import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscriptionApi } from '../services/subscriptionApi';
import type { PromoBannerInfo } from '../types/subscription';

export function usePricingInfo() {
  const { user } = useAuth();
  const [promo, setPromo] = useState<PromoBannerInfo | null>(null);
  const [promoError, setPromoError] = useState(false);
  const [promoLoading, setPromoLoading] = useState(true);

  useEffect(() => {
    subscriptionApi
      .getPromoBanner()
      .then(setPromo)
      .catch(() => setPromoError(true))
      .finally(() => setPromoLoading(false));
  }, []);

  const yearlyPrice = user?.subscription?.yearly_price_usd ?? promo?.yearly_price_usd;
  const freeMatchLimit = user?.subscription?.free_ai_matches_limit ?? promo?.free_ai_matches_limit;

  return {
    promo,
    promoError,
    promoLoading,
    yearlyPrice,
    freeMatchLimit,
    ready: yearlyPrice != null && freeMatchLimit != null,
  };
}

export function formatYearlyPrice(usd?: number | null): string {
  if (usd == null) return '—';
  return `$${usd}`;
}
