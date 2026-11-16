/**
 * Seeds non-sensitive defaults: settings document and the menu categories from the brief.
 * Known popular dishes are created WITHOUT prices or descriptions (owner fills them in) and hidden (active=false)
 * until the owner reviews them. No tables/capacity are created - the owner configures seating.
 */
import { connectDB, disconnectDB } from '../config/db.js'
import { MenuCategory, MenuItem, getSettings } from '../models/index.js'
import { ensureDefaultTables } from '../services/seating/seatingService.js'
import { slugify } from '../utils/helpers.js'

const CATEGORIES = ['Biryani', 'Kebabs', 'Starters', 'Main Course', 'Indian Breads', 'Rice and Pulao', 'Desserts', 'Beverages']
const KNOWN_DISHES = [
  ['Chicken Biryani', 'Biryani'],
  ['Mutton Biryani', 'Biryani'],
  ['Chicken Tandoori', 'Kebabs'],
  ['Mutton Seekh Kebab', 'Kebabs'],
  ['Chicken Kebabs', 'Kebabs'],
  ['Caramel Custard', 'Desserts'],
]

async function run() {
  await connectDB()
  await getSettings()
  const seededTables = await ensureDefaultTables()
  const cats = {}
  for (const [i, name] of CATEGORIES.entries()) {
    cats[name] = await MenuCategory.findOneAndUpdate({ slug: slugify(name) }, { $setOnInsert: { name, slug: slugify(name), order: i, active: true } }, { upsert: true, returnDocument: 'after' })
  }
  for (const [name, cat] of KNOWN_DISHES) {
    await MenuItem.updateOne(
      { slug: slugify(name) },
      { $setOnInsert: { name, slug: slugify(name), category: cats[cat]._id, price: null, description: '', isVeg: false, available: true, active: false, featured: true } },
      { upsert: true },
    )
  }
  console.log(`Seeded ${CATEGORIES.length} categories, ${KNOWN_DISHES.length} draft dishes, and ${seededTables} default dining tables.`)
}

run().catch((e) => { console.error(e); process.exitCode = 1 }).finally(() => disconnectDB())
