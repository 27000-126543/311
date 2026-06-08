import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

function parseProject(row: any) {
  return {
    ...row,
    qualifications: JSON.parse(row.qualifications || '[]'),
    scoring_criteria: JSON.parse(row.scoring_criteria || '[]'),
  }
}

const industryTemplates: Record<string, { criteria: any[]; qualifications: string[] }> = {
  '建筑工程': {
    criteria: [
      { criteriaId: 'sc1', name: '施工方案', weight: 40 },
      { criteriaId: 'sc2', name: '商务报价', weight: 30 },
      { criteriaId: 'sc3', name: '施工经验', weight: 20 },
      { criteriaId: 'sc4', name: '安全措施', weight: 10 },
    ],
    qualifications: ['建筑工程施工总承包壹级', '安全生产许可证'],
  },
  '信息技术': {
    criteria: [
      { criteriaId: 'sc1', name: '技术方案', weight: 45 },
      { criteriaId: 'sc2', name: '商务报价', weight: 25 },
      { criteriaId: 'sc3', name: '实施案例', weight: 20 },
      { criteriaId: 'sc4', name: '售后服务', weight: 10 },
    ],
    qualifications: ['计算机信息系统集成壹级', 'CMMI3级及以上认证'],
  },
  '医疗卫生': {
    criteria: [
      { criteriaId: 'sc1', name: '设计方案', weight: 35 },
      { criteriaId: 'sc2', name: '商务报价', weight: 35 },
      { criteriaId: 'sc3', name: '施工经验', weight: 20 },
      { criteriaId: 'sc4', name: '工期保障', weight: 10 },
    ],
    qualifications: ['建筑装修装饰工程专业承包壹级', '医疗器械经营许可证'],
  },
  '教育培训': {
    criteria: [
      { criteriaId: 'sc1', name: '平台功能', weight: 40 },
      { criteriaId: 'sc2', name: '商务报价', weight: 30 },
      { criteriaId: 'sc3', name: '服务能力', weight: 20 },
      { criteriaId: 'sc4', name: '用户口碑', weight: 10 },
    ],
    qualifications: ['软件企业认定', 'ISO9001质量管理体系认证'],
  },
  '交通运输': {
    criteria: [
      { criteriaId: 'sc1', name: '技术方案', weight: 40 },
      { criteriaId: 'sc2', name: '商务报价', weight: 25 },
      { criteriaId: 'sc3', name: '安全认证', weight: 20 },
      { criteriaId: 'sc4', name: '实施能力', weight: 15 },
    ],
    qualifications: ['铁路电气化工程专业承包壹级', '信号系统安全认证'],
  },
  '能源环保': {
    criteria: [
      { criteriaId: 'sc1', name: '技术方案', weight: 35 },
      { criteriaId: 'sc2', name: '商务报价', weight: 30 },
      { criteriaId: 'sc3', name: '施工经验', weight: 20 },
      { criteriaId: 'sc4', name: '运维方案', weight: 15 },
    ],
    qualifications: ['电力工程施工总承包壹级', '承装（修、试）电力设施许可证'],
  },
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { industry, region, status, page = '1', pageSize = '10' } = req.query
    const db = getDb()
    let sql = 'SELECT * FROM projects WHERE 1=1'
    const params: any[] = []
    if (industry) { sql += ' AND industry = ?'; params.push(industry) }
    if (region) { sql += ' AND region = ?'; params.push(region) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    const total = (db.prepare(`SELECT COUNT(*) as count FROM (${sql})`).get(...params) as any).count
    const offset = (Number(page) - 1) * Number(pageSize)
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.push(Number(pageSize), offset)
    const rows = db.prepare(sql).all(...params) as any[]
    res.json({ success: true, data: { list: rows.map(parseProject), total, page: Number(page), pageSize: Number(pageSize) } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取项目列表失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { name, budget, industry, region, qualifications, scoringCriteria, description, deadline, tendererId } = req.body
    if (!name || !budget || !industry || !region || !tendererId) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = getDb()
    const id = uuidv4()
    db.prepare(`INSERT INTO projects (id, name, budget, industry, region, tenderer_id, qualifications, scoring_criteria, description, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, name, budget, industry, region, tendererId,
      JSON.stringify(qualifications || []),
      JSON.stringify(scoringCriteria || []),
      description || null,
      deadline || null,
    )
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: parseProject(row) })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建项目失败' })
  }
})

router.get('/:id', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
    if (!row) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    res.json({ success: true, data: parseProject(row) })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取项目详情失败' })
  }
})

router.get('/:id/templates', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    const template = industryTemplates[project.industry] || industryTemplates['建筑工程']
    res.json({
      success: true,
      data: {
        industry: project.industry,
        recommendedCriteria: template.criteria,
        recommendedQualifications: template.qualifications,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取模板失败' })
  }
})

router.post('/:id/publish', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    if (project.status !== 'draft') { res.status(400).json({ success: false, error: '只有草稿状态的项目可以发布' }); return }
    const announcementId = uuidv4()
    db.prepare("UPDATE projects SET status = 'published', announcement_id = ? WHERE id = ?").run(announcementId, req.params.id)
    res.json({ success: true, data: { announcementId } })
  } catch (error) {
    res.status(500).json({ success: false, error: '发布项目失败' })
  }
})

export default router
