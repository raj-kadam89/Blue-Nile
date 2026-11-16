import bcrypt from 'bcryptjs'
import { User } from '../models/index.js'
import { asyncHandler, ok, unauthorized, badRequest } from '../utils/errors.js'
import { sendOtp, verifyOtp } from '../services/auth/otpService.js'
import { issueSession, clearSession, verifyRefresh, csrfFor } from '../services/auth/tokenService.js'
import { permissionsFor, userDto } from '../middleware/auth.js'
import { audit } from '../services/auditService.js'
import { ensureDefaultAccounts } from '../services/seating/seatingService.js'
import { env } from '../config/env.js'

const MAX_FAILED = 5
const LOCK_MS = 15 * 60 * 1000
// Constant-time-ish dummy hash so unknown emails take as long as wrong passwords (prevents enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-placeholder', 10)

export const sendOtpCtrl = asyncHandler(async (req, res) => {
  ok(res, await sendOtp({ ...req.body, ip: req.ip }), 'If the number is valid, an OTP has been sent.')
})

export const verifyOtpCtrl = asyncHandler(async (req, res) => {
  const user = await verifyOtp(req.body)
  const csrfToken = issueSession(res, user)
  ok(res, { user: userDto(user), csrfToken })
})

export const staffLogin = asyncHandler(async (req, res) => {
  await ensureDefaultAccounts()
  const { email, password } = req.body
  const user = await User.findOne({ email, role: { $in: ['OWNER', 'STAFF'] } }).select('+passwordHash +failedLoginAttempts +lockUntil +tokenVersion')
  const fail = () => unauthorized('Invalid email or password', 'INVALID_CREDENTIALS')
  if (!user) { await bcrypt.compare(password, DUMMY_HASH); throw fail() }
  if (user.lockUntil && user.lockUntil > new Date()) throw badRequest('Account temporarily locked after failed attempts. Try again in 15 minutes.', 'ACCOUNT_LOCKED')
  // Support both bcrypt hashes ($2a$/$2b$) and plain-text passwords if a user edited MongoDB directly in development
  const isBcrypt = typeof user.passwordHash === 'string' && /^\$2[aby]\$\d{2}\$/.test(user.passwordHash)
  const valid = user.passwordHash && (isBcrypt ? await bcrypt.compare(password, user.passwordHash) : (!env.isProd && password === user.passwordHash))
  if (valid && !isBcrypt) user.passwordHash = await bcrypt.hash(password, 12)
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
    if (user.failedLoginAttempts >= MAX_FAILED) { user.lockUntil = new Date(Date.now() + LOCK_MS); user.failedLoginAttempts = 0 }
    await user.save()
    throw fail()
  }
  if (!user.active) throw unauthorized('This account has been deactivated', 'ACCOUNT_DISABLED')
  user.failedLoginAttempts = 0
  user.lockUntil = undefined
  user.lastLoginAt = new Date()
  await user.save()
  const csrfToken = issueSession(res, user)
  await audit({ action: 'LOGIN', entityType: 'USER', entityId: user._id, actor: { id: user._id, name: user.name, role: user.role } })
  ok(res, { user: userDto(user, await permissionsFor(user)), csrfToken })
})

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.bn_rt
  if (!token) throw unauthorized()
  let p
  try { p = verifyRefresh(token) } catch { clearSession(res); throw unauthorized('Session expired') }
  const user = await User.findById(p.sub).select('+tokenVersion')
  if (!user || !user.active || (user.tokenVersion || 0) !== p.tv) { clearSession(res); throw unauthorized('Session expired') }
  const csrfToken = issueSession(res, user, p.sid)
  ok(res, { user: userDto(user, await permissionsFor(user)), csrfToken })
})

export const logout = asyncHandler(async (req, res) => {
  clearSession(res)
  ok(res, null, 'Logged out')
})

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw unauthorized()
  ok(res, { user: userDto(req.user, req.user.permissions), csrfToken: csrfFor(req.user.sid) })
})
