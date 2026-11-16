const TZ = 'Asia/Kolkata'

export const todayStr = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())

export const nowTimeStr = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  return parts.replace(/^24/, '00')
}

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const fmtDate = (s) => {
  if (!s) return '—'
  const d = new Date(String(s).length === 10 ? `${s}T00:00:00Z` : s)
  if (Number.isNaN(d.getTime())) return String(s)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: String(s).length === 10 ? 'UTC' : TZ })
}

export const fmtDateTime = (s) => {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return String(s)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

export const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`
}

export const cleanParams = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v !== null && v !== undefined))

export const STATUS_META = {
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
  CONFIRMED: { label: 'Confirmed', cls: 'bg-sky-100 text-sky-800 ring-sky-200' },
  CHECKED_IN: { label: 'Checked in', cls: 'bg-indigo-100 text-indigo-800 ring-indigo-200' },
  SEATED: { label: 'Seated', cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  COMPLETED: { label: 'Completed', cls: 'bg-stone-200 text-stone-700 ring-stone-300' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-800 ring-rose-200' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800 ring-red-200' },
  NO_SHOW: { label: 'No-show', cls: 'bg-orange-100 text-orange-800 ring-orange-200' },
  EXPIRED: { label: 'Expired', cls: 'bg-zinc-100 text-zinc-600 ring-zinc-200' },
}
export const STATUSES = Object.keys(STATUS_META)
export const STATUS_COLORS = {
  PENDING: '#d97706', CONFIRMED: '#0284c7', CHECKED_IN: '#4f46e5', SEATED: '#059669',
  COMPLETED: '#78716c', CANCELLED: '#e11d48', REJECTED: '#dc2626', NO_SHOW: '#ea580c', EXPIRED: '#a1a1aa',
}
