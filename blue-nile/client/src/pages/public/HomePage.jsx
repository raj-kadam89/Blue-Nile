import { Link } from 'react-router-dom'
import { ArrowRight, CalendarCheck2, Clock, Compass, MapPin, Phone, ShieldCheck, Sparkles, Star, UtensilsCrossed } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings.js'
import { useFetch } from '../../hooks/useAsync.js'
import { DishCard, HoursTable, Reveal, SectionHeading, Seo, Skeleton, buildRestaurantJsonLd } from '../../components/ui/PublicUi.jsx'

const KNOWN_FAVOURITES = [
  { name: 'Chicken Biryani', cat: 'Biryani' },
  { name: 'Mutton Biryani', cat: 'Biryani' },
  { name: 'Chicken Tandoori', cat: 'Kebabs' },
  { name: 'Mutton Seekh Kebab', cat: 'Kebabs' },
  { name: 'Chicken Kebabs', cat: 'Kebabs' },
  { name: 'Caramel Custard', cat: 'Desserts' },
]

export default function HomePage() {
  const { settings, restaurant, content, openingHours, loading: settingsLoading } = useSettings()
  const { data: menuData, loading: menuLoading } = useFetch('/menu')
  const { data: galleryData } = useFetch('/public/gallery')

  const home = content.home || {}
  const items = menuData?.items || []
  const categories = menuData?.categories || []
  const sigIds = new Set((home.signatureItemIds || []).map(String))
  const signatures = items.filter((i) => sigIds.has(String(i._id)) || i.featured).slice(0, 6)
  const testimonials = (content.testimonials || []).filter((t) => t?.text)
  const gallery = (galleryData?.items || []).slice(0, 4)

  const heroImg = home.heroImage || '/images/hero.svg'
  const introImg = home.introImage || '/images/interior.svg'
  const phone = restaurant.phone || '020 2612 5238'
  const address = restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India'
  const mapsUrl = restaurant.mapsUrl || 'https://www.google.com/maps/search/?api=1&query=Blue+Nile+102+Bund+Garden+Road+Agarkar+Nagar+Pune+411001'

  return (
    <>
      <Seo
        title="Biryani, Kebabs & Dining in Pune"
        description="Reserve a table at BLUE NILE, Bund Garden Road, Pune. Known for Chicken Biryani, Mutton Biryani, kebabs and Indian cuisine."
        path="/"
        jsonLd={buildRestaurantJsonLd(settings)}
      />

      {/* 1. HERO */}
      <section className="relative overflow-hidden bg-charcoal text-ivory">
        <div className="absolute inset-0 opacity-45">
          <img src={heroImg} alt="Biryani served in a traditional handi" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40" />
        </div>

        <div className="container-x relative z-10 grid min-h-[78vh] items-center gap-10 py-20 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow">Bund Garden Road · Pune</p>
            <h1 className="mt-3 font-serif text-5xl font-semibold leading-[1.04] tracking-tight text-ivory sm:text-6xl lg:text-7xl">
              {home.heroHeadline || 'Pune’s table for biryani, kebabs and slow-cooked Indian classics'}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ivory/80 sm:text-lg">
              {home.heroSubtext || 'Reserve your table at Blue Nile with real-time seating availability and instant mobile verification.'}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/reserve" className="btn btn-primary">
                <CalendarCheck2 className="size-4" aria-hidden="true" />Reserve a Table
              </Link>
              <Link to="/menu" className="btn btn-outline text-ivory">
                Explore Menu <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid max-w-xl grid-cols-3 gap-6 border-t border-white/15 pt-6 text-xs">
              <div>
                <div className="flex items-center gap-1 font-serif text-2xl font-semibold text-gold-light">
                  <Star className="size-4 fill-gold text-gold" aria-hidden="true" />
                  {restaurant.googleRating || 4.1} / 5
                </div>
                <p className="mt-0.5 text-ivory/60">{Number(restaurant.googleReviewCount || 18455).toLocaleString('en-IN')} Google reviews (listing data)</p>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold text-gold-light">₹400–₹1,200</div>
                <p className="mt-0.5 text-ivory/60">Typical spend per guest (listing data)</p>
              </div>
              <div>
                <div className="font-serif text-2xl font-semibold text-gold-light">Agarkar Nagar</div>
                <p className="mt-0.5 text-ivory/60">102, Bund Garden Road</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. RESTAURANT INTRODUCTION */}
      <section className="container-x py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-6">
            <SectionHeading
              eyebrow="Welcome to Blue Nile"
              title="An established Pune dining room for biryani & kebabs"
              subtitle={home.intro || 'Located on Bund Garden Road in Agarkar Nagar, Blue Nile is known across Pune for its biryani, chargrilled kebabs, Indian mains and classic caramel custard.'}
            />
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/about" className="btn btn-dark">About the Restaurant</Link>
              <Link to="/contact" className="btn btn-outline">Directions & Hours</Link>
            </div>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-6">
            <div className="relative border border-gold/40 bg-charcoal p-3">
              <img src={introImg} alt="Warm dining room illustration" loading="lazy" className="aspect-[4/3] w-full object-cover" />
              <div className="mt-3 flex items-center justify-between px-2 py-1 text-xs text-ivory/75">
                <span>102, Bund Garden Road, Pune</span>
                <span className="text-gold">{restaurant.cuisine || 'Biryani & Indian Cuisine'}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 3. SIGNATURE DISHES */}
      <section className="border-y border-charcoal/10 bg-ivory-dark/60 py-20">
        <div className="container-x">
          <SectionHeading
            eyebrow="From the Kitchen"
            title="Signature & Popular Dishes"
            subtitle="Dishes guests frequently ask for at Blue Nile. Live prices and availability are managed directly by the restaurant."
          />
          {menuLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-80" />)}
            </div>
          ) : signatures.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {signatures.map((item) => <DishCard key={item._id} item={item} LinkComponent={Link} />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {KNOWN_FAVOURITES.map((d) => (
                <div key={d.name} className="flex items-center justify-between border border-charcoal/15 bg-white p-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-widest text-gold">{d.cat}</p>
                    <h3 className="mt-1 font-serif text-2xl font-semibold">{d.name}</h3>
                    <p className="mt-1 text-xs text-charcoal/60">Popular at Blue Nile · See menu for current availability</p>
                  </div>
                  <UtensilsCrossed className="size-5 text-gold" aria-hidden="true" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-10 text-center">
            <Link to="/menu" className="btn btn-dark">Browse Full Menu</Link>
          </div>
        </div>
      </section>

      {/* 4. POPULAR MENU CATEGORIES */}
      {categories.length > 0 && (
        <section className="container-x py-20">
          <SectionHeading eyebrow="Curated Courses" title="Explore by Category" />
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {categories.map((c, idx) => (
              <Link
                key={c._id}
                to={`/menu?category=${encodeURIComponent(c.slug)}`}
                className="group flex flex-col justify-between border border-charcoal/15 bg-white p-6 transition-colors hover:border-gold hover:bg-charcoal hover:text-ivory"
              >
                <span className="font-mono text-xs text-gold">0{idx + 1}</span>
                <div className="mt-6">
                  <h3 className="font-serif text-2xl font-semibold">{c.name}</h3>
                  {c.description && <p className="mt-1 text-xs opacity-70">{c.description}</p>}
                </div>
                <span className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold">
                  Explore <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 5. ATMOSPHERE + 6. WHY DINE WITH US */}
      <section className="bg-charcoal py-20 text-ivory lg:py-24">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              light
              eyebrow="The Dining Experience"
              title="Unhurried meals, attentive table service"
              subtitle="Whether you are stopping by for a weekday lunch on Bund Garden Road or gathering family for weekend biryani, reserve online to see live seating for your time slot."
            />
            <img src="/images/kebabs.svg" alt="Charcoal kebabs platter illustration" loading="lazy" className="mt-6 aspect-[16/10] w-full border border-gold/30 object-cover" />
          </div>
          <div className="grid gap-6 self-center sm:grid-cols-2 lg:col-span-7">
            {(home.whyDine?.length ? home.whyDine : [
              { title: 'Live seat availability', text: 'Real-time table capacity is checked for your exact date, time slot and party size.' },
              { title: 'Signature biryani & kebabs', text: 'Known for Chicken Biryani, Mutton Biryani, Chicken Tandoori, Mutton Seekh Kebab and Caramel Custard.' },
              { title: 'Verified mobile bookings', text: 'Quick OTP verification keeps reservations genuine and lets you check or cancel online.' },
              { title: 'Central Pune address', text: 'Conveniently situated at 102, Bund Garden Road, Agarkar Nagar, Pune.' },
            ]).map((w, i) => (
              <div key={i} className="border border-white/12 bg-white/[0.03] p-6">
                <Sparkles className="size-5 text-gold" aria-hidden="true" />
                <h3 className="mt-3 font-serif text-2xl font-semibold text-ivory">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ivory/70">{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. GUEST REVIEWS (only if owner configured verified testimonials) */}
      {testimonials.length > 0 && (
        <section className="container-x py-20">
          <SectionHeading eyebrow="Guest Words" title="What Diners Note" />
          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <blockquote key={i} className="flex flex-col justify-between border border-charcoal/15 bg-white p-6">
                <p className="font-serif text-xl italic leading-relaxed text-charcoal">“{t.text}”</p>
                <footer className="mt-4 border-t border-charcoal/10 pt-3 text-xs uppercase tracking-wider text-charcoal/65">
                  {t.name}{t.source ? ` · ${t.source}` : ''}
                </footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      {/* 8. GALLERY PREVIEW (only when gallery has images) */}
      {gallery.length > 0 && (
        <section className="container-x py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading eyebrow="Visuals" title="From the Gallery" />
            <Link to="/gallery" className="btn btn-outline mb-10">Open Gallery</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((g) => (
              <Link key={g._id} to="/gallery" className="img-zoom block aspect-square overflow-hidden border border-charcoal/15 bg-charcoal">
                <img src={g.url} alt={g.caption || g.category} loading="lazy" className="h-full w-full object-cover" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 9. LOCATION & CONTACT */}
      <section className="border-t border-charcoal/10 bg-white py-20">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <SectionHeading eyebrow="Visit Us" title="Location & Hours" />
            <div className="space-y-4 text-sm">
              <p className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                <span><strong className="block text-charcoal">Address</strong>{address}</span>
              </p>
              <p className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
                <span><strong className="block text-charcoal">Telephone</strong><a href={`tel:${phone}`} className="text-olive underline">{phone}</a></span>
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark">
                <Compass className="size-4" aria-hidden="true" />Open in Google Maps
              </a>
              <Link to="/contact" className="btn btn-outline">Send an Enquiry</Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="border border-charcoal/15 bg-ivory p-6">
              <h3 className="mb-3 flex items-center gap-2 font-serif text-2xl font-semibold">
                <Clock className="size-5 text-gold" aria-hidden="true" />Opening Hours
              </h3>
              {settingsLoading ? <Skeleton className="h-48" /> : <HoursTable openingHours={openingHours} hoursVerified={settings?.hoursVerified} />}
            </div>
          </div>
        </div>
      </section>

      {/* 10. RESERVATION CTA */}
      <section className="bg-olive py-16 text-ivory">
        <div className="container-x flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="eyebrow">Table Reservations</p>
            <h2 className="mt-1 font-serif text-3xl font-semibold sm:text-4xl">Reserve your table at Blue Nile</h2>
            <p className="mt-2 text-sm text-ivory/80">Choose your date, guest count and time slot with live seat availability.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/reserve" className="btn btn-primary">Reserve Now</Link>
            <Link to="/booking-status" className="btn btn-outline text-ivory">Check Existing Booking</Link>
          </div>
        </div>
      </section>
    </>
  )
}

export const _unusedIcon = ShieldCheck
