import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startDb, stopDb, resetDb, loginCustomer, loginStaff, seedTables, tomorrow, M } from './helpers.js'
import { addDays } from '../utils/time.js'
import { runHoldExpiry } from '../jobs/index.js'

let app
beforeAll(async () => { app = await startDb() })
afterAll(stopDb)
beforeEach(async () => { await resetDb(); await seedTables() }) // T1=4, T2=4, T3=2 => 10 seats

const slotSeats = async (c, date, time) => {
  const r = await c.get(`/api/reservations/availability?date=${date}`)
  return r.body.data.slots.find((s) => s.time === time)?.availableSeats
}
const book = (c, body) => c.post('/api/reservations', { guestCount: 2, reservationDate: tomorrow(), startTime: '19:00', ...body })

describe('Availability & booking', () => {
  it('creates a PENDING booking with allocated table and reference', async () => {
    const c = await loginCustomer(app)
    const r = await book(c, { guestCount: 4, specialRequest: 'Birthday', occasion: 'Birthday' })
    expect(r.status).toBe(201)
    expect(r.body.data.reservation.status).toBe('PENDING')
    expect(r.body.data.reservation.reference).toMatch(/^BN-\d{6}-[A-Z0-9]{4}$/)
    expect(r.body.data.message).toMatch(/not confirmed/i)
    const doc = await M.Reservation.findOne({ reference: r.body.data.reservation.reference })
    expect(doc.assignedTables).toHaveLength(1)
    expect(doc.mobile).toBe('9876543210')
    expect(doc.verificationStatus).toBe('VERIFIED')
  })

  it('reduces availability per slot only, not for other dates', async () => {
    const c = await loginCustomer(app)
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(10)
    await book(c, { guestCount: 4 })
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(6)
    await book(c, { guestCount: 2 })
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(4)
    // Overlapping slot (19:30) is also reduced; a non-overlapping slot (22:00) is not.
    expect(await slotSeats(c, tomorrow(), '19:30')).toBe(4)
    expect(await slotSeats(c, tomorrow(), '22:00')).toBe(10)
    expect(await slotSeats(c, addDays(tomorrow(), 1), '19:00')).toBe(10)
  })

  it('rejects invalid bookings', async () => {
    const c = await loginCustomer(app)
    expect((await book(c, { reservationDate: addDays(tomorrow(), -3) })).status).toBe(400)
    expect((await book(c, { guestCount: 50 })).status).toBe(400)
    expect((await book(c, { startTime: '03:00' })).status).toBe(400)
    expect((await book(c, { startTime: '19:07' })).status).toBe(400)
    expect((await book(c, { reservationDate: addDays(tomorrow(), 400) })).status).toBe(400)
  })

  it('requires an OTP-verified customer session to book', async () => {
    const s = await loginStaff(app)
    expect((await book(s, {})).status).toBe(403)
  })

  it('returns 409 when the slot is full (booking conflict)', async () => {
    const c = await loginCustomer(app)
    await book(c, { guestCount: 4 })
    await book(c, { guestCount: 4 })
    await book(c, { guestCount: 2 })
    const r = await book(c, { guestCount: 2 })
    expect(r.status).toBe(409)
    expect(r.body.error.code).toBe('SLOT_UNAVAILABLE')
  })

  it('uses configured table combinations for large parties', async () => {
    await M.DiningTable.updateMany({ tableNumber: { $in: ['T1', 'T2'] } }, { $set: { combinationGroup: 'A' } })
    const c = await loginCustomer(app)
    const r = await book(c, { guestCount: 7 })
    expect(r.status).toBe(201)
    const doc = await M.Reservation.findOne({ reference: r.body.data.reservation.reference })
    expect(doc.assignedTables).toHaveLength(2)
  })

  it('never overbooks under concurrent requests', async () => {
    const customers = await Promise.all(Array.from({ length: 8 }, (_, i) => loginCustomer(app, `98765432${String(10 + i)}`)))
    const results = await Promise.all(customers.map((c) => book(c, { guestCount: 4 })))
    const okCount = results.filter((r) => r.status === 201).length
    expect(okCount).toBe(2) // only two 4-seat tables exist
    expect(results.filter((r) => r.status === 409).length).toBe(6)
    const locks = await M.SlotLock.aggregate([{ $group: { _id: { t: '$tableId', b: '$bucket' }, n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])
    expect(locks).toHaveLength(0)
  })

  it('releases expired pending holds automatically', async () => {
    const c = await loginCustomer(app)
    const r = await book(c, { guestCount: 4 })
    await M.Reservation.updateOne({ reference: r.body.data.reservation.reference }, { $set: { holdExpiresAt: new Date(Date.now() - 1000) } })
    expect(await runHoldExpiry()).toBe(1)
    expect((await M.Reservation.findOne({ reference: r.body.data.reservation.reference })).status).toBe('EXPIRED')
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(10)
  })

  it('protects booking status from other customers (IDOR)', async () => {
    const a = await loginCustomer(app, '9876543210')
    const b = await loginCustomer(app, '9123456780')
    const ref = (await book(a, {})).body.data.reservation.reference
    expect((await a.get(`/api/reservations/status?reference=${ref}`)).status).toBe(200)
    expect((await b.get(`/api/reservations/status?reference=${ref}`)).status).toBe(404)
    expect((await b.post('/api/reservations/cancel', { reference: ref })).status).toBe(404)
  })

  it('lets a customer cancel, releasing capacity', async () => {
    const c = await loginCustomer(app)
    const ref = (await book(c, { guestCount: 4 })).body.data.reservation.reference
    const r = await c.post('/api/reservations/cancel', { reference: ref, reason: 'Plans changed' })
    expect(r.status).toBe(200)
    expect(r.body.data.reservation.status).toBe('CANCELLED')
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(10)
  })
})

describe('Staff lifecycle', () => {
  it('confirms, checks in, seats and completes (releasing tables) with audit trail', async () => {
    const c = await loginCustomer(app)
    const id = (await book(c, { guestCount: 4 })).body.data.reservation._id
    const s = await loginStaff(app)
    for (const status of ['CONFIRMED', 'CHECKED_IN', 'SEATED']) {
      const r = await s.patch(`/api/staff/bookings/${id}/status`, { status })
      expect(r.status).toBe(200)
      expect(r.body.data.reservation.status).toBe(status)
    }
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(6) // seated: still occupied
    expect((await s.patch(`/api/staff/bookings/${id}/status`, { status: 'COMPLETED' })).status).toBe(200)
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(10)
    const detail = await s.get(`/api/staff/bookings/${id}`)
    expect(detail.body.data.audit.map((a) => a.newStatus)).toEqual(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'SEATED', 'COMPLETED'])
    expect(detail.body.data.audit[1].actorRole).toBe('STAFF')
  })

  it('rejects invalid transitions and requires reasons for cancel/reject/no-show', async () => {
    const c = await loginCustomer(app)
    const id = (await book(c, {})).body.data.reservation._id
    const s = await loginStaff(app)
    expect((await s.patch(`/api/staff/bookings/${id}/status`, { status: 'SEATED' })).status).toBe(422)
    expect((await s.patch(`/api/staff/bookings/${id}/status`, { status: 'REJECTED' })).status).toBe(400)
    const r = await s.patch(`/api/staff/bookings/${id}/status`, { status: 'REJECTED', reason: 'Private event' })
    expect(r.body.data.reservation.cancelReason).toBe('Private event')
  })

  it('records no-shows and releases capacity', async () => {
    const c = await loginCustomer(app)
    const id = (await book(c, { guestCount: 4 })).body.data.reservation._id
    const s = await loginStaff(app)
    await s.patch(`/api/staff/bookings/${id}/status`, { status: 'CONFIRMED' })
    const r = await s.patch(`/api/staff/bookings/${id}/status`, { status: 'NO_SHOW', reason: 'Did not arrive' })
    expect(r.body.data.reservation.status).toBe('NO_SHOW')
    expect(await slotSeats(c, tomorrow(), '19:00')).toBe(10)
  })

  it('creates walk-in bookings seated immediately when tables are free', async () => {
    const s = await loginStaff(app)
    const r = await s.post('/api/staff/walk-in', { customerName: 'Walk-in Guest', guestCount: 2, seatNow: true })
    expect(r.status).toBe(201)
    expect(r.body.data.reservation.status).toBe('SEATED')
    expect(r.body.data.reservation.bookingSource).toBe('WALK_IN')
    expect(r.body.data.reservation.assignedTables[0].tableNumber).toBe('T3')
  })

  it('blocks rescheduling for staff without permission, allows for owner', async () => {
    const c = await loginCustomer(app)
    const id = (await book(c, {})).body.data.reservation._id
    const s = await loginStaff(app)
    expect((await s.patch(`/api/staff/bookings/${id}/reschedule`, { reservationDate: tomorrow(), startTime: '20:00' })).status).toBe(403)
    const o = await loginStaff(app, 'OWNER')
    const r = await o.patch(`/api/staff/bookings/${id}/reschedule`, { reservationDate: tomorrow(), startTime: '20:00' })
    expect(r.status).toBe(200)
    expect(r.body.data.reservation.startTime).toBe('20:00')
  })

  it('exports CSV reports for the owner', async () => {
    const c = await loginCustomer(app)
    await book(c, {})
    const o = await loginStaff(app, 'OWNER')
    const r = await o.get('/api/admin/bookings?format=csv')
    expect(r.status).toBe(200)
    expect(r.headers['content-type']).toMatch(/text\/csv/)
    expect(r.text).toContain('Reference')
  })
})
