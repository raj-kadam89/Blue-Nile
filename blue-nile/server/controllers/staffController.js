import { Reservation, AuditLog, CustomerNote, User, getSettings } from '../models/index.js'
import { asyncHandler, ok, badRequest } from '../utils/errors.js'
import { paginate, pageResult, escapeRegex, normalizeMobile } from '../utils/helpers.js'
import { nowParts, toMin, todayStr, isDateStr, isTimeStr } from '../utils/time.js'
import { serializeReservation } from '../utils/serializers.js'
import { bookingFilter, sortFor, statusCounts } from '../services/booking/queryService.js'
import { changeStatus, reschedule as rescheduleSvc, createWalkIn, loadReservation } from '../services/booking/bookingService.js'
import { freeTablesFor, seatSnapshot, expireDueHolds } from '../services/seating/seatingService.js'
import { audit } from '../services/auditService.js'

const actorOf = (req) => ({ id: req.user.id, name: req.user.name, role: req.user.role })
const populate = (q) => q.populate('assignedTables', 'tableNumber area capacity')

export async function occupancyNow() {
  const settings = await getSettings()
  const now = nowParts()
  return seatSnapshot(now.date, now.minutes, settings, settings.booking.slotInterval)
}

export const dashboard = asyncHandler(async (_req, res) => {
  await expireDueHolds()
  const today = todayStr()
  const [pending, todayCount, upcoming, byStatusToday, occupancy, nextArrivals] = await Promise.all([
    Reservation.countDocuments({ status: 'PENDING' }),
    Reservation.countDocuments({ reservationDate: today, status: { $nin: ['EXPIRED'] } }),
    Reservation.countDocuments({ reservationDate: { $gt: today }, status: { $in: ['PENDING', 'CONFIRMED'] } }),
    statusCounts({ reservationDate: today }),
    occupancyNow(),
    populate(Reservation.find({ reservationDate: today, status: { $in: ['CONFIRMED', 'PENDING'] }, endMin: { $gte: nowParts().minutes } }).sort({ startMin: 1 }).limit(8)),
  ])
  ok(res, {
    counts: {
      pending, today: todayCount, upcoming,
      checkedIn: byStatusToday.CHECKED_IN || 0, seated: byStatusToday.SEATED || 0, completed: byStatusToday.COMPLETED || 0,
      cancelled: (byStatusToday.CANCELLED || 0) + (byStatusToday.REJECTED || 0) + (byStatusToday.NO_SHOW || 0),
    },
    nextArrivals: nextArrivals.map((r) => serializeReservation(r, { staff: true })),
    occupancy,
  })
})

export const listBookings = asyncHandler(async (req, res) => {
  await expireDueHolds()
  const q = req.valid.query
  const filter = bookingFilter(q)
  const pg = paginate(q)
  const [items, total] = await Promise.all([
    populate(Reservation.find(filter).sort(sortFor(q.queue)).skip(pg.skip).limit(pg.limit)),
    Reservation.countDocuments(filter),
  ])
  ok(res, pageResult(items.map((r) => serializeReservation(r, { staff: true })), total, pg))
})

export const getBooking = asyncHandler(async (req, res) => {
  const r = await loadReservation(req.params.id)
  const [auditRows, notes, history] = await Promise.all([
    AuditLog.find({ entityType: 'RESERVATION', entityId: r._id }).sort({ createdAt: 1 }).lean(),
    r.customerId ? CustomerNote.find({ customerId: r.customerId }).sort({ createdAt: -1 }).limit(50).lean() : r.mobile ? CustomerNote.find({ mobile: r.mobile }).sort({ createdAt: -1 }).limit(50).lean() : [],
    r.customerId || r.mobile ? statusCounts(r.customerId ? { customerId: r.customerId } : { mobile: r.mobile }) : {},
  ])
  ok(res, {
    reservation: serializeReservation(r, { staff: true }),
    audit: auditRows,
    customerNotes: notes,
    customerHistory: {
      total: Object.values(history).reduce((a, b) => a + b, 0),
      completed: history.COMPLETED || 0,
      noShows: history.NO_SHOW || 0,
      cancelled: (history.CANCELLED || 0) + (history.REJECTED || 0),
    },
  })
})

export const updateStatus = asyncHandler(async (req, res) => {
  const r = await changeStatus(req.params.id, req.body.status, actorOf(req), req.body.reason)
  ok(res, { reservation: serializeReservation(r, { staff: true }) }, `Reservation ${r.status.toLowerCase().replace('_', ' ')}`)
})

export const reschedule = asyncHandler(async (req, res) => {
  const r = await rescheduleSvc(req.params.id, req.body, actorOf(req))
  ok(res, { reservation: serializeReservation(r, { staff: true }) }, 'Reservation rescheduled')
})

export const walkIn = asyncHandler(async (req, res) => {
  const r = await createWalkIn(req.body, actorOf(req))
  ok(res, { reservation: serializeReservation(r, { staff: true }) }, 'Booking created', 201)
})

export const addNote = asyncHandler(async (req, res) => {
  const r = await loadReservation(req.params.id)
  let customerId = r.customerId
  if (!customerId && r.mobile) customerId = (await User.findOne({ role: 'CUSTOMER', mobile: r.mobile }).select('_id'))?._id
  if (!customerId && !r.mobile) throw badRequest('This booking has no mobile number to attach customer notes to', 'NO_CUSTOMER')
  if (!customerId) {
    // Create an unverified customer record for walk-in/phone guests so notes follow them across visits.
    const u = await User.findOneAndUpdate({ role: 'CUSTOMER', mobile: r.mobile }, { $setOnInsert: { role: 'CUSTOMER', mobile: r.mobile, name: r.customerName, mobileVerified: false } }, { upsert: true, returnDocument: 'after' })
    customerId = u._id
  }
  const note = await CustomerNote.create({ customerId, mobile: r.mobile, note: req.body.note, authorId: req.user.id, authorName: req.user.name, reservationId: r._id })
  await audit({ action: 'CUSTOMER_NOTE_ADDED', entityType: 'RESERVATION', entityId: r._id, reference: r.reference, actor: actorOf(req) })
  ok(res, { note }, 'Note added', 201)
})

export const customers = asyncHandler(async (req, res) => {
  const term = String(req.query.q || '').trim()
  const match = { mobile: { $exists: true, $ne: null } }
  if (term) {
    const mob = normalizeMobile(term)
    const rx = new RegExp(escapeRegex(term), 'i')
    match.$or = [{ customerName: rx }, { mobile: mob || rx }]
  }
  const rows = await Reservation.aggregate([
    { $match: match },
    { $sort: { reservationDate: -1 } },
    { $group: { _id: '$mobile', name: { $first: '$customerName' }, email: { $first: '$email' }, customerId: { $first: '$customerId' }, totalBookings: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'NO_SHOW'] }, 1, 0] } }, lastBookingDate: { $first: '$reservationDate' } } },
    { $sort: { lastBookingDate: -1 } },
    { $limit: 50 },
  ])
  ok(res, { items: rows.map((r) => ({ _id: r.customerId || r._id, name: r.name, mobile: r._id, email: r.email, totalBookings: r.totalBookings, noShows: r.noShows, lastBookingDate: r.lastBookingDate })) })
})

export const occupancy = asyncHandler(async (req, res) => {
  const now = nowParts()
  const date = isDateStr(req.query.date || '') ? req.query.date : now.date
  const time = isTimeStr(req.query.time || '') ? req.query.time : now.time
  const settings = await getSettings()
  const start = toMin(time)
  const { tables, occupied } = await freeTablesFor(date, start, start + settings.booking.slotInterval, settings)
  const items = tables.map((t) => {
    const r = occupied.get(String(t._id))
    const status = !r ? 'FREE' : ['SEATED', 'CHECKED_IN'].includes(r.status) ? 'OCCUPIED' : 'RESERVED'
    return { _id: t._id, tableNumber: t.tableNumber, area: t.area, capacity: t.capacity, combinationGroup: t.combinationGroup, status, ...(r ? { reservation: { _id: r._id, reference: r.reference, customerName: r.customerName, guestCount: r.guestCount, startTime: r.startTime, endTime: r.endTime, status: r.status } } : {}) }
  })
  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0)
  const availableSeats = items.filter((t) => t.status === 'FREE').reduce((s, t) => s + t.capacity, 0)
  ok(res, { date, time, totalSeats, availableSeats, occupiedSeats: totalSeats - availableSeats, tables: items })
})
