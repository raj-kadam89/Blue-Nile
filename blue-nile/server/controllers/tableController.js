import { DiningTable, Reservation } from '../models/index.js'
import { ACTIVE_STATUSES } from '../models/Reservation.js'
import { asyncHandler, ok, notFound, conflict } from '../utils/errors.js'
import { syncTotalSeats } from '../services/seating/seatingService.js'
import { audit } from '../services/auditService.js'
import { emitStaff } from '../sockets/emitter.js'
import { todayStr } from '../utils/time.js'

const actorOf = (req) => ({ id: req.user.id, name: req.user.name, role: req.user.role })
const changed = () => emitStaff('availability:changed', { date: null })

export const list = asyncHandler(async (_req, res) => {
  const items = await DiningTable.find().lean()
  items.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true }))
  const totalSeats = items.filter((t) => t.active).reduce((s, t) => s + t.capacity, 0)
  ok(res, { items, totalSeats })
})

export const create = asyncHandler(async (req, res) => {
  const table = await DiningTable.create(req.body)
  await syncTotalSeats()
  await audit({ action: 'TABLE_CREATED', entityType: 'TABLE', entityId: table._id, actor: actorOf(req), meta: req.body })
  changed()
  ok(res, { table }, 'Table added', 201)
})

const futureUse = (id) => Reservation.exists({ assignedTables: id, status: { $in: ACTIVE_STATUSES }, reservationDate: { $gte: todayStr() } })

export const update = asyncHandler(async (req, res) => {
  const table = await DiningTable.findById(req.params.id)
  if (!table) throw notFound('Table not found')
  const reducing = (req.body.capacity !== undefined && req.body.capacity < table.capacity) || req.body.active === false
  if (reducing && (await futureUse(table._id))) throw conflict('This table has active or upcoming reservations. Reassign or complete them before reducing capacity or deactivating it.', 'TABLE_IN_USE')
  table.set(req.body)
  await table.save()
  await syncTotalSeats()
  await audit({ action: 'TABLE_UPDATED', entityType: 'TABLE', entityId: table._id, actor: actorOf(req), meta: req.body })
  changed()
  ok(res, { table }, 'Table updated')
})

export const remove = asyncHandler(async (req, res) => {
  const table = await DiningTable.findById(req.params.id)
  if (!table) throw notFound('Table not found')
  if (await futureUse(table._id)) throw conflict('This table has active or upcoming reservations and cannot be deleted. Deactivate it after they are handled.', 'TABLE_IN_USE')
  await table.deleteOne()
  await syncTotalSeats()
  await audit({ action: 'TABLE_DELETED', entityType: 'TABLE', entityId: table._id, actor: actorOf(req), meta: { tableNumber: table.tableNumber } })
  changed()
  ok(res, null, 'Table deleted')
})
