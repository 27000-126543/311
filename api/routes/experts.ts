import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/draw', (req: Request, res: Response): void => {
  try {
    const { projectId, specialties, count = 3, excludeIds = [] } = req.body
    if (!projectId || !specialties?.length) {
      res.status(400).json({ success: false, error: '缺少项目ID或专业领域' })
      return
    }
    const db = getDb()
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }
    let experts = db.prepare("SELECT * FROM users WHERE role = 'expert'").all() as any[]
    if (excludeIds.length) {
      experts = experts.filter((e) => !excludeIds.includes(e.id))
    }
    const selectedCount = Math.min(count, experts.length)
    const shuffled = experts.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, selectedCount)
    const drawId = uuidv4()
    const decryptAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const encryptedResult = Buffer.from(JSON.stringify(selected.map((e) => ({
      id: e.id, name: e.username, specialty: specialties[0], orgName: e.org_name,
    })))).toString('base64')
    db.prepare(`INSERT INTO expert_draws (id, project_id, specialties, exclude_ids, encrypted_result, decrypt_at, decrypted)
      VALUES (?, ?, ?, ?, ?, ?, 0)`).run(
      drawId, projectId,
      JSON.stringify(specialties), JSON.stringify(excludeIds),
      encryptedResult, decryptAt,
    )
    res.json({
      success: true,
      data: { drawId, encryptedResult, decryptAt, selectedCount },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '专家抽取失败' })
  }
})

router.get('/draws', (_req: Request, res: Response): void => {
  try {
    const db = getDb()
    const rows = db.prepare(`
      SELECT ed.*, p.name as project_name
      FROM expert_draws ed
      JOIN projects p ON ed.project_id = p.id
      ORDER BY ed.created_at DESC
    `).all() as any[]
    const result = rows.map((d) => {
      const item: any = {
        drawId: d.id,
        projectId: d.project_id,
        projectName: d.project_name,
        specialties: JSON.parse(d.specialties || '[]'),
        excludeIds: JSON.parse(d.exclude_ids || '[]'),
        decryptAt: d.decrypt_at,
        decrypted: !!d.decrypted,
        createdAt: d.created_at,
      }
      if (d.decrypted) {
        try { item.experts = JSON.parse(Buffer.from(d.encrypted_result, 'base64').toString()) }
        catch { item.experts = JSON.parse(d.encrypted_result) }
      }
      return item
    })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取抽取列表失败' })
  }
})

router.get('/draw/:drawId', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const draw = db.prepare('SELECT * FROM expert_draws WHERE id = ?').get(req.params.drawId) as any
    if (!draw) { res.status(404).json({ success: false, error: '抽取记录不存在' }); return }
    const result: any = {
      drawId: draw.id,
      projectId: draw.project_id,
      specialties: JSON.parse(draw.specialties || '[]'),
      decryptAt: draw.decrypt_at,
      decrypted: !!draw.decrypted,
    }
    if (draw.decrypted) {
      result.experts = JSON.parse(Buffer.from(draw.encrypted_result, 'base64').toString())
    }
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取抽取结果失败' })
  }
})

export default router
