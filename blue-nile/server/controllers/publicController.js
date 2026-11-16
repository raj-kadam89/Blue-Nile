import { GalleryImage, ContactEnquiry, getSettings } from '../models/index.js'
import { asyncHandler, ok } from '../utils/errors.js'
import { storeImage } from '../middleware/upload.js'
import { audit } from '../services/auditService.js'
import { totalSeats } from '../services/seating/seatingService.js'

/** Public, non-sensitive subset of settings. */
export const publicSettings = asyncHandler(async (_req, res) => {
  const s = (await getSettings()).toObject()
  const b = s.booking
  const about = s.content.about
  res.set('Cache-Control', 'public, max-age=60')
  ok(res, {
    restaurant: s.restaurant,
    openingHours: s.openingHours,
    hoursVerified: s.hoursVerified,
    holidays: (s.holidays || []).filter((h) => h.date >= new Date().toISOString().slice(0, 10)),
    booking: { slotInterval: b.slotInterval, defaultDiningDuration: b.defaultDiningDuration, maxGuestsPerBooking: b.maxGuestsPerBooking, advanceBookingDays: b.advanceBookingDays, cancellationCutoffHours: b.cancellationCutoffHours, autoConfirm: b.autoConfirm, minLeadMinutes: b.minLeadMinutes, holdMinutes: b.holdMinutes },
    content: {
      ...s.content,
      // Unverified history is never published.
      about: { ...about, story: about.historyVerified ? about.story : '' },
    },
    totalSeats: await totalSeats(),
  })
})

export const gallery = asyncHandler(async (req, res) => {
  const f = { active: true }
  if (['FOOD', 'INTERIOR', 'ATMOSPHERE', 'CUSTOMER'].includes(req.query.category)) f.category = req.query.category
  ok(res, { items: await GalleryImage.find(f).sort({ order: 1, createdAt: -1 }).select('url caption category').lean() })
})

export const contact = asyncHandler(async (req, res) => {
  const e = await ContactEnquiry.create(req.body)
  await audit({ action: 'ENQUIRY_RECEIVED', entityType: 'ENQUIRY', entityId: e._id, actor: { name: req.body.name, role: 'PUBLIC' } })
  ok(res, null, 'Thank you. The restaurant will get back to you soon.', 201)
})

export const upload = asyncHandler(async (req, res) => {
  const url = await storeImage(req.file)
  await audit({ action: 'IMAGE_UPLOADED', entityType: 'MEDIA', actor: { id: req.user.id, name: req.user.name, role: req.user.role }, meta: { url } })
  ok(res, { url }, 'Image uploaded', 201)
})
