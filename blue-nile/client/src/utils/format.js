export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const pad = (n) => String(n).padStart(2, '0')

/** Local YYYY-MM-DD for a Date. */
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Parse YYYY-MM-DD into a local Date (noon, avoids TZ shifts). */
export const parseISODate = (s) => {
  const [y, m, d] = String(s).split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1, 12)
}

export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export const formatDate = (s, opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!s) return ''
  return parseISODate(s).toLocaleDateString('en-IN', opts)
}

/** 'HH:mm' -> '7:30 PM' */
export const formatTime = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return t || ''
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${pad(m)} ${suffix}`
}

export const formatPrice = (p) => {
  if (p === null || p === undefined || p === '' || Number.isNaN(Number(p))) return 'Price on request'
  return `₹${Number(p).toLocaleString('en-IN')}`
}

export const splitParagraphs = (text) =>
  String(text || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)

export const STATUS_INFO = {
  PENDING: { label: 'Awaiting confirmation', tone: 'amber', text: 'Your request has been received and is awaiting confirmation from the restaurant. It is NOT confirmed yet.' },
  CONFIRMED: { label: 'Confirmed', tone: 'green', text: 'Your table is confirmed. We look forward to welcoming you.' },
  CHECKED_IN: { label: 'Checked in', tone: 'green', text: 'You have been checked in. Your table will be ready shortly.' },
  SEATED: { label: 'Seated', tone: 'green', text: 'You are seated. Enjoy your meal.' },
  COMPLETED: { label: 'Completed', tone: 'neutral', text: 'This visit is complete. Thank you for dining with us.' },
  CANCELLED: { label: 'Cancelled', tone: 'red', text: 'This booking was cancelled.' },
  REJECTED: { label: 'Not accepted', tone: 'red', text: 'The restaurant could not accept this request.' },
  NO_SHOW: { label: 'No show', tone: 'red', text: 'This booking was marked as a no-show.' },
  EXPIRED: { label: 'Expired', tone: 'neutral', text: 'This request expired without confirmation.' },
}

export const isValidMobile = (m) => /^[6-9]\d{9}$/.test(m)
