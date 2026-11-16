import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { CalendarCheck2, MapPin, Menu as MenuIcon, Phone, Utensils, X } from 'lucide-react'
import { SettingsProvider } from '../context/SettingsContext.jsx'
import { useSettings } from '../hooks/useSettings.js'
import { useAuth } from '../context/AuthContext.jsx'
import { HoursTable } from '../components/ui/PublicUi.jsx'

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/about', label: 'Our Story' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
  { to: '/booking-status', label: 'Booking Status' },
]

function Shell() {
  const { restaurant, openingHours, settings } = useSettings()
  const { user, logout, isCustomer } = useAuth()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])

  const closeMenu = () => setOpen(false)
  const name = restaurant.name || 'BLUE NILE'
  const address = restaurant.address || '102, Bund Garden Road, Agarkar Nagar, Pune, Maharashtra 411001, India'
  const phone = restaurant.phone || '020 2612 5238'

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-charcoal">
      {/* Top editorial bar */}
      <div className="border-b border-white/10 bg-charcoal text-[11px] tracking-wider text-ivory/75">
        <div className="container-x flex flex-wrap items-center justify-between gap-2 py-2">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-gold" aria-hidden="true" />
            <span className="truncate">102, Bund Garden Road, Agarkar Nagar, Pune 411001</span>
          </span>
          <div className="flex items-center gap-4">
            <a href={`tel:${phone}`} className="flex items-center gap-1.5 hover:text-gold">
              <Phone className="size-3.5 text-gold" aria-hidden="true" />{phone}
            </a>
            {isCustomer && user && (
              <span className="hidden items-center gap-2 sm:inline-flex">
                <span className="text-gold">{user.name}</span>
                <button type="button" onClick={logout} className="underline hover:text-ivory">Sign out</button>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-40 border-b border-charcoal/10 bg-ivory/95 backdrop-blur-md">
        <div className="container-x flex h-20 items-center justify-between gap-4">
          <Link to="/" className="group flex flex-col">
            <span className="font-serif text-2xl font-semibold tracking-[0.14em] text-charcoal sm:text-3xl">{name.toUpperCase()}</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-charcoal/55">Bund Garden Road · Pune</span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `link-underline py-1 text-xs font-semibold uppercase tracking-[0.18em] transition-colors ${isActive ? 'text-charcoal' : 'text-charcoal/70 hover:text-charcoal'}`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link to="/reserve" className="btn btn-primary hidden sm:inline-flex">
              <CalendarCheck2 className="size-4" aria-hidden="true" />Reserve a Table
            </Link>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              className="inline-grid size-11 place-items-center border border-charcoal/20 lg:hidden"
            >
              {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav className="border-t border-charcoal/10 bg-ivory px-6 py-5 lg:hidden" aria-label="Mobile navigation">
            <ul className="space-y-3">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} onClick={closeMenu} className={({ isActive }) => `block py-1.5 font-serif text-2xl ${isActive ? 'font-semibold text-olive' : 'text-charcoal'}`}>
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2 border-t border-charcoal/10 pt-4">
              <Link to="/reserve" onClick={closeMenu} className="btn btn-primary w-full">Reserve a Table</Link>
              {isCustomer && user && (
                <button type="button" onClick={() => { logout(); closeMenu() }} className="btn btn-outline w-full">Sign out ({user.mobile})</button>
              )}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>

      {/* Mobile sticky booking bar */}
      {pathname !== '/reserve' && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-gold/40 bg-charcoal px-4 py-3 text-ivory sm:hidden">
          <div className="text-xs">
            <span className="block font-serif text-base text-gold-light">Planning a visit?</span>
            <span className="text-ivory/70">Live table availability</span>
          </div>
          <Link to="/reserve" className="btn btn-primary btn-sm">Reserve</Link>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gold/30 bg-charcoal text-ivory">
        <div className="container-x grid gap-10 py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="eyebrow">Est. in Pune</p>
            <h2 className="mt-1 font-serif text-3xl font-semibold tracking-wider text-ivory">{name.toUpperCase()}</h2>
            <p className="mt-3 text-sm leading-relaxed text-ivory/70">
              {restaurant.cuisine || 'Biryani Restaurant / Indian Restaurant'} on Bund Garden Road, Pune.
            </p>
            <div className="mt-5 space-y-1.5 text-sm text-ivory/80">
              <p>{address}</p>
              <p><a href={`tel:${phone}`} className="text-gold-light hover:underline">{phone}</a></p>
            </div>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-serif text-xl font-semibold text-gold-light">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-ivory/75">
              <li><Link to="/menu" className="hover:text-gold">Menu</Link></li>
              <li><Link to="/reserve" className="hover:text-gold">Table Reservation</Link></li>
              <li><Link to="/booking-status" className="hover:text-gold">Check Booking Status</Link></li>
              <li><Link to="/about" className="hover:text-gold">About Blue Nile</Link></li>
              <li><Link to="/gallery" className="hover:text-gold">Gallery</Link></li>
              <li><Link to="/faq" className="hover:text-gold">Frequently Asked Questions</Link></li>
              <li><Link to="/contact" className="hover:text-gold">Contact & Directions</Link></li>
            </ul>
          </div>

          <div className="md:col-span-5">
            <h3 className="font-serif text-xl font-semibold text-gold-light">Opening Hours</h3>
            <div className="mt-3">
              <HoursTable openingHours={openingHours} hoursVerified={settings?.hoursVerified} dark />
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="container-x flex flex-wrap items-center justify-between gap-4 py-5 text-xs text-ivory/55">
            <p>© {new Date().getFullYear()} {name}, Pune. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-5">
              <Link to="/privacy" className="hover:text-ivory">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-ivory">Terms & Conditions</Link>
              <Link to="/staff/login" className="hover:text-ivory">Staff Portal</Link>
              <Link to="/admin/login" className="hover:text-ivory">Owner Console</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function PublicLayout() {
  return (
    <SettingsProvider>
      <Shell />
    </SettingsProvider>
  )
}

export const _iconRef = Utensils
