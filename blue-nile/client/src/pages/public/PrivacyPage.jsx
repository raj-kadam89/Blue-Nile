import { useSettings } from '../../hooks/useSettings.js'
import { Seo } from '../../components/ui/PublicUi.jsx'
import { splitParagraphs } from '../../utils/format.js'

export default function PrivacyPage() {
  const { restaurant, content } = useSettings()
  const custom = splitParagraphs(content.policies?.privacy)
  const phone = restaurant.phone || '020 2612 5238'
  const address = restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India'

  return (
    <>
      <Seo title="Privacy Policy" description="How Blue Nile collects, verifies and uses customer reservation and OTP verification data." path="/privacy" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Privacy Policy</h1>
        </div>
      </section>

      <section className="container-x max-w-3xl py-14">
        <div className="prose-bn border border-charcoal/15 bg-white p-8 text-sm text-charcoal/80">
          {custom.length > 0 ? custom.map((p, i) => <p key={i}>{p}</p>) : (
            <>
              <h2 className="font-serif text-2xl font-semibold text-charcoal">1. Information We Collect</h2>
              <p>When you request a table reservation or submit an enquiry at Blue Nile, we collect your full name, Indian mobile/WhatsApp number, optional email address, party size, preferred date and time, and any special dining notes you choose to share.</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">2. Mobile OTP Verification</h2>
              <p>To prevent fraudulent bookings and allow you to check or cancel your reservation online, we send a one-time password (OTP) to your mobile number. OTP codes are stored only as cryptographic hashes with short expiry windows and attempt limits.</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">3. How Booking Information Is Used</h2>
              <p>Your details are used strictly to allocate tables, communicate reservation updates (request received, confirmation, cancellation or reminders) via WhatsApp/SMS/email, and assist you when you arrive at the restaurant. We do not sell customer data to third parties.</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">4. Data Retention</h2>
              <p>Temporary OTP verification records expire and are purged automatically. Reservation records and audit logs are retained for operational history, no-show tracking and accounting in accordance with applicable Indian regulations.</p>

              <h2 className="mt-6 font-serif text-2xl font-semibold text-charcoal">5. Contact</h2>
              <p>For privacy questions regarding your booking data, contact {restaurant.name || 'Blue Nile'} at {address} or call {phone}.</p>
            </>
          )}
        </div>
      </section>
    </>
  )
}
