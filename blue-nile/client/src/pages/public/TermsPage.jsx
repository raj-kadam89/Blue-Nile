import { useSettings } from '../../hooks/useSettings.js'
import { Seo } from '../../components/ui/PublicUi.jsx'
import { splitParagraphs } from '../../utils/format.js'

export default function TermsPage() {
  const { restaurant, booking, content } = useSettings()
  const custom = splitParagraphs(content.policies?.terms)
  const cutoff = booking.cancellationCutoffHours ?? 2
  const hold = booking.holdMinutes ?? 120

  return (
    <>
      <Seo title="Terms & Conditions" description="Reservation policies, cancellation rules, no-show guidelines and guest responsibilities at Blue Nile, Pune." path="/terms" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Legal & Policies</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Terms & Conditions</h1>
        </div>
      </section>

      <section className="container-x max-w-3xl py-14">
        <div className="prose-bn border border-charcoal/15 bg-white p-8 text-sm text-charcoal/80">
          {custom.length > 0 ? custom.map((p, i) => <p key={i}>{p}</p>) : (
            <>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">1. Reservation Requests & Confirmation</h2>
              <p>Submitting an online reservation at {restaurant.name || 'Blue Nile'} creates a booking request. Unless your booking screen and notification explicitly state <strong>Confirmed</strong>, the request is <strong>Pending</strong> restaurant approval and temporarily holds capacity for up to {hold} minutes.</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">2. Cancellation Policy</h2>
              <p>{content.policies?.cancellation || `Confirmed reservations may be cancelled online up to ${cutoff} hour(s) before the scheduled reservation time via the Booking Status page. For changes inside that window, please call ${restaurant.phone || '020 2612 5238'}.`}</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">3. Late Arrivals & No-Show Policy</h2>
              <p>{content.policies?.noShow || 'Please arrive on time for your reservation. If your party is delayed, call the restaurant so we can hold your table where possible. Unannounced late arrivals may be recorded as a no-show and the allocated tables released to waiting guests.'}</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">4. Guest Count & Seating Allocation</h2>
              <p>Tables are allocated based on the exact guest count submitted. Increases in party size are subject to real-time seat availability at the restaurant.</p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
