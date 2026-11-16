import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarCheck2 } from 'lucide-react'
import { useFetch } from '../../hooks/useAsync.js'
import { Badge, DishCard, ErrorBlock, Seo, Skeleton, VegDot } from '../../components/ui/PublicUi.jsx'
import { formatPrice } from '../../utils/format.js'

export default function DishDetailsPage() {
  const { slug } = useParams()
  const { data, loading, error, reload } = useFetch(`/menu/${encodeURIComponent(slug)}`)
  const item = data?.item
  const related = data?.related || []
  const img = item?.image || (item?.category?.slug === 'desserts' ? '/images/dessert.svg' : item?.category?.slug === 'kebabs' ? '/images/kebabs.svg' : '/images/hero.svg')

  return (
    <>
      <Seo title={item?.name || 'Dish Details'} description={item?.description || 'Dish details from the Blue Nile menu.'} path={`/menu/${slug}`} />

      <div className="container-x py-12">
        <Link to="/menu" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-charcoal/70 hover:text-charcoal">
          <ArrowLeft className="size-4" aria-hidden="true" />Back to Menu
        </Link>

        {loading ? (
          <div className="mt-8 grid gap-10 lg:grid-cols-12">
            <Skeleton className="h-96 lg:col-span-6" />
            <Skeleton className="h-96 lg:col-span-6" />
          </div>
        ) : error || !item ? (
          <div className="mt-8"><ErrorBlock error={error || new Error('Dish not found')} onRetry={reload} /></div>
        ) : (
          <>
            <div className="mt-8 grid items-start gap-10 lg:grid-cols-12">
              <div className="overflow-hidden border border-charcoal/15 bg-charcoal lg:col-span-6">
                <img src={img} alt={item.name} className="aspect-[4/3] w-full object-cover" />
              </div>

              <div className="border border-charcoal/15 bg-white p-8 lg:col-span-6">
                <div className="flex flex-wrap items-center gap-2">
                  {item.category?.name && <Badge tone="gold">{item.category.name}</Badge>}
                  <Badge tone={item.available ? 'green' : 'red'}>{item.available ? 'Available' : 'Out of stock'}</Badge>
                  <VegDot isVeg={item.isVeg} />
                </div>

                <h1 className="mt-4 font-serif text-4xl font-semibold text-charcoal sm:text-5xl">{item.name}</h1>
                <p className="mt-3 font-serif text-3xl font-semibold text-olive">{formatPrice(item.price)}</p>

                {item.description ? (
                  <p className="mt-5 text-base leading-relaxed text-charcoal/80">{item.description}</p>
                ) : (
                  <p className="mt-5 text-sm italic text-charcoal/60">Prepared fresh at Blue Nile, Pune. Ask our staff for allergen or spice-level preferences when dining.</p>
                )}

                <div className="mt-8 flex flex-wrap gap-3 border-t border-charcoal/10 pt-6">
                  <Link to="/reserve" className="btn btn-primary">
                    <CalendarCheck2 className="size-4" aria-hidden="true" />Reserve a Table to Dine
                  </Link>
                  <Link to="/menu" className="btn btn-outline">More Dishes</Link>
                </div>
              </div>
            </div>

            {related.length > 0 && (
              <section className="mt-16 border-t border-charcoal/10 pt-12">
                <h2 className="font-serif text-3xl font-semibold">More from {item.category?.name || 'the Menu'}</h2>
                <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {related.map((r) => <DishCard key={r._id} item={r} LinkComponent={Link} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
