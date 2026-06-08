import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

function ensureColumns(): void {
  const db = getDb()
  try {
    db.exec("ALTER TABLE contracts ADD COLUMN signature_data TEXT")
  } catch {}
  try {
    db.exec("ALTER TABLE contracts ADD COLUMN contract_amount REAL")
  } catch {}
}

function ensureMilestonesTable(): void {
  const db = getDb()
  db.exec(`
    CREATE TABLE IF NOT EXISTS contract_milestones (
      id TEXT PRIMARY KEY,
      contract_id TEXT NOT NULL REFERENCES contracts(id),
      name TEXT NOT NULL,
      planned_date TEXT NOT NULL,
      actual_date TEXT,
      payment_amount REAL DEFAULT 0,
      acceptance_result TEXT DEFAULT 'pending' CHECK(acceptance_result IN ('pass','fail','pending')),
      attachments TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','completed','overdue')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)
  try {
    db.exec("ALTER TABLE contract_milestones ADD COLUMN acceptance_opinion TEXT DEFAULT ''")
  } catch {}
}

function initSchema(): void {
  ensureColumns()
  ensureMilestonesTable()
}

initSchema()

function parseContract(row: any) {
  return {
    ...row,
    amendments: JSON.parse(row.amendments || '[]'),
    signatureData: row.signature_data ? JSON.parse(row.signature_data) : null,
  }
}

function getProjectName(db: any, projectId: string): string | null {
  const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(projectId) as any
  return project?.name ?? null
}

router.get('/overdue/milestones', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const today = new Date().toISOString().slice(0, 10)
    db.prepare(
      "UPDATE contract_milestones SET status = 'overdue' WHERE status = 'pending' AND planned_date < ?"
    ).run(today)
    const milestones = db.prepare(`
      SELECT cm.*, c.project_id, p.name as project_name
      FROM contract_milestones cm
      JOIN contracts c ON cm.contract_id = c.id
      LEFT JOIN projects p ON c.project_id = p.id
      WHERE cm.status IN ('overdue') OR (cm.status = 'pending' AND cm.planned_date < ?)
      ORDER BY cm.planned_date ASC
    `).all(today) as any[]
    res.json({ success: true, data: milestones.map((m: any) => ({ ...m, attachments: JSON.parse(m.attachments || '[]') })) })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取逾期里程碑失败' })
  }
})

router.get('/project/:projectId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE project_id = ?').get(req.params.projectId) as any
    if (!contract) { res.json({ success: true, data: null }); return }
    if (!contract.contract_amount || contract.contract_amount === 0) {
      const project = db.prepare('SELECT budget FROM projects WHERE id = ?').get(contract.project_id) as any
      if (project?.budget) {
        contract.contract_amount = project.budget
        db.prepare('UPDATE contracts SET contract_amount = ? WHERE id = ?').run(project.budget, contract.id)
      }
    }
    res.json({ success: true, data: { ...parseContract(contract), projectName: getProjectName(db, contract.project_id) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取合同失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { projectId, content, deposit } = req.body
    if (!projectId) { res.status(400).json({ success: false, error: '缺少项目ID' }); return }
    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    const existing = db.prepare('SELECT * FROM contracts WHERE project_id = ?').get(projectId) as any
    if (existing) { res.status(400).json({ success: false, error: '该项目已有合同' }); return }
    const id = uuidv4()
    const contractContent = content || `合同编号：CT-${Date.now()}\n\n甲方（招标人）：${project.name || '招标方'}\n乙方（中标人）：[中标方]\n\n一、工程概况\n本合同为${project.name}，预算金额为¥${project.budget?.toLocaleString() || '待定'}。\n\n二、合同金额\n本合同总价以实际中标金额为准。\n\n三、工期要求\n按招标文件约定执行。\n\n四、质量标准\n工程质量应符合国家现行施工验收规范的合格标准。\n\n五、履约保证金\n乙方应在中标通知书发出后15日内缴纳履约保证金。\n\n六、付款方式\n按工程进度分阶段支付。\n\n七、违约责任\n按合同约定执行。\n\n八、争议解决\n提交仲裁委员会仲裁。`
    const depositAmount = deposit || Math.round((project.budget || 0) * 0.04)
    db.prepare(`INSERT INTO contracts (id, project_id, deposit, contract_amount, status, content) VALUES (?, ?, ?, ?, 'draft', ?)`).run(
      id, projectId, depositAmount, project.budget || 0, contractContent,
    )
    db.prepare("UPDATE projects SET status = 'contracted' WHERE id = ?").run(projectId)
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: { ...parseContract(contract), projectName: project?.name } })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建合同失败' })
  }
})

router.post('/:id/sign', (req: Request, res: Response): void => {
  try {
    const { signature, signerName, signatureContent, signatureType } = req.body
    if (!signature && !signatureContent) { res.status(400).json({ success: false, error: '缺少签名信息' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    if (contract.status !== 'draft' && contract.status !== 'amending') {
      res.status(400).json({ success: false, error: '合同状态不允许签署' }); return
    }
    const signatureData = JSON.stringify({
      signerName: signerName || null,
      signatureContent: signatureContent || signature || null,
      signatureType: signatureType || 'typed',
      signedAt: new Date().toISOString(),
    })
    db.prepare("UPDATE contracts SET status = 'signed', signed_at = datetime('now'), signature_data = ? WHERE id = ?").run(signatureData, req.params.id)
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: { ...parseContract(updated), projectName: getProjectName(db, updated.project_id) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '签署合同失败' })
  }
})

router.post('/:id/amend', (req: Request, res: Response): void => {
  try {
    const { reason, documents, type, amountChange, durationChange } = req.body
    if (!reason) { res.status(400).json({ success: false, error: '缺少变更原因' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    if (contract.status !== 'signed' && contract.status !== 'amending') {
      res.status(400).json({ success: false, error: '只有已签署合同可以变更' }); return
    }
    const amendments = JSON.parse(contract.amendments || '[]')
    amendments.push({
      id: uuidv4(),
      reason,
      type: type || 'amendment',
      documents: documents || [],
      amountChange: amountChange || 0,
      durationChange: durationChange || 0,
      status: 'pending',
      tendererComment: null,
      supervisorComment: null,
      tendererApprovedAt: null,
      supervisorApprovedAt: null,
      date: new Date().toISOString(),
    })
    db.prepare("UPDATE contracts SET status = 'amending', amendments = ? WHERE id = ?").run(
      JSON.stringify(amendments), req.params.id,
    )
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: { ...parseContract(updated), projectName: getProjectName(db, updated.project_id) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '合同变更失败' })
  }
})

router.post('/:id/amendments/:amendmentId/approve', (req: Request, res: Response): void => {
  try {
    const { level, approved, comment } = req.body
    if (!level || (level !== 'tenderer' && level !== 'supervisor')) {
      res.status(400).json({ success: false, error: '缺少审批级别' }); return
    }
    if (approved === undefined) { res.status(400).json({ success: false, error: '缺少审批结果' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    const amendments = JSON.parse(contract.amendments || '[]')
    const amendment = amendments.find((a: any) => a.id === req.params.amendmentId)
    if (!amendment) { res.status(404).json({ success: false, error: '变更记录不存在' }); return }

    if (!approved) {
      amendment.status = 'rejected'
      if (level === 'tenderer') amendment.tendererComment = comment || null
      else amendment.supervisorComment = comment || null
    } else {
      const now = new Date().toISOString()
      if (level === 'tenderer') {
        amendment.status = 'tenderer_approved'
        amendment.tendererComment = comment || null
        amendment.tendererApprovedAt = now
      } else {
        amendment.supervisorComment = comment || null
        amendment.supervisorApprovedAt = now
        if (amendment.status === 'tenderer_approved') {
          amendment.status = 'approved'

          let baseAmount = contract.contract_amount
          if (!baseAmount || baseAmount === 0) {
            const project = db.prepare('SELECT budget FROM projects WHERE id = ?').get(contract.project_id) as any
            baseAmount = project?.budget || 0
          }
          const totalAmountChangeBefore = amendments
            .filter((a: any) => a.status === 'approved' && a.id !== amendment.id)
            .reduce((s: number, a: any) => s + (a.amountChange || 0), 0)
          const originalAmount = baseAmount - totalAmountChangeBefore

          if (amendment.amountChange) {
            contract.contract_amount = baseAmount + amendment.amountChange
          } else {
            contract.contract_amount = baseAmount
          }

          const allApproved = amendments.filter((a: any) => a.status === 'approved')
          const totalDurationChange = allApproved.reduce((s: number, a: any) => s + (a.durationChange || 0), 0)
          const totalAmountChange = allApproved.reduce((s: number, a: any) => s + (a.amountChange || 0), 0)

          let contentUpdate = contract.content || ''
          contentUpdate += '\n\n══════════════════════════════'
          contentUpdate += `\n【变更记录 #${allApproved.length}】`
          contentUpdate += `\n变更日期：${new Date().toLocaleDateString('zh-CN')}`
          contentUpdate += `\n变更原因：${amendment.reason}`
          if (amendment.amountChange) {
            contentUpdate += `\n金额变动：${amendment.amountChange > 0 ? '+' : ''}¥${amendment.amountChange.toLocaleString()}`
          }
          if (amendment.durationChange) {
            contentUpdate += `\n工期变动：${amendment.durationChange > 0 ? '+' : ''}${amendment.durationChange}天`
          }
          contentUpdate += '\n──────────────────────────────'
          contentUpdate += `\n本次变更后合同金额：¥${contract.contract_amount.toLocaleString()}（原合同金额 ¥${originalAmount.toLocaleString()}，累计调整 ${totalAmountChange > 0 ? '+' : ''}¥${totalAmountChange.toLocaleString()}）`
          if (totalDurationChange !== 0) {
            contentUpdate += `\n累计工期调整：${totalDurationChange > 0 ? '+' : ''}${totalDurationChange}天`
          }
          contentUpdate += '\n══════════════════════════════'
          contract.content = contentUpdate

          db.prepare("UPDATE contracts SET contract_amount = ?, content = ?, status = 'signed' WHERE id = ?").run(
            contract.contract_amount, contract.content, req.params.id,
          )
        }
      }
    }

    db.prepare('UPDATE contracts SET amendments = ? WHERE id = ?').run(JSON.stringify(amendments), req.params.id)
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: { ...parseContract(updated), projectName: getProjectName(db, updated.project_id) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '审批变更失败' })
  }
})

router.get('/:contractId/milestones', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.contractId) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    const today = new Date().toISOString().slice(0, 10)
    db.prepare(
      "UPDATE contract_milestones SET status = 'overdue' WHERE status = 'pending' AND planned_date < ? AND contract_id = ?"
    ).run(today, req.params.contractId)
    const milestones = db.prepare('SELECT * FROM contract_milestones WHERE contract_id = ? ORDER BY planned_date ASC').all(req.params.contractId) as any[]
    const parsed = milestones.map((m: any) => ({ ...m, attachments: JSON.parse(m.attachments || '[]') }))
    res.json({ success: true, data: parsed })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取履约台账失败' })
  }
})

router.post('/:contractId/milestones', (req: Request, res: Response): void => {
  try {
    const { name, plannedDate, paymentAmount } = req.body
    if (!name || !plannedDate) { res.status(400).json({ success: false, error: '缺少里程碑名称或计划日期' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.contractId) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    const id = uuidv4()
    const today = new Date().toISOString().slice(0, 10)
    const status = plannedDate < today ? 'overdue' : 'pending'
    db.prepare(
      `INSERT INTO contract_milestones (id, contract_id, name, planned_date, payment_amount, status) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, req.params.contractId, name, plannedDate, paymentAmount || 0, status)
    const milestone = db.prepare('SELECT * FROM contract_milestones WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: { ...milestone, attachments: JSON.parse(milestone.attachments || '[]') } })
  } catch (error) {
    res.status(500).json({ success: false, error: '添加里程碑失败' })
  }
})

router.put('/milestones/:milestoneId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const milestone = db.prepare('SELECT * FROM contract_milestones WHERE id = ?').get(req.params.milestoneId) as any
    if (!milestone) { res.status(404).json({ success: false, error: '里程碑不存在' }); return }
    const { name, plannedDate, paymentAmount, actualDate, actual_date, acceptanceResult, acceptance_result, acceptanceOpinion, acceptance_opinion, attachments, status } = req.body
    const updatedName = name ?? milestone.name
    const updatedPlannedDate = plannedDate ?? milestone.planned_date
    const updatedPaymentAmount = paymentAmount ?? milestone.payment_amount
    const updatedActualDate = actual_date ?? actualDate ?? milestone.actual_date
    const updatedAcceptanceResult = acceptance_result ?? acceptanceResult ?? milestone.acceptance_result
    const updatedAcceptanceOpinion = acceptance_opinion ?? acceptanceOpinion ?? milestone.acceptance_opinion
    const updatedAttachments = attachments ? JSON.stringify(attachments) : milestone.attachments
    let updatedStatus = status ?? milestone.status
    const today = new Date().toISOString().slice(0, 10)
    if (updatedPlannedDate < today && updatedStatus === 'pending') {
      updatedStatus = 'overdue'
    }
    db.prepare(
      `UPDATE contract_milestones SET name = ?, planned_date = ?, payment_amount = ?, actual_date = ?, acceptance_result = ?, acceptance_opinion = ?, attachments = ?, status = ? WHERE id = ?`
    ).run(updatedName, updatedPlannedDate, updatedPaymentAmount, updatedActualDate, updatedAcceptanceResult, updatedAcceptanceOpinion, updatedAttachments, updatedStatus, req.params.milestoneId)
    const updated = db.prepare('SELECT * FROM contract_milestones WHERE id = ?').get(req.params.milestoneId) as any
    res.json({ success: true, data: { ...updated, attachments: JSON.parse(updated.attachments || '[]') } })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新里程碑失败' })
  }
})

export default router
