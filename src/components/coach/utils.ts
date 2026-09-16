import type { Client } from '@/data/mock'

export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Adherence below this mark flags a client AT RISK (monochrome dashed styling) */
export const AT_RISK_THRESHOLD = 70
export const isAtRisk = (c: Client) => c.adherence < AT_RISK_THRESHOLD

/** Deterministic small hash for derived per-client mock values */
export function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))
