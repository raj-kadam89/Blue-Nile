import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CalendarCheck2, Clock, Compass, MapPin, Phone } from 'lucide-react'
import api from '../../services/api.js'
import { useSettings } from '../../hooks/useSettings.js'
import { ErrorBlock, Seo, Skeleton, StatusPill } from '../../components/ui/PublicUi.jsx'
import { STATUS_INFO, formatDate, formatTime } from '../../utils/format.js'

export default function BookingSuccessPage() {
  const { reference } = useParams()
  const location = useLocation()
  const { restaurant } = useSettings()
  const initial = location.state?.reservation || null
  const [reservation, setReservation] = useState(initial)
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (initial) return
    let alive = true
    api.get('/reservations/status', { params: { reference } })
      .then((d) => alive && setReservation(d.reservation))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [reference, initial])

  const phone = restaurant.phone || '020 2612 5238'
  const address = restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India'
  const mapsUrl = restaurant.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Blue+Nile+102+Bund+Garden+Road+Agarkar+Nagar+Pune+411001'
  const info = reservation ? (STATUS_INFO[reservation.status] || { text: reservation.statusMessage }) : null

  return (
    <>
      <Seo title={`Booking ${reference}`} path={`/booking-success/${reference}`} />

      <section className="container-x max-w-2xl py-16">
        {loading ? (
          <Skeleton className="h-96" />
        ) : error || !reservation ? (
          <ErrorBlock error={error || new Error('Booking not found')} />
        ) : (
          <div className="border border-gold/50 bg-white p-8 sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-charcoal/10 pb-5">
              <div>
                <p className="eyebrow">Booking Reference</p>
                <h1 className="mt-1 font-mono text-3xl font-semibold text-charcoal sm:text-4xl">{reservation.reference}</h1>
              </div>
              <StatusPill status={reservation.status} />
            </div>

            {/* Explicit Pending vs Confirmed banner */}
            <div
              role="status"
              className={`mt-6 border p-4 text-sm leading-relaxed ${reservation.status === 'CONFIRMED' ? 'border-emerald-600/40 bg-emerald-50 text-emerald-950' : 'border-amber-500/50 bg-amber-50 text-amber-950'}`}
            >
              <strong className="block font-serif text-xl">
                {reservation.status === 'CONFIRMED' ? 'Your table reservation is confirmed' : 'Reservation request received — awaiting confirmation'}
              </strong>
              <p className="mt-1">{reservation.statusMessage || info?.text}</p>
            </div>

            <dl className="mt-6 divide-y divide-charcoal/10 text-sm">
              <div className="flex justify-between py-3"><dt className="text-charcoal/60">Guest Name</dt><dd className="font-semibold">{reservation.customerName}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-charcoal/60">Mobile</dt><dd className="font-mono">+91 {reservation.mobile}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-charcoal/60">Date</dt><dd className="font-semibold">{formatDate(reservation.reservationDate)}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-charcoal/60">Time</dt><dd className="font-semibold">{formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-charcoal/60">Guests</dt><dd className="font-semibold">{reservation.guestCount}</dd></div>
              {reservation.specialRequest && <div className="flex justify-between py-3"><dt className="text-charcoal/60">Special Request</dt><dd className="max-w-xs text-right">{reservation.specialRequest}</dd></div>}
            </dl>

            <div className="mt-6 space-y-2 border-t border-charcoal/10 pt-5 text-xs text-charcoal/75">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" /><span>{address}</span></p>
              <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-gold" aria-hidden="true" /><a href={`tel:${phone}`} className="text-olive underline">{phone}</a></p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/booking-status?reference=${encodeURIComponent(reservation.reference)}`} className="btn btn-primary">
                <Clock className="size-4" aria-hidden="true" />Track / Manage Booking
              </Link>
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                <Compass className="size-4" aria-hidden="true" />Get Directions
              </a>
              <Link to="/menu" className="btn btn-outline">
                <CalendarCheck2 className="size-4" aria-hidden="true" />View Menu
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
