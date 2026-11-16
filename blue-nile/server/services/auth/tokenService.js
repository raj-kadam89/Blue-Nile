import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'

const ACCESS_TTL_SEC = 15 * 60
const REFRESH_TTL_SEC = { CUSTOMER: 30 * 86400, STAFF: 12 * 3600, OWNER: 12 * 3600 }

const baseCookie = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax', // cross-site (Vercel -> API host) requires SameSite=None + Secure
  path: '/',
})

export const csrfFor = (sessionId) => crypto.createHmac('sha256', env.JWT_SECRET).update(`csrf:${sessionId}`).digest('hex')

/** Issue access + refresh cookies. Returns the CSRF token bound to this session. */
export function issueSession(res, user, existingSid) {
  const sid = existingSid || crypto.randomBytes(16).toString('hex')
  const payload = { sub: String(user._id), role: user.role, tv: user.tokenVersion || 0, sid }
  const access = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TTL_SEC })
  const refreshTtl = REFRESH_TTL_SEC[user.role] || ACCESS_TTL_SEC
  const refresh = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: refreshTtl })
  res.cookie('bn_at', access, { ...baseCookie(), maxAge: ACCESS_TTL_SEC * 1000 })
  res.cookie('bn_rt', refresh, { ...baseCookie(), path: '/api/auth', maxAge: refreshTtl * 1000 })
  return csrfFor(sid)
}

export function clearSession(res) {
  res.clearCookie('bn_at', { ...baseCookie() })
  res.clearCookie('bn_rt', { ...baseCookie(), path: '/api/auth' })
}

export const verifyAccess = (token) => jwt.verify(token, env.JWT_SECRET)
export const verifyRefresh = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET)

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf('=')
      return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))]
    }),
  )
}
