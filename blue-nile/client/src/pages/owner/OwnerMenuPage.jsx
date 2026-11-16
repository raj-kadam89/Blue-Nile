import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Edit3, FolderPlus, Plus, Trash2, Upload } from 'lucide-react'
import api from '../../services/api.js'
import { Alert, Badge, Button, Card, DataTable, ErrorState, Modal, PageHeader, SkeletonList } from '../../components/dashboard/ui.jsx'
import { SelectInput, TextArea, TextInput, Toggle, inputCls } from '../../components/dashboard/Form.jsx'
import { useFetch } from '../../components/dashboard/hooks.js'
import { useToast } from '../../components/dashboard/Toast.jsx'

const itemSchema = z.object({
  name: z.string().trim().min(1, 'Dish name is required').max(100),
  category: z.string().min(1, 'Select a category'),
  price: z.string().optional(),
  description: z.string().trim().max(600).optional(),
  image: z.string().trim().max(500).optional(),
  isVeg: z.boolean(),
  available: z.boolean(),
  active: z.boolean(),
  featured: z.boolean(),
})

function DishModal({ item, categories, onClose, onSaved }) {
  const isEdit = !!item
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name || '',
      category: item?.category?._id || item?.category || categories[0]?._id || '',
      price: item?.price != null ? String(item.price) : '',
      description: item?.description || '',
      image: item?.image || '',
      isVeg: !!item?.isVeg,
      available: item ? item.available !== false : true,
      active: item ? item.active !== false : true,
      featured: !!item?.featured,
    },
  })

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setErr('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const r = await api.post('/admin/upload', fd)
      setValue('image', r.url)
    } catch (er) {
      setErr(er.message)
    } finally {
      setUploading(false)
    }
  }

  const submit = handleSubmit(async (v) => {
    setErr('')
    const price = v.price === '' || v.price === undefined ? null : Number(v.price)
    if (price !== null && (Number.isNaN(price) || price < 0)) { setErr('Enter a valid non-negative price or leave blank.'); return }
    const body = { ...v, price }
    try {
      if (isEdit) await api.patch(`/menu/${item._id}`, body)
      else await api.post('/menu', body)
      onSaved()
    } catch (e) {
      setErr(e.message)
    }
  })

  return (
    <Modal open title={isEdit ? `Edit ${item.name}` : 'Add Dish'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextInput label="Dish Name" required error={errors.name?.message} {...register('name')} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput label="Category" required options={categories.map((c) => ({ value: c._id, label: c.name }))} error={errors.category?.message} {...register('category')} />
          <TextInput label="Price in ₹ (leave blank for 'Price on request')" type="number" min={0} step="1" error={errors.price?.message} {...register('price')} />
        </div>
        <TextArea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
        <div>
          <TextInput label="Image URL" placeholder="/uploads/... or https://..." {...register('image')} />
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#d9d2c1] bg-ivory px-3 py-1.5 text-xs font-semibold hover:bg-ivory-dark">
            <Upload className="size-3.5" aria-hidden="true" />
            {uploading ? 'Uploading…' : 'Upload image file'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onFile} className="sr-only" disabled={uploading} />
          </label>
        </div>
        <div className="grid gap-3 rounded-lg bg-ivory p-3 sm:grid-cols-2">
          <Toggle checked={watch('isVeg')} onChange={(b) => setValue('isVeg', b)} label="Vegetarian" />
          <Toggle checked={watch('available')} onChange={(b) => setValue('available', b)} label="In stock today" />
          <Toggle checked={watch('featured')} onChange={(b) => setValue('featured', b)} label="Signature / featured" />
          <Toggle checked={watch('active')} onChange={(b) => setValue('active', b)} label="Published on public menu" />
        </div>
        {err && <Alert tone="rose">{err}</Alert>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={isSubmitting}>{isEdit ? 'Save dish' : 'Add dish'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function CategoryModal({ category, onClose, onSaved }) {
  const isEdit = !!category
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [order, setOrder] = useState(category?.order ?? 0)
  const [active, setActive] = useState(category ? category.active !== false : true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Category name is required'); return }
    setBusy(true); setErr('')
    try {
      const body = { name: name.trim(), description, order: Number(order) || 0, active }
      if (isEdit) await api.patch(`/menu/categories/${category._id}`, body)
      else await api.post('/menu/categories', body)
      onSaved()
    } catch (er) { setErr(er.message); setBusy(false) }
  }
  return (
    <Modal open size="sm" title={isEdit ? `Edit ${category.name}` : 'Add Category'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <TextInput label="Category Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextInput label="Display Order" type="number" value={order} onChange={(e) => setOrder(e.target.value)} />
        <TextArea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Toggle checked={active} onChange={setActive} label="Active on public menu" />
        {err && <Alert tone="rose">{err}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="gold" loading={busy}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function OwnerMenuPage() {
  const { success, error: toastErr } = useToast()
  const { data, loading, error, reload } = useFetch(() => api.get('/menu', { params: { all: 'true' } }), [])
  const [catFilter, setCatFilter] = useState('')
  const [q, setQ] = useState('')
  const [editingItem, setEditingItem] = useState(null)
  const [editingCat, setEditingCat] = useState(null)

  const categories = data?.categories || []
  const items = (data?.items || []).filter((i) => {
    if (catFilter && (i.category?._id || i.category) !== catFilter) return false
    if (q.trim() && !i.name.toLowerCase().includes(q.trim().toLowerCase())) return false
    return true
  })

  const quickToggle = async (item, field) => {
    try {
      await api.patch(`/menu/${item._id}`, { [field]: !item[field] })
      reload()
    } catch (e) { toastErr(e.message) }
  }

  const deleteItem = async (item) => {
    try { await api.delete(`/menu/${item._id}`); success('Dish deleted'); reload() } catch (e) { toastErr(e.message) }
  }
  const deleteCat = async (c) => {
    try { await api.delete(`/menu/categories/${c._id}`); success('Category deleted'); reload() } catch (e) { toastErr(e.message) }
  }

  const columns = [
    { key: 'name', header: 'Dish', render: (r) => (
      <div className="flex items-center gap-2">
        <span className={`inline-block size-2.5 rounded-full ${r.isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} title={r.isVeg ? 'Veg' : 'Non-veg'} />
        <div>
          <div className="font-semibold">{r.name}</div>
          <div className="text-xs text-charcoal/55">{r.category?.name || '—'}</div>
        </div>
      </div>
    ) },
    { key: 'price', header: 'Price', render: (r) => <span className="num font-semibold">{r.price != null ? `₹${r.price}` : <span className="text-xs text-amber-700">Price on request</span>}</span> },
    { key: 'available', header: 'Stock', render: (r) => (
      <button type="button" onClick={() => quickToggle(r, 'available')} className="text-left">
        <Badge className={r.available ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-rose-100 text-rose-800 ring-rose-200'}>{r.available ? 'In stock' : 'Out of stock'}</Badge>
      </button>
    ) },
    { key: 'active', header: 'Published', render: (r) => (
      <button type="button" onClick={() => quickToggle(r, 'active')} className="text-left">
        <Badge className={r.active ? 'bg-sky-100 text-sky-800 ring-sky-200' : 'bg-stone-200 text-stone-700'}>{r.active ? 'Published' : 'Draft / Hidden'}</Badge>
      </button>
    ) },
    { key: 'actions', header: 'Actions', render: (r) => (
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" icon={Edit3} onClick={() => setEditingItem(r)}>Edit</Button>
        <Button size="sm" variant="danger" icon={Trash2} onClick={() => deleteItem(r)} aria-label={`Delete ${r.name}`} />
      </div>
    ) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Management"
        subtitle="Manage categories, dishes, owner-verified prices, images and real-time stock availability"
        actions={(
          <>
            <Button variant="outline" size="sm" icon={FolderPlus} onClick={() => setEditingCat('new')}>Add Category</Button>
            <Button variant="gold" size="sm" icon={Plus} onClick={() => setEditingItem('new')} disabled={!categories.length}>Add Dish</Button>
          </>
        )}
      />

      <Card className="p-4">
        <h2 className="mb-2 font-serif text-xl font-semibold">Categories</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div key={c._id} className="inline-flex items-center gap-2 rounded-lg border border-[#d9d2c1] bg-ivory px-3 py-1.5 text-xs">
              <span className="font-semibold">{c.name}</span>
              {!c.active && <span className="text-charcoal/50">(hidden)</span>}
              <button type="button" onClick={() => setEditingCat(c)} className="text-olive underline">Edit</button>
              <button type="button" onClick={() => deleteCat(c)} className="text-rose-700 underline">Delete</button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dishes…" aria-label="Search dishes" className={`${inputCls} max-w-xs`} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Filter by category" className={`${inputCls} w-auto`}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {loading && !data ? <SkeletonList rows={4} /> : error ? <ErrorState error={error} onRetry={reload} /> : (
        <DataTable columns={columns} rows={items} />
      )}

      {editingItem && (
        <DishModal
          item={editingItem === 'new' ? null : editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSaved={() => { setEditingItem(null); success('Dish saved'); reload() }}
        />
      )}
      {editingCat && (
        <CategoryModal
          category={editingCat === 'new' ? null : editingCat}
          onClose={() => setEditingCat(null)}
          onSaved={() => { setEditingCat(null); success('Category saved'); reload() }}
        />
      )}
    </div>
  )
}
