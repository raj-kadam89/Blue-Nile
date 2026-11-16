import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import cloudinary, { cloudinaryConfigured } from '../config/cloudinary.js'
import { env } from '../config/env.js'
import { badRequest } from '../utils/errors.js'

const ALLOWED = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }
export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads')

export const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => (ALLOWED[file.mimetype] ? cb(null, true) : cb(badRequest('Only JPEG, PNG, WebP or AVIF images are allowed', 'INVALID_FILE_TYPE'))),
}).single('image')

/** Verify magic bytes so a renamed non-image cannot be uploaded. */
function sniff(buf) {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  if (buf.toString('ascii', 4, 12).startsWith('ftypavi')) return 'image/avif'
  return null
}

/** Store image in Cloudinary (production) or local /uploads (development only). Returns public URL. */
export async function storeImage(file) {
  if (!file) throw badRequest('No image provided', 'NO_FILE')
  const type = sniff(file.buffer)
  if (!type || type !== file.mimetype) throw badRequest('File content is not a valid image', 'INVALID_FILE_CONTENT')
  if (cloudinaryConfigured()) {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'blue-nile', resource_type: 'image', transformation: [{ width: 2000, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }, (err, r) => (err ? reject(err) : resolve(r))).end(file.buffer)
    })
    return result.secure_url
  }
  if (env.isProd) throw badRequest('Image storage (Cloudinary) is not configured', 'STORAGE_NOT_CONFIGURED')
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ALLOWED[type]}`
  await fs.writeFile(path.join(UPLOAD_DIR, name), file.buffer)
  return `/uploads/${name}`
}
