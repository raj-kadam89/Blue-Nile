import { useState } from 'react'
import { Download, Plus, Search } from 'lucide-react'
import api from '../../services/api.js'
import { useSocketEvent } from '../../context/SocketContext.jsx'
import { BookingActions, BookingDetailDrawer, WalkInModal } from '../../components/dashboard/BookingParts.jsx'
import { Button, Card, DataTable, ErrorState, PageHeader, Pagination, SkeletonList, StatusBadge } from '../../components/dashboard/ui.jsx'
import { inputCls } from '../../components/dashboard/Form.jsx'
import { useDebounced, useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'
import { STATUSES, cleanParams, fmtDate, fmtTime } from '../../components/dashboard/format.js'

export default function OwnerBookingsPage() {
  const { error: toastErr } = useToast()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const [drawerId, setDrawerId] = useState(null)
  const [walkIn, setWalkIn] = useState(false)
  const [exporting, setExporting] = useState(false)
  const debQ = useDebounced(q, 300)

  const filterParams = cleanParams({ q: debQ.trim(), status, from, to, source })
  const { data, loading, error, reload } = useFetch(
    () => api.get('/admin/bookings', { params: { ...filterParams, page, limit: 20 } }),
    [debQ, status, from, to, source, page],
  )

  useSocketEvent('booking:new', reload)
  useSocketEvent('booking:updated', reload)

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await api.get('/admin/bookings', { params: { ...filterParams, format: 'csv' }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `blue-nile-bookings-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toastErr(e.message)
    } finally {
      setExporting(false)
    }
  }

  const columns = [
    { key: 'reference', header: 'Ref', render: (r) => <span className="num font-mono text-xs font-semibold">{r.reference}</span> },
    { key: 'customerName', header: 'Guest', render: (r) => <div><div className="font-semibold">{r.customerName}</div><div className="num text-xs text-charcoal/55">{r.mobile || '—'}</div></div> },
    { key: 'when', header: 'Date & Time', render: (r) => <div className="num"><div>{fmtDate(r.reservationDate)}</div><div className="text-xs text-charcoal/55">{fmtTime(r.startTime)}</div></div> },
    { key: 'guestCount', header: 'Guests', render: (r) => <span className="num font-semibold">{r.guestCount}</span> },
    { key: 'tables', header: 'Tables', render: (r) => r.assignedTables?.map((t) => `T${t.tableNumber}`).join(', ') || '—' },
    { key: 'bookingSource', header: 'Source', render: (r) => <span className="text-xs">{r.bookingSource}</span> },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', header: 'Actions', render: (r) => <div onClick={(e) => e.stopPropagation()}><BookingActions booking={r} onChanged={reload} size="sm" /></div> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="All Bookings"
        subtitle="Search, filter, manage reservation statuses, create manual bookings and export CSV reports"
        actions={(
          <>
            <Button variant="outline" size="sm" icon={Download} loading={exporting} onClick={exportCsv}>Export CSV</Button>
            <Button variant="gold" size="sm" icon={Plus} onClick={() => setWalkIn(true)}>Manual / Walk-in</Button>
          </>
        )}
      />

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-charcoal/40" aria-hidden="true" />
            <input
              type="search"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1) }}
              placeholder="Name, phone or reference…"
              aria-label="Search bookings"
              className={`${inputCls} pl-9`}
            />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status" className={inputCls}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1) }} aria-label="Filter by source" className={inputCls}>
            <option value="">All sources</option>
            <option value="ONLINE">ONLINE</option>
            <option value="WALK_IN">WALK_IN</option>
            <option value="PHONE">PHONE</option>
          </select>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} aria-label="From date" className={inputCls} />
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} aria-label="To date" className={inputCls} />
        </div>
      </Card>

      {loading && !data ? (
        <SkeletonList rows={5} />
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <>
          <DataTable columns={columns} rows={data?.items || []} onRowClick={(r) => setDrawerId(r._id)} />
          <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
        </>
      )}

      {drawerId && <BookingDetailDrawer id={drawerId} onClose={() => setDrawerId(null)} onChanged={reload} />}
      <WalkInModal open={walkIn} onClose={() => setWalkIn(false)} onDone={() => { setWalkIn(false); reload() }} allowSource />
    </div>
  )
}
