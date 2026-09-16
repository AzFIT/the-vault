import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Public-folder asset URL that respects Vite `base`.
 * '/' locally, '/the-vault/' on GitHub Pages — so `/logo.png` becomes
 * asset('logo.png') and resolves correctly on both.
 */
export const asset = (path: string): string => `${import.meta.env.BASE_URL}${path}`
