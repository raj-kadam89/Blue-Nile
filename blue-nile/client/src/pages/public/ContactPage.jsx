import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2, Compass, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import api from '../../services/api.js'
import { useSettings } from '../../hooks/useSettings.js'
import { Field, HoursTable, Seo, buildRestaurantJsonLd } from '../../components/ui/PublicUi.jsx'

const schema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(100),
  mobile: z.string().trim().regex(/^$|^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number').optional(),
  email: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Please write a short message (at least 5 characters)').max(2000),
})

export default function ContactPage() {
  const { settings, restaurant, openingHours } = useSettings()
  const [sent, setSent] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', mobile: '', email: '', message: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerErr('')
    try {
      await api.post('/public/contact', values)
      setSent(true)
      reset()
    } catch (e) {
      setServerErr(e.message)
    }
  })

  const phone = restaurant.phone || '020 2612 5238'
  const address = restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India'
  const mapsUrl = restaurant.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Blue+Nile+102+Bund+Garden+Road+Agarkar+Nagar+Pune+411001'
  const waDigits = String(restaurant.whatsapp || '').replace(/\D/g, '')

  return (
    <>
      <Seo title="Contact & Directions" description="Address, telephone, opening hours and enquiry form for Blue Nile, 102 Bund Garden Road, Pune." path="/contact" jsonLd={buildRestaurantJsonLd(settings)} />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Get in Touch</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Contact & Directions</h1>
          <p className="mt-3 max-w-2xl text-sm text-ivory/75">102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001.</p>
        </div>
      </section>

      <section className="container-x py-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-6">
            <div className="border border-charcoal/15 bg-white p-6">
              <h2 className="font-serif text-2xl font-semibold">Direct Contact</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <div><dt className="font-semibold">Address</dt><dd className="text-charcoal/75">{address}</dd></div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                  <div><dt className="font-semibold">Telephone</dt><dd><a href={`tel:${phone}`} className="text-olive underline">{phone}</a></dd></div>
                </div>
                {waDigits && (
                  <div className="flex items-start gap-3">
                    <MessageCircle className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                    <div><dt className="font-semibold">WhatsApp</dt><dd><a href={`https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}`} target="_blank" rel="noopener noreferrer" className="text-olive underline">Chat on WhatsApp</a></dd></div>
                  </div>
                )}
                {restaurant.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                    <div><dt className="font-semibold">Email</dt><dd><a href={`mailto:${restaurant.email}`} className="text-olive underline">{restaurant.email}</a></dd></div>
                  </div>
                )}
              </dl>
              <div className="mt-6">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                  <Compass className="size-4" aria-hidden="true" />Directions on Google Maps
                </a>
              </div>
            </div>

            <div className="border border-charcoal/15 bg-white p-6">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Opening Hours</h2>
              <HoursTable openingHours={openingHours} hoursVerified={settings?.hoursVerified} />
            </div>

            {restaurant.mapsEmbedUrl && (
              <div className="overflow-hidden border border-charcoal/15">
                <iframe title="Blue Nile on Google Maps" src={restaurant.mapsEmbedUrl} className="h-72 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            )}
          </div>

          <div className="lg:col-span-6">
            <div className="border border-charcoal/15 bg-white p-8">
              <p className="eyebrow">Write to Us</p>
              <h2 className="mt-1 font-serif text-3xl font-semibold">Send an Enquiry</h2>
              <p className="mt-2 text-sm text-charcoal/70">For group dining questions, feedback or general enquiries. To book a table immediately, use our online reservation page.</p>

              {sent ? (
                <div role="status" className="mt-6 border border-emerald-600/40 bg-emerald-50 p-6">
                  <CheckCircle2 className="size-6 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-2 font-serif text-2xl font-semibold">Enquiry received</h3>
                  <p className="mt-1 text-sm text-charcoal/75">Thank you for reaching out to Blue Nile. Our team will respond shortly.</p>
                  <button type="button" onClick={() => setSent(false)} className="btn btn-dark btn-sm mt-4">Send another message</button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
                  <Field label="Full Name" required error={errors.name?.message}>
                    {(p) => <input {...p} {...register('name')} className="field-input" autoComplete="name" />}
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Mobile Number" error={errors.mobile?.message} hint="10-digit Indian mobile">
                      {(p) => <input {...p} type="tel" inputMode="numeric" maxLength={10} {...register('mobile')} className="field-input" autoComplete="tel" />}
                    </Field>
                    <Field label="Email (optional)" error={errors.email?.message}>
                      {(p) => <input {...p} type="email" {...register('email')} className="field-input" autoComplete="email" />}
                    </Field>
                  </div>
                  <Field label="Your Message" required error={errors.message?.message}>
                    {(p) => <textarea {...p} rows={5} {...register('message')} className="field-input" />}
                  </Field>
                  {serverErr && <p role="alert" className="field-error">{serverErr}</p>}
                  <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                    {isSubmitting ? 'Sending…' : 'Submit Enquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
