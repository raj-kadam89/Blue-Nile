import mongoose from 'mongoose'
import { Reservation, getSettings } from '../../models/index.js'
import { randomCode } from '../../utils/helpers.js'
import { badRequest, conflict, notFound, unprocessable } from '../../utils/errors.js'
import { fromMin, toMin, nowParts, todayStr, localToDate } from '../../utils/time.js'
import { acquireLocks, releaseLocks, allocate, expireDueHolds, validateWindow, slotConflict } from '../seating/seatingService.js'
import { audit } from '../auditService.js'
import { emitStaff } from '../../sockets/emitter.js'
import { notifyReservation } from '../notification/dispatcher.js'
import { serializeReservation } from '../../utils/serializers.js'

export const TRANSITIONS = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED', 'EXPIRED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['SEATED', 'CANCELLED', 'NO_SHOW'],
  SEATED: ['COMPLETED'],
}
const RELEASE_ON = ['COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW', 'EXPIRED']
const REASON_REQUIRED = ['CANCELLED', 'REJECTED', 'NO_SHOW']
const EVENT_FOR = { CONFIRMED: 'BOOKING_CONFIRMED', REJECTED: 'BOOKING_REJECTED', CANCELLED: 'BOOKING_CANCELLED' }

const populate = (q) => q.populate('assignedTables', 'tableNumber area capacity')

export async function loadReservation(id) {
  if (!mongoose.isValidObjectId(id)) throw notFound('Reservation not found')
  const r = await populate(Reservation.findById(id))
  if (!r) throw notFound('Reservation not found')
  return r
}

async function newReference(date) {
  for (let i = 0; i < 8; i++) {
    const ref = `BN-${date.slice(2, 4)}${date.slice(5, 7)}${date.slice(8, 10)}-${randomCode(4)}`
    if (!(await Reservation.exists({ reference: ref }))) return ref
  }
  throw new Error('Could not generate booking reference')
}

const announce = (event, r, extra = {}) => {
  const payload = { reservation: serializeReservation(r, { staff: true }), ...extra }
  emitStaff(event, payload)
  emitStaff('availability:changed', { date: r.reservationDate })
}

/**
 * Create a reservation with atomic table allocation.
 * Overbooking is prevented by unique per-table/per-bucket SlotLock documents.
 */
export async function createReservation(input) {
  const { actor, source = 'ONLINE', guestCount, reservationDate, startTime, specialRequest, occasion, customer } = input
  const settings = await getSettings()
  const b = settings.booking
  if (!Number.isInteger(guestCount) || guestCount < 1) throw badRequest('Guest count must be at least 1', 'INVALID_GUESTS')
  if (source === 'ONLINE' && guestCount > b.maxGuestsPerBooking) throw badRequest(`Maximum ${b.maxGuestsPerBooking} guests per online booking. Please call the restaurant for larger groups.`, 'TOO_MANY_GUESTS')
  let startMin
  if (source === 'ONLINE') startMin = validateWindow(settings, reservationDate, startTime, { strict: true }).start
  else {
    // Staff-created bookings may fall outside the online slot grid / lead time, but never in the past.
    if (reservationDate < todayStr()) throw badRequest('Reservation date is in the past', 'DATE_IN_PAST')
    startMin = toMin(startTime)
  }
  const endMin = Math.min(startMin + b.defaultDiningDuration, 1439)

  await expireDueHolds()

  let tables = null
  const reservationId = new mongoose.Types.ObjectId()
  for (let attempt = 0; attempt < 6 && !tables; attempt++) {
    const choice = await allocate(reservationDate, startMin, endMin, guestCount, settings)
    if (!choice) throw slotConflict()
    if (await acquireLocks(reservationId, choice, reservationDate, startMin, endMin, b.bufferMinutes)) tables = choice
  }
  if (!tables) throw slotConflict()

  let status = input.status
  if (!status) status = b.autoConfirm ? 'CONFIRMED' : 'PENDING'
  const now = new Date()
  try {
    const doc = await Reservation.create({
      _id: reservationId,
      reference: await newReference(reservationDate),
      customerId: customer?._id,
      customerName: input.customerName,
      mobile: input.mobile,
      email: input.email || undefined,
      guestCount, reservationDate, startTime: fromMin(startMin), endTime: fromMin(endMin), startMin, endMin,
      assignedTables: tables.map((t) => t._id),
      status,
      verificationStatus: input.verified ? 'VERIFIED' : 'UNVERIFIED',
      bookingSource: source,
      specialRequest, occasion,
      holdExpiresAt: status === 'PENDING' ? new Date(now.getTime() + b.holdMinutes * 60000) : undefined,
      createdBy: actor?.id,
      confirmedBy: status === 'CONFIRMED' && actor?.id ? actor.id : undefined,
      seatedAt: status === 'SEATED' ? now : undefined,
    })
    const full = await loadReservation(doc._id)
    await audit({ action: 'BOOKING_CREATED', entityType: 'RESERVATION', entityId: doc._id, reference: doc.reference, actor: actor || { name: input.customerName, role: 'CUSTOMER' }, newStatus: status, meta: { source, guestCount } })
    announce('booking:new', full)
    if (source === 'ONLINE') {
      await notifyReservation(status === 'CONFIRMED' ? 'BOOKING_CONFIRMED' : 'BOOKING_RECEIVED', full)
      await notifyReservation('STAFF_NEW_BOOKING', full)
    }
    return full
  } catch (err) {
    await releaseLocks(reservationId)
    throw err
  }
}

export async function changeStatus(id, newStatus, actor, reason) {
  await expireDueHolds()
  const current = await loadReservation(id)
  const prev = current.status
  if (!(TRANSITIONS[prev] || []).includes(newStatus)) throw unprocessable(`Cannot change a ${prev} reservation to ${newStatus}`, 'INVALID_TRANSITION')
  if (REASON_REQUIRED.includes(newStatus) && !(reason && reason.trim())) throw badRequest('A reason is required for this action', 'REASON_REQUIRED')

  const set = { status: newStatus }
  const unset = {}
  const now = new Date()
  if (newStatus === 'CONFIRMED') { set.confirmedBy = actor.id; unset.holdExpiresAt = 1 }
  if (newStatus === 'CHECKED_IN') set.checkedInAt = now
  if (newStatus === 'SEATED') set.seatedAt = now
  if (newStatus === 'COMPLETED') set.completedAt = now
  if (REASON_REQUIRED.includes(newStatus)) set.cancelReason = reason.trim().slice(0, 300)
  if (RELEASE_ON.includes(newStatus)) unset.holdExpiresAt = 1

  const update = { $set: set }
  if (Object.keys(unset).length) update.$unset = unset
  const updated = await Reservation.findOneAndUpdate({ _id: current._id, status: prev }, update, { returnDocument: 'after' })
  if (!updated) throw conflict('Reservation was changed by someone else. Please refresh.', 'STALE_STATE')
  if (RELEASE_ON.includes(newStatus)) await releaseLocks(current._id)

  const full = await loadReservation(current._id)
  await audit({ action: 'STATUS_CHANGED', entityType: 'RESERVATION', entityId: current._id, reference: current.reference, actor, previousStatus: prev, newStatus, reason })
  announce('booking:updated', full, { previousStatus: prev })
  if (EVENT_FOR[newStatus]) await notifyReservation(EVENT_FOR[newStatus], full)
  return full
}

export async function reschedule(id, { reservationDate, startTime, reason }, actor) {
  await expireDueHolds()
  const current = await loadReservation(id)
  if (!['PENDING', 'CONFIRMED'].includes(current.status)) throw unprocessable('Only pending or confirmed reservations can be rescheduled', 'INVALID_TRANSITION')
  const settings = await getSettings()
  const b = settings.booking
  const { start } = validateWindow(settings, reservationDate, startTime, { strict: true, checkLead: false })
  const endMin = Math.min(start + b.defaultDiningDuration, 1439)

  const { SlotLock } = await import('../../models/index.js')
  const oldLocks = await SlotLock.find({ reservationId: current._id }).lean()
  await releaseLocks(current._id)
  let tables = null
  for (let i = 0; i < 4 && !tables; i++) {
    const choice = await allocate(reservationDate, start, endMin, current.guestCount, settings, { excludeId: current._id })
    if (!choice) break
    if (await acquireLocks(current._id, choice, reservationDate, start, endMin, b.bufferMinutes)) tables = choice
  }
  if (!tables) {
    if (oldLocks.length) await SlotLock.insertMany(oldLocks.map(({ _id, ...l }) => l), { ordered: false }).catch(() => {})
    throw slotConflict()
  }
  const prev = { date: current.reservationDate, time: current.startTime }
  current.set({ reservationDate, startTime: fromMin(start), endTime: fromMin(endMin), startMin: start, endMin, assignedTables: tables.map((t) => t._id), reminderSentAt: undefined })
  if (current.status === 'PENDING') current.holdExpiresAt = new Date(Date.now() + b.holdMinutes * 60000)
  await current.save()
  const full = await loadReservation(current._id)
  await audit({ action: 'BOOKING_RESCHEDULED', entityType: 'RESERVATION', entityId: current._id, reference: current.reference, actor, previousStatus: current.status, newStatus: current.status, reason, meta: { from: prev, to: { date: reservationDate, time: full.startTime } } })
  announce('booking:updated', full, { previousStatus: current.status })
  emitStaff('availability:changed', { date: prev.date })
  return full
}

/** Customer-initiated cancellation honouring the configured cutoff. */
export async function customerCancel(reference, customer, reason) {
  const r = await Reservation.findOne({ reference: String(reference).toUpperCase().trim(), customerId: customer.id })
  if (!r) throw notFound('Booking not found', 'BOOKING_NOT_FOUND')
  if (!['PENDING', 'CONFIRMED'].includes(r.status)) throw unprocessable(`A ${r.status.toLowerCase().replace('_', ' ')} booking cannot be cancelled`, 'INVALID_TRANSITION')
  const settings = await getSettings()
  const cutoffMs = settings.booking.cancellationCutoffHours * 3600000
  if (r.status === 'CONFIRMED' && localToDate(r.reservationDate, r.startMin).getTime() - Date.now() < cutoffMs) {
    throw unprocessable(`Online cancellation closes ${settings.booking.cancellationCutoffHours} hour(s) before the reservation. Please call ${settings.restaurant.phone}.`, 'CANCELLATION_WINDOW_CLOSED')
  }
  return changeStatus(r._id, 'CANCELLED', { id: customer.id, name: customer.name, role: 'CUSTOMER' }, reason?.trim() || 'Cancelled by customer')
}

/** Walk-in / phone / manual booking by staff. */
export async function createWalkIn(input, actor) {
  const now = nowParts()
  const seatNow = input.seatNow !== false && !input.reservationDate
  let date = input.reservationDate || now.date
  let time = input.startTime || now.time
  if (seatNow) { date = now.date; time = now.time }
  if (!seatNow && date === now.date && !input.startTime) time = now.time
  return createReservation({
    actor, source: input.source || 'WALK_IN', customerName: input.customerName, mobile: input.mobile || undefined, email: input.email,
    guestCount: input.guestCount, reservationDate: date, startTime: time, specialRequest: input.specialRequest,
    status: seatNow ? 'SEATED' : 'CONFIRMED', verified: false,
  })
}
