import { Router, type Request, type Response } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

router.get('/overview', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const totalProjects = (db.prepare('SELECT COUNT(*) as count FROM projects').get() as any).count
    const totalBids = (db.prepare('SELECT COUNT(*) as count FROM bids').get() as any).count
    const totalContracts = (db.prepare('SELECT COUNT(*) as count FROM contracts').get() as any).count
    const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count
    const biddingProjects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('published','bidding')").get() as any).count
    const evaluatingProjects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'evaluating'").get() as any).count
    const awardedProjects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE status IN ('awarded','contracted','completed')").get() as any).count
    const totalBudget = db.prepare('SELECT COALESCE(SUM(budget), 0) as total FROM projects').get() as any
    const avgCredit = db.prepare("SELECT AVG(credit_score) as avg FROM users WHERE role = 'bidder'").get() as any
    const today = new Date().toISOString().split('T')[0]
    const todayProjects = (db.prepare("SELECT COUNT(*) as count FROM projects WHERE date(created_at) = ?").get(today) as any).count
    const todayBids = (db.prepare("SELECT COUNT(*) as count FROM bids WHERE date(created_at) = ?").get(today) as any).count
    const industries = db.prepare('SELECT industry, COUNT(*) as count FROM projects GROUP BY industry').all() as any[]
    const regions = db.prepare('SELECT region, COUNT(*) as count FROM projects GROUP BY region').all() as any[]
    const statusDist = db.prepare('SELECT status, COUNT(*) as count FROM projects GROUP BY status').all() as any[]
    const creditDist = db.prepare("SELECT CASE WHEN credit_score >= 90 THEN '优秀' WHEN credit_score >= 70 THEN '良好' WHEN credit_score >= 60 THEN '一般' ELSE '较差' END as level, COUNT(*) as count FROM users WHERE role = 'bidder' GROUP BY level").all() as any[]
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const mStart = `${label}-01`
      const mEnd = i === 0 ? new Date().toISOString() : `${label}-31`
      const pCount = (db.prepare('SELECT COUNT(*) as count FROM projects WHERE created_at >= ? AND created_at <= ?').get(mStart, mEnd) as any).count
      const bCount = (db.prepare('SELECT COUNT(*) as count FROM bids WHERE created_at >= ? AND created_at <= ?').get(mStart, mEnd) as any).count
      months.push({ month: label, projects: pCount, bids: bCount })
    }
    res.json({
      success: true,
      data: {
        summary: {
          totalProjects, totalBids, totalContracts, totalUsers,
          totalBudget: totalBudget.total, avgCreditScore: Math.round((avgCredit.avg || 0) * 10) / 10,
        },
        today: { newProjects: todayProjects, newBids: todayBids },
        projectStatus: { bidding: biddingProjects, evaluating: evaluatingProjects, awarded: awardedProjects },
        byIndustry: industries,
        byRegion: regions,
        statusDistribution: statusDist,
        creditDistribution: creditDist,
        monthlyTrends: months,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取概览数据失败' })
  }
})

router.get('/report', (req: Request, res: Response): void => {
  try {
    const { industry, region, startDate, endDate, type = 'monthly' } = req.query
    const db = getDb()
    let projectSql = 'SELECT * FROM projects WHERE 1=1'
    const params: any[] = []
    if (industry) { projectSql += ' AND industry = ?'; params.push(industry) }
    if (region) { projectSql += ' AND region = ?'; params.push(region) }
    if (startDate) { projectSql += ' AND created_at >= ?'; params.push(startDate) }
    if (endDate) { projectSql += ' AND created_at <= ?'; params.push(endDate) }
    const projects = db.prepare(projectSql).all(...params) as any[]
    if (type === 'credit') {
      const bidderIds = [...new Set(projects.map((p) => p.tenderer_id))]
      const creditRecords = bidderIds.length
        ? db.prepare(`SELECT cr.*, u.username, u.org_name, u.credit_score FROM credit_records cr JOIN users u ON cr.bidder_id = u.id WHERE cr.bidder_id IN (${bidderIds.map(() => '?').join(',')})`).all(...bidderIds) as any[]
        : []
      res.json({ success: true, data: { type: 'credit', projects: projects.length, creditRecords } })
    } else {
      const monthlyData: Record<string, any> = {}
      for (const p of projects) {
        const month = p.created_at?.substring(0, 7) || 'unknown'
        if (!monthlyData[month]) monthlyData[month] = { month, count: 0, totalBudget: 0 }
        monthlyData[month].count++
        monthlyData[month].totalBudget += p.budget || 0
      }
      res.json({ success: true, data: { type: 'monthly', projects: projects.length, trends: Object.values(monthlyData) } })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '获取报表数据失败' })
  }
})

router.get('/export', (req: Request, res: Response): void => {
  try {
    const { type = 'monthly' } = req.query
    const db = getDb()
    const projects = db.prepare('SELECT * FROM projects').all() as any[]
    const csvHeader = '项目名称,行业,区域,预算(万元),状态,创建时间\n'
    const csvRows = projects.map((p) => `${p.name},${p.industry},${p.region},${(p.budget / 10000).toFixed(2)},${p.status},${p.created_at}`).join('\n')
    const csv = csvHeader + csvRows
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=report_${type}_${Date.now()}.csv`)
    res.send('\uFEFF' + csv)
  } catch (error) {
    res.status(500).json({ success: false, error: '导出失败' })
  }
})

export default router
