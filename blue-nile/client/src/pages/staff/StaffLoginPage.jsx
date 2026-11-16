import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Lock, ShieldCheck } from 'lucide-react'
import '../../styles/dashboard.css'
import { useAuth } from '../../context/AuthContext.jsx'
import { Alert, Button, Card } from '../../components/dashboard/ui.jsx'
import { TextInput } from '../../components/dashboard/Form.jsx'

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

export default function StaffLoginPage({ area = 'staff' }) {
  const navigate = useNavigate()
  const { user, staffLogin, logout } = useAuth()
  const [err, setErr] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!user) return
    if (area === 'owner' && user.role === 'OWNER') navigate('/admin', { replace: true })
    else if (area === 'staff' && ['STAFF', 'OWNER'].includes(user.role)) navigate('/staff', { replace: true })
  }, [user, area, navigate])

  const onSubmit = handleSubmit(async (values) => {
    setErr('')
    try {
      const logged = await staffLogin(values)
      if (area === 'owner' && logged.role !== 'OWNER') {
        await logout()
        setErr('This account does not have owner access. Use the Staff login page.')
        return
      }
      navigate(area === 'owner' ? '/admin' : '/staff', { replace: true })
    } catch (e) {
      setErr(e.message)
    }
  })

  return (
    <div className="dash-root grid min-h-screen place-items-center bg-charcoal px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-ivory">
          <Link to="/" className="font-serif text-3xl font-semibold tracking-wider text-gold-light">BLUE NILE</Link>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-ivory/60">
            {area === 'owner' ? 'Owner & Manager Console' : 'Restaurant Staff Portal'}
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-lg bg-gold/20 text-charcoal">
              {area === 'owner' ? <ShieldCheck className="size-5" aria-hidden="true" /> : <Lock className="size-5" aria-hidden="true" />}
            </span>
            <div>
              <h1 className="font-serif text-2xl font-semibold">Sign in</h1>
              <p className="text-xs text-charcoal/60">Authorized {area === 'owner' ? 'owner' : 'staff'} credentials only</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <TextInput label="Email" type="email" required autoComplete="username" error={errors.email?.message} {...register('email')} />
            <TextInput label="Password" type="password" required autoComplete="current-password" error={errors.password?.message} {...register('password')} />
            {err && <Alert tone="rose">{err}</Alert>}
            <Button type="submit" variant="gold" className="w-full" loading={isSubmitting}>Sign in</Button>
          </form>

          <div className="mt-6 flex items-center justify-between border-t border-[#eee9dc] pt-4 text-xs text-charcoal/60">
            <Link to="/" className="hover:underline">← Public website</Link>
            {area === 'owner' ? (
              <Link to="/staff/login" className="font-semibold text-olive hover:underline">Staff login →</Link>
            ) : (
              <Link to="/admin/login" className="font-semibold text-olive hover:underline">Owner login →</Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
