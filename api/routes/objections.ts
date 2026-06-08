import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/', (req: Request, res: Response): void => {
  try {
    const { projectId, submitterId, content, evidence } = req.body
    if (!projectId || !submitterId || !content) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = getDb()
    const id = uuidv4()
    db.prepare(`INSERT INTO objections (id, project_id, submitter_id, content, evidence)
      VALUES (?, ?, ?, ?, ?)`).run(id, projectId, submitterId, content, JSON.stringify(evidence || []))
    const objection = db.prepare('SELECT * FROM objections WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: objection })
  } catch (error) {
    res.status(500).json({ success: false, error: '提交异议失败' })
  }
})

router.post('/:id/approve', (req: Request, res: Response): void => {
  try {
    const { level, approved, comment } = req.body
    if (!level || approved === undefined) {
      res.status(400).json({ success: false, error: '缺少审批级别或审批结果' })
      return
    }
    const validLevels = ['tenderer', 'center', 'supervisor']
    if (!validLevels.includes(level)) {
      res.status(400).json({ success: false, error: '无效的审批级别' })
      return
    }
    const db = getDb()
    const objection = db.prepare('SELECT * FROM objections WHERE id = ?').get(req.params.id) as any
    if (!objection) { res.status(404).json({ success: false, error: '异议不存在' }); return }
    const status = approved ? 'approved' : 'rejected'
    const levelMap: Record<string, { statusCol: string; commentCol: string }> = {
      tenderer: { statusCol: 'level1_status', commentCol: 'level1_comment' },
      center: { statusCol: 'level2_status', commentCol: 'level2_comment' },
      supervisor: { statusCol: 'level3_status', commentCol: 'level3_comment' },
    }
    const cols = levelMap[level]
    db.prepare(`UPDATE objections SET ${cols.statusCol} = ?, ${cols.commentCol} = ?, updated_at = datetime('now') WHERE id = ?`).run(
      status, comment || null, req.params.id,
    )
    const updated = db.prepare('SELECT * FROM objections WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '审批异议失败' })
  }
})

export default router
