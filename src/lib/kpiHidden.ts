/**
 * Shared "hide KPI figures" privacy state — one toggle drives the owner
 * dashboard KPI cards, the front-desk shift KPIs, and the insights page.
 * Persisted to localStorage and synced live across mounted components and
 * browser tabs via a custom event + the native storage event.
 */
import { useCallback, useEffect, useState } from 'react'

const KEY = 'vault-kpi-hidden'
const EVENT = 'vault-kpi-hidden-changed'

export function getKpiHidden(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setKpiHidden(hidden: boolean) {
  try {
    localStorage.setItem(KEY, hidden ? '1' : '0')
  } catch {
    // storage unavailable — toggle still works for this mount
  }
  window.dispatchEvent(new Event(EVENT))
}

/** [hidden, toggle] — subscribe to live changes from any surface. */
export function useKpiHidden(): [boolean, () => void] {
  const [hidden, setHidden] = useState(getKpiHidden)

  useEffect(() => {
    const refresh = () => setHidden(getKpiHidden())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const toggle = useCallback(() => {
    const next = !getKpiHidden()
    setKpiHidden(next)
    setHidden(next)
  }, [])

  return [hidden, toggle]
}
