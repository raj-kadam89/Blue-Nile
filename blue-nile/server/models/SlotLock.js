import mongoose from 'mongoose'
const { Schema } = mongoose

/**
 * Atomic seat locks. One document per (table, date, 15-min bucket) with a unique index:
 * two overlapping reservations can never both insert a lock for the same table => no double booking,
 * even on a standalone MongoDB without transactions.
 */
const slotLockSchema = new Schema({
  tableId: { type: Schema.Types.ObjectId, ref: 'DiningTable', required: true },
  date: { type: String, required: true },
  bucket: { type: Number, required: true },
  reservationId: { type: Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
})
slotLockSchema.index({ tableId: 1, date: 1, bucket: 1 }, { unique: true })
slotLockSchema.index({ date: 1 })

export default mongoose.model('SlotLock', slotLockSchema)
