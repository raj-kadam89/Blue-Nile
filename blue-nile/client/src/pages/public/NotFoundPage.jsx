import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Seo } from '../../components/ui/PublicUi.jsx'

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page Not Found" />
      <section className="container-x grid min-h-[65vh] place-items-center py-20 text-center">
        <div className="max-w-lg border border-charcoal/15 bg-white p-10">
          <Compass className="mx-auto size-10 text-gold" aria-hidden="true" />
          <p className="eyebrow mt-4">Error 404</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">We couldn’t find that page</h1>
          <p className="mt-3 text-sm text-charcoal/70">The page you were looking for may have moved. Explore our menu or reserve a table at Blue Nile, Pune.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-dark">Return Home</Link>
            <Link to="/reserve" className="btn btn-primary">Reserve a Table</Link>
          </div>
        </div>
      </section>
    </>
  )
}
