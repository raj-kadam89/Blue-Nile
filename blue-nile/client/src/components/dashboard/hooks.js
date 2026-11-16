import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Data fetching hook. `data` is retained across reloads so socket-driven refetches don't flash skeletons.
 * `loading` is true only for the first load (or when deps change and there is no data yet).
 */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [tick, setTick] = useState(0)
  const ref = useRef(fetcher)
  useEffect(() => { ref.current = fetcher })

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, error: null, loading: s.data == null }))
    Promise.resolve()
      .then(() => ref.current())
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((error) => alive && setState((s) => ({ ...s, loading: false, error })))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

export function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
