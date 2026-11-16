# Blue Nile – API Contract (v1)

Base: `/api` (Vite proxies `/api` and `/socket.io` to `:5000` in dev).
Success: `{ "success": true, "data": ..., "message"?: "" }`
Error: `{ "success": false, "error": { "code": "STRING", "message": "Human text", "details"?: [...] } }`
Paginated `data`: `{ items, total, page, pages }`.
Auth = HTTP-only cookies. Every non-GET request made while logged in must send header `X-CSRF-Token` (value returned by login/verify/refresh/me as `csrfToken`).
Dates are `YYYY-MM-DD` strings, times `HH:mm` (24h), all in restaurant local time (Asia/Kolkata).
Roles: `OWNER`, `STAFF`, `CUSTOMER`. `/admin/*` OWNER only. `/staff/*` OWNER + STAFF.

## Auth
- `POST /auth/send-otp` `{mobile, name?, email?}` -> `{cooldownSeconds, expiresInSeconds, devOtp?}` (devOtp only in development)
- `POST /auth/verify-otp` `{mobile, otp, name?, email?}` -> `{user, csrfToken}` (customer session)
- `POST /auth/staff-login` `{email, password}` -> `{user, csrfToken}`
- `POST /auth/refresh` -> `{user, csrfToken}`; `POST /auth/logout`; `GET /auth/me` -> `{user, csrfToken}` (401 if none)
- `user`: `{id, role, name, mobile?, email?, permissions?: {canReschedule, canCreateWalkIn}}`

## Public (no auth)
- `GET /public/settings` -> `{restaurant:{name,tagline,address,phone,whatsapp,email,mapsUrl,mapsEmbedUrl,googleRating,googleReviewCount,averageSpend,cuisine}, openingHours:[{day(0=Sun..6),open,close,closed}], hoursVerified, holidays:[{date,closed,open,close,note}], booking:{slotInterval,defaultDiningDuration,maxGuestsPerBooking,advanceBookingDays,cancellationCutoffHours,autoConfirm,minLeadMinutes,holdMinutes}, content:{home:{heroHeadline,heroSubtext,intro,heroImage,introImage,whyDine:[{title,text}],signatureItemIds:[]}, about:{story,philosophy,experience,historyVerified,images:[]}, faq:[{q,a}], policies:{privacy,terms,cancellation,noShow}, testimonials:[{name,text,rating,source}]}, totalSeats}`
- `GET /public/gallery?category=FOOD|INTERIOR|ATMOSPHERE|CUSTOMER` -> `{items:[{_id,url,caption,category}]}`
- `POST /public/contact` `{name,mobile?,email?,message}`
- `GET /menu` -> `{categories:[{_id,name,slug,description,order}], items:[{_id,name,slug,description,price(number|null),isVeg,available,image,featured,category:{_id,name,slug}}]}` (owner with `?all=true` also gets inactive)
- `GET /menu/:idOrSlug` -> `{item, related:[item]}`

## Customer reservations
- `GET /reservations/availability?date=&guests=` (public) -> `{date, open:bool, reason?, slots:[{time,endTime,availableSeats,available,reason?}], settings:{slotInterval,defaultDiningDuration}}`
- `POST /reservations` (CUSTOMER) `{guestCount,reservationDate,startTime,specialRequest?,occasion?,customerName?,email?}` -> `{reservation, message}`; 409 `SLOT_UNAVAILABLE`
- `GET /reservations/status?reference=` (CUSTOMER, own bookings only) -> `{reservation}`; 404 otherwise
- `GET /reservations/mine` (CUSTOMER) -> `{items}`
- `POST /reservations/cancel` (CUSTOMER) `{reference, reason?}` -> `{reservation}`; 422 if inside cutoff
- `reservation`: `{_id,reference,customerName,mobile,email,guestCount,reservationDate,startTime,endTime,status,specialRequest,occasion,bookingSource,holdExpiresAt,createdAt,statusMessage}`
- statuses: `PENDING CONFIRMED CHECKED_IN SEATED COMPLETED CANCELLED REJECTED NO_SHOW EXPIRED`

## Staff (OWNER+STAFF)
Staff reservation objects add `assignedTables:[{_id,tableNumber,area,capacity}], verificationStatus, cancelReason, customerId, createdBy`.
- `GET /staff/dashboard` -> `{counts:{pending,today,upcoming,checkedIn,seated,completed,cancelled}, nextArrivals:[reservation], occupancy:{occupiedSeats,availableSeats,totalSeats}}`
- `GET /staff/bookings?queue=new|today|upcoming|checked-in|seated|completed|cancelled|all&status=&date=&from=&to=&q=&page=&limit=` -> paginated reservations (`q` matches name/mobile/reference)
- `GET /staff/bookings/:id` -> `{reservation, audit:[], customerNotes:[], customerHistory:{total,completed,noShows,cancelled}}`
- `PATCH /staff/bookings/:id/status` `{status, reason?}` (reason required for CANCELLED/REJECTED/NO_SHOW)
- `PATCH /staff/bookings/:id/reschedule` `{reservationDate,startTime,reason?}` (needs permission canReschedule)
- `POST /staff/walk-in` `{customerName,mobile?,guestCount,specialRequest?,seatNow?:true,reservationDate?,startTime?,source?:"WALK_IN"|"PHONE"}`
- `POST /staff/bookings/:id/notes` `{note}`
- `GET /staff/customers?q=` -> `{items:[{_id,name,mobile,email,totalBookings,noShows,lastBookingDate}]}`
- `GET /staff/occupancy?date=&time=` -> `{date,time,totalSeats,availableSeats,tables:[{_id,tableNumber,area,capacity,status:"FREE"|"RESERVED"|"OCCUPIED",reservation?}]}`
- `GET /tables` (staff/owner) -> `{items:[{_id,tableNumber,area,capacity,active,combinationGroup}]}`; `POST /tables`, `PATCH /tables/:id`, `DELETE /tables/:id` OWNER only.

## Owner (/admin, OWNER only)
- `GET /admin/dashboard?date=&time=` -> `{totals:{total,today,pending,confirmed,cancelled,completed}, occupancy:{occupiedSeats,availableSeats,totalSeats}, setupWarnings:[string]}`
- `GET /admin/analytics?days=30` -> `{daily:[{date,count}], weekly:[{week,count}], monthly:[{month,count}], statusDistribution:[{status,count}], popularTimes:[{time,count}], guestDistribution:[{label,count}], sourceDistribution:[{source,count}], cancellation:{cancelled,rejected,noShow,expired,rate}}`
- `GET /admin/bookings` same filters as staff list, plus `format=csv` (file download)
- `GET|POST /admin/employees`, `PATCH /admin/employees/:id` `{name,email,phone,designation,active,permissions,password?}`, `GET /admin/employees/:id/activity`
  - employee: `{_id,name,email,phone,designation,active,permissions,lastLoginAt,createdAt}`
- `GET /admin/audit-logs?page=&entityType=&action=&actorId=` -> paginated `{_id,action,entityType,entityId,reference,actorName,actorRole,previousStatus,newStatus,reason,createdAt}`
- `GET /admin/settings` / `PATCH /admin/settings` – full settings document (see model) plus read-only `otpStatus:{provider,configured}`, `integrations:{whatsapp,email,cloudinary}`
  - Settings shape: `restaurant{...}, openingHours[], hoursVerified, holidays[], booking{slotInterval,defaultDiningDuration,bufferMinutes,maxGuestsPerBooking,advanceBookingDays,minLeadMinutes,holdMinutes,autoConfirm,cancellationCutoffHours}, content{...as public}, notificationPrefs{whatsappEnabled,emailEnabled,staffAlertNumber,staffAlertEmail,reminderHoursBefore}`
- `POST /admin/upload` multipart field `image` -> `{url}`
- `GET|POST /admin/gallery`, `PATCH|DELETE /admin/gallery/:id` `{url,caption,category,order,active}`
- `GET /admin/enquiries`, `PATCH /admin/enquiries/:id` `{status}`
- `GET /admin/notifications?page=` -> notification log
- Menu management: `POST|PATCH|DELETE /menu`, `POST|PATCH|DELETE /menu/categories[/:id]` (OWNER). Item body `{name,description,price,isVeg,available,active,image,category(id),featured}`.

## Realtime (Socket.IO, cookie-auth, OWNER/STAFF only, same origin / CLIENT_URL)
Events: `booking:new {reservation}`, `booking:updated {reservation, previousStatus}`, `availability:changed {date}`. Clients must refetch from REST; the server is the source of truth.
