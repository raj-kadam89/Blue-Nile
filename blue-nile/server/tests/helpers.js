import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import { connectDB } from '../config/db.js'
import { createApp } from '../app.js'
import * as M from '../models/index.js'
import { addDays, todayStr } from '../utils/time.js'

let mongod
export async function startDb() {
  mongod = await MongoMemoryServer.create()
  await connectDB(mongod.getUri('bn-test'))
  return createApp()
}
export async function stopDb() {
  await mongoose.disconnect()
  if (mongod) await mongod.stop()
}
export async function resetDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})))
  await M.getSettings()
}

export const tomorrow = () => addDays(todayStr(), 1)

/** Cookie-preserving agent plus CSRF token for mutating calls. */
export function client(app) {
  const agent = request.agent(app)
  const c = {
    agent,
    csrf: '',
    get: (url) => agent.get(url),
    post: (url, body) => agent.post(url).set('X-CSRF-Token', c.csrf).send(body),
    patch: (url, body) => agent.patch(url).set('X-CSRF-Token', c.csrf).send(body),
    delete: (url) => agent.delete(url).set('X-CSRF-Token', c.csrf),
  }
  return c
}

export async function loginCustomer(app, mobile = '9876543210', name = 'Test Guest') {
  const c = client(app)
  const s = await c.post('/api/auth/send-otp', { mobile, name })
  if (s.status !== 200) throw new Error(`send-otp failed: ${JSON.stringify(s.body)}`)
  const v = await c.post('/api/auth/verify-otp', { mobile, otp: s.body.data.devOtp, name })
  if (v.status !== 200) throw new Error(`verify failed: ${JSON.stringify(v.body)}`)
  c.csrf = v.body.data.csrfToken
  c.user = v.body.data.user
  return c
}

export async function createStaffUser(role = 'STAFF', email = `${role.toLowerCase()}@bn.test`, password = 'Password123!', permissions = {}) {
  const user = await M.User.create({ role, name: `${role} User`, email, passwordHash: await bcrypt.hash(password, 4) })
  if (role === 'STAFF') await M.StaffProfile.create({ userId: user._id, permissions: { canReschedule: false, canCreateWalkIn: true, ...permissions } })
  return { user, email, password }
}

export async function loginStaff(app, role = 'STAFF', opts = {}) {
  const { email, password } = await createStaffUser(role, opts.email, opts.password, opts.permissions)
  const c = client(app)
  const r = await c.post('/api/auth/staff-login', { email, password })
  if (r.status !== 200) throw new Error(`login failed: ${JSON.stringify(r.body)}`)
  c.csrf = r.body.data.csrfToken
  c.user = r.body.data.user
  return c
}

export async function seedTables(spec = [['T1', 4], ['T2', 4], ['T3', 2]]) {
  for (const [tableNumber, capacity, combinationGroup] of spec) await M.DiningTable.create({ tableNumber, capacity, combinationGroup })
}

export { M }
