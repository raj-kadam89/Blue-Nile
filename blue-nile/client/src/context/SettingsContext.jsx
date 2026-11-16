/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../services/api.js'

const SettingsContext = createContext(null)
let cache = null
let inflight = null

const load = () => {
  if (cache) return Promise.resolve(cache)
  inflight = inflight || api.get('/public/settings').then((d) => { cache = d; return d }).finally(() => { inflight = null })
  return inflight
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(cache)
  const [loading, setLoading] = useState(!cache)
  const [error, setError] = useState(null)

  const fetchSettings = useCallback(() => {
    setLoading(true)
    setError(null)
    load()
      .then((d) => setSettings(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!cache) fetchSettings() // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchSettings])

  const value = useMemo(() => ({ settings, loading, error, reload: fetchSettings }), [settings, loading, error, fetchSettings])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettingsContext = () => useContext(SettingsContext)
