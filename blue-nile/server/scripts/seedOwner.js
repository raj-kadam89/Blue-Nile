/**
 * One-time, environment-controlled owner bootstrap.
 *   SEED_OWNER_NAME=... SEED_OWNER_EMAIL=... SEED_OWNER_PASSWORD=... npm run seed:owner
 * Refuses to run if an OWNER already exists (use --force-reset to reset that owner's password).
 */
import bcrypt from 'bcryptjs'
import { env } from '../config/env.js'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/index.js'

const force = process.argv.includes('--force-reset')

async function run() {
  const { SEED_OWNER_NAME: name, SEED_OWNER_EMAIL: email, SEED_OWNER_PASSWORD: password } = process.env
  if (!name || !email || !password) throw new Error('Set SEED_OWNER_NAME, SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD in .env')
  if (password.length < 12 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('SEED_OWNER_PASSWORD must be at least 12 characters with upper, lower case and a digit')
  }
  await connectDB()
  const existing = await User.findOne({ role: 'OWNER' }).select('+tokenVersion')
  if (existing && !force) {
    console.log(`An owner account already exists (${existing.email}). Nothing to do.`)
    return
  }
  const passwordHash = await bcrypt.hash(password, 12)
  if (existing) {
    existing.set({ name, email: email.toLowerCase(), passwordHash, active: true, tokenVersion: (existing.tokenVersion || 0) + 1 })
    await existing.save()
    console.log(`Owner ${email} reset.`)
  } else {
    await User.create({ role: 'OWNER', name, email: email.toLowerCase(), passwordHash, active: true })
    console.log(`Owner ${email} created. Remove SEED_OWNER_PASSWORD from your environment now.`)
  }
}

run().catch((e) => { console.error(e.message); process.exitCode = 1 }).finally(() => disconnectDB())
