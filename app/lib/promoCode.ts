import AsyncStorage from '@react-native-async-storage/async-storage';

import { appIdentity } from '@/constants/appIdentity';

export const PROMO_CODE_STORAGE_KEY = 'kraftisium_pending_promo_code';

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export async function readStoredPromoCode(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(PROMO_CODE_STORAGE_KEY);
    return stored ? normalizePromoCode(stored) : null;
  } catch {
    return null;
  }
}

export async function writeStoredPromoCode(code: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PROMO_CODE_STORAGE_KEY, normalizePromoCode(code));
  } catch {
    /* ignore */
  }
}

export async function clearStoredPromoCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROMO_CODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function buildPromoLink(code: string): string {
  return `${appIdentity.webUrl}/redeem?promo=${encodeURIComponent(normalizePromoCode(code))}`;
}

export function buildReferralLink(referralCode: string): string {
  return `${appIdentity.webUrl}/register?ref=${encodeURIComponent(referralCode)}`;
}

export function promoDurationLabel(months: number | null | undefined): string {
  if (!months || months >= 12) {
    const years = months ? Math.round(months / 12) : 1;
    return years === 1 ? '1 year' : `${years} years`;
  }
  return months === 1 ? '1 month' : `${months} months`;
}
