import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const SocketContext = createContext(null)
const EVENTS = ['booking:new', 'booking:updated', 'availability:changed']

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = 880
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5)
    o.connect(g)
    g.connect(ctx.destination)
    o.start()
    o.stop(ctx.currentTime + 0.55)
    o.onended = () => ctx.close()
  } catch { /* audio not available */ }
}

/** Connects only while mounted (i.e. inside the logged-in dashboard layout). */
export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false)
  const [newCount, setNewCount] = useState(0)
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('bn_sound') === '1')
  const listeners = useRef(new Map())
  const soundRef = useRef(soundOn)

  useEffect(() => {
    soundRef.current = soundOn
    localStorage.setItem('bn_sound', soundOn ? '1' : '0')
  }, [soundOn])

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    EVENTS.forEach((ev) => {
      socket.on(ev, (payload) => {
        if (ev === 'booking:new') {
          setNewCount((c) => c + 1)
          if (soundRef.current) beep()
        }
        listeners.current.get(ev)?.forEach((fn) => fn(payload))
      })
    })
    return () => { socket.removeAllListeners(); socket.disconnect() }
  }, [])

  const subscribe = useCallback((event, handler) => {
    const map = listeners.current
    if (!map.has(event)) map.set(event, new Set())
    map.get(event).add(handler)
    return () => map.get(event)?.delete(handler)
  }, [])
  const resetNew = useCallback(() => setNewCount(0), [])

  const value = useMemo(
    () => ({ connected, newCount, resetNew, soundOn, setSoundOn, subscribe }),
    [connected, newCount, resetNew, soundOn, subscribe],
  )
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
}

export const useSocket = () => useContext(SocketContext)

/** Subscribe to a realtime event. Handlers should refetch from REST, not trust the payload. */
export function useSocketEvent(event, handler) {
  const ctx = useContext(SocketContext)
  const ref = useRef(handler)
  useEffect(() => { ref.current = handler })
  const subscribe = ctx?.subscribe
  useEffect(() => {
    if (!subscribe) return undefined
    return subscribe(event, (p) => ref.current?.(p))
  }, [subscribe, event])
}
