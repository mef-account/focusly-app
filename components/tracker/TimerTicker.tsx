'use client'

import { useEffect } from 'react'
import { useTimerStore } from '@/store/useTimerStore'

/** Mounted once in the app shell — drives the global 1s tick while a timer runs. */
export function TimerTicker() {
  const running = useTimerStore((s) => s.running)
  const tick = useTimerStore((s) => s.tick)

  useEffect(() => {
    if (!running) return
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [running, tick])

  return null
}
