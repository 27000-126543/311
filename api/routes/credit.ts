import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/alerts/list', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_alerts (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL,
      threshold REAL DEFAULT 60,
      status TEXT DEFAULT 'active',
      restricted INTEGER DEFAULT 1,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
    const lowCreditUsers = db.prepare('SELECT id, username, org_name, credit_score FROM users WHERE credit_score < 60 AND role = ?').all('bidder') as any[]
    const alerts = db.prepare("SELECT * FROM credit_alerts ORDER BY created_at DESC").all() as any[]
    res.json({
      success: true,
      data: {
        lowCreditUsers,
        alerts,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取信用预警失败' })
  }
})

router.post('/alerts/:bidderId/send', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const bidder = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.bidderId) as any
    if (!bidder) { res.status(404).json({ success: false, error: '投标人不存在' }); return }
    const existing = db.prepare('SELECT * FROM credit_alerts WHERE bidder_id = ? AND status = ?').get(req.params.bidderId, 'active') as any
    if (existing) { res.json({ success: true, data: existing }); return }
    const id = uuidv4()
    const threshold = 60
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_alerts (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL,
      threshold REAL DEFAULT 60,
      status TEXT DEFAULT 'active',
      restricted INTEGER DEFAULT 1,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
    db.prepare('INSERT INTO credit_alerts (id, bidder_id, threshold, status, restricted, message) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, req.params.bidderId, threshold, 'active', 1,
      `信用分 ${bidder.credit_score} 分低于阈值 ${threshold} 分，已触发投标资格限制`,
    )
    db.prepare('INSERT INTO credit_records (id, bidder_id, type, score_change, reason) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), req.params.bidderId, 'penalty', 0, `信用预警：信用分${bidder.credit_score}分低于${threshold}分，投标资格受限`,
    )
    const alert = db.prepare('SELECT * FROM credit_alerts WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: alert })
  } catch (error) {
    res.status(500).json({ success: false, error: '发送预警失败' })
  }
})

router.post('/alerts/:alertId/release', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const alert = db.prepare('SELECT * FROM credit_alerts WHERE id = ?').get(req.params.alertId) as any
    if (!alert) { res.status(404).json({ success: false, error: '预警记录不存在' }); return }
    db.prepare("UPDATE credit_alerts SET status = 'released', restricted = 0 WHERE id = ?").run(req.params.alertId)
    db.prepare('INSERT INTO credit_records (id, bidder_id, type, score_change, reason) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), alert.bidder_id, 'fulfill', 0, '信用限制已解除，恢复投标资格',
    )
    const updated = db.prepare('SELECT * FROM credit_alerts WHERE id = ?').get(req.params.alertId) as any
    res.json({ success: true, data: updated })
  } catch (error) {
    res.status(500).json({ success: false, error: '解除限制失败' })
  }
})

router.get('/restrictions/list', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_alerts (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL,
      threshold REAL DEFAULT 60,
      status TEXT DEFAULT 'active',
      restricted INTEGER DEFAULT 1,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
    const restrictions = db.prepare(`
      SELECT ca.*, u.username, u.org_name, u.credit_score
      FROM credit_alerts ca
      LEFT JOIN users u ON ca.bidder_id = u.id
      WHERE ca.restricted = 1
      ORDER BY ca.created_at DESC
    `).all() as any[]
    res.json({ success: true, data: restrictions })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取限制名单失败' })
  }
})

router.get('/restrictions/check/:bidderId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_alerts (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL,
      threshold REAL DEFAULT 60,
      status TEXT DEFAULT 'active',
      restricted INTEGER DEFAULT 1,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
    const active = db.prepare('SELECT * FROM credit_alerts WHERE bidder_id = ? AND restricted = 1').all(req.params.bidderId) as any[]
    res.json({
      success: true,
      data: {
        restricted: active.length > 0,
        alerts: active,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '检查限制状态失败' })
  }
})

router.get('/restrictions/history', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    db.prepare(`CREATE TABLE IF NOT EXISTS credit_alerts (
      id TEXT PRIMARY KEY,
      bidder_id TEXT NOT NULL,
      threshold REAL DEFAULT 60,
      status TEXT DEFAULT 'active',
      restricted INTEGER DEFAULT 1,
      message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`).run()
    const history = db.prepare(`
      SELECT ca.*, u.username, u.org_name, u.credit_score
      FROM credit_alerts ca
      LEFT JOIN users u ON ca.bidder_id = u.id
      ORDER BY ca.created_at DESC
    `).all() as any[]
    res.json({ success: true, data: history })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取历史记录失败' })
  }
})

router.get('/interceptions', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const records = db.prepare(`
      SELECT cr.*, u.username, u.org_name, p.name as project_name
      FROM credit_records cr
      LEFT JOIN users u ON cr.bidder_id = u.id
      LEFT JOIN projects p ON cr.project_id = p.id
      WHERE cr.type IN ('penalty', 'bid')
      ORDER BY cr.created_at DESC
    `).all() as any[]
    const mapped = records.map((r: any) => ({
      ...r,
      bidder_name: r.org_name || r.username || r.bidder_id,
      project: r.project_name || '—',
    }))
    res.json({ success: true, data: mapped })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取拦截记录失败' })
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

router.get('/:bidderId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const bidder = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.bidderId) as any
    if (!bidder) { res.status(404).json({ success: false, error: '投标人不存在' }); return }
    const records = db.prepare('SELECT cr.*, p.name as project_name FROM credit_records cr LEFT JOIN projects p ON cr.project_id = p.id WHERE cr.bidder_id = ? ORDER BY cr.created_at DESC').all(req.params.bidderId) as any[]
    const totalChange = records.reduce((sum: number, r: any) => sum + r.score_change, 0)
    const mappedRecords = records.map((r: any) => ({ ...r, project: r.project_name || '—' }))
    const sortedAsc = [...records].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    const baseScore = bidder.credit_score - totalChange
    const now = new Date()
    const months: string[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    }
    let runningScore = baseScore
    const monthlyScores = new Map<string, number>()
    for (const month of months) {
      monthlyScores.set(month, runningScore)
    }
    for (const record of sortedAsc) {
      const date = new Date(record.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (monthlyScores.has(monthKey)) {
        runningScore += record.score_change
        monthlyScores.set(monthKey, runningScore)
      } else if (monthKey > months[0]) {
        for (const m of months) {
          if (m >= monthKey) {
            runningScore += record.score_change
            monthlyScores.set(m, runningScore)
            break
          }
        }
      }
    }
    const trend = months.map(month => ({ month, score: Math.round((monthlyScores.get(month) ?? runningScore) * 10) / 10 }))
    res.json({
      success: true,
      data: {
        bidderId: bidder.id,
        username: bidder.username,
        orgName: bidder.org_name,
        currentScore: bidder.credit_score,
        totalChange,
        records: mappedRecords,
        trend,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取信用信息失败' })
  }
})

export default router
