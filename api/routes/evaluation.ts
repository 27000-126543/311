import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/:projectId/score', (req: Request, res: Response): void => {
  try {
    const { expertId, bidId, scores, comment } = req.body
    if (!expertId || !bidId || !scores?.length) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = getDb()
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(bidId) as any
    if (!bid) { res.status(404).json({ success: false, error: '投标不存在' }); return }
    const totalScore = scores.reduce((sum: number, s: any) => sum + (s.score || 0), 0)
    const id = uuidv4()
    db.prepare(`INSERT INTO evaluations (id, bid_id, expert_id, project_id, scores, total_score, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, bidId, expertId, req.params.projectId,
      JSON.stringify(scores), totalScore, comment || null,
    )
    db.prepare("UPDATE bids SET status = 'scored' WHERE id = ?").run(bidId)
    res.json({ success: true, data: { evaluationId: id, totalScore } })
  } catch (error) {
    res.status(500).json({ success: false, error: '评分失败' })
  }
})

router.get('/:projectId/result', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const projectId = req.params.projectId
    const bids = db.prepare('SELECT * FROM bids WHERE project_id = ?').all(projectId) as any[]
    const evaluations = db.prepare('SELECT * FROM evaluations WHERE project_id = ?').all(projectId) as any[]
    const ranking = bids
      .filter((b) => b.status === 'scored' || b.status === 'opened')
      .map((b) => {
        const bidEvals = evaluations.filter((e) => e.bid_id === b.id)
        const avgScore = bidEvals.length
          ? bidEvals.reduce((sum: number, e: any) => sum + e.total_score, 0) / bidEvals.length
          : 0
        return {
          bidId: b.id,
          bidderId: b.bidder_id,
          quote: b.quote,
          avgScore: Math.round(avgScore * 100) / 100,
          evalCount: bidEvals.length,
        }
      })
      .sort((a, b) => b.avgScore - a.avgScore)
    res.json({ success: true, data: { projectId, ranking } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取评标结果失败' })
  }
})

export default router
