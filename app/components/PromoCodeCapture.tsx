import { useEffect } from 'react';
import { useGlobalSearchParams } from 'expo-router';

import { normalizePromoCode, writeStoredPromoCode } from '@/lib/promoCode';

/** Mount once in root layout — persists ?promo= / ?code= from any deep link. */
export function PromoCodeCapture() {
  const params = useGlobalSearchParams<{ promo?: string; code?: string }>();

  useEffect(() => {
    const raw = params.promo ?? params.code;
    if (typeof raw === 'string' && raw.trim()) {
      void writeStoredPromoCode(normalizePromoCode(raw));
    }
  }, [params.promo, params.code]);

  return null;
}
