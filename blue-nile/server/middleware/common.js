import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import { ZodError } from 'zod'
import { AppError, tooMany } from '../utils/errors.js'
import { env } from '../config/env.js'

/** Strip Mongo operators ($...) and dotted keys from body/params (Express 5 safe, req.query is read-only). */
function clean(value, depth = 0) {
  if (depth > 10 || value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1))
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor') delete value[key]
    else value[key] = clean(value[key], depth + 1)
  }
  return value
}
export function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') clean(req.body)
  if (req.params) clean(req.params)
  // Query values must be plain strings (blocks ?x[$ne]= injections).
  const q = req.query
  for (const k of Object.keys(q || {})) if (typeof q[k] !== 'string') delete q[k]
  next()
}

/** Zod validation. Replaces req.body with parsed data; parsed query in req.valid.query. */
export const validate = (schemas) => (req, _res, next) => {
  try {
    req.valid = req.valid || {}
    if (schemas.body) req.body = schemas.body.parse(req.body ?? {})
    if (schemas.query) req.valid.query = schemas.query.parse({ ...req.query })
    next()
  } catch (err) {
    next(err)
  }
}

const limiterHandler = (_req, _res, next, options) => next(tooMany(options.message))
const mk = (windowMs, limit, message) => rateLimit({ windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false, message, handler: limiterHandler, skip: () => env.isTest })
export const apiLimiter = mk(60_000, 300, 'Too many requests, slow down')
export const otpLimiter = mk(15 * 60_000, 10, 'Too many OTP requests from this network. Try again later.')
export const loginLimiter = mk(15 * 60_000, 20, 'Too many login attempts. Try again later.')
export const publicFormLimiter = mk(60 * 60_000, 10, 'Too many submissions. Try again later.')

export const notFoundHandler = (req, _res, next) => next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`))

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500
  let body = { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  if (err instanceof AppError) {
    status = err.status
    body = { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) }
  } else if (err instanceof ZodError) {
    status = 400
    const issues = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
    body = { code: 'VALIDATION_ERROR', message: issues[0] ? `${issues[0].path ? `${issues[0].path}: ` : ''}${issues[0].message}` : 'Invalid input', details: issues }
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400
    body = { code: 'VALIDATION_ERROR', message: Object.values(err.errors)[0]?.message || 'Invalid data' }
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400
    body = { code: 'INVALID_ID', message: 'Invalid identifier' }
  } else if (err?.code === 11000) {
    status = 409
    body = { code: 'DUPLICATE', message: `A record with this ${Object.keys(err.keyValue || {})[0] || 'value'} already exists` }
  } else if (err?.type === 'entity.parse.failed') {
    status = 400
    body = { code: 'BAD_JSON', message: 'Malformed JSON body' }
  } else if (err?.type === 'entity.too.large') {
    status = 413
    body = { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' }
  } else if (err?.name === 'MulterError') {
    status = 400
    body = { code: 'UPLOAD_ERROR', message: err.message }
  }
  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err)
  res.status(status).json({ success: false, error: body })
}
