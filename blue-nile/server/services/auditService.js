import { AuditLog } from '../models/index.js'

/** Never throws: audit failures must not break the business action. */
export async function audit({ action, entityType, entityId, reference, actor, previousStatus, newStatus, reason, meta }) {
  try {
    await AuditLog.create({
      action, entityType, entityId, reference,
      actorId: actor?.id || actor?._id,
      actorName: actor?.name || 'System',
      actorRole: actor?.role || 'SYSTEM',
      previousStatus, newStatus, reason, meta,
    })
  } catch (err) {
    console.error('[audit] failed', err.message)
  }
}
