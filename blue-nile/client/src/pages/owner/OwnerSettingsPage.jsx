import { useEffect, useState } from 'react'
import api from '../../services/api.js'
import { Badge, Button, Card, DataTable, ErrorState, PageHeader, Pagination, SkeletonList } from '../../components/dashboard/ui.jsx'
import { TextInput, Toggle } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'
import { fmtDateTime } from '../../components/dashboard/format.js'

export default function OwnerSettingsPage() {
  const { success, error: toastErr } = useToast()
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/settings'), [])
  const [notifPage, setNotifPage] = useState(1)
  const { data: notifData } = useFetch(() => api.get('/admin/notifications', { params: { page: notifPage, limit: 15 } }), [notifPage])

  const [booking, setBooking] = useState({})
  const [prefs, setPrefs] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!data) return
    setBooking(data.booking || {})
    setPrefs(data.notificationPrefs || {})
  }, [data])

  const save = async (patch) => {
    setSaving(true)
    try {
      await api.patch('/admin/settings', patch)
      success('Settings saved')
      reload()
    } catch (e) {
      toastErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) return <SkeletonList rows={4} />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  const num = (k, v) => setBooking({ ...booking, [k]: Number(v) })

  return (
    <div className="space-y-6">
      <PageHeader title="System & Reservation Settings" subtitle="Configure reservation slot intervals, dining duration, hold expiry, cancellation rules and notification channels" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-serif text-2xl font-semibold">Reservation & Seating Rules</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label="Slot Interval (minutes)" type="number" min={5} max={240} value={booking.slotInterval ?? 30} onChange={(e) => num('slotInterval', e.target.value)} />
            <TextInput label="Default Dining Duration (min)" type="number" min={15} max={480} value={booking.defaultDiningDuration ?? 90} onChange={(e) => num('defaultDiningDuration', e.target.value)} />
            <TextInput label="Table Turnaround Buffer (min)" type="number" min={0} max={120} value={booking.bufferMinutes ?? 15} onChange={(e) => num('bufferMinutes', e.target.value)} />
            <TextInput label="Max Guests per Online Booking" type="number" min={1} max={100} value={booking.maxGuestsPerBooking ?? 10} onChange={(e) => num('maxGuestsPerBooking', e.target.value)} />
            <TextInput label="Advance Booking Window (days)" type="number" min={1} max={365} value={booking.advanceBookingDays ?? 30} onChange={(e) => num('advanceBookingDays', e.target.value)} />
            <TextInput label="Minimum Lead Time (minutes)" type="number" min={0} value={booking.minLeadMinutes ?? 60} onChange={(e) => num('minLeadMinutes', e.target.value)} />
            <TextInput label="Pending Hold Expiry (minutes)" type="number" min={5} value={booking.holdMinutes ?? 120} onChange={(e) => num('holdMinutes', e.target.value)} />
            <TextInput label="Customer Cancellation Cutoff (hours)" type="number" min={0} value={booking.cancellationCutoffHours ?? 2} onChange={(e) => num('cancellationCutoffHours', e.target.value)} />
          </div>
          <Toggle
            checked={!!booking.autoConfirm}
            onChange={(b) => setBooking({ ...booking, autoConfirm: b })}
            label="Auto-confirm online bookings when tables are available"
            description="When off (recommended), online bookings start as PENDING until staff or owner confirms."
          />
          <Button variant="gold" loading={saving} onClick={() => save({ booking })}>Save Booking Rules</Button>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">Notification Preferences</h2>
            <Toggle checked={!!prefs.whatsappEnabled} onChange={(b) => setPrefs({ ...prefs, whatsappEnabled: b })} label="Send WhatsApp notifications" />
            <Toggle checked={!!prefs.emailEnabled} onChange={(b) => setPrefs({ ...prefs, emailEnabled: b })} label="Send Email notifications" />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Staff Alert WhatsApp Number" value={prefs.staffAlertNumber || ''} onChange={(e) => setPrefs({ ...prefs, staffAlertNumber: e.target.value })} />
              <TextInput label="Staff Alert Email" value={prefs.staffAlertEmail || ''} onChange={(e) => setPrefs({ ...prefs, staffAlertEmail: e.target.value })} />
            </div>
            <TextInput label="Send Reminder (hours before reservation)" type="number" min={0} max={48} value={prefs.reminderHoursBefore ?? 3} onChange={(e) => setPrefs({ ...prefs, reminderHoursBefore: Number(e.target.value) })} />
            <Button variant="gold" loading={saving} onClick={() => save({ notificationPrefs: prefs })}>Save Notification Preferences</Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-serif text-2xl font-semibold">Provider & Integration Status</h2>
            <p className="mt-1 text-xs text-charcoal/60">Configured through server environment variables (.env)</p>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {[
                ['Mobile OTP', data?.otpStatus?.configured, data?.otpStatus?.provider],
                ['WhatsApp Cloud API', data?.integrations?.whatsapp],
                ['Email Provider', data?.integrations?.email],
                ['Cloudinary Media', data?.integrations?.cloudinary],
              ].map(([name, ok, extra]) => (
                <div key={name} className="flex items-center justify-between rounded-lg bg-ivory px-3 py-2">
                  <dt className="font-medium">{name}{extra ? ` (${extra})` : ''}</dt>
                  <dd><Badge className={ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>{ok ? 'Configured' : 'Dev / Unset'}</Badge></dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-serif text-2xl font-semibold">Notification Delivery Log</h2>
        <DataTable
          columns={[
            { key: 'createdAt', header: 'Time', render: (r) => <span className="num text-xs">{fmtDateTime(r.createdAt)}</span> },
            { key: 'channel', header: 'Channel' },
            { key: 'event', header: 'Event' },
            { key: 'to', header: 'Recipient', render: (r) => <span className="num font-mono text-xs">{r.to}</span> },
            { key: 'status', header: 'Status', render: (r) => <Badge className={r.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : r.status === 'FAILED' ? 'bg-rose-100 text-rose-800' : 'bg-stone-200 text-stone-700'}>{r.status}</Badge> },
            { key: 'lastError', header: 'Note / Error', render: (r) => <span className="text-xs text-charcoal/60">{r.lastError || '—'}</span> },
          ]}
          rows={notifData?.items || []}
        />
        <Pagination page={notifData?.page} pages={notifData?.pages} total={notifData?.total} onPage={setNotifPage} />
      </Card>
    </div>
  )
}
