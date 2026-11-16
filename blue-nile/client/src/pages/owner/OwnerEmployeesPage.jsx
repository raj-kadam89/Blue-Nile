import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Activity, Edit3, Plus, UserCheck, UserX } from 'lucide-react'
import api from '../../services/api.js'
import { Alert, Badge, Button, DataTable, ErrorState, Modal, PageHeader, Pagination, SkeletonList } from '../../components/dashboard/ui.jsx'
import { TextInput, Toggle } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'
import { fmtDateTime } from '../../components/dashboard/format.js'

const empSchema = z.object({
  name: z.string().trim().min(2, 'Enter staff name'),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().max(20).optional(),
  designation: z.string().trim().max(80).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
  canReschedule: z.boolean(),
  canCreateWalkIn: z.boolean(),
})

function EmployeeModal({ employee, onClose, onSaved }) {
  const isEdit = !!employee
  const [err, setErr] = useState('')
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(empSchema),
    defaultValues: {
      name: employee?.name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      designation: employee?.designation || 'Host',
      password: '',
      canReschedule: !!employee?.permissions?.canReschedule,
      canCreateWalkIn: employee ? employee.permissions?.canCreateWalkIn !== false : true,
    },
  })

  const submit = handleSubmit(async (v) => {
    setErr('')
    if (!isEdit && (!v.password || v.password.length < 8)) { setErr('Password of at least 8 characters is required for new staff.'); return }
    const payload = {
      name: v.name,
      email: v.email,
      phone: v.phone || undefined,
      designation: v.designation || 'Staff',
      permissions: { canReschedule: v.canReschedule, canCreateWalkIn: v.canCreateWalkIn },
      ...(v.password ? { password: v.password } : {}),
    }
    try {
      if (isEdit) await api.patch(`/admin/employees/${employee._id}`, payload)
      else await api.post('/admin/employees', payload)
      onSaved()
    } catch (e) {
      setErr(e.message)
    }
  })

  return (
    <Modal open title={isEdit ? `Edit ${employee.name}` : 'Create Staff Account'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Full Name" required error={errors.name?.message} {...register('name')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Login Email" type="email" required error={errors.email?.message} {...register('email')} />
          <TextInput label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Designation" error={errors.designation?.message} {...register('designation')} />
          <TextInput label={isEdit ? 'New Password (leave blank to keep)' : 'Initial Password'} type="password" required={!isEdit} error={errors.password?.message} {...register('password')} />
        </div>
        <div className="space-y-3 rounded-lg bg-ivory p-3">
          <Toggle checked={watch('canCreateWalkIn')} onChange={(b) => setValue('canCreateWalkIn', b)} label="Can create walk-in & phone bookings" />
          <Toggle checked={watch('canReschedule')} onChange={(b) => setValue('canReschedule', b)} label="Can reschedule existing reservations" />
        </div>
        {err && <Alert tone="rose">{err}</Alert>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={isSubmitting}>{isEdit ? 'Save changes' : 'Create staff account'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ActivityDrawer({ employee, onClose }) {
  const [page, setPage] = useState(1)
  const { data, loading, error, reload } = useFetch(() => api.get(`/admin/employees/${employee._id}/activity`, { params: { page, limit: 20 } }), [employee._id, page])
  return (
    <Modal open drawer title={`Activity · ${employee.name}`} onClose={onClose}>
      {loading && !data ? <SkeletonList rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <>
          <ol className="space-y-2 border-l-2 border-gold/40 pl-4">
            {data?.items?.length ? data.items.map((a) => (
              <li key={a._id} className="text-sm">
                <div className="font-semibold">{a.action} {a.reference ? `· ${a.reference}` : ''}</div>
                <div className="text-xs text-charcoal/55">{a.previousStatus && a.newStatus ? `${a.previousStatus} → ${a.newStatus} · ` : ''}{fmtDateTime(a.createdAt)}</div>
                {a.reason && <div className="text-xs italic text-charcoal/70">“{a.reason}”</div>}
              </li>
            )) : <li className="text-sm text-charcoal/55">No recorded actions yet.</li>}
          </ol>
          <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
        </>
      )}
    </Modal>
  )
}

export default function OwnerEmployeesPage() {
  const { success, error: toastErr } = useToast()
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/employees'), [])
  const [editing, setEditing] = useState(null) // null | 'new' | employee
  const [activityEmp, setActivityEmp] = useState(null)

  const toggleActive = async (emp) => {
    try {
      await api.patch(`/admin/employees/${emp._id}`, { active: !emp.active })
      success(emp.active ? 'Staff account deactivated' : 'Staff account activated')
      reload()
    } catch (e) {
      toastErr(e.message)
    }
  }

  const columns = [
    { key: 'name', header: 'Name', render: (r) => <div><div className="font-semibold">{r.name}</div><div className="text-xs text-charcoal/55">{r.designation || 'Staff'}</div></div> },
    { key: 'email', header: 'Email / Phone', render: (r) => <div><div>{r.email}</div><div className="num text-xs text-charcoal/55">{r.phone || '—'}</div></div> },
    { key: 'permissions', header: 'Permissions', render: (r) => (
      <div className="flex flex-wrap gap-1">
        {r.permissions?.canCreateWalkIn && <Badge>Walk-in</Badge>}
        {r.permissions?.canReschedule && <Badge>Reschedule</Badge>}
      </div>
    ) },
    { key: 'lastLoginAt', header: 'Last Login', render: (r) => <span className="num text-xs">{fmtDateTime(r.lastLoginAt)}</span> },
    { key: 'active', header: 'Status', render: (r) => <Badge className={r.active ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-rose-100 text-rose-800 ring-rose-200'}>{r.active ? 'Active' : 'Inactive'}</Badge> },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" icon={Edit3} onClick={() => setEditing(r)}>Edit</Button>
        <Button size="sm" variant="outline" icon={Activity} onClick={() => setActivityEmp(r)}>Activity</Button>
        <Button size="sm" variant={r.active ? 'danger' : 'success'} icon={r.active ? UserX : UserCheck} onClick={() => toggleActive(r)}>
          {r.active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>
    ) },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        title="Employee Management"
        subtitle="Create staff login accounts, manage permissions, activate/deactivate access and audit staff actions"
        actions={<Button variant="gold" icon={Plus} onClick={() => setEditing('new')}>Add Staff Member</Button>}
      />

      {loading && !data ? <SkeletonList rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable columns={columns} rows={data?.items || []} />
      )}

      {editing && (
        <EmployeeModal
          employee={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); success('Saved'); reload() }}
        />
      )}
      {activityEmp && <ActivityDrawer employee={activityEmp} onClose={() => setActivityEmp(null)} />}
    </div>
  )
}
