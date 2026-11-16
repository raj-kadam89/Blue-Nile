import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useFetch } from '../../hooks/useAsync.js'
import { ErrorBlock, Seo, Skeleton } from '../../components/ui/PublicUi.jsx'

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'FOOD', label: 'Food' },
  { key: 'INTERIOR', label: 'Interior' },
  { key: 'ATMOSPHERE', label: 'Atmosphere' },
  { key: 'CUSTOMER', label: 'Dining Moments' },
]

const FALLBACKS = [
  { _id: 'f1', url: '/images/hero.svg', caption: 'Handi biryani — illustrative artwork', category: 'FOOD' },
  { _id: 'f2', url: '/images/kebabs.svg', caption: 'Charcoal kebabs — illustrative artwork', category: 'FOOD' },
  { _id: 'f3', url: '/images/interior.svg', caption: 'Warm dining room — illustrative artwork', category: 'INTERIOR' },
  { _id: 'f4', url: '/images/dessert.svg', caption: 'Caramel custard — illustrative artwork', category: 'FOOD' },
]

export default function GalleryPage() {
  const [cat, setCat] = useState('ALL')
  const [idx, setIdx] = useState(-1)
  const { data, loading, error, reload } = useFetch('/public/gallery')

  const raw = data?.items?.length ? data.items : FALLBACKS
  const items = cat === 'ALL' ? raw : raw.filter((i) => i.category === cat)

  useEffect(() => {
    if (idx < 0) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setIdx(-1)
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % items.length)
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + items.length) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [idx, items.length])

  const active = idx >= 0 ? items[idx] : null

  return (
    <>
      <Seo title="Gallery" description="Food, interior and atmosphere gallery for Blue Nile, Pune." path="/gallery" />

      <section className="border-b border-charcoal/10 bg-charcoal py-14 text-ivory">
        <div className="container-x">
          <p className="eyebrow">Visuals</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold sm:text-5xl">Gallery</h1>
          <p className="mt-3 max-w-2xl text-sm text-ivory/75">Glimpses of our dishes, dining room and atmosphere on Bund Garden Road.</p>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gallery categories">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={cat === t.key}
              onClick={() => { setCat(t.key); setIdx(-1) }}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-widest ${cat === t.key ? 'bg-charcoal text-ivory' : 'border border-charcoal/20 bg-white hover:border-gold'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="aspect-[4/3]" />)}
            </div>
          ) : error ? (
            <ErrorBlock error={error} onRetry={reload} />
          ) : items.length === 0 ? (
            <p className="border border-dashed border-charcoal/25 bg-white p-12 text-center text-sm text-charcoal/65">No images in this category yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((g, i) => (
                <button
                  key={g._id}
                  type="button"
                  onClick={() => setIdx(i)}
                  className="img-zoom group relative block aspect-[4/3] overflow-hidden border border-charcoal/15 bg-charcoal text-left"
                >
                  <img src={g.url} alt={g.caption || g.category} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/90 via-charcoal/50 to-transparent p-4 text-ivory">
                    <span className="text-[10px] uppercase tracking-widest text-gold">{g.category}</span>
                    {g.caption && <p className="font-serif text-lg">{g.caption}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {active && (
        <div role="dialog" aria-modal="true" aria-label="Image lightbox" className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/90 p-4" onClick={() => setIdx(-1)}>
          <button type="button" onClick={() => setIdx(-1)} aria-label="Close lightbox" className="absolute right-5 top-5 border border-white/20 p-2 text-ivory hover:border-gold"><X className="size-6" /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + items.length) % items.length) }} aria-label="Previous image" className="mr-3 border border-white/20 p-2 text-ivory hover:border-gold"><ChevronLeft className="size-6" /></button>
          <figure className="max-h-[85vh] max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <img src={active.url} alt={active.caption || active.category} className="max-h-[75vh] w-auto border border-gold/40 object-contain" />
            {active.caption && <figcaption className="mt-3 text-center font-serif text-xl text-ivory">{active.caption}</figcaption>}
          </figure>
          <button type="button" onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % items.length) }} aria-label="Next image" className="ml-3 border border-white/20 p-2 text-ivory hover:border-gold"><ChevronRight className="size-6" /></button>
        </div>
      )}
    </>
  )
}
