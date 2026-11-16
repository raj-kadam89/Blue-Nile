import mongoose from 'mongoose'
import dns from 'node:dns'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { env } from './env.js'

let memoryServer = null

async function startEmbeddedMongo() {
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const dbPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.data/mongo')
  fs.mkdirSync(dbPath, { recursive: true })
  memoryServer = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger' } })
  console.warn('[db] Using local embedded dev MongoDB at', dbPath)
  return memoryServer.getUri('bluenile')
}

export async function connectDB(uriOverride) {
  mongoose.set('strictQuery', true)
  let uri = uriOverride ||  process.env.MONGO_URI

  // Strip accidental < > brackets around the password in mongodb+srv://<user>:<pass>@host
  if (uri) uri = uri.replace(/:<([^<>]+)>@/, ':$1@')

  if (uri && uri.includes('db_password') && !env.isProd) {
    console.warn('[db] MONGO_URI still contains placeholder password - falling back to embedded dev MongoDB')
    uri = ''
  }

  // Use public DNS resolvers when resolving mongodb+srv:// on Windows ISPs that block SRV records
  if (uri && uri.startsWith('mongodb+srv://')) {
    try { dns.setServers(['8.8.8.8', '1.1.1.1', ...dns.getServers()]) } catch { /* ignore */ }
  }

  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI missing')
    uri = await startEmbeddedMongo()
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  } catch (err) {
    if (env.isProd || uriOverride) throw err
    console.warn(`[db] Could not reach remote MONGO_URI (${err.message}). Falling back to local embedded MongoDB so your server stays running.`)
    const localUri = await startEmbeddedMongo()
    await mongoose.connect(localUri, { serverSelectionTimeoutMS: 15000 })
  }

  await Promise.all(Object.values(mongoose.models).map((m) => m.init()))
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
  if (memoryServer) await memoryServer.stop()
}
