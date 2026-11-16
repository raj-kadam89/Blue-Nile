import mongoose from 'mongoose'
const { Schema } = mongoose

const staffProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    designation: { type: String, trim: true, maxlength: 80, default: 'Staff' },
    phone: { type: String, trim: true },
    permissions: {
      canReschedule: { type: Boolean, default: false },
      canCreateWalkIn: { type: Boolean, default: true },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

export default mongoose.model('StaffProfile', staffProfileSchema)
