import { useState } from 'react'
import api from '../../services/api.js'
import { Badge, Card, DataTable, ErrorState, PageHeader, Pagination, SkeletonList, StatusBadge } from '../../components/dashboard/ui.jsx'
import { inputCls } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { cleanParams, fmtDateTime } from '../../components/dashboard/format.js'

const ENTITIES = ['', 'RESERVATION', 'EMPLOYEE', 'SETTINGS', 'TABLE', 'MENU', 'GALLERY', 'USER', 'REPORT']

export default function OwnerAuditLogsPage() {
  const [entityType, setEntityType] = useState('')
  const [reference, setReference] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading, error, reload } = useFetch(
    () => api.get('/admin/audit-logs', { params: cleanParams({ entityType, reference: reference.trim(), page, limit: 25 }) }),
    [entityType, reference, page],
  )

  const columns = [
    { key: 'createdAt', header: 'Timestamp', render: (r) => <span className="num text-xs">{fmtDateTime(r.createdAt)}</span> },
    { key: 'actorName', header: 'Actor', render: (r) => <div><div className="font-semibold">{r.actorName || 'System'}</div><div className="text-[11px] uppercase text-charcoal/55">{r.actorRole}</div></div> },
    { key: 'action', header: 'Action', render: (r) => <Badge>{r.action}</Badge> },
    { key: 'entityType', header: 'Entity', render: (r) => <span className="text-xs">{r.entityType}{r.reference ? ` · ${r.reference}` : ''}</span> },
    { key: 'transition', header: 'Status Change', render: (r) => r.newStatus ? (
      <div className="flex items-center gap-1.5">
        {r.previousStatus && <><StatusBadge status={r.previousStatus} /><span>→</span></>}
        <StatusBadge status={r.newStatus} />
      </div>
    ) : '—' },
    { key: 'reason', header: 'Reason / Details', render: (r) => <span className="text-xs text-charcoal/75">{r.reason || (r.meta ? JSON.stringify(r.meta) : '—')}</span> },
  ]

  return (
    <div className="space-y-5">
      <PageHeader title="Audit Logs" subtitle="Immutable trail of booking creations, confirmations, cancellations, completions and configuration changes" />

      <Card className="flex flex-wrap gap-3 p-4">
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1) }} aria-label="Filter by entity type" className={`${inputCls} w-auto`}>
          {ENTITIES.map((e) => <option key={e} value={e}>{e || 'All entity types'}</option>)}
        </select>
        <input
          value={reference}
          onChange={(e) => { setReference(e.target.value.toUpperCase()); setPage(1) }}
          placeholder="Filter by booking reference (e.g. BN-…)"
          aria-label="Filter by booking reference"
          className={`${inputCls} max-w-xs font-mono uppercase`}
        />
      </Card>

      {loading && !data ? <SkeletonList rows={5} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <DataTable columns={columns} rows={data?.items || []} />
          <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
        </>
      )}
    </div>
  )
}
