import { Router, type Request, type Response } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/:bidderId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const bidder = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.bidderId) as any
    if (!bidder) { res.status(404).json({ success: false, error: '投标人不存在' }); return }
    const records = db.prepare('SELECT * FROM credit_records WHERE bidder_id = ? ORDER BY created_at DESC').all(req.params.bidderId) as any[]
    const totalChange = records.reduce((sum: number, r: any) => sum + r.score_change, 0)
    res.json({
      success: true,
      data: {
        bidderId: bidder.id,
        username: bidder.username,
        orgName: bidder.org_name,
        currentScore: bidder.credit_score,
        totalChange,
        records,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取信用信息失败' })
  }
})

router.get('/alerts/list', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const lowCreditUsers = db.prepare('SELECT id, username, org_name, credit_score FROM users WHERE credit_score < 60 AND role = ?').all('bidder') as any[]
    const recentPenalties = db.prepare("SELECT cr.*, u.username, u.org_name FROM credit_records cr JOIN users u ON cr.bidder_id = u.id WHERE cr.type IN ('breach','penalty') ORDER BY cr.created_at DESC LIMIT 10").all() as any[]
    res.json({
      success: true,
      data: {
        lowCreditUsers,
        recentPenalties,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取信用预警失败' })
  }
})

router.get('/distribution/data', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { byIndustry, byRegion } = req.query
    const bidders = db.prepare("SELECT * FROM users WHERE role = 'bidder'").all() as any[]
    const distribution: any = {
      total: bidders.length,
      avgScore: bidders.length ? Math.round(bidders.reduce((s: number, u: any) => s + u.credit_score, 0) / bidders.length * 10) / 10 : 0,
      ranges: {
        excellent: bidders.filter((u) => u.credit_score >= 90).length,
        good: bidders.filter((u) => u.credit_score >= 70 && u.credit_score < 90).length,
        medium: bidders.filter((u) => u.credit_score >= 60 && u.credit_score < 70).length,
        poor: bidders.filter((u) => u.credit_score < 60).length,
      },
    }
    if (byIndustry === 'true') {
      const industries = db.prepare("SELECT DISTINCT industry FROM projects").all() as any[]
      distribution.byIndustry = industries.map((i) => {
        const projectIds = db.prepare('SELECT id FROM projects WHERE industry = ?').all(i.industry).map((p: any) => p.id)
        const records = projectIds.length
          ? db.prepare(`SELECT cr.* FROM credit_records cr WHERE cr.project_id IN (${projectIds.map(() => '?').join(',')})`).all(...projectIds) as any[]
          : []
        return { industry: i.industry, count: records.length, avgChange: records.length ? Math.round(records.reduce((s: number, r: any) => s + r.score_change, 0) / records.length * 10) / 10 : 0 }
      })
    }
    if (byRegion === 'true') {
      const regions = db.prepare("SELECT DISTINCT region FROM projects").all() as any[]
      distribution.byRegion = regions.map((r) => {
        const projectIds = db.prepare('SELECT id FROM projects WHERE region = ?').all(r.region).map((p: any) => p.id)
        const records = projectIds.length
          ? db.prepare(`SELECT cr.* FROM credit_records cr WHERE cr.project_id IN (${projectIds.map(() => '?').join(',')})`).all(...projectIds) as any[]
          : []
        return { region: r.region, count: records.length, avgChange: records.length ? Math.round(records.reduce((s: number, rec: any) => s + rec.score_change, 0) / records.length * 10) / 10 : 0 }
      })
    }
    res.json({ success: true, data: distribution })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取信用分布失败' })
  }
})

export default router
