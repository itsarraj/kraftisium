export const PROMO_CODE_STORAGE_KEY = 'kraftisium_pending_promo_code'

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export function readStoredPromoCode(): string | null {
  try {
    const stored = localStorage.getItem(PROMO_CODE_STORAGE_KEY)
    return stored ? normalizePromoCode(stored) : null
  } catch {
    return null
  }
}

export function writeStoredPromoCode(code: string): void {
  try {
    localStorage.setItem(PROMO_CODE_STORAGE_KEY, normalizePromoCode(code))
  } catch {
    /* ignore quota errors */
  }
}

export function clearStoredPromoCode(): void {
  try {
    localStorage.removeItem(PROMO_CODE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/** Shareable link — send this to someone you want to gift Premium to. */
export function buildPromoLink(code: string, origin = window.location.origin): string {
  const normalized = normalizePromoCode(code)
  return `${origin}/redeem?promo=${encodeURIComponent(normalized)}`
}

export function promoDurationLabel(months: number | null | undefined): string {
  if (!months || months >= 12) {
    const years = months ? Math.round(months / 12) : 1
    return years === 1 ? '1 year' : `${years} years`
  }
  return months === 1 ? '1 month' : `${months} months`
}
