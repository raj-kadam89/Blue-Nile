import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { DiningTable, Reservation, SlotLock, RestaurantSettings, User, StaffProfile } from '../../models/index.js'
import { env } from '../../config/env.js'
import { ACTIVE_STATUSES } from '../../models/Reservation.js'

const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env')
import { nowParts, toMin, fromMin, weekday, addDays, diffDays, pad } from '../../utils/time.js'
import { badRequest, conflict } from '../../utils/errors.js'

export const BUCKET = 15

export const bucketsFor = (startMin, endMin, buffer) => {
  const from = Math.floor(startMin / BUCKET)
  const to = Math.ceil((endMin + buffer) / BUCKET)
  const out = []
  for (let b = from; b < to; b++) out.push(b)
  return out
}

/** Resolve opening hours for a date, honouring holidays / special hours. */
export function dayHours(settings, date) {
  const h = (settings.holidays || []).find((x) => x.date === date)
  if (h) {
    if (h.closed) return { closed: true, reason: h.note || 'Closed on this date' }
    if (h.open && h.close) return { closed: false, open: h.open, close: h.close, note: h.note }
  }
  const d = (settings.openingHours || []).find((x) => x.day === weekday(date))
  if (!d || d.closed || !d.open || !d.close) return { closed: true, reason: 'Closed on this day' }
  return { closed: false, open: d.open, close: d.close }
}

/** Remove locks of reservations whose pending hold lapsed and mark them EXPIRED. */
export async function expireDueHolds() {
  const due = await Reservation.find({ status: 'PENDING', holdExpiresAt: { $lte: new Date() } }).select('_id').lean()
  if (!due.length) return []
  const ids = due.map((d) => d._id)
  const res = await Reservation.updateMany({ _id: { $in: ids }, status: 'PENDING' }, { $set: { status: 'EXPIRED' }, $unset: { holdExpiresAt: 1 } })
  await SlotLock.deleteMany({ reservationId: { $in: ids } })
  return res.modifiedCount ? ids : []
}

export const DEFAULT_TABLES = [
  { tableNumber: '1', area: 'Main Hall', capacity: 2, active: true },
  { tableNumber: '2', area: 'Main Hall', capacity: 2, active: true },
  { tableNumber: '3', area: 'Main Hall', capacity: 4, active: true, combinationGroup: 'MAIN_A' },
  { tableNumber: '4', area: 'Main Hall', capacity: 4, active: true, combinationGroup: 'MAIN_A' },
  { tableNumber: '5', area: 'Main Hall', capacity: 4, active: true },
  { tableNumber: '6', area: 'Family Dining', capacity: 6, active: true, combinationGroup: 'FAMILY_B' },
  { tableNumber: '7', area: 'Family Dining', capacity: 6, active: true, combinationGroup: 'FAMILY_B' },
  { tableNumber: '8', area: 'Family Dining', capacity: 8, active: true },
]

/** Seed starter dining tables if the database has no tables at all yet. */
export async function ensureDefaultTables() {
  const existing = await DiningTable.countDocuments()
  if (existing > 0) return 0
  await DiningTable.insertMany(DEFAULT_TABLES)
  await syncTotalSeats()
  return DEFAULT_TABLES.length
}

/**
 * Ensure an OWNER account (and a starter STAFF account in dev) exists in MongoDB.
 * Reads SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD from .env, or falls back in development to:
 *   Owner -> admin@bluenile.com / Admin@123456
 *   Staff -> staff@bluenile.com / Staff@123456
 */
export async function ensureDefaultAccounts() {
  dotenv.config({ path: rootEnvPath, override: true, quiet: true })
  const seedEmail = (process.env.SEED_OWNER_EMAIL || env.SEED_OWNER_EMAIL || '').toLowerCase().trim()
  const seedPass = process.env.SEED_OWNER_PASSWORD || env.SEED_OWNER_PASSWORD || ''
  const seedName = process.env.SEED_OWNER_NAME || env.SEED_OWNER_NAME || 'Blue Nile Owner'

  // 1. If SEED_OWNER_EMAIL & SEED_OWNER_PASSWORD are set in .env, ensure that exact owner exists with that password
  if (seedEmail && seedPass) {
    const existingSeed = await User.findOne({ email: seedEmail, role: { $in: ['OWNER', 'STAFF'] } }).select('+passwordHash')
    if (!existingSeed) {
      await User.create({
        role: 'OWNER',
        name: seedName,
        email: seedEmail,
        passwordHash: await bcrypt.hash(seedPass, 12),
        active: true,
      })
      console.log(`[auth] Seeded OWNER from .env: ${seedEmail}`)
    } else if (!existingSeed.passwordHash || !(await bcrypt.compare(seedPass, existingSeed.passwordHash))) {
      existingSeed.role = 'OWNER'
      existingSeed.name = seedName
      existingSeed.passwordHash = await bcrypt.hash(seedPass, 12)
      existingSeed.active = true
      existingSeed.failedLoginAttempts = 0
      existingSeed.lockUntil = undefined
      await existingSeed.save()
      console.log(`[auth] Synced OWNER password from .env: ${seedEmail}`)
    }
  }

  // 2. Also ensure the default dev Owner (admin@bluenile.com) exists in development
  if (env.isDev && !(await User.exists({ email: 'admin@bluenile.com' }))) {
    await User.create({
      role: 'OWNER',
      name: 'Blue Nile Owner',
      email: 'admin@bluenile.com',
      passwordHash: await bcrypt.hash('Admin@123456', 12),
      active: true,
    })
    console.log('[auth] Seeded dev OWNER account: admin@bluenile.com')
  }

  // 3. Ensure a starter STAFF account exists in development
  if (env.isDev && !(await User.exists({ role: 'STAFF' }))) {
    const staffUser = await User.create({
      role: 'STAFF',
      name: 'Reception Staff',
      email: 'staff@bluenile.com',
      passwordHash: await bcrypt.hash('Staff@123456', 12),
      active: true,
    })
    await StaffProfile.create({
      userId: staffUser._id,
      designation: 'Front Desk Host',
      permissions: { canReschedule: true, canCreateWalkIn: true },
    })
    console.log('[auth] Seeded STAFF account: staff@bluenile.com')
  }
}

export async function activeTables() {
  return DiningTable.find({ active: true }).sort({ tableNumber: 1 }).lean()
}

/**
 * Map<tableIdString, reservation> of tables occupied/reserved in [startMin, endMin) (+buffer) on `date`.
 * Seated/checked-in parties that overrun their window keep the table until staff completes them.
 */
export async function occupiedTables(date, startMin, endMin, buffer, { excludeId } = {}) {
  const now = nowParts()
  const q = { reservationDate: date, status: { $in: ACTIVE_STATUSES } }
  if (excludeId) q._id = { $ne: excludeId }
  const list = await Reservation.find(q).lean()
  const map = new Map()
  for (const r of list) {
    if (r.status === 'PENDING' && r.holdExpiresAt && r.holdExpiresAt < new Date()) continue
    let rEnd = r.endMin
    if ((r.status === 'SEATED' || r.status === 'CHECKED_IN') && date === now.date) rEnd = Math.max(rEnd, now.minutes)
    if (r.startMin < endMin + buffer && startMin < rEnd + buffer) {
      for (const t of r.assignedTables) map.set(String(t), r)
    }
  }
  return map
}

/** Choose tables for a party: smallest single table that fits, else a configured combination group. */
export function chooseTables(freeTables, guests) {
  const single = freeTables.filter((t) => t.capacity >= guests).sort((a, b) => a.capacity - b.capacity || a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }))[0]
  if (single) return [single]
  const groups = new Map()
  for (const t of freeTables) if (t.combinationGroup) (groups.get(t.combinationGroup) || groups.set(t.combinationGroup, []).get(t.combinationGroup)).push(t)
  let best = null
  for (const members of groups.values()) {
    const total = members.reduce((s, t) => s + t.capacity, 0)
    if (total < guests) continue
    if (!best || total < best.total) best = { total, members }
  }
  if (!best) return null
  const sorted = [...best.members].sort((a, b) => b.capacity - a.capacity)
  const chosen = []
  let sum = 0
  for (const t of sorted) { chosen.push(t); sum += t.capacity; if (sum >= guests) break }
  return chosen
}

export async function freeTablesFor(date, startMin, endMin, settings, opts = {}) {
  const [tables, occ] = await Promise.all([activeTables(), occupiedTables(date, startMin, endMin, settings.booking.bufferMinutes, opts)])
  const free = tables.filter((t) => !occ.has(String(t._id)))
  return { tables, free, occupied: occ }
}

export async function allocate(date, startMin, endMin, guests, settings, opts = {}) {
  const { free } = await freeTablesFor(date, startMin, endMin, settings, opts)
  return chooseTables(free, guests)
}

/** Atomically claim table time-buckets. Returns true on success, false if any bucket already taken. */
export async function acquireLocks(reservationId, tables, date, startMin, endMin, buffer) {
  const buckets = bucketsFor(startMin, endMin, buffer)
  const docs = []
  for (const t of tables) for (const b of buckets) docs.push({ tableId: t._id, date, bucket: b, reservationId })
  try {
    await SlotLock.insertMany(docs, { ordered: true })
    return true
  } catch (err) {
    await SlotLock.deleteMany({ reservationId })
    if (err.code === 11000 || err.writeErrors || err.name === 'MongoBulkWriteError') return false
    throw err
  }
}
export const releaseLocks = (reservationId) => SlotLock.deleteMany({ reservationId })

export async function syncTotalSeats() {
  const [r] = await DiningTable.aggregate([{ $match: { active: true } }, { $group: { _id: null, seats: { $sum: '$capacity' } } }])
  await RestaurantSettings.updateOne({ key: 'main' }, { $set: { totalSeats: r?.seats || 0 } })
  return r?.seats || 0
}

export const totalSeats = async () => {
  const [r] = await DiningTable.aggregate([{ $match: { active: true } }, { $group: { _id: null, seats: { $sum: '$capacity' } } }])
  return r?.seats || 0
}

/** Seats available for a specific interval (sum capacity of free tables). */
export async function seatSnapshot(date, startMin, settings, durationMin) {
  const endMin = Math.min(startMin + (durationMin || settings.booking.defaultDiningDuration), 1439)
  const { tables, free } = await freeTablesFor(date, startMin, endMin, settings)
  const total = tables.reduce((s, t) => s + t.capacity, 0)
  const available = free.reduce((s, t) => s + t.capacity, 0)
  return { totalSeats: total, availableSeats: available, occupiedSeats: total - available }
}

/** Validate that a date/time falls inside booking rules. */
export function validateWindow(settings, date, startTime, { strict = true, checkLead = true, now = nowParts() } = {}) {
  const b = settings.booking
  const diff = diffDays(date, now.date)
  if (diff < 0) throw badRequest('Reservation date is in the past', 'DATE_IN_PAST')
  if (diff > b.advanceBookingDays) throw badRequest(`Bookings open up to ${b.advanceBookingDays} days in advance`, 'DATE_TOO_FAR')
  const hours = dayHours(settings, date)
  if (hours.closed) throw badRequest(hours.reason || 'The restaurant is closed on this date', 'RESTAURANT_CLOSED')
  const start = toMin(startTime)
  const open = toMin(hours.open)
  const close = toMin(hours.close)
  if (start < open || start > close - b.slotInterval) throw badRequest('Selected time is outside opening hours', 'OUTSIDE_HOURS')
  if (strict && (start - open) % b.slotInterval !== 0) throw badRequest('Selected time is not a valid slot', 'INVALID_SLOT')
  if (checkLead && diff === 0 && start < now.minutes + b.minLeadMinutes) throw badRequest('That time is too soon to book online. Please call the restaurant.', 'TOO_SOON')
  return { start, open, close }
}

export async function availabilityForDate(settings, date, guests) {
  await expireDueHolds()
  const b = settings.booking
  const now = nowParts()
  const diff = diffDays(date, now.date)
  const base = { date, settings: { slotInterval: b.slotInterval, defaultDiningDuration: b.defaultDiningDuration } }
  if (diff < 0 || diff > b.advanceBookingDays) return { ...base, open: false, reason: diff < 0 ? 'Date is in the past' : `Bookings open up to ${b.advanceBookingDays} days ahead`, slots: [] }
  const hours = dayHours(settings, date)
  if (hours.closed) return { ...base, open: false, reason: hours.reason, slots: [] }
  let tables = await activeTables()
  if (!tables.length && (await DiningTable.countDocuments()) === 0) {
    await ensureDefaultTables()
    tables = await activeTables()
  }
  if (!tables.length) return { ...base, open: false, reason: 'Online seating is not configured yet', slots: [] }
  const open = toMin(hours.open)
  const close = toMin(hours.close)
  const slots = []
  const guestsOk = guests && guests <= b.maxGuestsPerBooking
  const reservations = await Reservation.find({ reservationDate: date, status: { $in: ACTIVE_STATUSES } }).lean()
  for (let s = open; s <= close - b.slotInterval; s += b.slotInterval) {
    const end = Math.min(s + b.defaultDiningDuration, 1439)
    const taken = new Set()
    for (const r of reservations) {
      if (r.status === 'PENDING' && r.holdExpiresAt && r.holdExpiresAt < new Date()) continue
      let rEnd = r.endMin
      if ((r.status === 'SEATED' || r.status === 'CHECKED_IN') && date === now.date) rEnd = Math.max(rEnd, now.minutes)
      if (r.startMin < end + b.bufferMinutes && s < rEnd + b.bufferMinutes) r.assignedTables.forEach((t) => taken.add(String(t)))
    }
    const free = tables.filter((t) => !taken.has(String(t._id)))
    const availableSeats = free.reduce((a, t) => a + t.capacity, 0)
    let available = true
    let reason
    if (diff === 0 && s < now.minutes + b.minLeadMinutes) { available = false; reason = 'Too soon to book online' }
    else if (guests && !guestsOk) { available = false; reason = `Maximum ${b.maxGuestsPerBooking} guests per booking` }
    else if (guests && !chooseTables(free, guests)) { available = false; reason = availableSeats > 0 ? 'No table combination fits your party' : 'Fully booked' }
    else if (!guests && availableSeats === 0) { available = false; reason = 'Fully booked' }
    slots.push({ time: fromMin(s), endTime: fromMin(end), availableSeats, available, ...(reason ? { reason } : {}) })
  }
  return { ...base, open: true, slots }
}

export const slotConflict = () => conflict('That time slot was just taken. Please choose another time.', 'SLOT_UNAVAILABLE')
export { pad, addDays }
