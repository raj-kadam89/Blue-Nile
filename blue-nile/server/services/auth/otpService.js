import crypto from 'node:crypto'
import { OTPVerification, User } from '../../models/index.js'
import { env } from '../../config/env.js'
import { badRequest, tooMany } from '../../utils/errors.js'
import { sendOtpSms } from '../notification/providers.js'

export const OTP_TTL_SEC = 5 * 60
export const RESEND_COOLDOWN_SEC = 45
export const MAX_ATTEMPTS = 5
export const MAX_SENDS_PER_HOUR = 5

const hash = (mobile, code) => crypto.createHmac('sha256', env.JWT_SECRET).update(`${mobile}:${code}`).digest('hex')
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Generate + deliver an OTP. Response is identical whether or not the number has an account (no enumeration). */
export async function sendOtp({ mobile, name, email, ip }) {
  const latest = await OTPVerification.findOne({ mobile }).sort({ createdAt: -1 })
  if (latest) {
    const since = (Date.now() - latest.createdAt.getTime()) / 1000
    if (since < RESEND_COOLDOWN_SEC) throw tooMany(`Please wait ${Math.ceil(RESEND_COOLDOWN_SEC - since)}s before requesting another OTP`, 'OTP_COOLDOWN')
  }
  const hourly = await OTPVerification.countDocuments({ mobile, createdAt: { $gte: new Date(Date.now() - 3600000) } })
  if (hourly >= MAX_SENDS_PER_HOUR) throw tooMany('Too many OTP requests for this number. Try again later.', 'OTP_LIMIT')

  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
  await OTPVerification.updateMany({ mobile, used: false }, { $set: { used: true } }) // invalidate older codes
  const doc = await OTPVerification.create({ mobile, codeHash: hash(mobile, code), expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000), name, email, ip })
  try {
    await sendOtpSms(mobile, code)
  } catch (err) {
    await doc.deleteOne()
    console.error('[otp] delivery failed', err.message)
    throw badRequest('Could not send OTP right now. Please try again shortly.', 'OTP_DELIVERY_FAILED')
  }
  const devMode = (env.isDev || env.isTest) && env.otpProvider === 'dev'
  return { cooldownSeconds: RESEND_COOLDOWN_SEC, expiresInSeconds: OTP_TTL_SEC, ...(devMode ? { devOtp: code } : {}) }
}

/** Verify OTP and return the (created or existing) customer. */
export async function verifyOtp({ mobile, otp, name, email }) {
  const rec = await OTPVerification.findOne({ mobile, used: false }).sort({ createdAt: -1 })
  const invalid = () => badRequest('Invalid or expired OTP', 'OTP_INVALID')
  if (!rec || rec.expiresAt < new Date()) throw invalid()
  if (rec.attempts >= MAX_ATTEMPTS) {
    rec.used = true
    await rec.save()
    throw tooMany('Too many incorrect attempts. Request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED')
  }
  if (!safeEqual(rec.codeHash, hash(mobile, String(otp)))) {
    rec.attempts += 1
    await rec.save()
    throw invalid()
  }
  // Atomically consume to prevent reuse under concurrency.
  const consumed = await OTPVerification.findOneAndUpdate({ _id: rec._id, used: false }, { $set: { used: true } })
  if (!consumed) throw invalid()

  const displayName = (name || rec.name || '').trim()
  let user = await User.findOne({ role: 'CUSTOMER', mobile })
  if (!user) {
    user = await User.create({ role: 'CUSTOMER', mobile, mobileVerified: true, name: displayName || 'Guest', email: email || rec.email || undefined, lastLoginAt: new Date() })
  } else {
    if (!user.active) throw badRequest('This account is disabled. Please contact the restaurant.', 'ACCOUNT_DISABLED')
    user.mobileVerified = true
    if (displayName && (user.name === 'Guest' || !user.name)) user.name = displayName
    if (email && !user.email) user.email = email
    user.lastLoginAt = new Date()
    await user.save()
  }
  return user
}
