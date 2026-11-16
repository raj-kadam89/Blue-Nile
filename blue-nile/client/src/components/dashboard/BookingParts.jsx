import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarClock, CheckCheck, CheckCircle2, LogIn, Phone, Armchair, StickyNote, UserX, XCircle, Users, CalendarDays, Clock, Hash, MessageSquareText, Ban } from 'lucide-react'
import api from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Alert, Button, Card, ConfirmDialog, ErrorState, Modal, SkeletonList, StatusBadge, Badge } from './ui.jsx'
import { Field, SelectInput, TextArea, TextInput, inputCls } from './Form.jsx'
import { useFetch } from './hooks.js'
import { useToast } from './Toast.jsx'
import { fmtDate, fmtDateTime, fmtTime, todayStr } from './format.js'

/* ---------------- Reschedule ---------------- */
export function RescheduleModal({ booking, onClose, onDone }) {
  const [date, setDate] = useState(booking.reservationDate)
  const [time, setTime] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const { data, loading, error, reload } = useFetch(
    () => api.get('/reservations/availability', { params: { date, guests: booking.guestCount } }),
    [date],
  )
  const submit = async () => {
    setBusy(true); setErr('')
    try {
      await api.patch(`/staff/bookings/${booking._id}/reschedule`, { reservationDate: date, startTime: time, reason: reason.trim() || undefined })
      onDone('Booking rescheduled')
    } catch (e) { setErr(e.message); setBusy(false) }
  }
  return (
    <Modal open size="md" title="Reschedule booking" onClose={onClose} footer={(
      <>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button loading={busy} disabled={!time} onClick={submit}>Reschedule</Button>
      </>
    )}>
      <p className="mb-3 text-sm text-charcoal/70">{booking.customerName} · {booking.guestCount} guests · currently {fmtDate(booking.reservationDate)} at {fmtTime(booking.startTime)}</p>
      <Field label="New date">
        {(p) => <input {...p} type="date" min={todayStr()} value={date} onChange={(e) => { setDate(e.target.value); setTime('') }} className={inputCls} />}
      </Field>
      <div className="mt-4">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/65">Available time slots</div>
        {loading ? <SkeletonList rows={1} className="h-16" /> : error ? <ErrorState error={error} onRetry={reload} /> : !data?.open ? (
          <Alert tone="amber">{data?.reason || 'Closed on this date.'}</Alert>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time slots">
            {data.slots.map((s) => (
              <button
                key={s.time}
                type="button"
                role="radio"
                aria-checked={time === s.time}
                disabled={!s.available}
                title={s.available ? `${s.availableSeats} seats free` : s.reason || 'Full'}
                onClick={() => setTime(s.time)}
                className={`num rounded-lg border px-2 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${time === s.time ? 'border-charcoal bg-charcoal text-ivory' : 'border-[#d9d2c1] bg-white hover:bg-ivory'}`}
              >
                {fmtTime(s.time)}
                <span className="block text-[10px] font-normal opacity-70">{s.availableSeats} free</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-4"><TextArea label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
      {err && <Alert tone="rose" className="mt-3">{err}</Alert>}
    </Modal>
  )
}

/* ---------------- Actions ---------------- */
/** Status-aware action buttons with confirm dialogs. Calls onChanged() after any success. */
export function BookingActions({ booking, onChanged, size = 'md', full = false }) {
  const { user, isOwner } = useAuth()
  const { success, error } = useToast()
  const [dlg, setDlg] = useState(null) // {status,title,confirmLabel,danger}
  const [busy, setBusy] = useState('')
  const [resched, setResched] = useState(false)
  const canResched = isOwner || user?.permissions?.canReschedule

  const run = async (status, reason) => {
    await api.patch(`/staff/bookings/${booking._id}/status`, { status, reason })
    success(`Booking ${status.replace('_', ' ').toLowerCase()}`)
    onChanged?.()
  }
  const quick = async (status) => {
    setBusy(status)
    try { await run(status) } catch (e) { error(e.message) } finally { setBusy('') }
  }
  const destructive = (status, title, confirmLabel) => setDlg({ status, title, confirmLabel })
  const w = full ? 'flex-1' : ''
  const s = booking.status
  const btn = (props) => <Button size={size} className={w} {...props} />

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {s === 'PENDING' && <>
          {btn({ variant: 'success', icon: CheckCircle2, loading: busy === 'CONFIRMED', onClick: () => quick('CONFIRMED'), children: 'Confirm', 'aria-label': `Confirm booking ${booking.reference}` })}
          {btn({ variant: 'outline', icon: XCircle, onClick: () => destructive('REJECTED', 'Reject booking', 'Reject booking'), children: 'Reject' })}
        </>}
        {s === 'CONFIRMED' && <>
          {btn({ variant: 'primary', icon: LogIn, loading: busy === 'CHECKED_IN', onClick: () => quick('CHECKED_IN'), children: 'Check-in', 'aria-label': `Check in ${booking.reference}` })}
          {canResched && btn({ variant: 'outline', icon: CalendarClock, onClick: () => setResched(true), children: 'Reschedule' })}
          {btn({ variant: 'outline', icon: UserX, onClick: () => destructive('NO_SHOW', 'Mark as no-show', 'Mark no-show'), children: 'No-show' })}
          {btn({ variant: 'ghost', icon: Ban, onClick: () => destructive('CANCELLED', 'Cancel booking', 'Cancel booking'), children: 'Cancel' })}
        </>}
        {s === 'CHECKED_IN' && <>
          {btn({ variant: 'success', icon: Armchair, loading: busy === 'SEATED', onClick: () => quick('SEATED'), children: 'Mark seated' })}
          {btn({ variant: 'ghost', icon: Ban, onClick: () => destructive('CANCELLED', 'Cancel booking', 'Cancel booking'), children: 'Cancel' })}
        </>}
        {s === 'SEATED' && btn({ variant: 'primary', icon: CheckCheck, loading: busy === 'COMPLETED', onClick: () => quick('COMPLETED'), children: 'Mark completed' })}
      </div>
      <ConfirmDialog
        open={!!dlg}
        danger
        requireReason
        title={dlg?.title}
        confirmLabel={dlg?.confirmLabel}
        message={`${booking.customerName} · ${booking.reference} · ${fmtDate(booking.reservationDate)} ${fmtTime(booking.startTime)}`}
        onClose={() => setDlg(null)}
        onConfirm={async (reason) => { await run(dlg.status, reason); setDlg(null) }}
      />
      {resched && <RescheduleModal booking={booking} onClose={() => setResched(false)} onDone={(m) => { setResched(false); success(m); onChanged?.() }} />}
    </>
  )
}

/* ---------------- Card ---------------- */
export function BookingCard({ booking: b, onOpen, onChanged }) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <button type="button" onClick={() => onOpen(b)} className="text-left font-serif text-xl font-semibold hover:underline focus-visible:underline">{b.customerName}</button>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-charcoal/55"><Hash className="size-3" aria-hidden="true" /><span className="num font-mono">{b.reference}</span></div>
        </div>
        <div className="flex items-center gap-2">
          {b.bookingSource && b.bookingSource !== 'WEBSITE' && <Badge>{b.bookingSource.replace('_', ' ')}</Badge>}
          <StatusBadge status={b.status} />
        </div>
      </div>
      <div className="num mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        <span className="flex items-center gap-1.5"><CalendarDays className="size-4 text-gold" aria-hidden="true" />{fmtDate(b.reservationDate)}</span>
        <span className="flex items-center gap-1.5"><Clock className="size-4 text-gold" aria-hidden="true" />{fmtTime(b.startTime)}</span>
        <span className="flex items-center gap-1.5"><Users className="size-4 text-gold" aria-hidden="true" />{b.guestCount} guests</span>
        {b.mobile ? <a href={`tel:${b.mobile}`} className="flex items-center gap-1.5 font-semibold text-olive hover:underline" aria-label={`Call ${b.customerName}`}><Phone className="size-4 text-gold" aria-hidden="true" />{b.mobile}</a> : <span className="text-charcoal/40">No mobile</span>}
      </div>
      {(b.specialRequest || b.occasion) && (
        <p className="mt-3 flex gap-2 rounded-lg bg-ivory px-3 py-2 text-sm text-charcoal/80">
          <MessageSquareText className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
          <span>{b.occasion && <strong>{b.occasion}. </strong>}{b.specialRequest}</span>
        </p>
      )}
      {b.assignedTables?.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-charcoal/55">Tables:</span>
          {b.assignedTables.map((t) => <Badge key={t._id} className="bg-olive/10 text-olive ring-olive/20">T{t.tableNumber}{t.area ? ` · ${t.area}` : ''}</Badge>)}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0ebdd] pt-3">
        <BookingActions booking={b} onChanged={onChanged} />
        <Button variant="soft" size="sm" onClick={() => onOpen(b)}>Details</Button>
      </div>
    </Card>
  )
}

/* ---------------- Detail drawer ---------------- */
export function BookingDetailDrawer({ id, onClose, onChanged }) {
  const { data, loading, error, reload } = useFetch(() => api.get(`/staff/bookings/${id}`), [id])
  const { success, error: toastErr } = useToast()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const b = data?.reservation
  const changed = () => { reload(); onChanged?.() }
  const addNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    try { await api.post(`/staff/bookings/${id}/notes`, { note: note.trim() }); setNote(''); success('Note added'); reload() } catch (e) { toastErr(e.message) } finally { setSaving(false) }
  }
  const row = (k, v) => v ? <div className="flex justify-between gap-4 border-b border-[#f3efe3] py-1.5 text-sm"><dt className="text-charcoal/55">{k}</dt><dd className="num text-right font-medium">{v}</dd></div> : null
  return (
    <Modal open drawer title={b ? b.customerName : 'Booking details'} onClose={onClose}>
      {loading && !data ? <SkeletonList rows={4} className="h-16" /> : error && !data ? <ErrorState error={error} onRetry={reload} /> : b && (
        <div className="space-y-5">
          <div className="flex items-center justify-between"><StatusBadge status={b.status} /><span className="num font-mono text-xs text-charcoal/60">{b.reference}</span></div>
          <BookingActions booking={b} onChanged={changed} size="md" />
          <dl>
            {row('Date', fmtDate(b.reservationDate))}
            {row('Time', `${fmtTime(b.startTime)} – ${fmtTime(b.endTime)}`)}
            {row('Guests', b.guestCount)}
            {row('Mobile', b.mobile && <a className="text-olive underline" href={`tel:${b.mobile}`}>{b.mobile}</a>)}
            {row('Email', b.email)}
            {row('Source', b.bookingSource?.replace('_', ' '))}
            {row('Occasion', b.occasion)}
            {row('Special request', b.specialRequest)}
            {row('Verification', b.verificationStatus)}
            {row('Cancel reason', b.cancelReason)}
            {row('Tables', b.assignedTables?.map((t) => `T${t.tableNumber}`).join(', '))}
            {row('Created', fmtDateTime(b.createdAt))}
          </dl>
          {data.customerHistory && (
            <div>
              <h3 className="mb-2 text-lg font-semibold">Customer history</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                {[['Total', 'total'], ['Done', 'completed'], ['No-shows', 'noShows'], ['Cancelled', 'cancelled']].map(([l, k]) => (
                  <div key={k} className="rounded-lg bg-ivory p-2"><div className="num font-serif text-2xl font-semibold">{data.customerHistory[k] ?? 0}</div><div className="text-[11px] text-charcoal/55">{l}</div></div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold"><StickyNote className="size-4 text-gold" aria-hidden="true" />Customer notes</h3>
            <ul className="mb-3 space-y-2">
              {data.customerNotes?.length ? data.customerNotes.map((n, i) => (
                <li key={n._id || i} className="rounded-lg bg-ivory px-3 py-2 text-sm">{n.note}<div className="mt-1 text-[11px] text-charcoal/50">{n.authorName || n.createdByName || ''} {fmtDateTime(n.createdAt)}</div></li>
              )) : <li className="text-sm text-charcoal/50">No notes yet.</li>}
            </ul>
            <div className="flex gap-2">
              <input aria-label="New note" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote()} placeholder="Add a note…" className={inputCls} />
              <Button loading={saving} onClick={addNote} disabled={!note.trim()}>Add</Button>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-lg font-semibold">Audit history</h3>
            <ol className="space-y-2 border-l-2 border-gold/40 pl-4">
              {data.audit?.length ? data.audit.map((a, i) => (
                <li key={a._id || i} className="text-sm">
                  <div className="font-semibold">{a.action?.replace(/_/g, ' ')}{a.previousStatus && a.newStatus ? ` · ${a.previousStatus} → ${a.newStatus}` : ''}</div>
                  <div className="text-xs text-charcoal/55">{a.actorName} ({a.actorRole}) · {fmtDateTime(a.createdAt)}</div>
                  {a.reason && <div className="text-xs italic text-charcoal/70">“{a.reason}”</div>}
                </li>
              )) : <li className="text-sm text-charcoal/50">No history.</li>}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  )
}

/* ---------------- Walk-in ---------------- */
const walkSchema = z.object({
  customerName: z.string().trim().min(2, 'Enter the guest name'),
  mobile: z.string().trim().regex(/^$|^[+\d][\d\s-]{8,14}$/, 'Enter a valid mobile number').optional(),
  guestCount: z.coerce.number({ message: 'Enter number of guests' }).int().min(1, 'At least 1 guest').max(100, 'Too many guests'),
  specialRequest: z.string().trim().max(500).optional(),
  seatNow: z.boolean(),
  source: z.string().optional(),
  reservationDate: z.string().optional(),
  startTime: z.string().optional(),
})

export function WalkInModal({ open, onClose, onDone, allowSource = false }) {
  return open ? <WalkInForm onClose={onClose} onDone={onDone} allowSource={allowSource} /> : null
}

function WalkInForm({ onClose, onDone, allowSource }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(walkSchema),
    defaultValues: { customerName: '', mobile: '', guestCount: 2, specialRequest: '', seatNow: true, source: 'WALK_IN', reservationDate: '', startTime: '' },
  })
  const { success } = useToast()
  const [err, setErr] = useState('')
  const seatNow = watch('seatNow')
  const submit = handleSubmit(async (v) => {
    setErr('')
    const body = { customerName: v.customerName, guestCount: v.guestCount, seatNow: v.seatNow, source: allowSource ? v.source : 'WALK_IN' }
    if (v.mobile) body.mobile = v.mobile
    if (v.specialRequest) body.specialRequest = v.specialRequest
    if (!v.seatNow && v.reservationDate) body.reservationDate = v.reservationDate
    if (!v.seatNow && v.startTime) body.startTime = v.startTime
    try {
      const r = await api.post('/staff/walk-in', body)
      success('Booking created')
      onDone?.(r)
    } catch (e) {
      setErr(e.code === 'SLOT_UNAVAILABLE' ? `No tables available: ${e.message}` : e.message)
    }
  })
  return (
    <Modal open title="Add walk-in / phone booking" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Guest name" required error={errors.customerName?.message} {...register('customerName')} autoComplete="off" />
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Mobile (optional)" type="tel" inputMode="tel" error={errors.mobile?.message} {...register('mobile')} />
          <TextInput label="Guests" required type="number" min={1} error={errors.guestCount?.message} {...register('guestCount')} />
        </div>
        {allowSource && <SelectInput label="Source" options={[{ value: 'WALK_IN', label: 'Walk-in' }, { value: 'PHONE', label: 'Phone' }]} {...register('source')} />}
        <TextArea label="Special request" {...register('specialRequest')} />
        <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-ivory px-3 py-3 text-sm font-semibold">
          <input type="checkbox" className="size-5 accent-[#343B31]" {...register('seatNow')} /> Seat now (guests are here)
        </label>
        {!seatNow && (
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Date" type="date" min={todayStr()} {...register('reservationDate')} />
            <TextInput label="Time" type="time" {...register('startTime')} />
          </div>
        )}
        {err && <Alert tone="rose">{err}</Alert>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={isSubmitting}>Create booking</Button>
        </div>
      </form>
    </Modal>
  )
}
