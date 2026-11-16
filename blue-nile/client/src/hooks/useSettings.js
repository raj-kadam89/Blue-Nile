import { useSettingsContext } from '../context/SettingsContext.jsx'

/** Returns { settings, loading, error, reload, restaurant, booking, content, openingHours }. */
export function useSettings() {
  const ctx = useSettingsContext()
  const s = ctx?.settings
  return {
    settings: s || null,
    loading: ctx?.loading ?? false,
    error: ctx?.error ?? null,
    reload: ctx?.reload ?? (() => {}),
    restaurant: s?.restaurant || {},
    booking: s?.booking || {},
    content: s?.content || {},
    openingHours: s?.openingHours || [],
  }
}
