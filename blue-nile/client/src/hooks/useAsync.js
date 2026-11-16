import { useCallback, useEffect, useState } from 'react'
import api from '../services/api.js'

/** GET helper: useFetch('/menu') -> { data, loading, error, reload }. Pass null url to skip. */
export function useFetch(url, params) {
  const key = JSON.stringify(params || {})
  const [state, setState] = useState({ data: null, loading: !!url, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!url) return undefined
    let alive = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true, error: null }))
    api.get(url, { params: JSON.parse(key) })
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState({ data: null, loading: false, error }))
    return () => { alive = false }
  }, [url, key, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
