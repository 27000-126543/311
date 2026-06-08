import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()

function parseBid(row: any) {
  return {
    ...row,
    documents: JSON.parse(row.documents || '[]'),
    key_params: JSON.parse(row.key_params || '{}'),
    verify_result: row.verify_result ? JSON.parse(row.verify_result) : null,
  }
}

router.get('/', (req: Request, res: Response): void => {
  try {
    const { projectId, status } = req.query
    const db = getDb()
    let sql = 'SELECT * FROM bids WHERE 1=1'
    const params: any[] = []
    if (projectId) { sql += ' AND project_id = ?'; params.push(projectId) }
    if (status) { sql += ' AND status = ?'; params.push(status) }
    sql += ' ORDER BY created_at DESC'
    const rows = db.prepare(sql).all(...params) as any[]
    res.json({ success: true, data: rows.map(parseBid) })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取投标列表失败' })
  }
})

router.post('/', (req: Request, res: Response): void => {
  try {
    const { projectId, bidderId, quote, documents, keyParams } = req.body
    if (!projectId || !bidderId || !quote) {
      res.status(400).json({ success: false, error: '缺少必填字段' })
      return
    }
    const db = getDb()
    const id = uuidv4()
    db.prepare(`INSERT INTO bids (id, project_id, bidder_id, quote, documents, key_params, encrypted_content)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
      id, projectId, bidderId, quote,
      JSON.stringify(documents || []),
      JSON.stringify(keyParams || {}),
      Buffer.from(JSON.stringify({ quote, keyParams })).toString('base64'),
    )
    const row = db.prepare('SELECT * FROM bids WHERE id = ?').get(id) as any
    res.status(201).json({ success: true, data: parseBid(row) })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建投标失败' })
  }
})

router.post('/:id/verify', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(req.params.id) as any
    if (!bid) { res.status(404).json({ success: false, error: '投标不存在' }); return }
    if (bid.status !== 'pending') { res.status(400).json({ success: false, error: '只能审核待审核的投标' }); return }
    const bidder = db.prepare('SELECT * FROM users WHERE id = ?').get(bid.bidder_id) as any
    const licenseValid = Math.random() > 0.2
    const performanceMatch = Math.random() > 0.3
    const creditScore = bidder?.credit_score ?? 100
    const creditPassed = creditScore >= 60
    const passed = licenseValid && performanceMatch && creditPassed
    const verifyResult = { licenseValid, performanceMatch, creditScore, creditPassed }
    if (passed) {
      db.prepare("UPDATE bids SET status = 'verified', verify_result = ? WHERE id = ?").run(JSON.stringify(verifyResult), req.params.id)
    } else {
      const reasons: string[] = []
      if (!licenseValid) reasons.push('资质证书无效或已过期')
      if (!performanceMatch) reasons.push('业绩不满足项目要求')
      if (!creditPassed) reasons.push(`信用评分${creditScore}分，低于60分门槛`)
      db.prepare("UPDATE bids SET status = 'rejected', verify_result = ?, reject_reason = ? WHERE id = ?").run(
        JSON.stringify(verifyResult), reasons.join('；'), req.params.id,
      )
    }
    const updated = db.prepare('SELECT * FROM bids WHERE id = ?').get(req.params.id) as any
    res.json({ success: true, data: parseBid(updated) })
  } catch (error) {
    res.status(500).json({ success: false, error: '投标校验失败' })
  }
})

router.post('/:id/reject', (req: Request, res: Response): void => {
  try {
    const { reason } = req.body
    if (!reason) { res.status(400).json({ success: false, error: '请提供废标原因' }); return }
    const db = getDb()
    const bid = db.prepare('SELECT * FROM bids WHERE id = ?').get(req.params.id) as any
    if (!bid) { res.status(404).json({ success: false, error: '投标不存在' }); return }
    db.prepare("UPDATE bids SET status = 'rejected', reject_reason = ? WHERE id = ?").run(reason, req.params.id)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ success: false, error: '废标操作失败' })
  }
})

export default router
