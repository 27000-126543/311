import { Router, type Request, type Response } from 'express'
import { getDb } from '../db/database.js'

const router = Router()

router.post('/:projectId/decrypt', (req: Request, res: Response): void => {
  try {
    const db = getDb()
    const { projectId } = req.params
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any
    if (!project) { res.status(404).json({ success: false, error: '项目不存在' }); return }

    const bids = db.prepare(
      "SELECT * FROM bids WHERE project_id = ? AND status IN ('verified', 'opened')"
    ).all(projectId) as any[]

    const updated = bids.map((bid) => {
      if (bid.status === 'verified') {
        db.prepare("UPDATE bids SET status = 'opened' WHERE id = ?").run(bid.id)
      }
      let decryptedContent: any = null
      try {
        decryptedContent = bid.encrypted_content
          ? JSON.parse(Buffer.from(bid.encrypted_content, 'base64').toString())
          : null
      } catch { decryptedContent = null }

      return {
        bidId: bid.id,
        bidderId: bid.bidder_id,
        quote: bid.quote,
        keyParams: JSON.parse(bid.key_params || '{}'),
        decryptedContent,
        status: 'opened',
      }
    })

    res.json({ success: true, data: { projectId, bids: updated } })
  } catch (error) {
    res.status(500).json({ success: false, error: '解密失败' })
  }
})

export default router
