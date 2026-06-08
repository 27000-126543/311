import { Router, type Request, type Response } from 'express'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../db/database.js'

const router = Router()
const JWT_SECRET = 'bidding-platform-secret-2024'

function generateToken(user: { id: string; role: string; org_name: string }): string {
  return jwt.sign({ userId: user.id, role: user.role, orgName: user.org_name }, JWT_SECRET, { expiresIn: '24h' })
}

router.post('/login', (req: Request, res: Response): void => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' })
      return
    }
    const db = getDb()
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }
    const token = generateToken(user)
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          orgName: user.org_name,
          creditScore: user.credit_score,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.post('/register', (req: Request, res: Response): void => {
  try {
    const { username, password, role, orgName } = req.body
    if (!username || !password || !role || !orgName) {
      res.status(400).json({ success: false, error: '所有字段都不能为空' })
      return
    }
    const validRoles = ['tenderer', 'bidder', 'expert', 'admin', 'supervisor']
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: '无效的角色类型' })
      return
    }
    const db = getDb()
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as any
    if (existing) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }
    const id = uuidv4()
    db.prepare('INSERT INTO users (id, username, password, role, org_name) VALUES (?, ?, ?, ?, ?)').run(id, username, password, role, orgName)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any
    const token = generateToken(user)
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          orgName: user.org_name,
          creditScore: user.credit_score,
        },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

export default router
