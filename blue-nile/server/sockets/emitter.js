let io = null
export const setIO = (instance) => { io = instance }
export const getIO = () => io
/** Broadcast to authenticated staff/owner sockets. */
export const emitStaff = (event, payload) => { if (io) io.to('staff').emit(event, payload) }
