import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { startDb, stopDb, resetDb, client, loginCustomer, loginStaff, createStaffUser, M } from './helpers.js'

let app
beforeAll(async () => { app = await startDb() })
afterAll(stopDb)
beforeEach(resetDb)

describe('OTP authentication', () => {
  it('generates a hashed OTP and verifies it, creating a customer session', async () => {
    const c = client(app)
    const s = await c.post('/api/auth/send-otp', { mobile: '+91 98765 43210', name: 'Asha' })
    expect(s.status).toBe(200)
    expect(s.body.data.devOtp).toMatch(/^\d{6}$/)
    const rec = await M.OTPVerification.findOne({ mobile: '9876543210' })
    expect(rec.codeHash).not.toContain(s.body.data.devOtp)
    const v = await c.post('/api/auth/verify-otp', { mobile: '9876543210', otp: s.body.data.devOtp })
    expect(v.status).toBe(200)
    expect(v.body.data.user.role).toBe('CUSTOMER')
    expect(v.headers['set-cookie'].join(';')).toMatch(/bn_at=.*HttpOnly/i)
    const me = await c.get('/api/auth/me')
    expect(me.body.data.user.mobile).toBe('9876543210')
  })

  it('rejects invalid mobile numbers', async () => {
    const r = await client(app).post('/api/auth/send-otp', { mobile: '12345' })
    expect(r.status).toBe(400)
  })

  it('rejects an invalid OTP and locks after max attempts', async () => {
    const c = client(app)
    const s = await c.post('/api/auth/send-otp', { mobile: '9876543210' })
    const wrong = s.body.data.devOtp === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) expect((await c.post('/api/auth/verify-otp', { mobile: '9876543210', otp: wrong })).status).toBe(400)
    const locked = await c.post('/api/auth/verify-otp', { mobile: '9876543210', otp: s.body.data.devOtp })
    expect(locked.status).toBe(429)
  })

  it('rejects expired OTPs', async () => {
    const c = client(app)
    const s = await c.post('/api/auth/send-otp', { mobile: '9876543210' })
    await M.OTPVerification.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } })
    const r = await c.post('/api/auth/verify-otp', { mobile: '9876543210', otp: s.body.data.devOtp })
    expect(r.status).toBe(400)
    expect(r.body.error.code).toBe('OTP_INVALID')
  })

  it('prevents OTP reuse', async () => {
    const c = client(app)
    const s = await c.post('/api/auth/send-otp', { mobile: '9876543210' })
    expect((await c.post('/api/auth/verify-otp', { mobile: '9876543210', otp: s.body.data.devOtp })).status).toBe(200)
    const again = await client(app).post('/api/auth/verify-otp', { mobile: '9876543210', otp: s.body.data.devOtp })
    expect(again.status).toBe(400)
  })

  it('enforces resend cooldown (rate limiting)', async () => {
    const c = client(app)
    expect((await c.post('/api/auth/send-otp', { mobile: '9876543210' })).status).toBe(200)
    const r = await c.post('/api/auth/send-otp', { mobile: '9876543210' })
    expect(r.status).toBe(429)
    expect(r.body.error.code).toBe('OTP_COOLDOWN')
  })
})

describe('Staff login & RBAC', () => {
  it('logs in staff, never exposing password hashes', async () => {
    const { email, password } = await createStaffUser('STAFF')
    const r = await client(app).post('/api/auth/staff-login', { email, password })
    expect(r.status).toBe(200)
    expect(JSON.stringify(r.body)).not.toMatch(/passwordHash|\$2[aby]\$/)
  })

  it('locks the account after repeated failures without revealing whether email exists', async () => {
    const { email } = await createStaffUser('STAFF')
    const unknown = await client(app).post('/api/auth/staff-login', { email: 'nobody@bn.test', password: 'x' })
    const wrong = await client(app).post('/api/auth/staff-login', { email, password: 'wrong' })
    expect(unknown.status).toBe(401)
    expect(wrong.body.error.message).toBe(unknown.body.error.message)
    for (let i = 0; i < 4; i++) await client(app).post('/api/auth/staff-login', { email, password: 'wrong' })
    const locked = await client(app).post('/api/auth/staff-login', { email, password: 'Password123!' })
    expect(locked.body.error.code).toBe('ACCOUNT_LOCKED')
  })

  it('blocks unauthenticated access to private APIs', async () => {
    for (const url of ['/api/admin/dashboard', '/api/staff/bookings', '/api/admin/employees', '/api/reservations/mine']) {
      expect((await client(app).get(url)).status).toBe(401)
    }
  })

  it('restricts customers from staff and owner dashboards', async () => {
    const c = await loginCustomer(app)
    expect((await c.get('/api/staff/dashboard')).status).toBe(403)
    expect((await c.get('/api/admin/dashboard')).status).toBe(403)
  })

  it('restricts staff from owner-only endpoints', async () => {
    const s = await loginStaff(app, 'STAFF')
    expect((await s.get('/api/staff/dashboard')).status).toBe(200)
    expect((await s.get('/api/admin/analytics')).status).toBe(403)
    expect((await s.get('/api/admin/employees')).status).toBe(403)
    expect((await s.patch('/api/admin/settings', { booking: { slotInterval: 15 } })).status).toBe(403)
    expect((await s.post('/api/tables', { tableNumber: 'X', capacity: 2 })).status).toBe(403)
  })

  it('lets the owner manage employees; deactivation revokes access immediately', async () => {
    const o = await loginStaff(app, 'OWNER')
    const created = await o.post('/api/admin/employees', { name: 'Ravi', email: 'ravi@bn.test', password: 'StrongPass1', designation: 'Host' })
    expect(created.status).toBe(201)
    const staff = client(app)
    const login = await staff.post('/api/auth/staff-login', { email: 'ravi@bn.test', password: 'StrongPass1' })
    staff.csrf = login.body.data.csrfToken
    expect((await staff.get('/api/staff/dashboard')).status).toBe(200)
    const off = await o.patch(`/api/admin/employees/${created.body.data.employee._id}`, { active: false })
    expect(off.status).toBe(200)
    expect((await staff.get('/api/staff/dashboard')).status).toBe(401)
    const logs = await o.get('/api/admin/audit-logs?entityType=EMPLOYEE')
    expect(logs.body.data.items.map((l) => l.action)).toEqual(expect.arrayContaining(['EMPLOYEE_CREATED', 'EMPLOYEE_DEACTIVATED']))
  })

  it('requires a CSRF token for authenticated mutations', async () => {
    const o = await loginStaff(app, 'OWNER')
    const r = await o.agent.post('/api/tables').send({ tableNumber: 'T9', capacity: 2 })
    expect(r.status).toBe(403)
    expect(r.body.error.code).toBe('CSRF_INVALID')
  })

  it('strips NoSQL operators from input', async () => {
    const r = await client(app).post('/api/auth/staff-login', { email: { $ne: null }, password: { $ne: null } })
    expect(r.status).toBe(400)
  })
})
