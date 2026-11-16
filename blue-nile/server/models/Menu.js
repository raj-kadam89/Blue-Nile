import mongoose from 'mongoose'
const { Schema } = mongoose

const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)
export const MenuCategory = mongoose.model('MenuCategory', categorySchema)

const itemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    price: { type: Number, min: 0, default: null }, // owner-entered only; null => "Price on request"
    isVeg: { type: Boolean, default: false },
    available: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    image: { type: String, default: '' },
    category: { type: Schema.Types.ObjectId, ref: 'MenuCategory', required: true, index: true },
  },
  { timestamps: true },
)
itemSchema.index({ name: 'text', description: 'text' })
export const MenuItem = mongoose.model('MenuItem', itemSchema)
