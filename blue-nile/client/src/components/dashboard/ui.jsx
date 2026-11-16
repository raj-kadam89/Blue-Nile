import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, Loader2, X } from 'lucide-react'
import { STATUS_META } from './format.js'

const cx = (...a) => a.filter(Boolean).join(' ')

export function Spinner({ className = 'size-4' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden="true" />
}

const BTN = {
  primary: 'bg-charcoal text-ivory hover:bg-charcoal-soft border-charcoal',
  gold: 'bg-gold text-charcoal hover:bg-gold-light border-gold',
  outline: 'bg-white text-charcoal border-[#d9d2c1] hover:bg-ivory',
  ghost: 'bg-transparent text-charcoal border-transparent hover:bg-black/5',
  danger: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700',
  success: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700',
  soft: 'bg-ivory-dark/60 text-charcoal border-transparent hover:bg-ivory-dark',
}
const BTN_SIZE = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-5 text-base' }

export function Button({ variant = 'primary', size = 'md', loading, icon: Icon, className, children, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-gold',
        BTN[variant], BTN_SIZE[size], className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

export function IconButton({ label, icon: Icon, className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('inline-grid size-9 place-items-center rounded-lg text-charcoal/70 transition-colors hover:bg-black/5 hover:text-charcoal', className)}
      {...rest}
    >
      <Icon className="size-4.5" aria-hidden="true" />
    </button>
  )
}

export function Badge({ children, className }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', className || 'bg-stone-100 text-stone-700 ring-stone-200')}>{children}</span>
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: '' }
  return <Badge className={m.cls}>{m.label}</Badge>
}

export function Card({ className, children, ...rest }) {
  return <div className={cx('rounded-xl border border-[#e7e2d6] bg-white shadow-[0_1px_2px_rgba(23,23,23,0.04)]', className)} {...rest}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-3xl font-semibold leading-tight text-charcoal sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-charcoal/60">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

const TONES = {
  gold: 'bg-gold/15 text-[#8a6a33]',
  amber: 'bg-amber-100 text-amber-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  sky: 'bg-sky-100 text-sky-700',
  rose: 'bg-rose-100 text-rose-700',
  stone: 'bg-stone-200 text-stone-700',
  indigo: 'bg-indigo-100 text-indigo-700',
}
export function StatCard({ label, value, icon: Icon, tone = 'gold', hint, loading, to, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      onClick={onClick}
      data-to={to}
      className={cx('rounded-xl border border-[#e7e2d6] bg-white p-4 text-left shadow-[0_1px_2px_rgba(23,23,23,0.04)]', onClick && 'transition-shadow hover:shadow-md')}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/55">{label}</span>
        {Icon && <span className={cx('grid size-8 place-items-center rounded-lg', TONES[tone])}><Icon className="size-4" aria-hidden="true" /></span>}
      </div>
      {loading ? <div className="dash-skeleton mt-3 h-8 w-16" /> : <div className="num mt-2 font-serif text-3xl font-semibold text-charcoal">{value ?? '—'}</div>}
      {hint && <div className="mt-1 text-xs text-charcoal/55">{hint}</div>}
    </Tag>
  )
}

export function Skeleton({ className = 'h-4 w-full' }) {
  return <div className={cx('dash-skeleton', className)} aria-hidden="true" />
}

export function SkeletonList({ rows = 4, className = 'h-24' }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className={cx('w-full', className)} />)}
    </div>
  )
}

export function EmptyState({ title = 'Nothing here yet', text, icon: Icon = Inbox, action }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-[#d9d2c1] bg-white/60 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-ivory-dark text-charcoal/60"><Icon className="size-5" aria-hidden="true" /></span>
      <h3 className="mt-3 font-serif text-xl font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-charcoal/60">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="grid place-items-center rounded-xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <AlertTriangle className="size-6 text-rose-600" aria-hidden="true" />
      <p className="mt-2 font-semibold text-rose-800">Couldn’t load this data</p>
      <p className="mt-1 text-sm text-rose-700">{error?.message || 'Please try again.'}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

export function Alert({ tone = 'amber', children, className }) {
  const t = { amber: 'border-amber-200 bg-amber-50 text-amber-900', rose: 'border-rose-200 bg-rose-50 text-rose-800', emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800', sky: 'border-sky-200 bg-sky-50 text-sky-900' }[tone]
  return <div role={tone === 'rose' ? 'alert' : 'status'} className={cx('rounded-lg border px-3 py-2 text-sm', t, className)}>{children}</div>
}

export function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return total != null ? <p className="num mt-3 text-xs text-charcoal/55">{total} result{total === 1 ? '' : 's'}</p> : null
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="num text-xs text-charcoal/55">{total} results · page {page} of {pages}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">Prev</Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page">Next <ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
  )
}

/** Simple responsive table: columns [{key,header,render?,className?}] */
export function DataTable({ columns, rows, rowKey = '_id', onRowClick, empty }) {
  if (!rows?.length) return empty || <EmptyState />
  return (
    <div className="dash-scroll overflow-x-auto rounded-xl border border-[#e7e2d6] bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-ivory/70 text-xs uppercase tracking-wider text-charcoal/55">
          <tr>{columns.map((c) => <th key={c.key} scope="col" className={cx('px-3 py-2.5 font-semibold', c.className)}>{c.header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#efeadd]">
          {rows.map((r) => (
            <tr
              key={r[rowKey]}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(r) } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              className={cx(onRowClick && 'cursor-pointer hover:bg-ivory/60 focus-visible:bg-ivory/60')}
            >
              {columns.map((c) => <td key={c.key} className={cx('px-3 py-2.5 align-middle', c.className)}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Modal({ open = true, onClose, title, children, footer, size = 'md', drawer = false, labelledBy }) {
  const ref = useRef(null)
  const id = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    if (!open) return undefined
    const prev = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => {
      const el = ref.current?.querySelector('input,select,textarea,button:not([data-close])')
      ;(el || ref.current)?.focus()
    }, 30)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      clearTimeout(t)
      prev?.focus?.()
    }
  }, [open])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return (
    <div className={cx('fixed inset-0 z-[100] flex bg-charcoal/50 backdrop-blur-[2px]', drawer ? 'justify-end' : 'items-end justify-center p-0 sm:items-center sm:p-4')} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || id}
        tabIndex={-1}
        className={cx(
          'flex w-full flex-col bg-white shadow-2xl outline-none',
          drawer ? 'dash-slide h-full max-w-xl' : cx('dash-pop max-h-[92vh] rounded-t-2xl sm:rounded-2xl', w),
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#eee9dc] px-5 py-4">
          <h2 id={id} className="font-serif text-2xl font-semibold">{title}</h2>
          <IconButton label="Close" icon={X} onClick={onClose} data-close="1" />
        </div>
        <div className="dash-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[#eee9dc] bg-ivory/40 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, requireReason, reasonLabel = 'Reason', onConfirm, onClose }) {
  return open ? (
    <ConfirmInner title={title} message={message} confirmLabel={confirmLabel} danger={danger} requireReason={requireReason} reasonLabel={reasonLabel} onConfirm={onConfirm} onClose={onClose} />
  ) : null
}

function ConfirmInner({ title, message, confirmLabel, danger, requireReason, reasonLabel, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async () => {
    if (requireReason && reason.trim().length < 3) { setErr('A reason is required (at least 3 characters).'); return }
    setBusy(true); setErr('')
    try { await onConfirm(reason.trim()) } catch (e) { setErr(e.message); setBusy(false); return }
    setBusy(false)
  }
  return (
    <Modal open size="sm" title={title} onClose={busy ? undefined : onClose} footer={(
      <>
        <Button variant="outline" onClick={onClose} disabled={busy}>Keep as is</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={submit}>{confirmLabel}</Button>
      </>
    )}>
      {message && <p className="mb-3 text-sm text-charcoal/75">{message}</p>}
      {requireReason && (
        <label className="block text-sm font-semibold">
          {reasonLabel} <span className="text-rose-600">*</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            aria-required="true"
            aria-invalid={!!err}
            className="mt-1 w-full rounded-lg border border-[#d9d2c1] bg-white px-3 py-2 text-sm font-normal focus:border-gold"
            placeholder="Visible in the audit log"
          />
        </label>
      )}
      {err && <Alert tone="rose" className="mt-3">{err}</Alert>}
    </Modal>
  )
}
