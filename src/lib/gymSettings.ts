/**
 * Gym profile settings — owner-editable identity/contact details.
 *
 * Stored in localStorage and synced live across components and tabs via the
 * same event + storage pattern as kpiHidden.ts.
 *
 * Honesty note: the marketing site (Footer, contact links) still reads its own
 * hardcoded constants today. This store is the single source of truth going
 * forward — wiring the public site to read from here is a follow-up phase.
 */
import { useCallback, useEffect, useState } from 'react'

export interface GymSettings {
  gymName: string
  tagline: string
  phone: string
  whatsapp: string
  email: string
  address: string
  hoursWeekday: string
  hoursWeekend: string
}

export const DEFAULT_GYM_SETTINGS: GymSettings = {
  gymName: 'The Vault Fitness',
  tagline: 'Unlock your fitness potential',
  phone: '+852 2885 9300',
  whatsapp: '85228859300',
  email: 'train@thevault-fitness.com',
  address: 'G/F, Wing Hing Court, 10–12 Catchick Street, Kennedy Town, Hong Kong',
  hoursWeekday: '06:00 – 23:00',
  hoursWeekend: '08:00 – 21:00',
}

const KEY = 'vault-gym-settings'
const EVENT = 'vault-gym-settings-changed'

export function getGymSettings(): GymSettings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_GYM_SETTINGS, ...(JSON.parse(raw) as Partial<GymSettings>) } : DEFAULT_GYM_SETTINGS
  } catch {
    return DEFAULT_GYM_SETTINGS
  }
}

export function saveGymSettings(next: GymSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — change applies to this mount only
  }
  window.dispatchEvent(new Event(EVENT))
}

export function resetGymSettings() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

/** [settings, save, reset] — subscribes to live changes from any surface. */
export function useGymSettings(): [GymSettings, (next: GymSettings) => void, () => void] {
  const [settings, setSettings] = useState<GymSettings>(getGymSettings)

  useEffect(() => {
    const refresh = () => setSettings(getGymSettings())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const save = useCallback((next: GymSettings) => {
    saveGymSettings(next)
    setSettings(next)
  }, [])
  const reset = useCallback(() => {
    resetGymSettings()
    setSettings(DEFAULT_GYM_SETTINGS)
  }, [])

  return [settings, save, reset]
}

// ---------------------------------------------------------------------------
// Privacy PIN (vault-coach-pin) — owned by KpiModals; surfaced here so the
// owner can manage it centrally. Same storage key, no second source.
// ---------------------------------------------------------------------------

const PIN_KEY = 'vault-coach-pin'

export function getPrivacyPin(): string | null {
  try {
    return localStorage.getItem(PIN_KEY)
  } catch {
    return null
  }
}

export function setPrivacyPin(pin: string | null) {
  try {
    if (pin === null) localStorage.removeItem(PIN_KEY)
    else localStorage.setItem(PIN_KEY, pin)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(EVENT))
}

export function usePrivacyPin(): [string | null, (pin: string | null) => void] {
  const [pin, setPin] = useState<string | null>(getPrivacyPin)

  useEffect(() => {
    const refresh = () => setPin(getPrivacyPin())
    window.addEventListener(EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const update = useCallback((next: string | null) => {
    setPrivacyPin(next)
    setPin(next)
  }, [])

  return [pin, update]
}
