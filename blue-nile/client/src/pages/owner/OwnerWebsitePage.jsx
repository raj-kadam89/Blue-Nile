import { useEffect, useState } from 'react'
import { Check, Plus, Trash2, Upload } from 'lucide-react'
import api from '../../services/api.js'
import { Badge, Button, Card, ErrorState, PageHeader, SkeletonList } from '../../components/dashboard/ui.jsx'
import { SelectInput, TextArea, TextInput, Toggle, inputCls } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'
import { fmtDateTime } from '../../components/dashboard/format.js'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TABS = [
  ['home', 'Home & Story'],
  ['contact', 'Contact & Hours'],
  ['faq', 'FAQ & Policies'],
  ['gallery', 'Gallery'],
  ['enquiries', 'Enquiries'],
]

export default function OwnerWebsitePage() {
  const { success, error: toastErr } = useToast()
  const { data, loading, error, reload } = useFetch(() => api.get('/admin/settings'), [])
  const { data: galData, reload: reloadGal } = useFetch(() => api.get('/admin/gallery'), [])
  const { data: enqData, reload: reloadEnq } = useFetch(() => api.get('/admin/enquiries'), [])

  const [tab, setTab] = useState('home')
  const [saving, setSaving] = useState(false)

  // Editable copies
  const [home, setHome] = useState({})
  const [about, setAbout] = useState({})
  const [restaurant, setRestaurant] = useState({})
  const [hours, setHours] = useState([])
  const [hoursVerified, setHoursVerified] = useState(false)
  const [holidays, setHolidays] = useState([])
  const [faq, setFaq] = useState([])
  const [policies, setPolicies] = useState({})

  // New gallery form
  const [galUrl, setGalUrl] = useState('')
  const [galCaption, setGalCaption] = useState('')
  const [galCat, setGalCat] = useState('FOOD')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!data) return
    setHome(data.content?.home || {})
    setAbout(data.content?.about || {})
    setRestaurant(data.restaurant || {})
    setHours(data.openingHours || [])
    setHoursVerified(!!data.hoursVerified)
    setHolidays(data.holidays || [])
    setFaq(data.content?.faq || [])
    setPolicies(data.content?.policies || {})
  }, [data])

  const saveSection = async (patch) => {
    setSaving(true)
    try {
      await api.patch('/admin/settings', patch)
      success('Website content saved')
      reload()
    } catch (e) {
      toastErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  const uploadToField = async (file, onUrl) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await api.post('/admin/upload', fd)
      onUrl(r.url)
    } catch (e) { toastErr(e.message) } finally { setUploading(false) }
  }

  const addGallery = async (e) => {
    e.preventDefault()
    if (!galUrl.trim()) return
    try {
      await api.post('/admin/gallery', { url: galUrl.trim(), caption: galCaption.trim(), category: galCat, active: true })
      setGalUrl(''); setGalCaption('')
      success('Gallery image added')
      reloadGal()
    } catch (er) { toastErr(er.message) }
  }

  if (loading && !data) return <SkeletonList rows={4} />
  if (error && !data) return <ErrorState error={error} onRetry={reload} />

  return (
    <div className="space-y-6">
      <PageHeader title="Website Content & CMS" subtitle="Edit public homepage copy, verified restaurant story, opening hours, holidays, FAQs, gallery and customer enquiries" />

      <div className="flex flex-wrap gap-2 border-b border-[#e7e2d6] pb-3" role="tablist">
        {TABS.map(([k, l]) => (
          <Button key={k} size="sm" variant={tab === k ? 'primary' : 'outline'} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>

      {tab === 'home' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">Homepage Hero & Introduction</h2>
            <TextInput label="Hero Headline" value={home.heroHeadline || ''} onChange={(e) => setHome({ ...home, heroHeadline: e.target.value })} />
            <TextInput label="Hero Subtext" value={home.heroSubtext || ''} onChange={(e) => setHome({ ...home, heroSubtext: e.target.value })} />
            <TextArea label="Restaurant Introduction" rows={4} value={home.intro || ''} onChange={(e) => setHome({ ...home, intro: e.target.value })} />
            <TextInput label="Hero Image URL" value={home.heroImage || ''} onChange={(e) => setHome({ ...home, heroImage: e.target.value })} />
            <Button variant="gold" loading={saving} onClick={() => saveSection({ content: { home: { heroHeadline: home.heroHeadline, heroSubtext: home.heroSubtext, intro: home.intro, heroImage: home.heroImage } } })}>
              Save Homepage
            </Button>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">About Us & Verified Heritage</h2>
            <TextArea label="Restaurant Story / Heritage" rows={4} value={about.story || ''} onChange={(e) => setAbout({ ...about, story: e.target.value })} />
            <Toggle
              checked={!!about.historyVerified}
              onChange={(b) => setAbout({ ...about, historyVerified: b })}
              label="Owner-verified historical story"
              description="The story text is only published on the public About page when this box is enabled."
            />
            <TextArea label="Cuisine Philosophy" rows={3} value={about.philosophy || ''} onChange={(e) => setAbout({ ...about, philosophy: e.target.value })} />
            <TextArea label="Dining Experience" rows={3} value={about.experience || ''} onChange={(e) => setAbout({ ...about, experience: e.target.value })} />
            <Button variant="gold" loading={saving} onClick={() => saveSection({ content: { about: { story: about.story || '', philosophy: about.philosophy || '', experience: about.experience || '', historyVerified: !!about.historyVerified } } })}>
              Save About Page
            </Button>
          </Card>
        </div>
      )}

      {tab === 'contact' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">Restaurant Contact Information</h2>
            <TextInput label="Restaurant Name" value={restaurant.name || ''} onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })} />
            <TextInput label="Business Category / Cuisine" value={restaurant.cuisine || ''} onChange={(e) => setRestaurant({ ...restaurant, cuisine: e.target.value })} />
            <TextArea label="Address" rows={2} value={restaurant.address || ''} onChange={(e) => setRestaurant({ ...restaurant, address: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Telephone" value={restaurant.phone || ''} onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })} />
              <TextInput label="WhatsApp Number" value={restaurant.whatsapp || ''} onChange={(e) => setRestaurant({ ...restaurant, whatsapp: e.target.value })} />
            </div>
            <TextInput label="Public Email" value={restaurant.email || ''} onChange={(e) => setRestaurant({ ...restaurant, email: e.target.value })} />
            <TextInput label="Google Maps Directions Link" value={restaurant.mapsUrl || ''} onChange={(e) => setRestaurant({ ...restaurant, mapsUrl: e.target.value })} />
            <Button variant="gold" loading={saving} onClick={() => saveSection({ restaurant })}>Save Contact Details</Button>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">Opening Hours & Holidays</h2>
            <Toggle checked={hoursVerified} onChange={setHoursVerified} label="Opening hours verified by owner" description="Removes the provisional-hours notice on the public website." />
            <div className="space-y-2">
              {DAYS.map((dName, idx) => {
                const row = hours.find((h) => h.day === idx) || { day: idx, open: '11:00', close: '23:00', closed: false }
                const patchRow = (p) => setHours(DAYS.map((_, i) => (i === idx ? { ...row, ...p } : (hours.find((h) => h.day === i) || { day: i, open: '11:00', close: '23:00', closed: false }))))
                return (
                  <div key={dName} className="grid grid-cols-12 items-center gap-2 text-sm">
                    <span className="col-span-4 font-semibold">{dName}</span>
                    <input type="time" disabled={row.closed} value={row.open || '11:00'} onChange={(e) => patchRow({ open: e.target.value })} className={`${inputCls} col-span-3`} />
                    <input type="time" disabled={row.closed} value={row.close || '23:00'} onChange={(e) => patchRow({ close: e.target.value })} className={`${inputCls} col-span-3`} />
                    <label className="col-span-2 flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={!!row.closed} onChange={(e) => patchRow({ closed: e.target.checked })} />Closed
                    </label>
                  </div>
                )
              })}
            </div>

            <div className="border-t border-[#eee9dc] pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase">Holidays / Special Hours</span>
                <Button size="sm" variant="outline" icon={Plus} onClick={() => setHolidays([...holidays, { date: new Date().toISOString().slice(0, 10), closed: true, note: 'Holiday' }])}>Add date</Button>
              </div>
              <div className="space-y-2">
                {holidays.map((h, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                    <input type="date" value={h.date} onChange={(e) => setHolidays(holidays.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} className={`${inputCls} w-auto`} />
                    <input placeholder="Note" value={h.note || ''} onChange={(e) => setHolidays(holidays.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} className={`${inputCls} flex-1`} />
                    <Button size="sm" variant="danger" icon={Trash2} onClick={() => setHolidays(holidays.filter((_, j) => j !== i))} />
                  </div>
                ))}
              </div>
            </div>

            <Button variant="gold" loading={saving} onClick={() => saveSection({ openingHours: hours, hoursVerified, holidays })}>Save Hours & Holidays</Button>
          </Card>
        </div>
      )}

      {tab === 'faq' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl font-semibold">FAQ Items</h2>
              <Button size="sm" variant="outline" icon={Plus} onClick={() => setFaq([...faq, { q: '', a: '' }])}>Add Question</Button>
            </div>
            {faq.map((f, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-[#e7e2d6] bg-ivory/50 p-3">
                <TextInput label={`Question ${i + 1}`} value={f.q} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                <TextArea label="Answer" rows={2} value={f.a} onChange={(e) => setFaq(faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
                <Button size="sm" variant="danger" icon={Trash2} onClick={() => setFaq(faq.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            ))}
            <Button variant="gold" loading={saving} onClick={() => saveSection({ content: { faq: faq.filter((f) => f.q.trim() && f.a.trim()) } })}>Save FAQs</Button>
          </Card>

          <Card className="space-y-4 p-5">
            <h2 className="font-serif text-2xl font-semibold">Reservation & Privacy Policies</h2>
            <TextArea label="Cancellation Policy Text" rows={3} value={policies.cancellation || ''} onChange={(e) => setPolicies({ ...policies, cancellation: e.target.value })} />
            <TextArea label="No-show Policy Text" rows={3} value={policies.noShow || ''} onChange={(e) => setPolicies({ ...policies, noShow: e.target.value })} />
            <TextArea label="Privacy Policy Override (blank = structured default)" rows={4} value={policies.privacy || ''} onChange={(e) => setPolicies({ ...policies, privacy: e.target.value })} />
            <TextArea label="Terms & Conditions Override (blank = structured default)" rows={4} value={policies.terms || ''} onChange={(e) => setPolicies({ ...policies, terms: e.target.value })} />
            <Button variant="gold" loading={saving} onClick={() => saveSection({ content: { policies } })}>Save Policies</Button>
          </Card>
        </div>
      )}

      {tab === 'gallery' && (
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 font-serif text-2xl font-semibold">Add Gallery Image</h2>
            <form onSubmit={addGallery} className="grid items-end gap-3 sm:grid-cols-4">
              <TextInput label="Image URL" required value={galUrl} onChange={(e) => setGalUrl(e.target.value)} />
              <TextInput label="Caption" value={galCaption} onChange={(e) => setGalCaption(e.target.value)} />
              <SelectInput label="Category" options={['FOOD', 'INTERIOR', 'ATMOSPHERE', 'CUSTOMER']} value={galCat} onChange={(e) => setGalCat(e.target.value)} />
              <div className="flex gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-[#d9d2c1] bg-ivory px-3 text-xs font-semibold">
                  <Upload className="size-3.5" aria-hidden="true" />{uploading ? '…' : 'Upload'}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(e) => uploadToField(e.target.files?.[0], setGalUrl)} />
                </label>
                <Button type="submit" variant="gold" icon={Plus}>Add</Button>
              </div>
            </form>
          </Card>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(galData?.items || []).map((g) => (
              <Card key={g._id} className="overflow-hidden">
                <img src={g.url} alt={g.caption || g.category} className="aspect-[4/3] w-full object-cover" />
                <div className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <Badge>{g.category}</Badge>
                    <p className="mt-1 truncate font-medium">{g.caption || 'No caption'}</p>
                  </div>
                  <Button size="sm" variant="danger" icon={Trash2} onClick={async () => { await api.delete(`/admin/gallery/${g._id}`); reloadGal() }} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'enquiries' && (
        <div className="space-y-3">
          {(enqData?.items || []).length === 0 ? (
            <Card className="p-8 text-center text-sm text-charcoal/60">No contact enquiries yet.</Card>
          ) : (
            (enqData?.items || []).map((e) => (
              <Card key={e._id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-xl font-semibold">{e.name}</span>
                    <Badge className={e.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>{e.status}</Badge>
                  </div>
                  <div className="num text-xs text-charcoal/55">{e.mobile || 'No phone'} · {e.email || 'No email'} · {fmtDateTime(e.createdAt)}</div>
                  <p className="mt-2 text-sm">{e.message}</p>
                </div>
                {e.status !== 'RESOLVED' && (
                  <Button size="sm" variant="outline" icon={Check} onClick={async () => { await api.patch(`/admin/enquiries/${e._id}`, { status: 'RESOLVED' }); reloadEnq() }}>
                    Mark resolved
                  </Button>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
