import { Router } from 'express'
import { validate, otpLimiter, loginLimiter, publicFormLimiter } from '../middleware/common.js'
import { requireRole, requirePermission } from '../middleware/auth.js'
import { uploadImage } from '../middleware/upload.js'
import * as S from '../validators/schemas.js'
import * as auth from '../controllers/authController.js'
import * as resv from '../controllers/reservationController.js'
import * as staff from '../controllers/staffController.js'
import * as admin from '../controllers/adminController.js'
import * as tables from '../controllers/tableController.js'
import * as menu from '../controllers/menuController.js'
import * as pub from '../controllers/publicController.js'

const r = Router()
const OWNER = requireRole('OWNER')
const STAFF = requireRole('OWNER', 'STAFF')
const CUSTOMER = requireRole('CUSTOMER')

// ---- auth ----
r.post('/auth/send-otp', otpLimiter, validate({ body: S.sendOtpSchema }), auth.sendOtpCtrl)
r.post('/auth/verify-otp', otpLimiter, validate({ body: S.verifyOtpSchema }), auth.verifyOtpCtrl)
r.post('/auth/staff-login', loginLimiter, validate({ body: S.staffLoginSchema }), auth.staffLogin)
r.post('/auth/refresh', auth.refresh)
r.post('/auth/logout', auth.logout)
r.get('/auth/me', auth.me)

// ---- public ----
r.get('/public/settings', pub.publicSettings)
r.get('/public/gallery', pub.gallery)
r.post('/public/contact', publicFormLimiter, validate({ body: S.contactSchema }), pub.contact)

// ---- customer reservations ----
r.get('/reservations/availability', validate({ query: S.availabilityQuery }), resv.availability)
r.post('/reservations', CUSTOMER, validate({ body: S.createReservationSchema }), resv.create)
r.get('/reservations/status', CUSTOMER, validate({ query: S.statusQuery }), resv.status)
r.get('/reservations/mine', CUSTOMER, resv.mine)
r.post('/reservations/cancel', CUSTOMER, validate({ body: S.cancelSchema }), resv.cancel)

// ---- staff (owner also allowed) ----
r.get('/staff/dashboard', STAFF, staff.dashboard)
r.get('/staff/bookings', STAFF, validate({ query: S.bookingListQuery }), staff.listBookings)
r.get('/staff/bookings/:id', STAFF, staff.getBooking)
r.patch('/staff/bookings/:id/status', STAFF, validate({ body: S.statusChangeSchema }), staff.updateStatus)
r.patch('/staff/bookings/:id/reschedule', STAFF, requirePermission('canReschedule'), validate({ body: S.rescheduleSchema }), staff.reschedule)
r.post('/staff/bookings/:id/notes', STAFF, validate({ body: S.noteSchema }), staff.addNote)
r.post('/staff/walk-in', STAFF, requirePermission('canCreateWalkIn'), validate({ body: S.walkInSchema }), staff.walkIn)
r.get('/staff/customers', STAFF, staff.customers)
r.get('/staff/occupancy', STAFF, staff.occupancy)

// ---- tables ----
r.get('/tables', STAFF, tables.list)
r.post('/tables', OWNER, validate({ body: S.tableSchema }), tables.create)
r.patch('/tables/:id', OWNER, validate({ body: S.tableSchema.partial() }), tables.update)
r.delete('/tables/:id', OWNER, tables.remove)

// ---- menu ----
r.get('/menu', menu.list)
r.post('/menu/categories', OWNER, validate({ body: S.categorySchema }), menu.createCategory)
r.patch('/menu/categories/:id', OWNER, validate({ body: S.categorySchema.partial() }), menu.updateCategory)
r.delete('/menu/categories/:id', OWNER, menu.deleteCategory)
r.get('/menu/:idOrSlug', menu.getOne)
r.post('/menu', OWNER, validate({ body: S.menuItemSchema }), menu.createItem)
r.patch('/menu/:id', OWNER, validate({ body: S.menuItemSchema.partial() }), menu.updateItem)
r.delete('/menu/:id', OWNER, menu.deleteItem)

// ---- owner ----
r.get('/admin/dashboard', OWNER, admin.dashboard)
r.get('/admin/analytics', OWNER, admin.analytics)
r.get('/admin/bookings', OWNER, validate({ query: S.bookingListQuery }), admin.bookings)
r.get('/admin/employees', OWNER, admin.listEmployees)
r.post('/admin/employees', OWNER, validate({ body: S.employeeCreateSchema }), admin.createEmployee)
r.patch('/admin/employees/:id', OWNER, validate({ body: S.employeeUpdateSchema }), admin.updateEmployee)
r.get('/admin/employees/:id/activity', OWNER, admin.employeeActivity)
r.get('/admin/audit-logs', OWNER, admin.auditLogs)
r.get('/admin/settings', OWNER, admin.getAdminSettings)
r.patch('/admin/settings', OWNER, validate({ body: S.settingsSchema }), admin.updateSettings)
r.post('/admin/upload', OWNER, uploadImage, pub.upload)
r.get('/admin/gallery', OWNER, admin.listGallery)
r.post('/admin/gallery', OWNER, validate({ body: S.gallerySchema }), admin.createGallery)
r.patch('/admin/gallery/:id', OWNER, validate({ body: S.gallerySchema.partial() }), admin.updateGallery)
r.delete('/admin/gallery/:id', OWNER, admin.deleteGallery)
r.get('/admin/enquiries', OWNER, admin.listEnquiries)
r.patch('/admin/enquiries/:id', OWNER, admin.updateEnquiry)
r.get('/admin/notifications', OWNER, admin.listNotifications)

export default r
