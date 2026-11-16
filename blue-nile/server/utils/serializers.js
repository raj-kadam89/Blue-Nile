const MESSAGES = {
  PENDING: 'Your request has been received and is awaiting confirmation from the restaurant. It is not confirmed yet.',
  CONFIRMED: 'Your reservation is confirmed. We look forward to welcoming you.',
  CHECKED_IN: 'You have been checked in. Your table will be ready shortly.',
  SEATED: 'You are seated. Enjoy your meal.',
  COMPLETED: 'Your dining visit is complete. Thank you for dining with us.',
  CANCELLED: 'This reservation was cancelled.',
  REJECTED: 'The restaurant could not accommodate this request.',
  NO_SHOW: 'This reservation was marked as a no-show.',
  EXPIRED: 'This request expired before it was confirmed.',
}

const tableShape = (t) => (t && t.tableNumber ? { _id: t._id, tableNumber: t.tableNumber, area: t.area, capacity: t.capacity } : t)

export function serializeReservation(r, { staff = false } = {}) {
  const o = r.toObject ? r.toObject() : r
  const base = {
    _id: o._id,
    reference: o.reference,
    customerName: o.customerName,
    mobile: o.mobile,
    email: o.email,
    guestCount: o.guestCount,
    reservationDate: o.reservationDate,
    startTime: o.startTime,
    endTime: o.endTime,
    status: o.status,
    specialRequest: o.specialRequest,
    occasion: o.occasion,
    bookingSource: o.bookingSource,
    holdExpiresAt: o.holdExpiresAt,
    createdAt: o.createdAt,
    statusMessage: MESSAGES[o.status],
  }
  if (!staff) return base
  return {
    ...base,
    assignedTables: (o.assignedTables || []).map(tableShape),
    verificationStatus: o.verificationStatus,
    cancelReason: o.cancelReason,
    customerId: o.customerId,
    createdBy: o.createdBy,
    checkedInAt: o.checkedInAt,
    seatedAt: o.seatedAt,
    completedAt: o.completedAt,
  }
}
export const statusMessage = (s) => MESSAGES[s]
