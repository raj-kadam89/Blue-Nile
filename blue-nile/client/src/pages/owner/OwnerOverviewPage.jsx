import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Armchair, BarChart3, CalendarCheck, CheckCheck, ClipboardList, Clock, Inbox, Table2, Users, UtensilsCrossed, XCircle } from 'lucide-react'
import api from '../../services/api.js'
import { useSocketEvent } from '../../context/SocketContext.jsx'
import OccupancyGrid from '../../components/dashboard/OccupancyGrid.jsx'
import { Alert, Button, Card, ErrorState, PageHeader, StatCard } from '../../components/dashboard/ui.jsx'
import { inputCls } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { nowTimeStr, todayStr } from '../../components/dashboard/format.js'

export default function OwnerOverviewPage() {
  const navigate = useNavigate()
  const [slotDate, setSlotDate] = useState(todayStr())
  const [slotTime, setSlotTime] = useState(nowTimeStr())
  const { data, loading, error, reload } = useFetch(
    () => api.get('/admin/dashboard', { params: { date: slotDate, time: slotTime } }),
    [slotDate, slotTime],
  )

  useSocketEvent('booking:new', reload)
  useSocketEvent('booking:updated', reload)
  useSocketEvent('availability:changed', reload)

  const t = data?.totals || {}
  const occ = data?.occupancy || {}
  const slot = data?.slot || {}
  const warnings = data?.setupWarnings || []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Owner Overview"
        subtitle="BLUE NILE, Bund Garden Road · Live reservations, seating capacity and restaurant operations"
        actions={(
          <>
            <Link to="/admin/analytics"><Button variant="outline" size="sm" icon={BarChart3}>Analytics</Button></Link>
            <Link to="/admin/seating"><Button variant="outline" size="sm" icon={Table2}>Seating</Button></Link>
            <Link to="/admin/menu"><Button variant="gold" size="sm" icon={UtensilsCrossed}>Manage Menu</Button></Link>
          </>
        )}
      />

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <Alert key={i} tone="amber" className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{w}</span>
            </Alert>
          ))}
        </div>
      )}

      {error && !data ? <ErrorState error={error} onRetry={reload} /> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Bookings" value={t.total} icon={ClipboardList} tone="gold" loading={loading} onClick={() => navigate('/admin/bookings')} />
          <StatCard label="Today's Bookings" value={t.today} icon={CalendarCheck} tone="sky" loading={loading} onClick={() => navigate('/staff/today')} />
          <StatCard label="Pending Approval" value={t.pending} icon={Inbox} tone="amber" loading={loading} onClick={() => navigate('/staff/new')} />
          <StatCard label="Confirmed" value={t.confirmed} icon={Clock} tone="indigo" loading={loading} onClick={() => navigate('/admin/bookings')} />
          <StatCard label="Completed Visits" value={t.completed} icon={CheckCheck} tone="emerald" loading={loading} />
          <StatCard label="Cancelled / Rejected" value={t.cancelled} icon={XCircle} tone="rose" loading={loading} />
          <StatCard label="Current Occupied Seats" value={occ.occupiedSeats != null ? `${occ.occupiedSeats} / ${occ.totalSeats}` : '—'} hint={`${occ.availableSeats ?? 0} seats free now`} icon={Armchair} tone="emerald" loading={loading} />
          <StatCard label="Available for Selected Slot" value={slot.availableSeats != null ? `${slot.availableSeats} / ${slot.totalSeats}` : '—'} hint={`${slot.date || slotDate} at ${slot.time || slotTime}`} icon={Users} tone="gold" loading={loading} />
        </div>
      )}

      <Card className="p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Check Seat Availability for Any Slot</h2>
            <p className="text-xs text-charcoal/60">Inspect available vs occupied capacity for a specific date and time</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-charcoal/60">Date
              <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} className={`${inputCls} mt-1 w-auto`} />
            </label>
            <label className="text-xs font-semibold text-charcoal/60">Time
              <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} className={`${inputCls} mt-1 w-auto`} />
            </label>
          </div>
        </div>
      </Card>

      <OccupancyGrid />
    </div>
  )
}
