import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import api from '../../services/api.js'
import OccupancyGrid from '../../components/dashboard/OccupancyGrid.jsx'
import { Alert, Badge, Button, Card, DataTable, ErrorState, Modal, PageHeader, SkeletonList, StatCard } from '../../components/dashboard/ui.jsx'
import { TextInput, Toggle, inputCls } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'
import { fmtTime, todayStr } from '../../components/dashboard/format.js'

const schema = z.object({
  tableNumber: z.string().trim().min(1, 'Table number is required').max(20),
  area: z.string().trim().max(60).optional(),
  capacity: z.coerce.number().int().min(1, 'At least 1 seat').max(100),
  combinationGroup: z.string().trim().max(40).optional(),
  active: z.boolean(),
})

function TableModal({ table, onClose, onSaved }) {
  const isEdit = !!table
  const [err, setErr] = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      tableNumber: table?.tableNumber || '',
      area: table?.area || 'Main Hall',
      capacity: table?.capacity || 4,
      combinationGroup: table?.combinationGroup || '',
      active: table ? table.active !== false : true,
    },
  })

  const submit = handleSubmit(async (v) => {
    setErr('')
    const body = { ...v, combinationGroup: v.combinationGroup || undefined }
    try {
      if (isEdit) await api.patch(`/tables/${table._id}`, body)
      else await api.post('/tables', body)
      onSaved()
    } catch (e) {
      setErr(e.message)
    }
  })

  return (
    <Modal open title={isEdit ? `Edit Table T${table.tableNumber}` : 'Add Dining Table'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Table Number" required placeholder="e.g. 1, A1" error={errors.tableNumber?.message} {...register('tableNumber')} />
          <TextInput label="Seat Capacity" type="number" min={1} required error={errors.capacity?.message} {...register('capacity')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Dining Area" placeholder="Main Hall, Family Room…" error={errors.area?.message} {...register('area')} />
          <TextInput label="Combination Group (optional)" hint="Tables with the same group code can combine for large parties" error={errors.combinationGroup?.message} {...register('combinationGroup')} />
        </div>
        <Toggle checked={watch('active')} onChange={(b) => setValue('active', b)} label="Table active (available for allocation)" />
        {err && <Alert tone="rose">{err}</Alert>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={isSubmitting}>{isEdit ? 'Save table' : 'Add table'}</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OwnerSeatingPage() {
  const { success, error: toastErr } = useToast()
  const { data, loading, error, reload } = useFetch(() => api.get('/tables'), [])
  const [slotDate, setSlotDate] = useState(todayStr())
  const { data: availData } = useFetch(() => api.get('/reservations/availability', { params: { date: slotDate } }), [slotDate, data])
  const [editing, setEditing] = useState(null)

  const remove = async (t) => {
    try {
      await api.delete(`/tables/${t._id}`)
      success(`Table T${t.tableNumber} deleted`)
      reload()
    } catch (e) {
      toastErr(e.message)
    }
  }

  const columns = [
    { key: 'tableNumber', header: 'Table', render: (r) => <span className="num font-serif text-lg font-semibold">T{r.tableNumber}</span> },
    { key: 'area', header: 'Area' },
    { key: 'capacity', header: 'Capacity', render: (r) => <span className="num font-semibold">{r.capacity} seats</span> },
    { key: 'combinationGroup', header: 'Combination Group', render: (r) => r.combinationGroup ? <Badge>{r.combinationGroup}</Badge> : '—' },
    { key: 'active', header: 'Status', render: (r) => <Badge className={r.active ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-stone-200 text-stone-700'}>{r.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" icon={Edit3} onClick={() => setEditing(r)}>Edit</Button>
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(r)} aria-label={`Delete table ${r.tableNumber}`} />
      </div>
    ) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Seating & Table Inventory"
        subtitle="Configure physical tables, capacities, combination groups and inspect per-slot seat availability"
        actions={<Button variant="gold" icon={Plus} onClick={() => setEditing('new')}>Add Table</Button>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Active Seats" value={data?.totalSeats ?? 0} tone="gold" loading={loading} />
        <StatCard label="Active Tables" value={(data?.items || []).filter((t) => t.active).length} tone="emerald" loading={loading} />
        <StatCard label="Total Tables" value={data?.items?.length ?? 0} tone="stone" loading={loading} />
      </div>

      {loading && !data ? <SkeletonList rows={3} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable columns={columns} rows={data?.items || []} />
      )}

      <OccupancyGrid />

      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Available Seat Count by Time Slot</h2>
            <p className="text-xs text-charcoal/60">Calculated separately for each date and slot interval</p>
          </div>
          <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} aria-label="Slot date" className={`${inputCls} w-auto`} />
        </div>
        {!availData?.open ? (
          <p className="text-sm text-charcoal/60">{availData?.reason || 'No slots available.'}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {availData.slots.map((s) => (
              <div key={s.time} className="rounded-lg border border-[#e7e2d6] bg-ivory/60 p-2.5 text-center">
                <div className="num text-xs font-semibold">{fmtTime(s.time)}</div>
                <div className="num mt-0.5 font-serif text-xl font-semibold text-olive">{s.availableSeats}</div>
                <div className="text-[10px] text-charcoal/55">seats free</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editing && (
        <TableModal
          table={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); success('Table saved'); reload() }}
        />
      )}
    </div>
  )
}
