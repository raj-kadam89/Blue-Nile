const TZ = 'Asia/Kolkata'

export const pad = (n) => String(n).padStart(2, '0')

/** "HH:mm" -> minutes since midnight */
export const toMin = (t) => {
  const [h, m] = String(t).split(':').map(Number)
  return h * 60 + m
}
/** minutes -> "HH:mm" (clamped to 24h for display) */
export const fromMin = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`

export const isDateStr = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
export const isTimeStr = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s)

/** Current restaurant-local date/time parts */
export function nowParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date)
  const g = (t) => parts.find((p) => p.type === t).value
  const hour = g('hour') === '24' ? '00' : g('hour')
  return { date: `${g('year')}-${g('month')}-${g('day')}`, time: `${hour}:${g('minute')}`, minutes: Number(hour) * 60 + Number(g('minute')) }
}

export const todayStr = () => nowParts().date

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** 0 = Sunday .. 6 = Saturday */
export const weekday = (dateStr) => new Date(`${dateStr}T00:00:00Z`).getUTCDay()

export const diffDays = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000)

/** Epoch ms for a restaurant-local date + minutes (IST is a fixed +05:30 offset, no DST) */
export const localToDate = (dateStr, minutes) => new Date(Date.parse(`${dateStr}T00:00:00+05:30`) + minutes * 60000)
