import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { getDb } from './db/database.js'
import authRoutes from './routes/auth.js'
import projectRoutes from './routes/projects.js'
import bidRoutes from './routes/bids.js'
import expertRoutes from './routes/experts.js'
import evaluationRoutes from './routes/evaluation.js'
import awardRoutes from './routes/awards.js'
import objectionRoutes from './routes/objections.js'
import contractRoutes from './routes/contracts.js'
import creditRoutes from './routes/credit.js'
import analyticsRoutes from './routes/analytics.js'
import bidOpeningRoutes from './routes/bid-opening.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

getDb()

app.use('/api/auth', authRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/bids', bidRoutes)
app.use('/api/experts', expertRoutes)
app.use('/api/evaluation', evaluationRoutes)
app.use('/api/awards', awardRoutes)
app.use('/api/objections', objectionRoutes)
app.use('/api/contracts', contractRoutes)
app.use('/api/credit', creditRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/bid-opening', bidOpeningRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
