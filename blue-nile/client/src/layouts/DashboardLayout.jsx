import { useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell, BarChart3, CalendarCheck, CalendarClock, CalendarDays, ClipboardList, Globe, LayoutDashboard, LogOut,
  Menu as MenuIcon, Plus, Settings, ShieldCheck, Table2, UserCheck, UserRound, Users, UtensilsCrossed, Volume2, VolumeX, Wifi, WifiOff, X, XCircle, CheckCheck, Armchair, Inbox,
} from 'lucide-react'
import '../styles/dashboard.css'
import { useAuth } from '../context/AuthContext.jsx'
import { SocketProvider, useSocket } from '../context/SocketContext.jsx'
import { ToastProvider } from '../components/dashboard/Toast.jsx'
import { Button } from '../components/dashboard/ui.jsx'
import { WalkInModal } from '../components/dashboard/BookingParts.jsx'

const OWNER_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/admin/seating', label: 'Seating & Tables', icon: Table2 },
  { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { to: '/admin/website', label: 'Website Content', icon: Globe },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldCheck },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]
const STAFF_NAV = [
  { to: '/staff', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/staff/new', label: 'New Bookings', icon: Inbox },
  { to: '/staff/today', label: "Today's", icon: CalendarCheck },
  { to: '/staff/upcoming', label: 'Upcoming', icon: CalendarClock },
  { to: '/staff/checked-in', label: 'Checked-in', icon: UserCheck },
  { to: '/staff/seated', label: 'Seated Customers', icon: Armchair },
  { to: '/staff/completed', label: 'Completed', icon: CheckCheck },
  { to: '/staff/cancelled', label: 'Cancelled', icon: XCircle },
]
// Compact bottom nav on mobile for staff
const STAFF_BOTTOM = [STAFF_NAV[0], STAFF_NAV[1], STAFF_NAV[2], STAFF_NAV[4], STAFF_NAV[5]]

function NavItem({ item, onClick }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-gold/15 text-gold-light shadow-[inset_3px_0_0_var(--color-gold)]' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory'}`}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      {item.label}
    </NavLink>
  )
}

function Shell({ area }) {
  const { user, logout, isOwner } = useAuth()
  const { connected, newCount, resetNew, soundOn, setSoundOn } = useSocket()
  const [open, setOpen] = useState(false)
  const [walkIn, setWalkIn] = useState(false)
  const navigate = useNavigate()
  const loc = useLocation()
  const nav = area === 'owner' ? OWNER_NAV : STAFF_NAV

  const doLogout = async () => {
    try { await logout() } finally { navigate(area === 'owner' ? '/admin/login' : '/staff/login', { replace: true }) }
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-charcoal text-ivory">
      <div className="flex items-center justify-between px-5 py-5">
        <NavLink to={area === 'owner' ? '/admin' : '/staff'} className="block">
          <span className="font-serif text-2xl font-semibold tracking-wide text-gold-light">BLUE NILE</span>
          <span className="block text-[10px] uppercase tracking-[0.25em] text-ivory/50">{area === 'owner' ? 'Owner console' : 'Staff operations'}</span>
        </NavLink>
        <button type="button" className="rounded-lg p-2 text-ivory/70 hover:bg-white/10 lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)}><X className="size-5" /></button>
      </div>
      <nav className="dash-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-4" aria-label={`${area} navigation`}>
        {nav.map((n) => <NavItem key={n.to} item={n} onClick={() => setOpen(false)} />)}
        {area === 'owner' && (
          <>
            <div className="mx-3 my-3 border-t border-white/10" />
            <NavItem item={{ to: '/staff', label: 'Staff operations', icon: UserRound, end: true }} onClick={() => setOpen(false)} />
          </>
        )}
        {area === 'staff' && (
          <div className="px-1 pt-4">
            <Button variant="gold" className="w-full" icon={Plus} onClick={() => { setOpen(false); setWalkIn(true) }}>Add walk-in</Button>
            {isOwner && <NavLink to="/admin" className="mt-3 block rounded-lg px-3 py-2 text-sm text-ivory/60 hover:bg-white/5 hover:text-ivory">← Owner console</NavLink>}
          </div>
        )}
      </nav>
      <div className="border-t border-white/10 p-4 text-xs text-ivory/50">
        <span className={`inline-flex items-center gap-1.5 ${connected ? 'text-emerald-400' : 'text-amber-400'}`}>
          {connected ? <Wifi className="size-3.5" aria-hidden="true" /> : <WifiOff className="size-3.5" aria-hidden="true" />}
          {connected ? 'Live updates on' : 'Reconnecting…'}
        </span>
      </div>
    </div>
  )

  return (
    <div className="dash-root min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-charcoal/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="dash-slide absolute inset-y-0 left-0 w-72 max-w-[85vw]">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#e7e2d6] bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg p-2 hover:bg-black/5 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}><MenuIcon className="size-5" /></button>
          <span className="font-serif text-lg font-semibold lg:hidden">BLUE NILE</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`} role="status">
            <span className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />{connected ? 'Live' : 'Offline'}
          </span>
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Mute new booking sound' : 'Play sound on new booking'}
            title={soundOn ? 'Sound on' : 'Sound off'}
            className="rounded-lg p-2 text-charcoal/70 hover:bg-black/5"
          >{soundOn ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}</button>
          <button
            type="button"
            onClick={() => { resetNew(); navigate('/staff/new') }}
            aria-label={`New bookings${newCount ? `, ${newCount} unread` : ''}`}
            className="relative rounded-lg p-2 text-charcoal/70 hover:bg-black/5"
          >
            <Bell className="size-5" />
            {newCount > 0 && <span className="dash-ping num absolute right-0.5 top-0.5 grid min-w-4.5 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-charcoal">{newCount}</span>}
          </button>
          <div className="ml-1 hidden text-right leading-tight sm:block">
            <div className="text-sm font-semibold">{user?.name}</div>
            <div className="text-[11px] uppercase tracking-wider text-charcoal/50">{user?.role}</div>
          </div>
          <Button variant="outline" size="sm" icon={LogOut} onClick={doLogout} aria-label="Log out">Logout</Button>
        </div>
      </header>

      <main className={`mx-auto max-w-7xl px-4 py-6 sm:px-6 ${area === 'staff' ? 'pb-28 lg:pb-8' : ''}`} key={loc.pathname.split('/').slice(0, 3).join('/')}>
        <Outlet />
      </main>

      {area === 'staff' && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-white/10 bg-charcoal px-1 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
          {STAFF_BOTTOM.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${isActive ? 'text-gold-light' : 'text-ivory/60'}`}>
              <n.icon className="size-5" aria-hidden="true" />{n.label.replace(' Customers', '').replace('New Bookings', 'New')}
            </NavLink>
          ))}
          <button type="button" onClick={() => setWalkIn(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-gold" aria-label="Add walk-in">
            <Plus className="size-5" aria-hidden="true" />Walk-in
          </button>
        </nav>
      )}
      <WalkInModal
        open={walkIn}
        onClose={() => setWalkIn(false)}
        onDone={() => { setWalkIn(false); window.dispatchEvent(new Event('bn:bookings-changed')) }}
        allowSource={false}
      />
    </div>
  )
}

export default function DashboardLayout({ area = 'staff' }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="grid min-h-screen place-items-center text-sm" role="status">Loading…</div>
  if (!user || !['OWNER', 'STAFF'].includes(user.role)) return <Navigate to={area === 'owner' ? '/admin/login' : '/staff/login'} replace />
  if (area === 'owner' && user.role !== 'OWNER') return <Navigate to="/staff" replace />
  return (
    <ToastProvider>
      <SocketProvider>
        <Shell area={area} />
      </SocketProvider>
    </ToastProvider>
  )
}

// keep icon import referenced for tree-shaking clarity
export const _unused = CalendarDays
