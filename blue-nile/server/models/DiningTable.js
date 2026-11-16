import mongoose from 'mongoose'
const { Schema } = mongoose

const diningTableSchema = new Schema(
  {
    tableNumber: { type: String, required: true, trim: true, unique: true, maxlength: 20 },
    area: { type: String, trim: true, default: 'Main Hall', maxlength: 60 },
    capacity: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    /** Tables sharing a combinationGroup can be joined for larger parties. */
    combinationGroup: { type: String, trim: true, maxlength: 40 },
  },
  { timestamps: true },
)
diningTableSchema.index({ active: 1, capacity: 1 })
diningTableSchema.index({ combinationGroup: 1 })

export default mongoose.model('DiningTable', diningTableSchema)
