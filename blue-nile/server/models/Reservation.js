import mongoose from 'mongoose'
const { Schema } = mongoose

export const STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'SEATED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW', 'EXPIRED']
/** Statuses that hold table capacity */
export const ACTIVE_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'SEATED']
export const SOURCES = ['ONLINE', 'WALK_IN', 'PHONE', 'MANUAL']

const reservationSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, trim: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    guestCount: { type: Number, required: true, min: 1 },
    reservationDate: { type: String, required: true }, // YYYY-MM-DD (restaurant-local)
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true },
    startMin: { type: Number, required: true },
    endMin: { type: Number, required: true },
    assignedTables: [{ type: Schema.Types.ObjectId, ref: 'DiningTable' }],
    status: { type: String, enum: STATUSES, default: 'PENDING' },
    verificationStatus: { type: String, enum: ['VERIFIED', 'UNVERIFIED'], default: 'UNVERIFIED' },
    bookingSource: { type: String, enum: SOURCES, default: 'ONLINE' },
    specialRequest: { type: String, trim: true, maxlength: 500 },
    occasion: { type: String, trim: true, maxlength: 40 },
    holdExpiresAt: Date,
    cancelReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reminderSentAt: Date,
    checkedInAt: Date,
    seatedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
)

reservationSchema.index({ reservationDate: 1, status: 1 })
reservationSchema.index({ status: 1, holdExpiresAt: 1 })
reservationSchema.index({ assignedTables: 1, reservationDate: 1 })
reservationSchema.index({ createdBy: 1 })
reservationSchema.index({ confirmedBy: 1 })

export default mongoose.model('Reservation', reservationSchema)
