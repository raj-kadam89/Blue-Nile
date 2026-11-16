import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Armchair, CalendarCheck, CalendarClock, CheckCheck, Inbox, Phone, Plus, Search, UserCheck, Users, XCircle } from 'lucide-react'
import api from '../../services/api.js'
import { useSocketEvent } from '../../context/SocketContext.jsx'
import { BookingCard, BookingDetailDrawer, WalkInModal } from '../../components/dashboard/BookingParts.jsx'
import OccupancyGrid from '../../components/dashboard/OccupancyGrid.jsx'
import { Button, Card, EmptyState, ErrorState, PageHeader, SkeletonList, StatCard } from '../../components/dashboard/ui.jsx'
import { inputCls } from '../../components/dashboard/Form.jsx'
import { useDebounced, useFetch } from '../../components/dashboard/hooks.js'
import { fmtDate } from '../../components/dashboard/format.js'

export default function StaffOverviewPage() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useFetch(() => api.get('/staff/dashboard'), [])
  const [drawerId, setDrawerId] = useState(null)
  const [walkIn, setWalkIn] = useState(false)
  const [custQ, setCustQ] = useState('')
  const debQ = useDebounced(custQ, 300)
  const { data: custData } = useFetch(() => (debQ.trim() ? api.get('/staff/customers', { params: { q: debQ.trim() } }) : Promise.resolve({ items: [] })), [debQ])

  useSocketEvent('booking:new', reload)
  useSocketEvent('booking:updated', reload)
  useSocketEvent('availability:changed', reload)

  useEffect(() => {
    const fn = () => reload()
    window.addEventListener('bn:bookings-changed', fn)
    return () => window.removeEventListener('bn:bookings-changed', fn)
  }, [reload])

  const c = data?.counts || {}
  const occ = data?.occupancy || {}

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Operations"
        subtitle="Manage incoming reservations, arrivals, seating and walk-in guests"
        actions={<Button variant="gold" icon={Plus} onClick={() => setWalkIn(true)}>Add walk-in</Button>}
      />

      {error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <StatCard label="Pending" value={c.pending} icon={Inbox} tone="amber" loading={loading} onClick={() => navigate('/staff/new')} />
          <StatCard label="Today" value={c.today} icon={CalendarCheck} tone="gold" loading={loading} onClick={() => navigate('/staff/today')} />
          <StatCard label="Upcoming" value={c.upcoming} icon={CalendarClock} tone="sky" loading={loading} onClick={() => navigate('/staff/upcoming')} />
          <StatCard label="Checked-in" value={c.checkedIn} icon={UserCheck} tone="indigo" loading={loading} onClick={() => navigate('/staff/checked-in')} />
          <StatCard label="Seated" value={c.seated} icon={Armchair} tone="emerald" loading={loading} onClick={() => navigate('/staff/seated')} />
          <StatCard label="Completed" value={c.completed} icon={CheckCheck} tone="stone" loading={loading} onClick={() => navigate('/staff/completed')} />
          <StatCard label="Cancelled" value={c.cancelled} icon={XCircle} tone="rose" loading={loading} onClick={() => navigate('/staff/cancelled')} />
          <StatCard label="Free Seats" value={occ.availableSeats != null ? `${occ.availableSeats}/${occ.totalSeats}` : '—'} icon={Users} tone="emerald" loading={loading} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <h2 className="font-serif text-2xl font-semibold">Next Arrivals Today</h2>
          {loading && !data ? (
            <SkeletonList rows={3} />
          ) : !data?.nextArrivals?.length ? (
            <EmptyState title="No upcoming arrivals right now" text="New and confirmed bookings for today will appear here." />
          ) : (
            <div className="space-y-3">
              {data.nextArrivals.map((b) => (
                <BookingCard key={b._id} booking={b} onOpen={(x) => setDrawerId(x._id)} onChanged={reload} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 lg:col-span-5">
          <Card className="p-4">
            <h2 className="font-serif text-2xl font-semibold">Lookup Customer by Phone / Name</h2>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" aria-hidden="true" />
              <input
                type="search"
                value={custQ}
                onChange={(e) => setCustQ(e.target.value)}
                placeholder="Search phone or guest name…"
                aria-label="Search customer by phone or name"
                className={`${inputCls} pl-9`}
              />
            </div>
            {debQ.trim() && (
              <ul className="mt-3 divide-y divide-[#eee9dc] text-sm">
                {custData?.items?.length ? custData.items.map((g) => (
                  <li key={g.mobile} className="flex items-center justify-between py-2">
                    <div>
                      <div className="font-semibold">{g.name}</div>
                      <a href={`tel:${g.mobile}`} className="num flex items-center gap-1 text-xs text-olive underline"><Phone className="size-3" aria-hidden="true" />{g.mobile}</a>
                    </div>
                    <div className="num text-right text-xs text-charcoal/65">
                      <div>{g.totalBookings} visits · {g.noShows} no-shows</div>
                      <div>Last: {fmtDate(g.lastBookingDate)}</div>
                    </div>
                  </li>
                )) : <li className="py-3 text-xs text-charcoal/55">No matching guests found.</li>}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <OccupancyGrid />

      {drawerId && <BookingDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} onChanged={reload} />}
      <WalkInModal open={walkIn} onClose={() => setWalkIn(false)} onDone={() => { setWalkIn(false); reload() }} />
    </div>
  )
}
