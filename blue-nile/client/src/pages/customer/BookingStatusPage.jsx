import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ShieldCheck, XCircle } from 'lucide-react'
import api from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../hooks/useSettings.js'
import { Field, Modal, OtpDigits, Seo, Skeleton, StatusPill } from '../../components/ui/PublicUi.jsx'
import { STATUS_INFO, formatDate, formatTime, isValidMobile } from '../../utils/format.js'

export default function BookingStatusPage() {
  const [params] = useSearchParams()
  const { user, isCustomer, sendOtp, verifyOtp, logout } = useAuth()
  const { booking } = useSettings()

  const [reference, setReference] = useState((params.get('reference') || '').toUpperCase())
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupErr, setLookupErr] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)

  const [mine, setMine] = useState({ loading: false, items: [] })
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelErr, setCancelErr] = useState('')

  // Inline OTP login state
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtp, setDevOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [authErr, setAuthErr] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const loadMine = useCallback(async () => {
    setMine((m) => ({ ...m, loading: true }))
    try {
      const d = await api.get('/reservations/mine')
      setMine({ loading: false, items: d.items || [] })
    } catch {
      setMine({ loading: false, items: [] })
    }
  }, [])

  const lookupByRef = useCallback(async (ref) => {
    if (!ref.trim()) return
    setLookupErr('')
    setLookupBusy(true)
    try {
      const d = await api.get('/reservations/status', { params: { reference: ref.trim().toUpperCase() } })
      setLookupResult(d.reservation)
    } catch (e) {
      setLookupResult(null)
      setLookupErr(e.message)
    } finally {
      setLookupBusy(false)
    }
  }, [])

  useEffect(() => {
    if (isCustomer) {
      loadMine()
      const prefill = params.get('reference')
      if (prefill) lookupByRef(prefill)
    }
  }, [isCustomer, loadMine, lookupByRef, params])

  const handleSendOtp = async (e) => {
    e?.preventDefault()
    setAuthErr('')
    if (!isValidMobile(mobile.trim())) { setAuthErr('Enter a valid 10-digit Indian mobile number.'); return }
    setAuthBusy(true)
    try {
      const r = await sendOtp({ mobile: mobile.trim() })
      setOtpSent(true)
      setCooldown(r.cooldownSeconds || 45)
      setDevOtp(r.devOtp || '')
    } catch (err) {
      setAuthErr(err.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setAuthErr('')
    if (otp.length !== 6) { setAuthErr('Enter the 6-digit OTP.'); return }
    setAuthBusy(true)
    try {
      await verifyOtp({ mobile: mobile.trim(), otp })
    } catch (err) {
      setAuthErr(err.message)
    } finally {
      setAuthBusy(false)
    }
  }

  const confirmCancel = async () => {
    if (!cancelTarget) return
    setCancelErr('')
    setCancelBusy(true)
    try {
      const d = await api.post('/reservations/cancel', { reference: cancelTarget.reference, reason: cancelReason.trim() || undefined })
      if (lookupResult?.reference === cancelTarget.reference) setLookupResult(d.reservation)
      setCancelTarget(null)
      setCancelReason('')
      await loadMine()
    } catch (e) {
      setCancelErr(e.message)
    } finally {
      setCancelBusy(false)
    }
  }

  const renderCard = (r) => {
    const info = STATUS_INFO[r.status] || { text: r.statusMessage }
    const canCancel = ['PENDING', 'CONFIRMED'].includes(r.status)
    return (
      <article key={r._id || r.reference} className="border border-charcoal/15 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-3">
          <div>
            <span className="font-mono text-lg font-semibold">{r.reference}</span>
            <p className="text-xs text-charcoal/60">{formatDate(r.reservationDate)} · {formatTime(r.startTime)} · {r.guestCount} guests</p>
          </div>
          <StatusPill status={r.status} />
        </div>
        <p className="mt-3 text-sm text-charcoal/80">{r.statusMessage || info.text}</p>
        {canCancel && (
          <div className="mt-4 flex justify-end border-t border-charcoal/10 pt-3">
            <button type="button" onClick={() => { setCancelTarget(r); setCancelReason(''); setCancelErr('') }} className="btn btn-outline btn-sm text-rose-800">
              <XCircle className="size-3.5" aria-hidden="true" />Request Cancellation
            </button>
          </div>
        )}
      </article>
    )
  }

  return (
    <>
      <Seo title="Check Booking Status" description="Securely check your reservation status or request a cancellation at Blue Nile, Pune." path="/booking-status" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Manage Reservation</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Check Booking Status</h1>
          <p className="mt-2 max-w-2xl text-sm text-ivory/75">
            For your privacy, reservations are only shown after verifying your mobile number with an OTP.
          </p>
        </div>
      </section>

      <section className="container-x max-w-3xl py-14">
        {!isCustomer ? (
          <div className="border border-charcoal/15 bg-white p-8">
            <h2 className="font-serif text-3xl font-semibold">Verify Your Mobile Number</h2>
            <p className="mt-1 text-sm text-charcoal/70">Enter the mobile number used for your reservation to receive a one-time verification code.</p>

            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="mt-6 max-w-sm space-y-4" noValidate>
                <Field label="Mobile Number" required error={authErr}>
                  {(p) => (
                    <div className="flex">
                      <span className="inline-flex items-center border border-r-0 border-charcoal/20 bg-ivory px-3 text-sm font-semibold">+91</span>
                      <input {...p} type="tel" inputMode="numeric" maxLength={10} value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="field-input" placeholder="9876543210" />
                    </div>
                  )}
                </Field>
                <button type="submit" disabled={authBusy} className="btn btn-primary w-full">{authBusy ? 'Sending OTP…' : 'Send OTP'}</button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4" noValidate>
                <p className="text-sm">Code sent to <strong>+91 {mobile}</strong>. <button type="button" onClick={() => { setOtpSent(false); setOtp('') }} className="underline">Change number</button></p>
                {devOtp && <div className="border border-gold bg-gold/15 px-3 py-2 text-xs">Development OTP: <strong className="font-mono">{devOtp}</strong></div>}
                <OtpDigits value={otp} onChange={setOtp} disabled={authBusy} />
                {authErr && <p role="alert" className="field-error">{authErr}</p>}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button type="submit" disabled={authBusy || otp.length !== 6} className="btn btn-primary">{authBusy ? 'Verifying…' : 'Verify & View Bookings'}</button>
                  {cooldown > 0 ? <span className="text-xs text-charcoal/60">Resend in {cooldown}s</span> : <button type="button" onClick={handleSendOtp} className="text-xs font-semibold text-olive underline">Resend OTP</button>}
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-2 border border-gold/40 bg-white px-5 py-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-olive"><ShieldCheck className="size-4" aria-hidden="true" />Verified mobile: +91 {user.mobile}</span>
              <button type="button" onClick={logout} className="underline">Use a different number</button>
            </div>

            {/* Lookup by reference */}
            <div className="border border-charcoal/15 bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Search by Booking Reference</h2>
              <form onSubmit={(e) => { e.preventDefault(); lookupByRef(reference) }} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value.toUpperCase())}
                  placeholder="e.g. BN-261115-ABCD"
                  aria-label="Booking reference"
                  className="field-input font-mono uppercase"
                />
                <button type="submit" disabled={lookupBusy || !reference.trim()} className="btn btn-dark shrink-0">
                  <Search className="size-4" aria-hidden="true" />{lookupBusy ? 'Checking…' : 'Check Status'}
                </button>
              </form>
              {lookupErr && <p role="alert" className="field-error mt-3">{lookupErr}</p>}
              {lookupResult && <div className="mt-5">{renderCard(lookupResult)}</div>}
            </div>

            {/* All bookings for this customer */}
            <div>
              <h2 className="mb-4 font-serif text-3xl font-semibold">Your Reservations</h2>
              {mine.loading ? (
                <Skeleton className="h-40" />
              ) : mine.items.length === 0 ? (
                <div className="border border-dashed border-charcoal/25 bg-white p-10 text-center">
                  <p className="font-serif text-2xl">No reservations found for +91 {user.mobile}</p>
                  <Link to="/reserve" className="btn btn-primary btn-sm mt-4">Reserve a Table</Link>
                </div>
              ) : (
                <div className="space-y-4">{mine.items.map(renderCard)}</div>
              )}
            </div>
          </div>
        )}
      </section>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Reservation">
        {cancelTarget && (
          <div className="space-y-4 text-sm">
            <p>
              Cancel reservation <strong className="font-mono">{cancelTarget.reference}</strong> for{' '}
              <strong>{formatDate(cancelTarget.reservationDate)} at {formatTime(cancelTarget.startTime)}</strong> ({cancelTarget.guestCount} guests)?
            </p>
            <p className="text-xs text-charcoal/65">
              Online cancellation is permitted up to {booking.cancellationCutoffHours ?? 2} hour(s) before a confirmed reservation.
            </p>
            <Field label="Reason (optional)">
              {(p) => <textarea {...p} rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="field-input" />}
            </Field>
            {cancelErr && <p role="alert" className="field-error">{cancelErr}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setCancelTarget(null)} disabled={cancelBusy} className="btn btn-outline btn-sm">Keep Booking</button>
              <button type="button" onClick={confirmCancel} disabled={cancelBusy} className="btn btn-dark btn-sm">
                {cancelBusy ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
