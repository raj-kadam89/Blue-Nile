import cron from 'node-cron'
import { Reservation, getSettings } from '../models/index.js'
import { expireDueHolds } from '../services/seating/seatingService.js'
import { retryFailed, notifyReservation } from '../services/notification/dispatcher.js'
import { emitStaff } from '../sockets/emitter.js'
import { nowParts } from '../utils/time.js'

export async function runHoldExpiry() {
  const ids = await expireDueHolds()
  if (ids.length) {
    const rows = await Reservation.find({ _id: { $in: ids } }).select('reservationDate reference').lean()
    for (const d of new Set(rows.map((r) => r.reservationDate))) emitStaff('availability:changed', { date: d })
    emitStaff('booking:updated', { expired: rows.map((r) => r.reference) })
  }
  return ids.length
}

export async function runReminders() {
  const s = await getSettings()
  const hours = s.notificationPrefs?.reminderHoursBefore
  if (!hours) return 0
  const now = nowParts()
  const due = await Reservation.find({
    reservationDate: now.date, status: 'CONFIRMED', reminderSentAt: { $exists: false },
    startMin: { $gt: now.minutes, $lte: now.minutes + hours * 60 },
  }).limit(100)
  for (const r of due) {
    const claimed = await Reservation.findOneAndUpdate({ _id: r._id, reminderSentAt: { $exists: false } }, { $set: { reminderSentAt: new Date() } })
    if (claimed) await notifyReservation('BOOKING_REMINDER', r)
  }
  return due.length
}

const safe = (name, fn) => async () => { try { await fn() } catch (e) { console.error(`[job:${name}]`, e.message) } }

export function startJobs() {
  const tasks = [
    cron.schedule('* * * * *', safe('holds', runHoldExpiry)),
    cron.schedule('*/5 * * * *', safe('reminders', runReminders)),
    cron.schedule('*/2 * * * *', safe('notify-retry', retryFailed)),
  ]
  return () => tasks.forEach((t) => t.stop())
}
