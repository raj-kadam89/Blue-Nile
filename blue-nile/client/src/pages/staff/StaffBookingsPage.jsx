import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Search } from 'lucide-react'
import api from '../../services/api.js'
import { useSocket, useSocketEvent } from '../../context/SocketContext.jsx'
import { BookingCard, BookingDetailDrawer, WalkInModal } from '../../components/dashboard/BookingParts.jsx'
import { Button, EmptyState, ErrorState, PageHeader, Pagination, SkeletonList } from '../../components/dashboard/ui.jsx'
import { inputCls } from '../../components/dashboard/Form.jsx'
import { useDebounced, useFetch } from '../../components/dashboard/hooks.js'
import { cleanParams } from '../../components/dashboard/format.js'

const TITLES = {
  new: { title: 'New Booking Requests', subtitle: 'Pending reservations awaiting confirmation or rejection' },
  today: { title: "Today's Bookings", subtitle: 'All active reservations scheduled for today' },
  upcoming: { title: 'Upcoming Bookings', subtitle: 'Future pending and confirmed reservations' },
  'checked-in': { title: 'Checked-in Guests', subtitle: 'Arrived guests ready to be seated' },
  seated: { title: 'Seated Customers', subtitle: 'Currently dining — mark completed to release tables' },
  completed: { title: 'Completed Dining', subtitle: 'Finished visits with released table capacity' },
  cancelled: { title: 'Cancelled / Rejected / No-show', subtitle: 'Historical cancelled, rejected, expired and no-show bookings' },
}

export default function StaffBookingsPage({ queue = 'today' }) {
  const { resetNew } = useSocket() || {}
  const [q, setQ] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [drawerId, setDrawerId] = useState(null)
  const [walkIn, setWalkIn] = useState(false)
  const debQ = useDebounced(q, 300)

  useEffect(() => {
    setPage(1)
    if (queue === 'new') resetNew?.()
  }, [queue, debQ, date, resetNew])

  const { data, loading, error, reload } = useFetch(
    () => api.get('/staff/bookings', { params: cleanParams({ queue, q: debQ.trim(), date, page, limit: 15 }) }),
    [queue, debQ, date, page],
  )

  useSocketEvent('booking:new', reload)
  useSocketEvent('booking:updated', reload)

  useEffect(() => {
    const fn = () => reload()
    window.addEventListener('bn:bookings-changed', fn)
    return () => window.removeEventListener('bn:bookings-changed', fn)
  }, [reload])

  const meta = TITLES[queue] || { title: 'Bookings', subtitle: '' }

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.title}
        subtitle={meta.subtitle}
        actions={(
          <>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={reload}>Refresh</Button>
            <Button variant="gold" size="sm" icon={Plus} onClick={() => setWalkIn(true)}>Add walk-in</Button>
          </>
        )}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" aria-hidden="true" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by guest name, mobile or reference…"
            aria-label="Search bookings"
            className={`${inputCls} pl-9`}
          />
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filter by date"
          className={`${inputCls} w-auto`}
        />
        {(q || date) && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(''); setDate('') }}>Clear</Button>
        )}
      </div>

      {loading && !data ? (
        <SkeletonList rows={4} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.items?.length ? (
        <EmptyState title="No bookings in this queue" text="Bookings matching this view will appear here automatically." />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {data.items.map((b) => (
              <BookingCard key={b._id} booking={b} onOpen={(x) => setDrawerId(x._id)} onChanged={reload} />
            ))}
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}

      {drawerId && <BookingDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} onChanged={reload} />}
      <WalkInModal open={walkIn} onClose={() => setWalkIn(false)} onDone={() => { setWalkIn(false); reload() }} />
    </div>
  )
}
