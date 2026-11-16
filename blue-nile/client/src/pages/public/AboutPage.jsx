import { Link } from 'react-router-dom'
import { CalendarCheck2, MapPin, Utensils } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings.js'
import { Reveal, SectionHeading, Seo } from '../../components/ui/PublicUi.jsx'
import { splitParagraphs } from '../../utils/format.js'

export default function AboutPage() {
  const { restaurant, content } = useSettings()
  const about = content.about || {}
  const storyParas = splitParagraphs(about.story)
  const philosophyParas = splitParagraphs(about.philosophy)
  const experienceParas = splitParagraphs(about.experience)
  const images = (about.images || []).filter(Boolean)

  return (
    <>
      <Seo title="About Us" description="About Blue Nile on Bund Garden Road, Pune — our cuisine philosophy and dining experience." path="/about" />

      <section className="border-b border-charcoal/10 bg-charcoal py-16 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Bund Garden Road · Pune</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">About {restaurant.name || 'Blue Nile'}</h1>
          <p className="mt-3 max-w-2xl text-base text-ivory/75">
            {restaurant.cuisine || 'Biryani Restaurant / Indian Restaurant'} at {restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune'}.
          </p>
        </div>
      </section>

      <section className="container-x py-16 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <SectionHeading eyebrow="Our Story & Heritage" title="A Pune landmark for biryani & Indian dining" />
            {about.historyVerified && storyParas.length > 0 ? (
              <div className="prose-bn text-base text-charcoal/80">
                {storyParas.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            ) : (
              <div className="border border-gold/40 bg-white p-6 text-sm leading-relaxed text-charcoal/75">
                <p>
                  Blue Nile is an established biryani and Indian restaurant located at 102, Bund Garden Road, Agarkar Nagar, Pune.
                  Detailed historical notes are published here once verified directly by the restaurant owner.
                </p>
              </div>
            )}
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-5">
            <div className="border border-charcoal/15 bg-white p-6">
              <p className="eyebrow">At a Glance</p>
              <dl className="mt-4 divide-y divide-charcoal/10 text-sm">
                <div className="py-3">
                  <dt className="text-xs uppercase tracking-wider text-charcoal/55">Category</dt>
                  <dd className="mt-0.5 font-serif text-xl font-semibold">{restaurant.cuisine || 'Biryani & Indian Restaurant'}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs uppercase tracking-wider text-charcoal/55">Known For</dt>
                  <dd className="mt-0.5">Chicken Biryani, Mutton Biryani, Chicken Tandoori, Mutton Seekh Kebab, Chicken Kebabs, Caramel Custard</dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs uppercase tracking-wider text-charcoal/55">Location</dt>
                  <dd className="mt-0.5 flex items-start gap-1.5"><MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />{restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune 411001'}</dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs uppercase tracking-wider text-charcoal/55">Average Spend</dt>
                  <dd className="mt-0.5">{restaurant.averageSpend || '₹400–₹1,200 per person (listing data)'}</dd>
                </div>
              </dl>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/reserve" className="btn btn-primary"><CalendarCheck2 className="size-4" aria-hidden="true" />Reserve a Table</Link>
                <Link to="/menu" className="btn btn-outline"><Utensils className="size-4" aria-hidden="true" />View Menu</Link>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-8 border-t border-charcoal/10 pt-16 md:grid-cols-2">
          <div className="border border-charcoal/12 bg-white p-8">
            <p className="eyebrow">Cuisine Philosophy</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">Slow-cooked biryani & charcoal kebabs</h2>
            <div className="prose-bn mt-3 text-sm text-charcoal/75">
              {philosophyParas.length > 0 ? philosophyParas.map((p, i) => <p key={i}>{p}</p>) : (
                <p>
                  Our kitchen focuses on fragrant dum biryani, marinated tandoori meats and classic North Indian and Mughlai accompaniments,
                  finished with house favourites such as caramel custard.
                </p>
              )}
            </div>
          </div>

          <div className="border border-charcoal/12 bg-white p-8">
            <p className="eyebrow">Dining Experience</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">Welcoming families, groups & everyday diners</h2>
            <div className="prose-bn mt-3 text-sm text-charcoal/75">
              {experienceParas.length > 0 ? experienceParas.map((p, i) => <p key={i}>{p}</p>) : (
                <p>
                  Reserve a table online for lunch or dinner, check live seating availability for your party size, and let us know about
                  birthdays, anniversaries or group seating needs in advance.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {(images.length ? images : ['/images/hero.svg', '/images/kebabs.svg', '/images/interior.svg']).slice(0, 3).map((src, i) => (
            <div key={i} className="overflow-hidden border border-charcoal/15 bg-charcoal">
              <img src={src} alt={`Blue Nile dining illustration ${i + 1}`} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
