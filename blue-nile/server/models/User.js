import mongoose from 'mongoose'
const { Schema } = mongoose

export const ROLES = ['OWNER', 'STAFF', 'CUSTOMER']

const userSchema = new Schema(
  {
    role: { type: String, enum: ROLES, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, trim: true }, // 10-digit Indian mobile (customers; optional for staff)
    mobileVerified: { type: Boolean, default: false },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    passwordHash: { type: String, select: false },
    active: { type: Boolean, default: true },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true },
)

// Customers are unique by mobile; staff/owner unique by email.
userSchema.index({ mobile: 1, role: 1 }, { unique: true, partialFilterExpression: { role: 'CUSTOMER', mobile: { $type: 'string' } } })
userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { role: { $in: ['OWNER', 'STAFF'] }, email: { $type: 'string' } } })

userSchema.set('toJSON', {
  transform: (_d, ret) => { delete ret.passwordHash; delete ret.failedLoginAttempts; delete ret.lockUntil; delete ret.tokenVersion; delete ret.__v; return ret },
})

export default mongoose.model('User', userSchema)
