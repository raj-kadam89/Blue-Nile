import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { loadUser, csrfProtect } from './middleware/auth.js'
import { sanitize, apiLimiter, notFoundHandler, errorHandler } from './middleware/common.js'
import { UPLOAD_DIR } from './middleware/upload.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      const normalized = origin.replace(/\/+$/, '')
      return cb(null, env.clientOrigins.length === 0 || env.clientOrigins.includes(normalized))
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }))
  app.use(express.json({ limit: '200kb' }))
  app.use(cookieParser())
  app.use(sanitize)

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }))
  if (!env.isProd) app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', fallthrough: false }))

  app.use('/api', apiLimiter, loadUser, csrfProtect, routes)
  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
