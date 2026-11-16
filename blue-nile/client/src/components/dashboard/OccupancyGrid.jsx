import { useState } from 'react'
import { RefreshCw, Users } from 'lucide-react'
import api from '../../services/api.js'
import { useSocketEvent } from '../../context/SocketContext.jsx'
import { Button, Card, EmptyState, ErrorState, Skeleton, StatusBadge } from './ui.jsx'
import { inputCls } from './Form.jsx'
import { useFetch } from './hooks.js'
import { fmtTime, nowTimeStr, todayStr } from './format.js'

const TONE = {
  FREE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  RESERVED: 'border-amber-300 bg-amber-50 text-amber-900',
  OCCUPIED: 'border-rose-300 bg-rose-50 text-rose-900',
}

export default function OccupancyGrid({ title = 'Live table occupancy' }) {
  const [date, setDate] = useState(todayStr())
  const [time, setTime] = useState(nowTimeStr())
  const { data, loading, error, reload } = useFetch(() => api.get('/staff/occupancy', { params: { date, time } }), [date, time])
  useSocketEvent('booking:updated', reload)
  useSocketEvent('booking:new', reload)
  useSocketEvent('availability:changed', reload)

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold">{title}</h2>
          {data && <p className="num text-sm text-charcoal/60">{data.availableSeats} of {data.totalSeats} seats available</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-charcoal/60">Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputCls} mt-1 w-auto`} />
          </label>
          <label className="text-xs font-semibold text-charcoal/60">Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputCls} mt-1 w-auto`} />
          </label>
          <Button variant="outline" icon={RefreshCw} onClick={() => { setDate(todayStr()); setTime(nowTimeStr()); reload() }}>Now</Button>
        </div>
      </div>
      <div className="mb-3 flex gap-3 text-xs">
        {Object.keys(TONE).map((k) => <span key={k} className={`rounded-full border px-2 py-0.5 font-semibold ${TONE[k]}`}>{k[0] + k.slice(1).toLowerCase()}</span>)}
      </div>
      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : error && !data ? <ErrorState error={error} onRetry={reload} /> : !data?.tables?.length ? (
        <EmptyState title="No tables configured" text="Add tables under Seating & Tables to see live occupancy." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.tables.map((t) => (
            <div key={t._id} className={`rounded-xl border p-3 ${TONE[t.status] || TONE.FREE}`}>
              <div className="flex items-center justify-between">
                <span className="num font-serif text-xl font-semibold">T{t.tableNumber}</span>
                <span className="num flex items-center gap-1 text-xs"><Users className="size-3.5" aria-hidden="true" />{t.capacity}</span>
              </div>
              <div className="text-xs opacity-75">{t.area || 'Main'}</div>
              <div className="mt-1 text-xs font-bold uppercase tracking-wide">{t.status}</div>
              {t.reservation && (
                <div className="mt-1 truncate text-xs" title={t.reservation.customerName}>
                  {t.reservation.customerName} · {t.reservation.guestCount}p · {fmtTime(t.reservation.startTime)}
                  <div className="mt-1"><StatusBadge status={t.reservation.status} /></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
