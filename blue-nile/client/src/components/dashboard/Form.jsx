import { useId } from 'react'

export const inputCls = 'w-full rounded-lg border border-[#d9d2c1] bg-white px-3 h-10 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold disabled:bg-stone-100 aria-[invalid=true]:border-rose-400'
export const textareaCls = 'w-full rounded-lg border border-[#d9d2c1] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/35 focus:border-gold aria-[invalid=true]:border-rose-400'

/** Label + control + error wrapper. `children` is a render-prop-free element; we pass ids via function when needed. */
export function Field({ label, error, hint, required, className = '', children }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold uppercase tracking-wide text-charcoal/65">
        {label}{required && <span className="text-rose-600"> *</span>}
      </label>
      {typeof children === 'function' ? children({ id, 'aria-invalid': !!error }) : children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal/50">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

export function TextInput({ label, error, hint, required, className, wrapperClass, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      {(p) => <input {...p} {...rest} className={`${inputCls} ${className || ''}`} />}
    </Field>
  )
}

export function TextArea({ label, error, hint, required, rows = 3, wrapperClass, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      {(p) => <textarea rows={rows} {...p} {...rest} className={textareaCls} />}
    </Field>
  )
}

export function SelectInput({ label, error, hint, required, options, placeholder, wrapperClass, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      {(p) => (
        <select {...p} {...rest} className={inputCls}>
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (typeof o === 'object' ? <option key={o.value} value={o.value}>{o.label}</option> : <option key={o} value={o}>{o}</option>))}
        </select>
      )}
    </Field>
  )
}

export function Toggle({ checked, onChange, label, disabled, description }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-stone-300 transition-colors peer-checked:bg-olive peer-focus-visible:outline-2 peer-focus-visible:outline-gold" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
      <span className="text-sm">
        <span className="font-semibold">{label}</span>
        {description && <span className="block text-xs text-charcoal/55">{description}</span>}
      </span>
    </label>
  )
}
