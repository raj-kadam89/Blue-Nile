import { useEffect, useId, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { DAY_NAMES, formatPrice, formatTime, STATUS_INFO } from '../../utils/format.js'

const cx = (...a) => a.filter(Boolean).join(' ')

export function Seo({ title, description, path = '', jsonLd }) {
  const fullTitle = title ? `${title} · BLUE NILE, Pune` : 'BLUE NILE · Biryani & Indian Restaurant in Pune'
  const desc = description || 'BLUE NILE on Bund Garden Road, Pune — reserve a table online with live seating availability, explore the menu and plan your visit.'
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      {path && <meta property="og:url" content={path} />}
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  )
}

export function buildRestaurantJsonLd(settings) {
  const r = settings?.restaurant || {}
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name || 'Blue Nile',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '102, Bund Garden Road, Agarkar Nagar',
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      postalCode: '411001',
      addressCountry: 'IN',
    },
    telephone: r.phone || '020 2612 5238',
    servesCuisine: ['Indian', 'Biryani', 'North Indian', 'Mughlai'],
    priceRange: '₹400–₹1,200',
    acceptsReservations: 'True',
  }
  if (r.googleRating && r.googleReviewCount) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: r.googleRating, reviewCount: r.googleReviewCount, bestRating: 5 }
  }
  if (settings?.hoursVerified && Array.isArray(settings?.openingHours)) {
    ld.openingHoursSpecification = settings.openingHours.filter((h) => !h.closed && h.open && h.close).map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_NAMES[h.day],
      opens: h.open,
      closes: h.close,
    }))
  }
  return ld
}

export function Reveal({ children, delay = 0, className }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left', light = false, as: Tag = 'h2' }) {
  const center = align === 'center'
  return (
    <div className={cx('mb-10', center && 'mx-auto max-w-2xl text-center')}>
      {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
      <Tag className={cx('font-serif text-3xl font-semibold leading-[1.12] sm:text-4xl md:text-5xl', light ? 'text-ivory' : 'text-charcoal')}>{title}</Tag>
      <div className={cx('mt-3 h-px w-14 bg-gold', center && 'mx-auto')} aria-hidden="true" />
      {subtitle && <p className={cx('mt-4 max-w-2xl text-base leading-relaxed', light ? 'text-ivory/75' : 'text-charcoal/70', center && 'mx-auto')}>{subtitle}</p>}
    </div>
  )
}

export function Spinner({ className = 'size-4' }) {
  return <Loader2 className={cx('animate-spin', className)} aria-hidden="true" />
}

const TONE = {
  amber: 'border-amber-500/40 bg-amber-500/15 text-amber-900',
  green: 'border-emerald-600/40 bg-emerald-600/15 text-emerald-900',
  red: 'border-rose-600/40 bg-rose-600/15 text-rose-900',
  neutral: 'border-charcoal/20 bg-charcoal/5 text-charcoal/80',
  gold: 'border-gold/50 bg-gold/15 text-charcoal',
}
export function Badge({ tone = 'neutral', children, className }) {
  return <span className={cx('inline-flex items-center gap-1.5 border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-widest', TONE[tone] || TONE.neutral, className)}>{children}</span>
}

export function StatusPill({ status }) {
  const info = STATUS_INFO[status] || { label: status, tone: 'neutral' }
  return <Badge tone={info.tone}>{info.label}</Badge>
}

export function VegDot({ isVeg }) {
  return (
    <span
      title={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      aria-label={isVeg ? 'Vegetarian' : 'Non-vegetarian'}
      className={cx('inline-grid size-4 shrink-0 place-items-center border', isVeg ? 'border-emerald-700' : 'border-rose-700')}
    >
      <span className={cx('size-2 rounded-full', isVeg ? 'bg-emerald-700' : 'bg-rose-700')} />
    </span>
  )
}

export function Skeleton({ className = 'h-6 w-full' }) {
  return <div className={cx('skeleton', className)} aria-hidden="true" />
}

export function ErrorBlock({ error, onRetry }) {
  return (
    <div role="alert" className="border border-rose-300 bg-rose-50/80 p-6 text-center">
      <AlertTriangle className="mx-auto size-6 text-rose-700" aria-hidden="true" />
      <p className="mt-2 font-serif text-xl font-semibold text-charcoal">Something didn’t load</p>
      <p className="mt-1 text-sm text-charcoal/70">{error?.message || 'Please try again in a moment.'}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn btn-dark btn-sm mt-4">Try again</button>}
    </div>
  )
}

export function Field({ label, required, error, hint, children }) {
  const id = useId()
  return (
    <div>
      {label && <label htmlFor={id} className="field-label">{label}{required && <span className="text-rose-700"> *</span>}</label>}
      {typeof children === 'function' ? children({ id, 'aria-invalid': !!error }) : children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal/55">{hint}</p>}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  )
}

export function Modal({ open, onClose, title, children }) {
  const id = useId()
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current?.() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/70 p-4 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div role="dialog" aria-modal="true" aria-labelledby={id} className="w-full max-w-lg border border-gold/40 bg-ivory p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-charcoal/15 pb-3">
          <h2 id={id} className="font-serif text-2xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="p-1 text-charcoal/60 hover:text-charcoal"><X className="size-5" /></button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

export function DishCard({ item, LinkComponent }) {
  const L = LinkComponent
  const img = item.image || (item.category?.slug === 'desserts' ? '/images/dessert.svg' : item.category?.slug === 'kebabs' ? '/images/kebabs.svg' : '/images/hero.svg')
  return (
    <article className="group flex flex-col border border-charcoal/12 bg-white transition-colors hover:border-gold">
      <L to={`/menu/${item.slug}`} className="img-zoom relative block aspect-[4/3] overflow-hidden bg-charcoal">
        <img src={img} alt={item.name} loading="lazy" className="h-full w-full object-cover opacity-95" />
        {!item.available && (
          <span className="absolute left-3 top-3 bg-charcoal/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ivory">Currently unavailable</span>
        )}
        {item.featured && item.available && (
          <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-charcoal">Signature</span>
        )}
      </L>
      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-2">
            <L to={`/menu/${item.slug}`} className="font-serif text-2xl font-semibold leading-snug text-charcoal group-hover:text-olive">
              {item.name}
            </L>
            <VegDot isVeg={item.isVeg} />
          </div>
          {item.category?.name && <p className="mt-0.5 text-[11px] uppercase tracking-widest text-charcoal/50">{item.category.name}</p>}
          {item.description && <p className="mt-2 line-clamp-2 text-sm text-charcoal/70">{item.description}</p>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-charcoal/10 pt-3">
          <span className="font-serif text-lg font-semibold text-charcoal">{formatPrice(item.price)}</span>
          <L to={`/menu/${item.slug}`} className="text-xs font-semibold uppercase tracking-widest text-olive group-hover:text-gold">View dish →</L>
        </div>
      </div>
    </article>
  )
}

export function HoursTable({ openingHours = [], hoursVerified = false, dark = false }) {
  const today = new Date().getDay()
  return (
    <div>
      <dl className={cx('divide-y text-sm', dark ? 'divide-white/10 text-ivory/85' : 'divide-charcoal/10 text-charcoal/85')}>
        {DAY_NAMES.map((day, idx) => {
          const row = openingHours.find((h) => h.day === idx)
          const isToday = idx === today
          return (
            <div key={day} className={cx('flex items-center justify-between py-2', isToday && 'font-semibold text-gold')}>
              <dt>{day}{isToday ? ' (Today)' : ''}</dt>
              <dd>{!row || row.closed ? 'Closed' : `${formatTime(row.open)} – ${formatTime(row.close)}`}</dd>
            </div>
          )
        })}
      </dl>
      {!hoursVerified && (
        <p className={cx('mt-2 text-xs italic', dark ? 'text-ivory/55' : 'text-charcoal/55')}>
          Hours shown are provisional and subject to owner verification. Please call ahead on holidays.
        </p>
      )}
    </div>
  )
}

export function OtpDigits({ value = '', onChange, disabled }) {
  const refs = useRef([])
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '')
  const setAt = (idx, char) => {
    const clean = char.replace(/\D/g, '').slice(-1)
    const next = digits.map((d, i) => (i === idx ? clean : d)).join('')
    onChange(next)
    if (clean && idx < 5) refs.current[idx + 1]?.focus()
  }
  const onPaste = (e) => {
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (pasted) { e.preventDefault(); onChange(pasted); refs.current[Math.min(pasted.length, 5)]?.focus() }
  }
  return (
    <div className="flex gap-2 sm:gap-3" onPaste={onPaste} role="group" aria-label="6-digit verification code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          value={d}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus() }}
          className="h-13 w-11 border border-charcoal/25 bg-white text-center font-mono text-xl font-semibold focus:border-gold focus:outline-none sm:w-12"
        />
      ))}
    </div>
  )
}
