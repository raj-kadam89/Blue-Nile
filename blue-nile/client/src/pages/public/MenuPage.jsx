import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, UtensilsCrossed } from 'lucide-react'
import { useFetch } from '../../hooks/useAsync.js'
import { DishCard, ErrorBlock, Seo, Skeleton } from '../../components/ui/PublicUi.jsx'

export default function MenuPage() {
  const [params, setParams] = useSearchParams()
  const activeCat = params.get('category') || 'all'
  const [q, setQ] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const { data, loading, error, reload } = useFetch('/menu')

  const categories = data?.categories || []
  const items = useMemo(() => {
    const all = data?.items || []
    const term = q.trim().toLowerCase()
    return all.filter((i) => {
      if (activeCat !== 'all' && i.category?.slug !== activeCat) return false
      if (vegOnly && !i.isVeg) return false
      if (term && !`${i.name} ${i.description || ''}`.toLowerCase().includes(term)) return false
      return true
    })
  }, [data, activeCat, vegOnly, q])

  const setCat = (slug) => {
    const next = new URLSearchParams(params)
    if (slug === 'all') next.delete('category')
    else next.set('category', slug)
    setParams(next, { replace: true })
  }

  return (
    <>
      <Seo title="Menu" description="Explore the menu at Blue Nile, Pune — Biryani, Kebabs, Starters, Main Course, Indian Breads, Rice & Pulao, Desserts and Beverages." path="/menu" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">The Blue Nile Kitchen</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Our Menu</h1>
          <p className="mt-3 max-w-2xl text-sm text-ivory/75">
            Menu items, prices and daily availability are managed directly by the restaurant. Dishes without a published price show “Price on request”.
          </p>
        </div>
      </section>

      <section className="container-x py-12">
        {/* Filters */}
        <div className="flex flex-col gap-4 border-b border-charcoal/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Menu categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeCat === 'all'}
              onClick={() => setCat('all')}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${activeCat === 'all' ? 'bg-charcoal text-ivory' : 'border border-charcoal/20 bg-white text-charcoal hover:border-gold'}`}
            >
              All ({data?.items?.length || 0})
            </button>
            {categories.map((c) => (
              <button
                key={c._id}
                type="button"
                role="tab"
                aria-selected={activeCat === c.slug}
                onClick={() => setCat(c.slug)}
                className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest transition-colors ${activeCat === c.slug ? 'bg-charcoal text-ivory' : 'border border-charcoal/20 bg-white text-charcoal hover:border-gold'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-60 flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-charcoal/45" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search dishes…"
                aria-label="Search dishes"
                className="field-input pl-9"
              />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 border border-charcoal/20 bg-white px-3 py-2.5 text-xs font-semibold uppercase tracking-wider">
              <input type="checkbox" checked={vegOnly} onChange={(e) => setVegOnly(e.target.checked)} className="size-4 accent-emerald-700" />
              Veg only
            </label>
          </div>
        </div>

        {/* Grid */}
        <div className="mt-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80" />)}
            </div>
          ) : error ? (
            <ErrorBlock error={error} onRetry={reload} />
          ) : items.length === 0 ? (
            <div className="border border-dashed border-charcoal/25 bg-white p-12 text-center">
              <UtensilsCrossed className="mx-auto size-8 text-gold" aria-hidden="true" />
              <h2 className="mt-3 font-serif text-2xl font-semibold">No dishes match your filter</h2>
              <p className="mt-1 text-sm text-charcoal/65">
                {data?.items?.length ? 'Try clearing your search or selecting another category.' : 'The restaurant is updating its online menu. Please call 020 2612 5238 for today’s dishes or reserve a table directly.'}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                {data?.items?.length ? (
                  <button type="button" onClick={() => { setCat('all'); setQ(''); setVegOnly(false) }} className="btn btn-dark btn-sm">Reset filters</button>
                ) : (
                  <Link to="/reserve" className="btn btn-primary btn-sm">Reserve a Table</Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => <DishCard key={item._id} item={item} LinkComponent={Link} />)}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
