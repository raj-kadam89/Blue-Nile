import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { setCsrfToken } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const applySession = useCallback((data) => {
    setUser(data.user)
    setCsrfToken(data.csrfToken)
    localStorage.setItem('bn_session', '1')
    return data.user
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setCsrfToken('')
    localStorage.removeItem('bn_session')
  }, [])

  useEffect(() => {
    let alive = true
    api.get('/auth/me')
      .then((d) => alive && applySession(d))
      .catch(() => alive && clearSession())
      .finally(() => alive && setLoading(false))
    const onExpired = () => clearSession()
    window.addEventListener('bn:session-expired', onExpired)
    return () => { alive = false; window.removeEventListener('bn:session-expired', onExpired) }
  }, [applySession, clearSession])

  const sendOtp = (payload) => api.post('/auth/send-otp', payload)
  const verifyOtp = async (payload) => applySession(await api.post('/auth/verify-otp', payload))
  const staffLogin = async (payload) => applySession(await api.post('/auth/staff-login', payload))
  const logout = async () => { try { await api.post('/auth/logout') } finally { clearSession() } }

  const value = useMemo(
    () => ({ user, loading, sendOtp, verifyOtp, staffLogin, logout, isOwner: user?.role === 'OWNER', isStaff: user?.role === 'STAFF', isCustomer: user?.role === 'CUSTOMER' }),
    [user, loading], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
