import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

// Layouts
const PublicLayout = lazy(() => import('../layouts/PublicLayout.jsx'))
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout.jsx'))

// Public pages
const HomePage = lazy(() => import('../pages/public/HomePage.jsx'))
const AboutPage = lazy(() => import('../pages/public/AboutPage.jsx'))
const MenuPage = lazy(() => import('../pages/public/MenuPage.jsx'))
const DishDetailsPage = lazy(() => import('../pages/public/DishDetailsPage.jsx'))
const GalleryPage = lazy(() => import('../pages/public/GalleryPage.jsx'))
const ContactPage = lazy(() => import('../pages/public/ContactPage.jsx'))
const FAQPage = lazy(() => import('../pages/public/FAQPage.jsx'))
const PrivacyPage = lazy(() => import('../pages/public/PrivacyPage.jsx'))
const TermsPage = lazy(() => import('../pages/public/TermsPage.jsx'))
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage.jsx'))

// Customer pages
const ReservationPage = lazy(() => import('../pages/customer/ReservationPage.jsx'))
const BookingSuccessPage = lazy(() => import('../pages/customer/BookingSuccessPage.jsx'))
const BookingStatusPage = lazy(() => import('../pages/customer/BookingStatusPage.jsx'))

// Dashboard
const DashboardLogin = lazy(() => import('../pages/staff/StaffLoginPage.jsx'))
const OwnerOverviewPage = lazy(() => import('../pages/owner/OwnerOverviewPage.jsx'))
const OwnerAnalyticsPage = lazy(() => import('../pages/owner/OwnerAnalyticsPage.jsx'))
const OwnerBookingsPage = lazy(() => import('../pages/owner/OwnerBookingsPage.jsx'))
const OwnerEmployeesPage = lazy(() => import('../pages/owner/OwnerEmployeesPage.jsx'))
const OwnerSeatingPage = lazy(() => import('../pages/owner/OwnerSeatingPage.jsx'))
const OwnerMenuPage = lazy(() => import('../pages/owner/OwnerMenuPage.jsx'))
const OwnerWebsitePage = lazy(() => import('../pages/owner/OwnerWebsitePage.jsx'))
const OwnerSettingsPage = lazy(() => import('../pages/owner/OwnerSettingsPage.jsx'))
const OwnerAuditLogsPage = lazy(() => import('../pages/owner/OwnerAuditLogsPage.jsx'))
const StaffOverviewPage = lazy(() => import('../pages/staff/StaffOverviewPage.jsx'))
const StaffBookingsPage = lazy(() => import('../pages/staff/StaffBookingsPage.jsx'))

const Fallback = () => (
  <div className="grid min-h-[40vh] place-items-center text-sm opacity-70" role="status">Loading…</div>
)

/** Backend RBAC is the real gate; this only drives UX redirects. */
function RequireRole({ roles, loginPath }) {
  const { user, loading } = useAuth()
  if (loading) return <Fallback />
  if (!user || !roles.includes(user.role)) return <Navigate to={loginPath} replace />
  return <Outlet />
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<Fallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/menu/:slug" element={<DishDetailsPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/reserve" element={<ReservationPage />} />
          <Route path="/booking-success/:reference" element={<BookingSuccessPage />} />
          <Route path="/booking-status" element={<BookingStatusPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="/admin/login" element={<DashboardLogin area="owner" />} />
        <Route path="/staff/login" element={<DashboardLogin area="staff" />} />

        <Route element={<RequireRole roles={['OWNER']} loginPath="/admin/login" />}>
          <Route path="/admin" element={<DashboardLayout area="owner" />}>
            <Route index element={<OwnerOverviewPage />} />
            <Route path="analytics" element={<OwnerAnalyticsPage />} />
            <Route path="bookings" element={<OwnerBookingsPage />} />
            <Route path="employees" element={<OwnerEmployeesPage />} />
            <Route path="seating" element={<OwnerSeatingPage />} />
            <Route path="menu" element={<OwnerMenuPage />} />
            <Route path="website" element={<OwnerWebsitePage />} />
            <Route path="settings" element={<OwnerSettingsPage />} />
            <Route path="audit-logs" element={<OwnerAuditLogsPage />} />
          </Route>
        </Route>

        <Route element={<RequireRole roles={['STAFF', 'OWNER']} loginPath="/staff/login" />}>
          <Route path="/staff" element={<DashboardLayout area="staff" />}>
            <Route index element={<StaffOverviewPage />} />
            <Route path="new" element={<StaffBookingsPage queue="new" />} />
            <Route path="today" element={<StaffBookingsPage queue="today" />} />
            <Route path="upcoming" element={<StaffBookingsPage queue="upcoming" />} />
            <Route path="checked-in" element={<StaffBookingsPage queue="checked-in" />} />
            <Route path="seated" element={<StaffBookingsPage queue="seated" />} />
            <Route path="completed" element={<StaffBookingsPage queue="completed" />} />
            <Route path="cancelled" element={<StaffBookingsPage queue="cancelled" />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
