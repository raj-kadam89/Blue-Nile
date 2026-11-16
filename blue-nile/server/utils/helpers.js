import crypto from 'node:crypto'
import { badRequest } from './errors.js'

/** Normalise Indian mobile numbers to 10 digits; returns null if invalid. */
export function normalizeMobile(input) {
  if (!input) return null
  let d = String(input).replace(/[^\d]/g, '')
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1)
  return /^[6-9]\d{9}$/.test(d) ? d : null
}
export const requireMobile = (input) => {
  const m = normalizeMobile(input)
  if (!m) throw badRequest('Enter a valid 10-digit Indian mobile number', 'INVALID_MOBILE')
  return m
}
export const e164 = (mobile) => `91${mobile}`
export const maskMobile = (m) => (m ? `${m.slice(0, 2)}******${m.slice(-2)}` : m)

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export function randomCode(len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)]
  return s
}

export const slugify = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]))

export function paginate(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20))
  return { page, limit, skip: (page - 1) * limit }
}
export const pageResult = (items, total, { page, limit }) => ({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
