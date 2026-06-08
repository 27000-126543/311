import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/:projectId/publish', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const projectId = req.params.projectId
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    const evaluations = db.prepare('SELECT * FROM evaluations WHERE project_id = ?').all(projectId) as any[]
    if (!evaluations.length) { res.status(400).json({ success: false, error: '该项目尚无评标记录' }); return }
    const bids = db.prepare("SELECT * FROM bids WHERE project_id = ? AND status IN ('scored', 'opened')").all(projectId) as any[]
    if (!bids.length) { res.status(400).json({ success: false, error: '没有可中标的投标' }); return }
    const scored = bids.map((b) => {
      const bidEvals = evaluations.filter((e) => e.bid_id === b.id)
      const avgScore = bidEvals.length ? bidEvals.reduce((s: number, e: any) => s + e.total_score, 0) / bidEvals.length : 0
      return { bidId: b.id, avgScore }
    }).sort((a, b) => b.avgScore - a.avgScore)
    const winnerBidId = scored[0].bidId
    const awardId = uuidv4()
    db.prepare("INSERT INTO awards (id, project_id, winner_bid_id, status) VALUES (?, ?, ?, 'published')").run(awardId, projectId, winnerBidId)
    db.prepare("UPDATE projects SET status = 'awarded' WHERE id = ?").run(projectId)
    const award = db.prepare('SELECT * FROM awards WHERE id = ?').get(awardId) as any
    res.status(201).json({ success: true, data: award })
  } catch (error) {
    res.status(500).json({ success: false, error: '发布中标结果失败' })
  }
})

router.get('/:projectId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const award = db.prepare('SELECT * FROM awards WHERE project_id = ?').get(req.params.projectId) as any
    if (!award) { res.status(404).json({ success: false, error: '中标记录不存在' }); return }
    res.json({ success: true, data: award })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取中标信息失败' })
  }
})

export default router
