import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'
let csrfToken = localStorage.getItem('bn_csrf') || ''

export const setCsrfToken = (t) => {
  csrfToken = t || ''
  if (t) localStorage.setItem('bn_csrf', t)
  else localStorage.removeItem('bn_csrf')
}

const client = axios.create({ baseURL, withCredentials: true })

client.interceptors.request.use((config) => {
  if (config.method && config.method !== 'get' && csrfToken) config.headers['X-CSRF-Token'] = csrfToken
  return config
})

let refreshing = null
client.interceptors.response.use(
  (res) => (res.config.responseType === 'blob' ? res : res.data?.data ?? res.data),
  async (err) => {
    const original = err.config
    const status = err.response?.status
    const isAuthCall = original?.url?.startsWith('/auth/')
    if (status === 401 && !original._retried && !isAuthCall && localStorage.getItem('bn_session')) {
      original._retried = true
      try {
        refreshing = refreshing || client.post('/auth/refresh').finally(() => { refreshing = null })
        const data = await refreshing
        setCsrfToken(data.csrfToken)
        original.headers['X-CSRF-Token'] = data.csrfToken
        return client(original)
      } catch {
        localStorage.removeItem('bn_session')
        setCsrfToken('')
        window.dispatchEvent(new Event('bn:session-expired'))
      }
    }
    const e = err.response?.data?.error
    const error = new Error(e?.message || err.message || 'Something went wrong')
    error.code = e?.code || 'NETWORK_ERROR'
    error.status = status
    error.details = e?.details
    throw error
  },
)

/** All helpers resolve with the unwrapped `data` payload and reject with Error(message, code, status). */
export const api = client
export default api
