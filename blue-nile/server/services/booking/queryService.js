import { Reservation } from '../../models/index.js'
import { ACTIVE_STATUSES, STATUSES } from '../../models/Reservation.js'
import { escapeRegex, normalizeMobile } from '../../utils/helpers.js'
import { todayStr } from '../../utils/time.js'

/** Build a Mongo filter for staff/owner booking lists from validated query params. */
export function bookingFilter(q = {}) {
  const today = todayStr()
  const f = {}
  switch (q.queue) {
    case 'new': f.status = 'PENDING'; break
    case 'today': f.reservationDate = today; f.status = { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'SEATED'] }; break
    case 'upcoming': f.reservationDate = { $gt: today }; f.status = { $in: ['PENDING', 'CONFIRMED'] }; break
    case 'checked-in': f.status = 'CHECKED_IN'; break
    case 'seated': f.status = 'SEATED'; break
    case 'completed': f.status = 'COMPLETED'; break
    case 'cancelled': f.status = { $in: ['CANCELLED', 'REJECTED', 'NO_SHOW', 'EXPIRED'] }; break
    default: break
  }
  if (q.status) {
    const list = q.status.split(',').map((s) => s.trim().toUpperCase()).filter((s) => STATUSES.includes(s))
    if (list.length) f.status = { $in: list }
  }
  if (q.date) f.reservationDate = q.date
  else if (q.from || q.to) f.reservationDate = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lte: q.to } : {}) }
  if (q.source) f.bookingSource = q.source.toUpperCase()
  if (q.q) {
    const term = q.q.trim()
    const mob = normalizeMobile(term)
    const rx = new RegExp(escapeRegex(term), 'i')
    f.$or = [{ customerName: rx }, { reference: rx }, { mobile: mob || rx }]
  }
  return f
}

export const sortFor = (queue) => (['today', 'upcoming', 'new', 'checked-in', 'seated'].includes(queue) ? { reservationDate: 1, startMin: 1 } : { reservationDate: -1, startMin: -1 })

export async function statusCounts(match = {}) {
  const rows = await Reservation.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }])
  return Object.fromEntries(rows.map((r) => [r._id, r.count]))
}

export { ACTIVE_STATUSES }
