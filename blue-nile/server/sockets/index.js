import { Server } from 'socket.io'
import { parseCookies } from '../services/auth/tokenService.js'
import { resolveUser } from '../middleware/auth.js'
import { setIO } from './emitter.js'

/** Socket.IO: only authenticated OWNER/STAFF sessions may connect (cookie auth, origin-restricted). */
export function initSockets(httpServer, origins) {
  const io = new Server(httpServer, { cors: { origin: origins, credentials: true } })
  io.use(async (socket, next) => {
    try {
      const token = parseCookies(socket.handshake.headers.cookie || '').bn_at
      const user = token && (await resolveUser(token))
      if (!user || !['OWNER', 'STAFF'].includes(user.role)) return next(new Error('UNAUTHORIZED'))
      socket.data.user = user
      next()
    } catch {
      next(new Error('UNAUTHORIZED'))
    }
  })
  io.on('connection', (socket) => {
    socket.join('staff')
    if (socket.data.user.role === 'OWNER') socket.join('owner')
    socket.emit('connected', { role: socket.data.user.role })
  })
  setIO(io)
  return io
}
