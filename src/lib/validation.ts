/** Shared form validators (non-component module so Fast Refresh stays happy). */

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
export const isPhone = (v: string) => v.replace(/\D/g, '').length >= 8
