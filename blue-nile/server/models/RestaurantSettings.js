import mongoose from 'mongoose'
const { Schema } = mongoose

const dayHours = new Schema({ day: Number, open: String, close: String, closed: { type: Boolean, default: false } }, { _id: false })
const holiday = new Schema({ date: String, closed: { type: Boolean, default: true }, open: String, close: String, note: String }, { _id: true })

const defaultHours = Array.from({ length: 7 }, (_, day) => ({ day, open: '11:00', close: '23:00', closed: false }))

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'main', unique: true },
    restaurant: {
      name: { type: String, default: 'Blue Nile' },
      tagline: { type: String, default: '' },
      cuisine: { type: String, default: 'Biryani Restaurant / Indian Restaurant' },
      address: { type: String, default: '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India' },
      phone: { type: String, default: '020 2612 5238' },
      whatsapp: { type: String, default: '' },
      email: { type: String, default: '' },
      mapsUrl: { type: String, default: 'https://www.google.com/maps/search/?api=1&query=Blue+Nile+102+Bund+Garden+Road+Agarkar+Nagar+Pune+411001' },
      mapsEmbedUrl: { type: String, default: '' },
      googleRating: { type: Number, default: 4.1 },
      googleReviewCount: { type: Number, default: 18455 },
      averageSpend: { type: String, default: '₹400–₹1,200 per person (listing data)' },
    },
    totalSeats: { type: Number, default: 0 }, // derived from active tables
    openingHours: { type: [dayHours], default: defaultHours },
    hoursVerified: { type: Boolean, default: false }, // provisional until owner verifies
    holidays: [holiday],
    booking: {
      slotInterval: { type: Number, default: 30, min: 5, max: 240 },
      defaultDiningDuration: { type: Number, default: 90, min: 15, max: 480 },
      bufferMinutes: { type: Number, default: 15, min: 0, max: 120 },
      maxGuestsPerBooking: { type: Number, default: 10, min: 1 },
      advanceBookingDays: { type: Number, default: 30, min: 1, max: 365 },
      minLeadMinutes: { type: Number, default: 60, min: 0 },
      holdMinutes: { type: Number, default: 120, min: 5 },
      autoConfirm: { type: Boolean, default: false },
      cancellationCutoffHours: { type: Number, default: 2, min: 0 },
    },
    content: {
      home: {
        heroHeadline: { type: String, default: 'Pune’s table for biryani, kebabs and slow-cooked Indian classics' },
        heroSubtext: { type: String, default: 'Reserve your table at Blue Nile, Bund Garden Road.' },
        intro: { type: String, default: 'Blue Nile is a Pune restaurant serving biryani, kebabs and Indian cuisine.' },
        heroImage: { type: String, default: '' },
        introImage: { type: String, default: '' },
        whyDine: {
          type: [{ title: String, text: String }],
          default: [
            { title: 'Reserve with confidence', text: 'See live seating for your date and time before you book.' },
            { title: 'Biryani & kebabs', text: 'Popular with guests: Chicken Biryani, Mutton Biryani, Chicken Tandoori and Mutton Seekh Kebab.' },
            { title: 'Simple bookings', text: 'Verify your mobile with an OTP and track your booking status anytime.' },
          ],
        },
        signatureItemIds: [{ type: Schema.Types.ObjectId }],
      },
      about: {
        story: { type: String, default: '' },
        philosophy: { type: String, default: '' },
        experience: { type: String, default: '' },
        historyVerified: { type: Boolean, default: false },
        images: [String],
      },
      faq: {
        type: [{ q: String, a: String }],
        default: [
          { q: 'How do I reserve a table?', a: 'Choose a date, guest count and time on the Reserve page, verify your mobile number with an OTP and submit your request.' },
          { q: 'Is my reservation confirmed immediately?', a: 'Not always. You will see Pending or Confirmed on your booking. A booking is only confirmed once the restaurant confirms it.' },
          { q: 'How can I cancel a reservation?', a: 'Open Booking Status, sign in with OTP and cancel using your booking reference, subject to the cancellation window.' },
          { q: 'What if I am running late?', a: 'Please call the restaurant. Tables may be released after the grace period set by the restaurant.' },
          { q: 'Do you take group bookings?', a: 'Yes, mention your group size in the request. Large parties may need confirmation by the restaurant.' },
          { q: 'What are your opening hours?', a: 'See the Contact page. Hours are set by the restaurant and may change on holidays.' },
          { q: 'Is the menu always available?', a: 'Availability can change during the day. Items marked unavailable are out of stock.' },
        ],
      },
      policies: {
        privacy: { type: String, default: '' },
        terms: { type: String, default: '' },
        cancellation: { type: String, default: '' },
        noShow: { type: String, default: '' },
      },
      testimonials: { type: [{ name: String, text: String, rating: Number, source: String }], default: [] },
    },
    notificationPrefs: {
      whatsappEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: true },
      staffAlertNumber: { type: String, default: '' },
      staffAlertEmail: { type: String, default: '' },
      reminderHoursBefore: { type: Number, default: 3 },
    },
  },
  { timestamps: true, minimize: false },
)

export const getSettings = async () => {
  let s = await mongoose.model('RestaurantSettings').findOne({ key: 'main' })
  if (!s) s = await mongoose.model('RestaurantSettings').create({ key: 'main' })
  return s
}

export default mongoose.model('RestaurantSettings', settingsSchema)
