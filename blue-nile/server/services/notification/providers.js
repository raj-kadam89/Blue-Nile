import { env } from '../../config/env.js'
import { e164 } from '../../utils/helpers.js'

const postJson = async (url, body, headers = {}) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
  const text = await res.text()
  let json = {}
  try { json = JSON.parse(text) } catch { /* non-json */ }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  return json
}

export const whatsappConfigured = () => Boolean(env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID)
export const emailConfigured = () => Boolean(env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM)
export const otpConfigured = () => (env.otpProvider === 'msg91' ? Boolean(env.OTP_API_KEY && env.OTP_TEMPLATE_ID) : env.otpProvider === 'dev' && !env.isProd)

/** WhatsApp Business Cloud API. If WHATSAPP_TEMPLATE_<EVENT> is set, an approved template is used (required outside the 24h window). */
export async function sendWhatsApp({ to, body, event }) {
  const digits = String(to).replace(/\D/g, '')
  const phone = digits.length === 10 ? e164(digits) : digits
  const template = process.env[`WHATSAPP_TEMPLATE_${event}`]
  const payload = template
    ? { messaging_product: 'whatsapp', to: phone, type: 'template', template: { name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: body.slice(0, 1000) }] }] } }
    : { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }
  const json = await postJson(`https://graph.facebook.com/v20.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, payload, { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` })
  return json.messages?.[0]?.id
}

/** Transactional email via Resend (swap provider here if needed). */
export async function sendEmail({ to, subject, body }) {
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#171717">${body.split('\n').map((l) => `<p style="margin:0 0 8px">${l.replace(/</g, '&lt;')}</p>`).join('')}</div>`
  const json = await postJson('https://api.resend.com/emails', { from: env.EMAIL_FROM, to: [to], subject, text: body, html }, { Authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}` })
  return json.id
}

/** OTP delivery. The "dev" provider only works when NODE_ENV=development. */
export async function sendOtpSms(mobile, otp) {
  if (env.otpProvider === 'dev') {
    if (env.isProd) throw new Error('Development OTP provider is disabled in production')
    if (!env.isTest) console.log(`[otp:dev] OTP for ${mobile}: ${otp}`)
    return { dev: true }
  }
  if (env.otpProvider === 'msg91') {
    if (!otpConfigured()) throw new Error('MSG91 is not configured')
    const qs = new URLSearchParams({ template_id: env.OTP_TEMPLATE_ID, mobile: e164(mobile), authkey: env.OTP_API_KEY, otp })
    if (env.OTP_SENDER_ID) qs.set('sender', env.OTP_SENDER_ID)
    await postJson(`https://control.msg91.com/api/v5/otp?${qs}`, {})
    return { dev: false }
  }
  throw new Error('No OTP provider configured')
}
