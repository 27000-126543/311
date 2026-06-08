import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

function parseContract(row: any) {
  return { ...row, amendments: JSON.parse(row.amendments || '[]') }
}

router.get('/project/:projectId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE project_id = ?').get(req.params.projectId) as any
    if (!contract) { res.json({ success: true, data: null }); return }
    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(contract.project_id) as any
    res.json({ success: true, data: { ...parseContract(contract), projectName: project?.name } })
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
    db.prepare(`INSERT INTO contracts (id, project_id, deposit, status, content) VALUES (?, ?, ?, 'draft', ?)`).run(
      id, projectId, depositAmount, contractContent,
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
    const { signature } = req.body
    if (!signature) { res.status(400).json({ success: false, error: '缺少签名信息' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    if (contract.status !== 'draft' && contract.status !== 'amending') {
      res.status(400).json({ success: false, error: '合同状态不允许签署' }); return
    }
    db.prepare("UPDATE contracts SET status = 'signed', signed_at = datetime('now') WHERE id = ?").run(req.params.id)
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(updated.project_id) as any
    res.json({ success: true, data: { ...parseContract(updated), projectName: project?.name } })
  } catch (error) {
    res.status(500).json({ success: false, error: '签署合同失败' })
  }
})

router.post('/:id/amend', (req: Request, res: Response): void => {
  try {
    const { reason, documents } = req.body
    if (!reason) { res.status(400).json({ success: false, error: '缺少变更原因' }); return }
    const db = getDb()
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    if (!contract) { res.status(404).json({ success: false, error: '合同不存在' }); return }
    if (contract.status !== 'signed') {
      res.status(400).json({ success: false, error: '只有已签署合同可以变更' }); return
    }
    const amendments = JSON.parse(contract.amendments || '[]')
    amendments.push({ id: uuidv4(), reason, date: new Date().toISOString(), documents: documents || [], status: 'pending' })
    db.prepare("UPDATE contracts SET status = 'amending', amendments = ? WHERE id = ?").run(
      JSON.stringify(amendments), req.params.id,
    )
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    const project = db.prepare('SELECT name FROM projects WHERE id = ?').get(updated.project_id) as any
    res.json({ success: true, data: { ...parseContract(updated), projectName: project?.name } })
  } catch (error) {
    res.status(500).json({ success: false, error: '合同变更失败' })
  }
})

export default router
