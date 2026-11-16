import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

const ToastContext = createContext({ toast: () => {} })

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)
  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), type === 'error' ? 6000 : 3500)
  }, [])
  const value = useMemo(() => ({
    toast,
    success: (m) => toast(m, 'success'),
    error: (m) => toast(m, 'error'),
    info: (m) => toast(m, 'info'),
  }), [toast])
  const Icon = { success: CheckCircle2, error: XCircle, info: Info }
  const tone = { success: 'border-emerald-300 text-emerald-800', error: 'border-rose-300 text-rose-800', info: 'border-sky-300 text-sky-800' }
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 right-3 z-[200] flex w-[min(92vw,22rem)] flex-col gap-2 lg:bottom-4" aria-live="polite">
        {items.map((t) => {
          const I = Icon[t.type]
          return (
            <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} className={`dash-pop pointer-events-auto flex items-start gap-2 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-lg ${tone[t.type]}`}>
              <I className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
