import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const { projectId, content, deposit } = req.body
    if (!projectId) { res.status(400).json({ success: false, error: '缺少项目ID' }); return }
    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    const id = uuidv4()
    db.prepare(`INSERT INTO contracts (id, project_id, deposit, status, content) VALUES (?, ?, ?, 'draft', ?)`).run(
      id, projectId, deposit || 0, content || null,
    )
    db.prepare("UPDATE projects SET status = 'contracted' WHERE id = ?").run(projectId)
    const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: { ...contract, amendments: JSON.parse(contract.amendments || '[]') } })
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
    res.json({ success: true, data: { ...updated, amendments: JSON.parse(updated.amendments || '[]') } })
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
    amendments.push({ reason, date: new Date().toISOString(), documents: documents || [] })
    db.prepare("UPDATE contracts SET status = 'amending', amendments = ? WHERE id = ?").run(
      JSON.stringify(amendments), req.params.id,
    )
    const updated = db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: { ...updated, amendments: JSON.parse(updated.amendments || '[]') } })
  } catch (error) {
    res.status(500).json({ success: false, error: '合同变更失败' })
  }
})

export default router
