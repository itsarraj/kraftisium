import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  clearStoredPromoCode,
  normalizePromoCode,
  readStoredPromoCode,
  writeStoredPromoCode,
} from '../lib/promoCode'
import { subscriptionApi } from '../services/subscriptionApi'
import type { ValidatePromoResponse } from '../types/subscription'

type UsePromoCodeOptions = {
  /** Read ?promo= or ?code= from the URL and persist for later checkout. */
  captureFromUrl?: boolean
  /** Validate stored / initial code on mount. */
  autoValidate?: boolean
  /** Initial code (e.g. from redeem page). */
  initialCode?: string
}

export function usePromoCode(options: UsePromoCodeOptions = {}) {
  const { captureFromUrl = false, autoValidate = false, initialCode } = options
  const [searchParams] = useSearchParams()

  const [code, setCodeState] = useState(() => {
    if (initialCode) return normalizePromoCode(initialCode)
    return readStoredPromoCode() ?? ''
  })
  const [validation, setValidation] = useState<ValidatePromoResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setCode = useCallback((next: string) => {
    setCodeState(normalizePromoCode(next))
    setValidation(null)
    setError(null)
  }, [])

  const persistCode = useCallback((next: string) => {
    const normalized = normalizePromoCode(next)
    if (normalized) writeStoredPromoCode(normalized)
    else clearStoredPromoCode()
  }, [])

  const apply = useCallback(async (raw?: string) => {
    const target = normalizePromoCode(raw ?? code)
    if (!target) {
      setError('Enter a promo code')
      setValidation(null)
      return null
    }

    setCodeState(target)
    persistCode(target)
    setLoading(true)
    setError(null)

    try {
      const res = await subscriptionApi.validatePromo(target)
      setValidation(res)
      if (!res.is_valid) {
        setError(res.error_message || 'Invalid promo code')
        return res
      }
      return res
    } catch {
      setError('Could not validate promo code')
      setValidation(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [code, persistCode])

  const clear = useCallback(() => {
    setCodeState('')
    setValidation(null)
    setError(null)
    clearStoredPromoCode()
  }, [])

  useEffect(() => {
    if (!captureFromUrl) return
    const fromUrl = searchParams.get('promo') ?? searchParams.get('code')
    if (!fromUrl) return
    const normalized = normalizePromoCode(fromUrl)
    setCodeState(normalized)
    writeStoredPromoCode(normalized)
  }, [captureFromUrl, searchParams])

  useEffect(() => {
    if (!autoValidate) return
    const stored = readStoredPromoCode()
    const toValidate = initialCode
      ? normalizePromoCode(initialCode)
      : stored || (code ? normalizePromoCode(code) : '')
    if (toValidate) void apply(toValidate)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / explicit initial
  }, [autoValidate, initialCode])

  const isValid = validation?.is_valid === true
  const isFree = isValid && validation.final_price_usd === 0
  const isPartialDiscount = isValid && validation.final_price_usd > 0

  return {
    code,
    setCode,
    apply,
    clear,
    validation,
    loading,
    error,
    isValid,
    isFree,
    isPartialDiscount,
    hasStoredCode: Boolean(readStoredPromoCode()),
    getStoredCode: readStoredPromoCode,
    persistCode,
  }
}
