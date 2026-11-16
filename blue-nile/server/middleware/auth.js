import { User, StaffProfile } from '../models/index.js'
import { verifyAccess, csrfFor } from '../services/auth/tokenService.js'
import { unauthorized, forbidden } from '../utils/errors.js'

export async function permissionsFor(user) {
  if (user.role === 'OWNER') return { canReschedule: true, canCreateWalkIn: true }
  if (user.role !== 'STAFF') return undefined
  const prof = await StaffProfile.findOne({ userId: user._id }).lean()
  return { canReschedule: !!prof?.permissions?.canReschedule, canCreateWalkIn: prof?.permissions?.canCreateWalkIn !== false }
}

export async function resolveUser(token) {
  const p = verifyAccess(token)
  const user = await User.findById(p.sub).select('+tokenVersion')
  if (!user || !user.active || (user.tokenVersion || 0) !== p.tv) return null
  const permissions = await permissionsFor(user)
  return { id: String(user._id), _id: user._id, role: user.role, name: user.name, mobile: user.mobile, email: user.email, permissions, sid: p.sid }
}

/** Attach req.user from the access cookie. Role always comes from the database, never from the client. */
export async function loadUser(req, _res, next) {
  const token = req.cookies?.bn_at
  if (!token) return next()
  try { req.user = (await resolveUser(token)) || undefined } catch { /* invalid/expired -> anonymous */ }
  next()
}

export const requireAuth = (req, _res, next) => (req.user ? next() : next(unauthorized()))

/** Backend RBAC. */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized())
  if (!roles.includes(req.user.role)) return next(forbidden())
  next()
}

export const requirePermission = (perm) => (req, _res, next) => {
  if (req.user?.role === 'OWNER' || req.user?.permissions?.[perm]) return next()
  next(forbidden('Your account is not permitted to perform this action'))
}

/** CSRF: token bound to session id via HMAC, required on mutating requests from authenticated users. */
export function csrfProtect(req, _res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || !req.user) return next()
  const token = req.get('x-csrf-token')
  if (!token || token !== csrfFor(req.user.sid)) return next(forbidden('Invalid or missing CSRF token. Please refresh the page.', 'CSRF_INVALID'))
  next()
}

export const userDto = (u, permissions) => ({
  id: String(u._id || u.id), role: u.role, name: u.name, mobile: u.mobile, email: u.email,
  ...(permissions ? { permissions } : {}),
})
