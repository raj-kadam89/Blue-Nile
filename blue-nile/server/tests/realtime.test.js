import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import http from 'node:http'
import { io as ioc } from 'socket.io-client'
import { startDb, stopDb, resetDb, loginCustomer, loginStaff, seedTables, tomorrow } from './helpers.js'
import { initSockets } from '../sockets/index.js'

let app, server, url
beforeAll(async () => {
  app = await startDb()
  server = http.createServer(app)
  initSockets(server, ['http://localhost:5173'])
  await new Promise((r) => server.listen(0, r))
  url = `http://localhost:${server.address().port}`
})
afterAll(async () => { server.close(); await stopDb() })
beforeEach(async () => { await resetDb(); await seedTables() })

const cookieOf = (c) => c.agent.jar.getCookies({ domain: '127.0.0.1', path: '/', secure: false, script: false }).map((k) => `${k.name}=${k.value}`).join('; ')
const connect = (cookie) => new Promise((resolve, reject) => {
  const s = ioc(url, { extraHeaders: { cookie }, transports: ['websocket'], reconnection: false })
  s.on('connect', () => resolve(s))
  s.on('connect_error', (e) => { s.close(); reject(e) })
})
const once = (s, ev) => new Promise((resolve) => s.once(ev, resolve))

describe('Realtime dashboard', () => {
  it('rejects socket connections from customers / anonymous users', async () => {
    await expect(connect('')).rejects.toThrow()
    const c = await loginCustomer(app)
    await expect(connect(cookieOf(c))).rejects.toThrow()
  })

  it('notifies staff of new bookings and status updates with capacity recalculation', async () => {
    const staff = await loginStaff(app)
    const sock = await connect(cookieOf(staff))
    const c = await loginCustomer(app)

    const newEvt = once(sock, 'booking:new')
    const avail = once(sock, 'availability:changed')
    const created = await c.post('/api/reservations', { guestCount: 4, reservationDate: tomorrow(), startTime: '19:00' })
    expect((await newEvt).reservation.reference).toBe(created.body.data.reservation.reference)
    expect((await avail).date).toBe(tomorrow())

    const upd = once(sock, 'booking:updated')
    await staff.patch(`/api/staff/bookings/${created.body.data.reservation._id}/status`, { status: 'CONFIRMED' })
    const evt = await upd
    expect(evt.previousStatus).toBe('PENDING')
    expect(evt.reservation.status).toBe('CONFIRMED')

    const dash = await staff.get('/api/staff/dashboard')
    expect(dash.body.data.counts.pending).toBe(0)
    sock.close()
  })
})
