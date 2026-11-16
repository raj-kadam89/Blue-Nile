import http from 'node:http'
import { env } from './config/env.js'
import { connectDB, disconnectDB } from './config/db.js'
import { getSettings } from './models/index.js'
import { createApp } from './app.js'
import { initSockets } from './sockets/index.js'
import { startJobs } from './jobs/index.js'
import { ensureDefaultAccounts, ensureDefaultTables, syncTotalSeats } from './services/seating/seatingService.js'

async function main() {
  await connectDB()
  await getSettings()
  await ensureDefaultAccounts()
  await ensureDefaultTables()
  await syncTotalSeats()
  const app = createApp()
  const server = http.createServer(app)
  initSockets(server, env.clientOrigins)
  const stopJobs = startJobs()
  server.listen(env.PORT, () => console.log(`Blue Nile API listening on :${env.PORT} (${env.NODE_ENV})`))

  const shutdown = async (sig) => {
    console.log(`${sig} received, shutting down`)
    stopJobs()
    server.close()
    await disconnectDB()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
