import mongoose from 'mongoose'
import { MenuCategory, MenuItem } from '../models/index.js'
import { asyncHandler, ok, notFound, conflict, badRequest } from '../utils/errors.js'
import { slugify } from '../utils/helpers.js'
import { audit } from '../services/auditService.js'

const actorOf = (req) => ({ id: req.user.id, name: req.user.name, role: req.user.role })

async function uniqueSlug(Model, base, excludeId) {
  const root = slugify(base) || 'item'
  let slug = root
  for (let i = 2; await Model.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }); i++) slug = `${root}-${i}`
  return slug
}

const itemDto = (i) => ({ _id: i._id, name: i.name, slug: i.slug, description: i.description, price: i.price ?? null, isVeg: i.isVeg, available: i.available, active: i.active, featured: i.featured, image: i.image, category: i.category && i.category.name ? { _id: i.category._id, name: i.category.name, slug: i.category.slug } : i.category, createdAt: i.createdAt, updatedAt: i.updatedAt })

export const list = asyncHandler(async (req, res) => {
  const all = req.query.all === 'true' && req.user?.role === 'OWNER'
  const catFilter = all ? {} : { active: true }
  const categories = await MenuCategory.find(catFilter).sort({ order: 1, name: 1 }).lean()
  const itemFilter = all ? {} : { active: true, category: { $in: categories.map((c) => c._id) } }
  const items = await MenuItem.find(itemFilter).populate('category', 'name slug').sort({ name: 1 }).lean()
  ok(res, { categories, items: items.map(itemDto) })
})

export const getOne = asyncHandler(async (req, res) => {
  const key = req.params.idOrSlug
  const q = mongoose.isValidObjectId(key) ? { $or: [{ _id: key }, { slug: key }] } : { slug: key }
  const item = await MenuItem.findOne({ ...q, active: true }).populate('category', 'name slug active').lean()
  if (!item || item.category?.active === false) throw notFound('Dish not found')
  const related = await MenuItem.find({ category: item.category._id, _id: { $ne: item._id }, active: true }).populate('category', 'name slug').limit(4).lean()
  ok(res, { item: itemDto(item), related: related.map(itemDto) })
})

export const createItem = asyncHandler(async (req, res) => {
  if (!(await MenuCategory.exists({ _id: req.body.category }))) throw badRequest('Category does not exist', 'INVALID_CATEGORY')
  const item = await MenuItem.create({ ...req.body, price: req.body.price ?? null, slug: await uniqueSlug(MenuItem, req.body.name) })
  await audit({ action: 'MENU_ITEM_CREATED', entityType: 'MENU', entityId: item._id, actor: actorOf(req), meta: { name: item.name, price: item.price } })
  ok(res, { item: itemDto(await item.populate('category', 'name slug')) }, 'Dish added', 201)
})

export const updateItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findById(req.params.id)
  if (!item) throw notFound('Dish not found')
  const prevPrice = item.price
  if (req.body.category && !(await MenuCategory.exists({ _id: req.body.category }))) throw badRequest('Category does not exist', 'INVALID_CATEGORY')
  if (req.body.name && req.body.name !== item.name) item.slug = await uniqueSlug(MenuItem, req.body.name, item._id)
  item.set(req.body)
  await item.save()
  await audit({ action: prevPrice !== item.price ? 'MENU_PRICE_UPDATED' : 'MENU_ITEM_UPDATED', entityType: 'MENU', entityId: item._id, actor: actorOf(req), meta: { name: item.name, ...(prevPrice !== item.price ? { from: prevPrice, to: item.price } : {}) } })
  ok(res, { item: itemDto(await item.populate('category', 'name slug')) }, 'Dish updated')
})

export const deleteItem = asyncHandler(async (req, res) => {
  const item = await MenuItem.findByIdAndDelete(req.params.id)
  if (!item) throw notFound('Dish not found')
  await audit({ action: 'MENU_ITEM_DELETED', entityType: 'MENU', entityId: item._id, actor: actorOf(req), meta: { name: item.name } })
  ok(res, null, 'Dish deleted')
})

export const createCategory = asyncHandler(async (req, res) => {
  const cat = await MenuCategory.create({ ...req.body, slug: await uniqueSlug(MenuCategory, req.body.name) })
  await audit({ action: 'MENU_CATEGORY_CREATED', entityType: 'MENU', entityId: cat._id, actor: actorOf(req), meta: { name: cat.name } })
  ok(res, { category: cat }, 'Category added', 201)
})

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await MenuCategory.findById(req.params.id)
  if (!cat) throw notFound('Category not found')
  if (req.body.name && req.body.name !== cat.name) cat.slug = await uniqueSlug(MenuCategory, req.body.name, cat._id)
  cat.set(req.body)
  await cat.save()
  await audit({ action: 'MENU_CATEGORY_UPDATED', entityType: 'MENU', entityId: cat._id, actor: actorOf(req) })
  ok(res, { category: cat }, 'Category updated')
})

export const deleteCategory = asyncHandler(async (req, res) => {
  if (await MenuItem.exists({ category: req.params.id })) throw conflict('Move or delete the dishes in this category first', 'CATEGORY_NOT_EMPTY')
  const cat = await MenuCategory.findByIdAndDelete(req.params.id)
  if (!cat) throw notFound('Category not found')
  await audit({ action: 'MENU_CATEGORY_DELETED', entityType: 'MENU', entityId: cat._id, actor: actorOf(req), meta: { name: cat.name } })
  ok(res, null, 'Category deleted')
})
