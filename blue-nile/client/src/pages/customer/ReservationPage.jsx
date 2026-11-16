import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, CheckCircle2, Clock, ShieldCheck, Users } from 'lucide-react'
import api from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../hooks/useSettings.js'
import { Field, OtpDigits, Seo, Skeleton } from '../../components/ui/PublicUi.jsx'
import { addDays, formatDate, formatTime, isValidMobile, toISODate } from '../../utils/format.js'

const STEPS = [
  'Date',
  'Guests',
  'Time Slot',
  'Seating Check',
  'Guest Details',
  'Verify Mobile',
  'Confirm & Submit',
]
const OCCASIONS = ['', 'Birthday', 'Anniversary', 'Group Dining', 'Business Meal', 'Other']

export default function ReservationPage() {
  const navigate = useNavigate()
  const { user, sendOtp, verifyOtp, logout, isCustomer } = useAuth()
  const { restaurant, booking, openingHours } = useSettings()

  const today = toISODate(new Date())
  const maxDate = toISODate(addDays(new Date(), booking.advanceBookingDays || 30))
  const maxGuests = booking.maxGuestsPerBooking || 10

  const [step, setStep] = useState(0)
  const [date, setDate] = useState(today)
  const [guests, setGuests] = useState(2)
  const [slot, setSlot] = useState(null) // { time, endTime, availableSeats }
  const [avail, setAvail] = useState({ loading: false, data: null, error: null })

  const [name, setName] = useState(user?.name && user.name !== 'Guest' ? user.name : '')
  const [mobile, setMobile] = useState(user?.mobile || '')
  const [email, setEmail] = useState(user?.email || '')
  const [occasion, setOccasion] = useState('')
  const [specialRequest, setSpecialRequest] = useState('')
  const [formErr, setFormErr] = useState('')

  // OTP state
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [devOtp, setDevOtp] = useState('')
  const [otpBusy, setOtpBusy] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isCustomer && user) {
      if (!name && user.name && user.name !== 'Guest') setName(user.name)
      if (!mobile && user.mobile) setMobile(user.mobile)
      if (!email && user.email) setEmail(user.email)
    }
  }, [isCustomer, user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const loadAvailability = async (d = date, g = guests) => {
    setAvail({ loading: true, data: null, error: null })
    try {
      const data = await api.get('/reservations/availability', { params: { date: d, guests: g } })
      setAvail({ loading: false, data, error: null })
      return data
    } catch (error) {
      setAvail({ loading: false, data: null, error })
      return null
    }
  }

  // Load slots when entering step 2 (Time Slot) or step 3 (Seating Check)
  const goToSlots = async () => {
    setFormErr('')
    setSlot(null)
    setStep(2)
    await loadAvailability(date, guests)
  }

  const verifySlotLive = async (chosen) => {
    setFormErr('')
    setSlot(chosen)
    setStep(3)
    const fresh = await loadAvailability(date, guests)
    const updated = fresh?.slots?.find((s) => s.time === chosen.time)
    if (updated) setSlot(updated)
  }

  const alreadyVerifiedForMobile = isCustomer && user?.mobile === mobile.trim()

  const goFromDetails = async () => {
    setFormErr('')
    if (name.trim().length < 2) { setFormErr('Please enter your full name.'); return }
    if (!isValidMobile(mobile.trim())) { setFormErr('Please enter a valid 10-digit Indian mobile number.'); return }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setFormErr('Please enter a valid email address or leave it blank.'); return }
    if (alreadyVerifiedForMobile) {
      setStep(6)
      return
    }
    setStep(5)
    if (!otpSent) await triggerSendOtp()
  }

  const triggerSendOtp = async () => {
    setFormErr('')
    setOtpBusy(true)
    try {
      const res = await sendOtp({ mobile: mobile.trim(), name: name.trim(), email: email.trim() || undefined })
      setOtpSent(true)
      setCooldown(res.cooldownSeconds || 45)
      setDevOtp(res.devOtp || '')
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setOtpBusy(false)
    }
  }

  const handleVerifyOtp = async () => {
    setFormErr('')
    if (otp.length !== 6) { setFormErr('Please enter the 6-digit OTP.'); return }
    setOtpBusy(true)
    try {
      await verifyOtp({ mobile: mobile.trim(), otp, name: name.trim(), email: email.trim() || undefined })
      setStep(6)
    } catch (e) {
      setFormErr(e.message)
    } finally {
      setOtpBusy(false)
    }
  }

  const submitReservation = async () => {
    setFormErr('')
    setSubmitting(true)
    try {
      const res = await api.post('/reservations', {
        guestCount: Number(guests),
        reservationDate: date,
        startTime: slot.time,
        specialRequest: specialRequest.trim() || undefined,
        occasion: occasion || undefined,
        customerName: name.trim(),
        email: email.trim() || undefined,
      })
      navigate(`/booking-success/${encodeURIComponent(res.reservation.reference)}`, {
        state: { reservation: res.reservation, message: res.message },
        replace: true,
      })
    } catch (e) {
      if (e.code === 'SLOT_UNAVAILABLE') {
        setFormErr('That time slot was just taken. Please pick another available time below.')
        setStep(2)
        await loadAvailability(date, guests)
      } else {
        setFormErr(e.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Staff/Owner cannot book as customers
  if (user && user.role !== 'CUSTOMER') {
    return (
      <>
        <Seo title="Reserve a Table" path="/reserve" />
        <section className="container-x max-w-xl py-16">
          <div className="border border-gold/40 bg-white p-8 text-center">
            <h1 className="font-serif text-3xl font-semibold">Signed in as {user.role}</h1>
            <p className="mt-2 text-sm text-charcoal/70">
              Customer reservations use mobile OTP verification. Use the walk-in / phone booking button in the staff dashboard, or sign out to test customer booking.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link to="/staff" className="btn btn-dark">Go to Staff Dashboard</Link>
              <button type="button" onClick={logout} className="btn btn-outline">Sign out</button>
            </div>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <Seo title="Reserve a Table" description="Book a table at Blue Nile, Bund Garden Road, Pune with live seating availability and mobile OTP verification." path="/reserve" />

      <section className="border-b border-charcoal/10 bg-charcoal py-12 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Online Reservation</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold sm:text-5xl">Reserve a Table at {restaurant.name || 'Blue Nile'}</h1>
          <p className="mt-2 text-sm text-ivory/75">102, Bund Garden Road, Agarkar Nagar, Pune · Live seating availability</p>
        </div>
      </section>

      <section className="container-x max-w-3xl py-12">
        {/* Stepper */}
        <ol className="mb-8 grid grid-cols-7 gap-1 border border-charcoal/15 bg-white p-3 text-center text-[11px]" aria-label="Reservation steps">
          {STEPS.map((label, i) => {
            const state = i === step ? 'current' : i < step ? 'done' : 'upcoming'
            return (
              <li
                key={label}
                aria-current={state === 'current' ? 'step' : undefined}
                className={`py-2 font-semibold uppercase tracking-wider ${state === 'current' ? 'bg-charcoal text-gold-light' : state === 'done' ? 'bg-ivory text-olive' : 'text-charcoal/40'}`}
              >
                <span className="block font-mono text-[10px]">0{i + 1}</span>
                <span className="hidden sm:inline">{label}</span>
              </li>
            )
          })}
        </ol>

        {formErr && (
          <div role="alert" className="mb-6 flex items-start gap-2.5 border border-rose-400 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{formErr}</span>
          </div>
        )}

        <div className="border border-charcoal/15 bg-white p-6 sm:p-8">
          {/* STEP 1: DATE */}
          {step === 0 && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">1. Select Reservation Date</h2>
              <p className="mt-1 text-sm text-charcoal/65">Bookings are open up to {booking.advanceBookingDays || 30} days in advance.</p>
              <div className="mt-6 max-w-xs">
                <Field label="Dining Date" required>
                  {(p) => (
                    <input
                      {...p}
                      type="date"
                      min={today}
                      max={maxDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="field-input"
                    />
                  )}
                </Field>
              </div>
              {openingHours?.length > 0 && (
                <p className="mt-4 text-xs text-charcoal/60">
                  Selected: <strong>{formatDate(date)}</strong>
                </p>
              )}
              <div className="mt-8 flex justify-end">
                <button type="button" onClick={() => setStep(1)} disabled={!date} className="btn btn-primary">
                  Next: Party Size <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: GUESTS */}
          {step === 1 && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">2. Select Number of Guests</h2>
              <p className="mt-1 text-sm text-charcoal/65">Choose your party size so we can check matching tables.</p>
              <div className="mt-6 grid grid-cols-5 gap-2 sm:grid-cols-10" role="radiogroup" aria-label="Number of guests">
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={guests === n}
                    onClick={() => setGuests(n)}
                    className={`py-3 font-serif text-xl font-semibold transition-colors ${guests === n ? 'bg-charcoal text-gold-light' : 'border border-charcoal/20 bg-ivory hover:border-gold'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {guests >= 6 && (
                <p className="mt-4 border-l-2 border-gold bg-ivory p-3 text-xs text-charcoal/75">
                  For groups of {guests}+, tables may be combined based on live availability. Please mention any seating preferences in the special requests step.
                </p>
              )}
              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(0)} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
                <button type="button" onClick={goToSlots} className="btn btn-primary">Check Time Slots <ArrowRight className="size-4" aria-hidden="true" /></button>
              </div>
            </div>
          )}

          {/* STEP 3: TIME SLOT */}
          {step === 2 && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">3. Select a Time Slot</h2>
              <p className="mt-1 text-sm text-charcoal/65">{formatDate(date)} · {guests} {guests === 1 ? 'guest' : 'guests'}</p>

              <div className="mt-6">
                {avail.loading ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : avail.error ? (
                  <div className="border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
                    {avail.error.message}
                    <button type="button" onClick={() => loadAvailability(date, guests)} className="btn btn-dark btn-sm ml-3">Retry</button>
                  </div>
                ) : !avail.data?.open ? (
                  <div className="border border-gold/40 bg-ivory p-6 text-sm">
                    <p className="font-serif text-xl font-semibold text-charcoal">{avail.data?.reason || 'Online slots are not open for this date'}</p>
                    <p className="mt-1 text-charcoal/70">Please choose another date or call {restaurant.phone || '020 2612 5238'} to enquire directly.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Available time slots">
                    {avail.data.slots.map((s) => (
                      <button
                        key={s.time}
                        type="button"
                        role="radio"
                        aria-checked={slot?.time === s.time}
                        disabled={!s.available}
                        onClick={() => verifySlotLive(s)}
                        title={s.available ? `${s.availableSeats} seats available` : s.reason}
                        className={`flex flex-col items-start border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${slot?.time === s.time ? 'border-charcoal bg-charcoal text-ivory' : 'border-charcoal/20 bg-ivory hover:border-gold'}`}
                      >
                        <span className="font-serif text-xl font-semibold">{formatTime(s.time)}</span>
                        <span className="mt-0.5 text-[11px] opacity-75">
                          {s.available ? `${s.availableSeats} seats open` : (s.reason || 'Unavailable')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(1)} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
              </div>
            </div>
          )}

          {/* STEP 4: REAL-TIME AVAILABLE SEATING SUMMARY */}
          {step === 3 && slot && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">4. Live Seating Availability</h2>
              <p className="mt-1 text-sm text-charcoal/65">Real-time capacity verified for your selected dining window.</p>

              <div className="mt-6 grid gap-4 border border-gold/40 bg-ivory p-6 sm:grid-cols-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-1 size-5 text-gold" aria-hidden="true" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-charcoal/55">Date</div>
                    <div className="font-serif text-xl font-semibold">{formatDate(date)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-1 size-5 text-gold" aria-hidden="true" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-charcoal/55">Dining Window</div>
                    <div className="font-serif text-xl font-semibold">{formatTime(slot.time)} – {formatTime(slot.endTime)}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="mt-1 size-5 text-gold" aria-hidden="true" />
                  <div>
                    <div className="text-xs uppercase tracking-wider text-charcoal/55">Available Seats</div>
                    <div className="font-serif text-xl font-semibold text-olive">{slot.availableSeats} seats open (party of {guests})</div>
                  </div>
                </div>
              </div>

              {!slot.available && (
                <p role="alert" className="mt-4 text-sm text-rose-800">This slot is no longer available ({slot.reason}). Please go back and select another time.</p>
              )}

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(2)} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Change Slot</button>
                <button type="button" disabled={!slot.available} onClick={() => setStep(4)} className="btn btn-primary">
                  Continue to Guest Details <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CUSTOMER INFORMATION */}
          {step === 4 && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">5. Enter Guest Information</h2>
              <p className="mt-1 text-sm text-charcoal/65">We will send a 6-digit OTP to verify your mobile number in the next step.</p>

              <div className="mt-6 space-y-4">
                <Field label="Full Name" required>
                  {(p) => <input {...p} value={name} onChange={(e) => setName(e.target.value)} className="field-input" autoComplete="name" placeholder="Your full name" />}
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="WhatsApp / Mobile Number" required hint="10-digit Indian mobile number">
                    {(p) => (
                      <div className="flex">
                        <span className="inline-flex items-center border border-r-0 border-charcoal/20 bg-ivory px-3 text-sm font-semibold">+91</span>
                        <input
                          {...p}
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setOtpSent(false) }}
                          className="field-input"
                          autoComplete="tel-national"
                          placeholder="9876543210"
                        />
                      </div>
                    )}
                  </Field>
                  <Field label="Email Address (optional)">
                    {(p) => <input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" autoComplete="email" placeholder="you@example.com" />}
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Occasion (optional)">
                    {(p) => (
                      <select {...p} value={occasion} onChange={(e) => setOccasion(e.target.value)} className="field-input">
                        {OCCASIONS.map((o) => <option key={o} value={o}>{o || 'None'}</option>)}
                      </select>
                    )}
                  </Field>
                  <Field label="Reservation Summary">
                    {() => <div className="field-input bg-ivory text-sm">{formatDate(date)} · {formatTime(slot?.time)} · {guests} guests</div>}
                  </Field>
                </div>

                <Field label="Special Requests (optional)" hint="High chair, wheelchair access, birthday note, spice preference, etc.">
                  {(p) => <textarea {...p} rows={3} maxLength={500} value={specialRequest} onChange={(e) => setSpecialRequest(e.target.value)} className="field-input" />}
                </Field>
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(3)} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
                <button type="button" onClick={goFromDetails} disabled={otpBusy} className="btn btn-primary">
                  {alreadyVerifiedForMobile ? 'Review & Submit' : otpBusy ? 'Sending OTP…' : 'Verify Mobile with OTP'} <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: OTP VERIFICATION */}
          {step === 5 && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">6. Verify Your Mobile Number</h2>
              <p className="mt-1 text-sm text-charcoal/65">Enter the 6-digit OTP sent to <strong>+91 {mobile}</strong>.</p>

              {devOtp && (
                <div className="mt-4 border border-gold bg-gold/15 px-4 py-2.5 text-xs">
                  Development mode OTP: <strong className="font-mono text-sm">{devOtp}</strong>
                </div>
              )}

              <div className="mt-6">
                <OtpDigits value={otp} onChange={setOtp} disabled={otpBusy} />
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-charcoal/65">
                {cooldown > 0 ? (
                  <span>Resend available in {cooldown}s</span>
                ) : (
                  <button type="button" onClick={triggerSendOtp} disabled={otpBusy} className="font-semibold text-olive underline">
                    Resend OTP
                  </button>
                )}
              </div>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(4)} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Edit Details</button>
                <button type="button" onClick={handleVerifyOtp} disabled={otpBusy || otp.length !== 6} className="btn btn-primary">
                  {otpBusy ? 'Verifying…' : 'Verify & Continue'} <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: REVIEW & SUBMIT */}
          {step === 6 && slot && (
            <div>
              <h2 className="font-serif text-3xl font-semibold">7. Submit Booking Request</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-800">
                <ShieldCheck className="size-4" aria-hidden="true" />Mobile +91 {mobile} verified
              </p>

              <dl className="mt-6 divide-y divide-charcoal/10 border border-charcoal/15 bg-ivory p-5 text-sm">
                <div className="flex justify-between py-2"><dt className="text-charcoal/60">Guest Name</dt><dd className="font-semibold">{name}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-charcoal/60">Mobile</dt><dd className="font-mono">+91 {mobile}</dd></div>
                {email && <div className="flex justify-between py-2"><dt className="text-charcoal/60">Email</dt><dd>{email}</dd></div>}
                <div className="flex justify-between py-2"><dt className="text-charcoal/60">Date & Time</dt><dd className="font-semibold">{formatDate(date)} at {formatTime(slot.time)}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-charcoal/60">Party Size</dt><dd className="font-semibold">{guests} {guests === 1 ? 'guest' : 'guests'}</dd></div>
                {occasion && <div className="flex justify-between py-2"><dt className="text-charcoal/60">Occasion</dt><dd>{occasion}</dd></div>}
                {specialRequest && <div className="flex justify-between py-2"><dt className="text-charcoal/60">Special Request</dt><dd className="max-w-xs text-right">{specialRequest}</dd></div>}
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-charcoal/65">
                {booking.autoConfirm
                  ? 'Your reservation will be confirmed immediately if tables are still free.'
                  : 'Submitting this form creates a PENDING reservation request and holds capacity for your party while our staff confirms it.'}
              </p>

              <div className="mt-8 flex justify-between">
                <button type="button" onClick={() => setStep(4)} disabled={submitting} className="btn btn-outline"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
                <button type="button" onClick={submitReservation} disabled={submitting} className="btn btn-primary">
                  <CheckCircle2 className="size-4" aria-hidden="true" />{submitting ? 'Submitting…' : 'Submit Reservation'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
