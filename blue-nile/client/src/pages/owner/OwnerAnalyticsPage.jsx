import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api from '../../services/api.js'
import { Button, Card, ErrorState, PageHeader, Skeleton, StatCard } from '../../components/dashboard/ui.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { STATUS_COLORS } from '../../components/dashboard/format.js'

const RANGES = [7, 30, 90]

export default function OwnerAnalyticsPage() {
  const [days, setDays] = useState(30)
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/analytics', { params: { days } }), [days])
  const c = data?.cancellation || {}

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restaurant Analytics"
        subtitle={`Booking volume, popular reservation times, party sizes and cancellation metrics (${days} days)`}
        actions={(
          <div className="flex gap-1 rounded-lg border border-[#d9d2c1] bg-white p-1">
            {RANGES.map((r) => (
              <Button key={r} size="sm" variant={days === r ? 'primary' : 'ghost'} onClick={() => setDays(r)}>
                {r}d
              </Button>
            ))}
          </div>
        )}
      />

      {error && !data ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatCard label="Bookings in Range" value={c.total} tone="gold" />
            <StatCard label="Cancelled" value={c.cancelled} tone="rose" />
            <StatCard label="Rejected" value={c.rejected} tone="amber" />
            <StatCard label="No-shows" value={c.noShow} tone="rose" />
            <StatCard label="Loss Rate" value={`${c.rate ?? 0}%`} hint="Cancelled + rejected + no-show" tone="stone" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Daily Bookings</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" name="Bookings" stroke="#B9955A" fill="#B9955A" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Weekly Bookings</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Bookings" fill="#343B31" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Monthly Bookings (Last 12 Months)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Bookings" fill="#171717" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Booking Status Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.statusDistribution} dataKey="count" nameKey="status" innerRadius={50} outerRadius={85} label={(e) => `${e.status} (${e.count})`}>
                      {data.statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#78716c'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Popular Reservation Times</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.popularTimes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" name="Bookings" fill="#B9955A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h2 className="mb-3 font-serif text-2xl font-semibold">Guest Count & Booking Source</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.guestDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee9dc" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Parties" fill="#343B31" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="self-center space-y-2 text-sm">
                  {data.sourceDistribution.length ? data.sourceDistribution.map((s) => (
                    <li key={s.source} className="flex items-center justify-between rounded-lg bg-ivory px-3 py-2">
                      <span className="font-semibold">{s.source}</span>
                      <span className="num font-mono">{s.count}</span>
                    </li>
                  )) : <li className="text-xs text-charcoal/55">No bookings in range.</li>}
                </ul>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
