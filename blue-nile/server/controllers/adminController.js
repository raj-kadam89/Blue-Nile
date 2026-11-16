import bcrypt from 'bcryptjs'
import { stringify } from 'csv-stringify/sync'
import { Reservation, User, StaffProfile, AuditLog, RestaurantSettings, GalleryImage, ContactEnquiry, Notification, DiningTable, getSettings } from '../models/index.js'
import { asyncHandler, ok, notFound, badRequest, conflict } from '../utils/errors.js'
import { paginate, pageResult } from '../utils/helpers.js'
import { todayStr, addDays, nowParts, toMin, isDateStr, isTimeStr } from '../utils/time.js'
import { serializeReservation } from '../utils/serializers.js'
import { bookingFilter, sortFor, statusCounts } from '../services/booking/queryService.js'
import { seatSnapshot, expireDueHolds, syncTotalSeats } from '../services/seating/seatingService.js'
import { audit } from '../services/auditService.js'
import { otpConfigured, whatsappConfigured, emailConfigured } from '../services/notification/providers.js'
import { cloudinaryConfigured } from '../config/cloudinary.js'
import { env } from '../config/env.js'
import { emitStaff } from '../sockets/emitter.js'

const actorOf = (req) => ({ id: req.user.id, name: req.user.name, role: req.user.role })

// ---------------- dashboard & analytics ----------------
export const dashboard = asyncHandler(async (req, res) => {
  await expireDueHolds()
  const settings = await getSettings()
  const now = nowParts()
  const date = isDateStr(req.query.date || '') ? req.query.date : now.date
  const time = isTimeStr(req.query.time || '') ? req.query.time : now.time
  const [all, today, occupancy, slot, tableCount] = await Promise.all([
    statusCounts({}),
    Reservation.countDocuments({ reservationDate: now.date, status: { $ne: 'EXPIRED' } }),
    seatSnapshot(now.date, now.minutes, settings, settings.booking.slotInterval),
    seatSnapshot(date, toMin(time), settings),
    DiningTable.countDocuments({ active: true }),
  ])
  const setupWarnings = []
  if (!tableCount) setupWarnings.push('No dining tables are configured. Online reservations are disabled until you add tables in Seating & Tables.')
  if (!settings.hoursVerified) setupWarnings.push('Opening hours are provisional. Verify them in Website Content → Opening hours before publishing.')
  if (!settings.content?.about?.historyVerified) setupWarnings.push('Restaurant history is hidden until you add and verify it in Website Content → About.')
  if (!otpConfigured()) setupWarnings.push('No OTP provider is configured. Customers cannot verify their mobile numbers in production.')
  ok(res, {
    totals: {
      total: Object.values(all).reduce((a, b) => a + b, 0),
      today,
      pending: all.PENDING || 0,
      confirmed: all.CONFIRMED || 0,
      cancelled: (all.CANCELLED || 0) + (all.REJECTED || 0),
      completed: all.COMPLETED || 0,
      noShow: all.NO_SHOW || 0,
    },
    occupancy: { occupiedSeats: occupancy.occupiedSeats, totalSeats: occupancy.totalSeats, availableSeats: occupancy.availableSeats },
    slot: { date, time, ...slot },
    setupWarnings,
  })
})

export const analytics = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 30))
  const to = todayStr()
  const from = addDays(to, -(days - 1))
  const match = { reservationDate: { $gte: from, $lte: to } }
  const [daily, status, times, guestsAgg, sources, monthly] = await Promise.all([
    Reservation.aggregate([{ $match: match }, { $group: { _id: '$reservationDate', count: { $sum: 1 }, guests: { $sum: '$guestCount' } } }]),
    Reservation.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Reservation.aggregate([{ $match: match }, { $group: { _id: '$startTime', count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Reservation.aggregate([{ $match: match }, { $group: { _id: '$guestCount', count: { $sum: 1 } } }]),
    Reservation.aggregate([{ $match: match }, { $group: { _id: '$bookingSource', count: { $sum: 1 } } }]),
    Reservation.aggregate([{ $match: { reservationDate: { $gte: addDays(to, -364) } } }, { $group: { _id: { $substr: ['$reservationDate', 0, 7] }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
  ])
  const dmap = new Map(daily.map((d) => [d._id, d]))
  const dailySeries = []
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i)
    dailySeries.push({ date: d, count: dmap.get(d)?.count || 0, guests: dmap.get(d)?.guests || 0 })
  }
  // ISO-like weeks starting from `from`
  const weekly = []
  for (let i = 0; i < dailySeries.length; i += 7) {
    const chunk = dailySeries.slice(i, i + 7)
    weekly.push({ week: chunk[0].date, count: chunk.reduce((a, b) => a + b.count, 0) })
  }
  const buckets = [['1–2', 1, 2], ['3–4', 3, 4], ['5–6', 5, 6], ['7–10', 7, 10], ['11+', 11, 1e9]]
  const guestDistribution = buckets.map(([label, lo, hi]) => ({ label, count: guestsAgg.filter((g) => g._id >= lo && g._id <= hi).reduce((a, b) => a + b.count, 0) }))
  const st = Object.fromEntries(status.map((s) => [s._id, s.count]))
  const total = status.reduce((a, b) => a + b.count, 0)
  const lost = (st.CANCELLED || 0) + (st.REJECTED || 0) + (st.NO_SHOW || 0)
  ok(res, {
    range: { from, to, days },
    daily: dailySeries,
    weekly,
    monthly: monthly.map((m) => ({ month: m._id, count: m.count })),
    statusDistribution: status.map((s) => ({ status: s._id, count: s.count })),
    popularTimes: times.map((t) => ({ time: t._id, count: t.count })),
    guestDistribution,
    sourceDistribution: sources.map((s) => ({ source: s._id, count: s.count })),
    cancellation: { total, cancelled: st.CANCELLED || 0, rejected: st.REJECTED || 0, noShow: st.NO_SHOW || 0, expired: st.EXPIRED || 0, rate: total ? Math.round((lost / total) * 1000) / 10 : 0 },
  })
})

// ---------------- bookings ----------------
export const bookings = asyncHandler(async (req, res) => {
  await expireDueHolds()
  const q = req.valid.query
  const filter = bookingFilter(q)
  const populate = (x) => x.populate('assignedTables', 'tableNumber area capacity')
  if (q.format === 'csv') {
    const rows = await populate(Reservation.find(filter).sort({ reservationDate: -1, startMin: -1 }).limit(20000)).lean()
    const csv = stringify(
      rows.map((r) => ({
        Reference: r.reference, Date: r.reservationDate, Start: r.startTime, End: r.endTime, Customer: r.customerName, Mobile: r.mobile || '', Email: r.email || '',
        Guests: r.guestCount, Status: r.status, Source: r.bookingSource, Tables: (r.assignedTables || []).map((t) => t.tableNumber).join(' + '),
        Occasion: r.occasion || '', 'Special request': r.specialRequest || '', 'Cancel reason': r.cancelReason || '', 'Created at': r.createdAt?.toISOString(),
      })),
      { header: true, cast: { string: (v) => (/^[=+\-@]/.test(v) ? `'${v}` : v) } }, // CSV injection guard
    )
    await audit({ action: 'BOOKINGS_EXPORTED', entityType: 'REPORT', actor: actorOf(req), meta: { count: rows.length, filter: q } })
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="blue-nile-bookings-${todayStr()}.csv"`)
    return res.send(`\uFEFF${csv}`)
  }
  const pg = paginate(q)
  const [items, total] = await Promise.all([populate(Reservation.find(filter).sort(sortFor(q.queue)).skip(pg.skip).limit(pg.limit)), Reservation.countDocuments(filter)])
  ok(res, pageResult(items.map((r) => serializeReservation(r, { staff: true })), total, pg))
})

// ---------------- employees ----------------
const employeeDto = (u, p) => ({ _id: u._id, name: u.name, email: u.email, role: u.role, phone: p?.phone || '', designation: p?.designation || '', active: u.active, permissions: { canReschedule: !!p?.permissions?.canReschedule, canCreateWalkIn: p?.permissions?.canCreateWalkIn !== false }, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt })

export const listEmployees = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: 'STAFF' }).sort({ createdAt: -1 }).lean()
  const profiles = await StaffProfile.find({ userId: { $in: users.map((u) => u._id) } }).lean()
  const pmap = new Map(profiles.map((p) => [String(p.userId), p]))
  ok(res, { items: users.map((u) => employeeDto(u, pmap.get(String(u._id)))) })
})

export const createEmployee = asyncHandler(async (req, res) => {
  const b = req.body
  if (await User.exists({ email: b.email, role: { $in: ['OWNER', 'STAFF'] } })) throw conflict('An account with this email already exists', 'DUPLICATE_EMAIL')
  const user = await User.create({ role: 'STAFF', name: b.name, email: b.email, passwordHash: await bcrypt.hash(b.password, 12), active: b.active !== false })
  const profile = await StaffProfile.create({ userId: user._id, phone: b.phone, designation: b.designation || 'Staff', permissions: { canReschedule: !!b.permissions?.canReschedule, canCreateWalkIn: b.permissions?.canCreateWalkIn !== false }, createdBy: req.user.id })
  await audit({ action: 'EMPLOYEE_CREATED', entityType: 'EMPLOYEE', entityId: user._id, actor: actorOf(req), meta: { email: b.email } })
  ok(res, { employee: employeeDto(user, profile) }, 'Staff account created', 201)
})

export const updateEmployee = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'STAFF' }).select('+tokenVersion')
  if (!user) throw notFound('Employee not found')
  const b = req.body
  const changes = []
  if (b.name) { user.name = b.name; changes.push('name') }
  if (b.email && b.email !== user.email) {
    if (await User.exists({ email: b.email, _id: { $ne: user._id }, role: { $in: ['OWNER', 'STAFF'] } })) throw conflict('An account with this email already exists', 'DUPLICATE_EMAIL')
    user.email = b.email; changes.push('email')
  }
  if (b.password) { user.passwordHash = await bcrypt.hash(b.password, 12); user.tokenVersion = (user.tokenVersion || 0) + 1; changes.push('password') }
  if (typeof b.active === 'boolean' && b.active !== user.active) {
    user.active = b.active
    if (!b.active) user.tokenVersion = (user.tokenVersion || 0) + 1 // revoke sessions immediately
    changes.push(b.active ? 'activated' : 'deactivated')
  }
  await user.save()
  const profile = await StaffProfile.findOneAndUpdate(
    { userId: user._id },
    { $set: { ...(b.phone !== undefined ? { phone: b.phone } : {}), ...(b.designation !== undefined ? { designation: b.designation } : {}), ...(b.permissions?.canReschedule !== undefined ? { 'permissions.canReschedule': b.permissions.canReschedule } : {}), ...(b.permissions?.canCreateWalkIn !== undefined ? { 'permissions.canCreateWalkIn': b.permissions.canCreateWalkIn } : {}) } },
    { returnDocument: 'after', upsert: true },
  )
  if (b.permissions) changes.push('permissions')
  await audit({ action: typeof b.active === 'boolean' && changes.includes('deactivated') ? 'EMPLOYEE_DEACTIVATED' : 'EMPLOYEE_UPDATED', entityType: 'EMPLOYEE', entityId: user._id, actor: actorOf(req), meta: { changes } })
  ok(res, { employee: employeeDto(user, profile) }, 'Employee updated')
})

export const employeeActivity = asyncHandler(async (req, res) => {
  const pg = paginate(req.query)
  const filter = { actorId: req.params.id }
  const [items, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), AuditLog.countDocuments(filter)])
  ok(res, pageResult(items, total, pg))
})

// ---------------- audit logs ----------------
export const auditLogs = asyncHandler(async (req, res) => {
  const pg = paginate(req.query)
  const f = {}
  if (req.query.entityType) f.entityType = String(req.query.entityType)
  if (req.query.action) f.action = String(req.query.action)
  if (req.query.actorId && /^[a-f\d]{24}$/i.test(req.query.actorId)) f.actorId = req.query.actorId
  if (req.query.reference) f.reference = String(req.query.reference).toUpperCase()
  const [items, total] = await Promise.all([AuditLog.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), AuditLog.countDocuments(f)])
  ok(res, pageResult(items, total, pg))
})

// ---------------- settings ----------------
export const getAdminSettings = asyncHandler(async (_req, res) => {
  const s = await getSettings()
  ok(res, {
    ...s.toObject(),
    otpStatus: { provider: env.otpProvider || 'none', configured: otpConfigured() },
    integrations: { whatsapp: whatsappConfigured(), email: emailConfigured(), cloudinary: cloudinaryConfigured() },
  })
})

const flatten = (obj, prefix = '', out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out)
    else if (v !== undefined) out[key] = v
  }
  return out
}

export const updateSettings = asyncHandler(async (req, res) => {
  const body = req.body
  if (body.openingHours) {
    for (const h of body.openingHours) if (!h.closed && (!h.open || !h.close || toMin(h.open) >= toMin(h.close))) throw badRequest(`Invalid opening hours for day ${h.day}: close must be after open`, 'INVALID_HOURS')
  }
  const set = flatten(body)
  const updated = await RestaurantSettings.findOneAndUpdate({ key: 'main' }, { $set: set }, { returnDocument: 'after', upsert: true, runValidators: true })
  await audit({ action: 'SETTINGS_UPDATED', entityType: 'SETTINGS', entityId: updated._id, actor: actorOf(req), meta: { fields: Object.keys(set) } })
  emitStaff('availability:changed', { date: null })
  ok(res, updated, 'Settings saved')
})

// ---------------- gallery ----------------
export const listGallery = asyncHandler(async (_req, res) => ok(res, { items: await GalleryImage.find().sort({ order: 1, createdAt: -1 }).lean() }))
export const createGallery = asyncHandler(async (req, res) => {
  const item = await GalleryImage.create(req.body)
  await audit({ action: 'GALLERY_ADDED', entityType: 'GALLERY', entityId: item._id, actor: actorOf(req) })
  ok(res, { item }, 'Image added', 201)
})
export const updateGallery = asyncHandler(async (req, res) => {
  const item = await GalleryImage.findByIdAndUpdate(req.params.id, { $set: req.body }, { returnDocument: 'after', runValidators: true })
  if (!item) throw notFound('Image not found')
  ok(res, { item }, 'Image updated')
})
export const deleteGallery = asyncHandler(async (req, res) => {
  const item = await GalleryImage.findByIdAndDelete(req.params.id)
  if (!item) throw notFound('Image not found')
  await audit({ action: 'GALLERY_REMOVED', entityType: 'GALLERY', entityId: item._id, actor: actorOf(req) })
  ok(res, null, 'Image removed')
})

// ---------------- enquiries & notifications ----------------
export const listEnquiries = asyncHandler(async (req, res) => {
  const pg = paginate(req.query)
  const f = req.query.status ? { status: String(req.query.status) } : {}
  const [items, total] = await Promise.all([ContactEnquiry.find(f).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), ContactEnquiry.countDocuments(f)])
  ok(res, pageResult(items, total, pg))
})
export const updateEnquiry = asyncHandler(async (req, res) => {
  const status = req.body?.status
  if (!['NEW', 'RESOLVED'].includes(status)) throw badRequest('Invalid status')
  const item = await ContactEnquiry.findByIdAndUpdate(req.params.id, { $set: { status } }, { returnDocument: 'after' })
  if (!item) throw notFound('Enquiry not found')
  ok(res, { item })
})
export const listNotifications = asyncHandler(async (req, res) => {
  const pg = paginate(req.query)
  const [items, total] = await Promise.all([Notification.find().sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).lean(), Notification.countDocuments()])
  ok(res, pageResult(items, total, pg))
})

export const recalcSeats = asyncHandler(async (_req, res) => ok(res, { totalSeats: await syncTotalSeats() }))
