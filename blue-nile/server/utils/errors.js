export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
export const badRequest = (msg, code = 'BAD_REQUEST', details) => new AppError(400, code, msg, details)
export const unauthorized = (msg = 'Authentication required', code = 'UNAUTHORIZED') => new AppError(401, code, msg)
export const forbidden = (msg = 'You do not have permission to do this', code = 'FORBIDDEN') => new AppError(403, code, msg)
export const notFound = (msg = 'Not found', code = 'NOT_FOUND') => new AppError(404, code, msg)
export const conflict = (msg, code = 'CONFLICT') => new AppError(409, code, msg)
export const unprocessable = (msg, code = 'UNPROCESSABLE') => new AppError(422, code, msg)
export const tooMany = (msg = 'Too many requests, please try again later', code = 'RATE_LIMITED') => new AppError(429, code, msg)

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
export const ok = (res, data = null, message, status = 200) => res.status(status).json({ success: true, data, ...(message ? { message } : {}) })
