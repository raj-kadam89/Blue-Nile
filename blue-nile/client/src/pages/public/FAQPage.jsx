import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useSettings } from '../../hooks/useSettings.js'
import { Seo } from '../../components/ui/PublicUi.jsx'

export default function FAQPage() {
  const { content } = useSettings()
  const faqs = content.faq || []
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <>
      <Seo title="Frequently Asked Questions" description="Answers about table reservations, cancellations, late arrivals, group dining, opening hours and menu availability at Blue Nile, Pune." path="/faq" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Help & Policies</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Frequently Asked Questions</h1>
          <p className="mt-3 max-w-2xl text-sm text-ivory/75">Everything you need to know before reserving a table at Blue Nile.</p>
        </div>
      </section>

      <section className="container-x max-w-3xl py-16">
        <div className="divide-y divide-charcoal/15 border border-charcoal/15 bg-white">
          {faqs.map((item, i) => {
            const open = openIdx === i
            return (
              <div key={i}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left font-serif text-2xl font-semibold hover:bg-ivory/60"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`size-5 shrink-0 text-gold transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {open && <div className="px-6 pb-6 text-sm leading-relaxed text-charcoal/75">{item.a}</div>}
              </div>
            )
          })}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border border-gold/40 bg-white p-6">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Still have a question?</h2>
            <p className="text-sm text-charcoal/70">Call us or send an enquiry and our team will be glad to assist.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/contact" className="btn btn-dark btn-sm">Contact Us</Link>
            <Link to="/reserve" className="btn btn-primary btn-sm">Reserve a Table</Link>
          </div>
        </div>
      </section>
    </>
  )
}
