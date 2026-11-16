import { Reservation, getSettings } from '../models/index.js'
import { asyncHandler, ok, notFound, forbidden } from '../utils/errors.js'
import { availabilityForDate } from '../services/seating/seatingService.js'
import { createReservation, customerCancel } from '../services/booking/bookingService.js'
import { serializeReservation } from '../utils/serializers.js'

export const availability = asyncHandler(async (req, res) => {
  const { date, guests } = req.valid.query
  ok(res, await availabilityForDate(await getSettings(), date, guests))
})

export const create = asyncHandler(async (req, res) => {
  const u = req.user
  const b = req.body
  // Identity always comes from the verified session (mobile was OTP-verified), never from the body.
  const r = await createReservation({
    actor: { id: u.id, name: u.name, role: 'CUSTOMER' },
    customer: u,
    source: 'ONLINE',
    customerName: b.customerName || u.name,
    mobile: u.mobile,
    email: b.email || u.email,
    guestCount: b.guestCount,
    reservationDate: b.reservationDate,
    startTime: b.startTime,
    specialRequest: b.specialRequest,
    occasion: b.occasion,
    verified: true,
  })
  const data = serializeReservation(r)
  ok(res, { reservation: data, message: data.statusMessage }, undefined, 201)
})

/** IDOR-safe: only the authenticated customer's own bookings can be read. */
export const status = asyncHandler(async (req, res) => {
  const ref = req.valid.query.reference.toUpperCase()
  const r = await Reservation.findOne({ reference: ref, customerId: req.user.id })
  if (!r) throw notFound('No booking with this reference was found for your mobile number', 'BOOKING_NOT_FOUND')
  ok(res, { reservation: serializeReservation(r) })
})

export const mine = asyncHandler(async (req, res) => {
  const items = await Reservation.find({ customerId: req.user.id }).sort({ reservationDate: -1, startMin: -1 }).limit(50)
  ok(res, { items: items.map((r) => serializeReservation(r)) })
})

export const cancel = asyncHandler(async (req, res) => {
  if (req.user.role !== 'CUSTOMER') throw forbidden()
  const r = await customerCancel(req.body.reference, req.user, req.body.reason)
  ok(res, { reservation: serializeReservation(r) }, 'Your reservation has been cancelled')
})
