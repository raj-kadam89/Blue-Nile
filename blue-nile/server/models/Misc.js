import mongoose from 'mongoose'
const { Schema } = mongoose

export const GalleryImage = mongoose.model(
  'GalleryImage',
  new Schema(
    {
      url: { type: String, required: true },
      caption: { type: String, trim: true, maxlength: 200, default: '' },
      category: { type: String, enum: ['FOOD', 'INTERIOR', 'ATMOSPHERE', 'CUSTOMER'], default: 'FOOD' },
      order: { type: Number, default: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
)

export const Notification = mongoose.model(
  'Notification',
  (() => {
    const s = new Schema(
      {
        reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', index: true },
        channel: { type: String, enum: ['WHATSAPP', 'EMAIL', 'SMS'], required: true },
        event: { type: String, required: true },
        audience: { type: String, enum: ['CUSTOMER', 'STAFF'], default: 'CUSTOMER' },
        to: { type: String, required: true },
        subject: String,
        body: { type: String, required: true },
        status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED', 'SKIPPED'], default: 'QUEUED' },
        attempts: { type: Number, default: 0 },
        lastError: String,
        nextAttemptAt: Date,
        sentAt: Date,
        providerMessageId: String,
      },
      { timestamps: true },
    )
    s.index({ status: 1, nextAttemptAt: 1 })
    s.index({ createdAt: -1 })
    return s
  })(),
)

export const AuditLog = mongoose.model(
  'AuditLog',
  (() => {
    const s = new Schema(
      {
        action: { type: String, required: true }, // e.g. BOOKING_CREATED, STATUS_CHANGED, EMPLOYEE_CREATED
        entityType: { type: String, required: true }, // RESERVATION | EMPLOYEE | SETTINGS | TABLE | MENU ...
        entityId: { type: Schema.Types.ObjectId },
        reference: String,
        actorId: { type: Schema.Types.ObjectId, ref: 'User' },
        actorName: String,
        actorRole: { type: String }, // OWNER | STAFF | CUSTOMER | SYSTEM
        previousStatus: String,
        newStatus: String,
        reason: String,
        meta: Schema.Types.Mixed,
      },
      { timestamps: { createdAt: true, updatedAt: false } },
    )
    s.index({ createdAt: -1 })
    s.index({ actorId: 1, createdAt: -1 })
    s.index({ entityType: 1, entityId: 1 })
    return s
  })(),
)

export const OTPVerification = mongoose.model(
  'OTPVerification',
  (() => {
    const s = new Schema(
      {
        mobile: { type: String, required: true, index: true },
        codeHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        attempts: { type: Number, default: 0 },
        used: { type: Boolean, default: false },
        name: String,
        email: String,
        ip: String,
      },
      { timestamps: true },
    )
    // Retention: purge records one day after expiry.
    s.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 })
    return s
  })(),
)

export const CustomerNote = mongoose.model(
  'CustomerNote',
  (() => {
    const s = new Schema(
      {
        customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        mobile: String,
        note: { type: String, required: true, trim: true, maxlength: 1000 },
        authorId: { type: Schema.Types.ObjectId, ref: 'User' },
        authorName: String,
        reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation' },
      },
      { timestamps: true },
    )
    return s
  })(),
)

export const ContactEnquiry = mongoose.model(
  'ContactEnquiry',
  new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 100 },
      mobile: { type: String, trim: true },
      email: { type: String, trim: true },
      message: { type: String, required: true, trim: true, maxlength: 2000 },
      status: { type: String, enum: ['NEW', 'RESOLVED'], default: 'NEW' },
    },
    { timestamps: true },
  ),
)
