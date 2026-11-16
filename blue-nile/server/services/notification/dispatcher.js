import { Notification, getSettings } from '../../models/index.js'
import { sendWhatsApp, sendEmail, whatsappConfigured, emailConfigured } from './providers.js'

const MAX_ATTEMPTS = 5

const fmtDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

function compose(event, r, s) {
  const name = s.restaurant.name
  const when = `${fmtDate(r.reservationDate)} at ${r.startTime}`
  const details = `Reference: ${r.reference}\nDate & time: ${when}\nGuests: ${r.guestCount}`
  const contact = `Questions? Call ${s.restaurant.phone}.`
  switch (event) {
    case 'BOOKING_RECEIVED':
      return { subject: `${name}: booking request received (${r.reference})`, body: `Hi ${r.customerName}, we have received your reservation request at ${name}. It is NOT confirmed yet - we will message you once the restaurant confirms.\n${details}\n${contact}` }
    case 'BOOKING_CONFIRMED':
      return { subject: `${name}: reservation confirmed (${r.reference})`, body: `Hi ${r.customerName}, your reservation at ${name} is confirmed.\n${details}\nAddress: ${s.restaurant.address}\n${contact}` }
    case 'BOOKING_REJECTED':
      return { subject: `${name}: reservation request not accepted (${r.reference})`, body: `Hi ${r.customerName}, sorry - ${name} could not accommodate your request.\n${details}${r.cancelReason ? `\nReason: ${r.cancelReason}` : ''}\n${contact}` }
    case 'BOOKING_CANCELLED':
      return { subject: `${name}: reservation cancelled (${r.reference})`, body: `Hi ${r.customerName}, your reservation at ${name} has been cancelled.\n${details}${r.cancelReason ? `\nReason: ${r.cancelReason}` : ''}\n${contact}` }
    case 'BOOKING_REMINDER':
      return { subject: `${name}: reservation reminder (${r.reference})`, body: `Reminder: your reservation at ${name} is today.\n${details}\nAddress: ${s.restaurant.address}\n${contact}` }
    case 'STAFF_NEW_BOOKING':
      return { subject: `New booking request ${r.reference}`, body: `New ${r.bookingSource} booking request: ${r.customerName} (${r.mobile || 'no phone'}), ${r.guestCount} guests, ${when}. Ref ${r.reference}. Status: ${r.status}.` }
    default:
      return null
  }
}

async function send(n) {
  if (n.channel === 'WHATSAPP') return sendWhatsApp({ to: n.to, body: n.body, event: n.event })
  if (n.channel === 'EMAIL') return sendEmail({ to: n.to, subject: n.subject, body: n.body })
  throw new Error(`Unsupported channel ${n.channel}`)
}

/** Attempt delivery for one notification doc. Never throws; failures are logged and retried. */
export async function attempt(n) {
  const configured = n.channel === 'WHATSAPP' ? whatsappConfigured() : emailConfigured()
  if (!configured) {
    n.status = 'SKIPPED'
    n.lastError = 'PROVIDER_NOT_CONFIGURED'
    n.nextAttemptAt = undefined
    return n.save()
  }
  n.attempts += 1
  try {
    n.providerMessageId = await send(n)
    n.status = 'SENT'
    n.sentAt = new Date()
    n.lastError = undefined
    n.nextAttemptAt = undefined
  } catch (err) {
    n.status = 'FAILED'
    n.lastError = String(err.message).slice(0, 500)
    n.nextAttemptAt = n.attempts >= MAX_ATTEMPTS ? undefined : new Date(Date.now() + 2 ** n.attempts * 60000)
  }
  return n.save()
}

export async function retryFailed() {
  const due = await Notification.find({ status: 'FAILED', nextAttemptAt: { $lte: new Date() }, attempts: { $lt: MAX_ATTEMPTS } }).limit(50)
  for (const n of due) await attempt(n)
  return due.length
}

/**
 * Queue + deliver notifications for a reservation event.
 * Customer messages only claim confirmation on BOOKING_CONFIRMED.
 */
export async function notifyReservation(event, reservation) {
  try {
    const s = await getSettings()
    const prefs = s.notificationPrefs
    const r = reservation.toObject ? reservation.toObject() : reservation
    const msg = compose(event, r, s)
    if (!msg) return
    const docs = []
    const base = { reservationId: r._id, event, subject: msg.subject, body: msg.body }
    if (event === 'STAFF_NEW_BOOKING') {
      if (prefs.whatsappEnabled && prefs.staffAlertNumber) docs.push({ ...base, channel: 'WHATSAPP', audience: 'STAFF', to: prefs.staffAlertNumber })
      if (prefs.emailEnabled && prefs.staffAlertEmail) docs.push({ ...base, channel: 'EMAIL', audience: 'STAFF', to: prefs.staffAlertEmail })
    } else {
      if (prefs.whatsappEnabled && r.mobile) docs.push({ ...base, channel: 'WHATSAPP', to: r.mobile })
      if (prefs.emailEnabled && r.email) docs.push({ ...base, channel: 'EMAIL', to: r.email })
    }
    for (const d of docs) {
      const n = await Notification.create(d)
      await attempt(n)
    }
  } catch (err) {
    console.error('[notify] failed', event, err.message) // reservation is never affected
  }
}

export const notifyAsync = (event, reservation) => { notifyReservation(event, reservation) }
