import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { z } from 'zod'

const here = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(here, '../../.env'), quiet: true })
dotenv.config({ path: path.resolve(here, '../.env'), quiet: true })

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  OTP_PROVIDER: z.string().optional(),
  OTP_API_KEY: z.string().optional(),
  OTP_SENDER_ID: z.string().optional(),
  OTP_TEMPLATE_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  SEED_OWNER_NAME: z.string().optional(),
  SEED_OWNER_EMAIL: z.string().optional(),
  SEED_OWNER_PASSWORD: z.string().optional(),
})

const parsed = schema.parse(process.env)
const isProd = parsed.NODE_ENV === 'production'

const secret = (value, name) => {
  if (value && value.length >= 32) return value
  if (isProd) throw new Error(`${name} must be set (min 32 chars) in production`)
  // Dev/test only: ephemeral secret, sessions reset on restart.
  return crypto.randomBytes(48).toString('hex')
}

if (isProd && !parsed.MONGO_URI) throw new Error('MONGO_URI is required in production')

export const env = {
  ...parsed,
  isProd,
  isDev: parsed.NODE_ENV === 'development',
  isTest: parsed.NODE_ENV === 'test',
  JWT_SECRET: secret(parsed.JWT_SECRET, 'JWT_SECRET'),
  JWT_REFRESH_SECRET: secret(parsed.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  clientOrigins: parsed.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean),
  otpProvider: (parsed.OTP_PROVIDER || (parsed.NODE_ENV === 'development' ? 'dev' : '')).toLowerCase(),
}
