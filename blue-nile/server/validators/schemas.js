import { z } from 'zod'
import { normalizeMobile } from '../utils/helpers.js'
import { isDateStr, isTimeStr } from '../utils/time.js'

const xssSafe = (s) => s.replace(/[<>]/g, '')
export const text = (max) => z.string().trim().max(max).transform(xssSafe)
const optText = (max) => text(max).optional().or(z.literal('').transform(() => undefined))
export const mobile = z.string().transform((v, ctx) => {
  const m = normalizeMobile(v)
  if (!m) { ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit Indian mobile number' }); return z.NEVER }
  return m
})
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(160)
const optEmail = email.optional().or(z.literal('').transform(() => undefined))
export const date = z.string().refine(isDateStr, 'Date must be YYYY-MM-DD')
export const time = z.string().refine(isTimeStr, 'Time must be HH:mm')
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
const guests = z.coerce.number().int().min(1).max(100)

// ---------- auth ----------
export const sendOtpSchema = z.object({ mobile, name: optText(100), email: optEmail })
export const verifyOtpSchema = z.object({ mobile, otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'), name: optText(100), email: optEmail })
export const staffLoginSchema = z.object({ email, password: z.string().min(1).max(200) })

// ---------- reservations ----------
export const availabilityQuery = z.object({ date, guests: guests.optional() })
export const createReservationSchema = z.object({
  guestCount: guests,
  reservationDate: date,
  startTime: time,
  specialRequest: optText(500),
  occasion: optText(40),
  customerName: optText(100),
  email: optEmail,
})
export const statusQuery = z.object({ reference: z.string().trim().min(4).max(30) })
export const cancelSchema = z.object({ reference: z.string().trim().min(4).max(30), reason: optText(300) })

// ---------- staff ----------
export const STATUS_TARGETS = ['CONFIRMED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'SEATED', 'COMPLETED', 'NO_SHOW']
export const statusChangeSchema = z.object({ status: z.enum(STATUS_TARGETS), reason: optText(300) })
export const rescheduleSchema = z.object({ reservationDate: date, startTime: time, reason: optText(300) })
export const walkInSchema = z.object({
  customerName: text(100).pipe(z.string().min(1, 'Name is required')),
  mobile: mobile.optional().or(z.literal('').transform(() => undefined)),
  email: optEmail,
  guestCount: guests,
  specialRequest: optText(500),
  seatNow: z.boolean().optional(),
  reservationDate: date.optional().or(z.literal('').transform(() => undefined)),
  startTime: time.optional().or(z.literal('').transform(() => undefined)),
  source: z.enum(['WALK_IN', 'PHONE', 'MANUAL']).optional(),
})
export const noteSchema = z.object({ note: text(1000).pipe(z.string().min(1, 'Note is required')) })
export const bookingListQuery = z.object({
  queue: z.enum(['new', 'today', 'upcoming', 'checked-in', 'seated', 'completed', 'cancelled', 'all']).optional(),
  status: z.string().optional(),
  date: date.optional(),
  from: date.optional(),
  to: date.optional(),
  q: z.string().trim().max(80).optional(),
  source: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  format: z.enum(['json', 'csv']).optional(),
})

// ---------- tables ----------
export const tableSchema = z.object({
  tableNumber: text(20).pipe(z.string().min(1)),
  area: optText(60),
  capacity: z.coerce.number().int().min(1).max(100),
  active: z.boolean().optional(),
  combinationGroup: optText(40),
})

// ---------- menu ----------
export const categorySchema = z.object({ name: text(60).pipe(z.string().min(1)), description: optText(300), order: z.coerce.number().int().optional(), active: z.boolean().optional() })
export const menuItemSchema = z.object({
  name: text(100).pipe(z.string().min(1)),
  description: optText(600),
  price: z.union([z.coerce.number().min(0).max(100000), z.null()]).optional(),
  isVeg: z.boolean().optional(),
  available: z.boolean().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  image: z.string().trim().max(500).optional(),
  category: objectId,
})

// ---------- employees ----------
const permissions = z.object({ canReschedule: z.boolean().optional(), canCreateWalkIn: z.boolean().optional() }).optional()
const password = z.string().min(8, 'Password must be at least 8 characters').max(128)
export const employeeCreateSchema = z.object({ name: text(100).pipe(z.string().min(1)), email, phone: optText(20), designation: optText(80), password, permissions, active: z.boolean().optional() })
export const employeeUpdateSchema = z.object({ name: text(100).optional(), email: email.optional(), phone: optText(20), designation: optText(80), password: password.optional().or(z.literal('').transform(() => undefined)), permissions, active: z.boolean().optional() })

// ---------- public ----------
export const contactSchema = z.object({ name: text(100).pipe(z.string().min(1, 'Name is required')), mobile: mobile.optional().or(z.literal('').transform(() => undefined)), email: optEmail, message: text(2000).pipe(z.string().min(5, 'Message is too short')) })

export const gallerySchema = z.object({
  url: z.string().trim().max(500).pipe(z.string().min(1)),
  caption: optText(200),
  category: z.enum(['FOOD', 'INTERIOR', 'ATMOSPHERE', 'CUSTOMER']).optional(),
  order: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
})

// ---------- settings (partial; only provided sections are changed) ----------
const hhmm = time
const settingsRestaurant = z.object({
  name: text(100), tagline: text(200), cuisine: text(120), address: text(300), phone: text(30), whatsapp: text(20), email: z.string().trim().max(160),
  mapsUrl: z.string().trim().max(500), mapsEmbedUrl: z.string().trim().max(1000), googleRating: z.coerce.number().min(0).max(5), googleReviewCount: z.coerce.number().int().min(0), averageSpend: text(100),
}).partial()
export const settingsSchema = z.object({
  restaurant: settingsRestaurant.optional(),
  openingHours: z.array(z.object({ day: z.number().int().min(0).max(6), open: hhmm.optional().or(z.literal('')), close: hhmm.optional().or(z.literal('')), closed: z.boolean().optional() })).max(7).optional(),
  hoursVerified: z.boolean().optional(),
  holidays: z.array(z.object({ date, closed: z.boolean().optional(), open: hhmm.optional().or(z.literal('')), close: hhmm.optional().or(z.literal('')), note: optText(120) })).max(200).optional(),
  booking: z.object({
    slotInterval: z.coerce.number().int().min(5).max(240), defaultDiningDuration: z.coerce.number().int().min(15).max(480), bufferMinutes: z.coerce.number().int().min(0).max(120),
    maxGuestsPerBooking: z.coerce.number().int().min(1).max(100), advanceBookingDays: z.coerce.number().int().min(1).max(365), minLeadMinutes: z.coerce.number().int().min(0).max(2880),
    holdMinutes: z.coerce.number().int().min(5).max(10080), autoConfirm: z.boolean(), cancellationCutoffHours: z.coerce.number().min(0).max(168),
  }).partial().optional(),
  content: z.object({
    home: z.object({ heroHeadline: text(200), heroSubtext: text(400), intro: text(3000), heroImage: z.string().max(500), introImage: z.string().max(500), whyDine: z.array(z.object({ title: text(80), text: text(400) })).max(12), signatureItemIds: z.array(objectId).max(12) }).partial().optional(),
    about: z.object({ story: text(8000), philosophy: text(4000), experience: text(4000), historyVerified: z.boolean(), images: z.array(z.string().max(500)).max(20) }).partial().optional(),
    faq: z.array(z.object({ q: text(300), a: text(2000) })).max(50).optional(),
    policies: z.object({ privacy: text(20000), terms: text(20000), cancellation: text(5000), noShow: text(5000) }).partial().optional(),
    testimonials: z.array(z.object({ name: text(80), text: text(1000), rating: z.coerce.number().min(1).max(5).optional(), source: optText(80) })).max(30).optional(),
  }).optional(),
  notificationPrefs: z.object({ whatsappEnabled: z.boolean(), emailEnabled: z.boolean(), staffAlertNumber: z.string().trim().max(20), staffAlertEmail: z.string().trim().max(160), reminderHoursBefore: z.coerce.number().min(0).max(48) }).partial().optional(),
})
