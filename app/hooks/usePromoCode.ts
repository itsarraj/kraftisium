import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import {
  clearStoredPromoCode,
  normalizePromoCode,
  readStoredPromoCode,
  writeStoredPromoCode,
} from '@/lib/promoCode';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { ValidatePromoResponse } from '@/types/subscription';

type UsePromoCodeOptions = {
  captureFromUrl?: boolean;
  autoValidate?: boolean;
  initialCode?: string;
};

export function usePromoCode(options: UsePromoCodeOptions = {}) {
  const { captureFromUrl = false, autoValidate = false, initialCode } = options;
  const params = useLocalSearchParams<{ promo?: string; code?: string }>();

  const [code, setCodeState] = useState(initialCode ? normalizePromoCode(initialCode) : '');
  const [validation, setValidation] = useState<ValidatePromoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (initialCode) {
        if (!cancelled) setCodeState(normalizePromoCode(initialCode));
        setHydrated(true);
        return;
      }
      const stored = await readStoredPromoCode();
      if (!cancelled && stored) setCodeState(stored);
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  const setCode = useCallback((next: string) => {
    setCodeState(normalizePromoCode(next));
    setValidation(null);
    setError(null);
  }, []);

  const persistCode = useCallback(async (next: string) => {
    const normalized = normalizePromoCode(next);
    if (normalized) await writeStoredPromoCode(normalized);
    else await clearStoredPromoCode();
  }, []);

  const apply = useCallback(
    async (raw?: string) => {
      const target = normalizePromoCode(raw ?? code);
      if (!target) {
        setError('Enter a promo code');
        setValidation(null);
        return null;
      }

      setCodeState(target);
      await persistCode(target);
      setLoading(true);
      setError(null);

      try {
        const res = await subscriptionApi.validatePromo(target);
        setValidation(res);
        if (!res.is_valid) {
          setError(res.error_message || 'Invalid promo code');
          return res;
        }
        return res;
      } catch {
        setError('Could not validate promo code');
        setValidation(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [code, persistCode],
  );

  const clear = useCallback(async () => {
    setCodeState('');
    setValidation(null);
    setError(null);
    await clearStoredPromoCode();
  }, []);

  useEffect(() => {
    if (!captureFromUrl) return;
    const fromUrl = params.promo ?? params.code;
    if (!fromUrl || typeof fromUrl !== 'string') return;
    const normalized = normalizePromoCode(fromUrl);
    setCodeState(normalized);
    void writeStoredPromoCode(normalized);
  }, [captureFromUrl, params.promo, params.code]);

  useEffect(() => {
    if (!autoValidate || !hydrated) return;
    const toValidate = initialCode
      ? normalizePromoCode(initialCode)
      : code;
    if (toValidate) void apply(toValidate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoValidate, hydrated, initialCode]);

  const isValid = validation?.is_valid === true;
  const isFree = isValid && validation.final_price_usd === 0;
  const isPartialDiscount = isValid && validation.final_price_usd > 0;

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
    hydrated,
  };
}
