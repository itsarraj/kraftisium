import { router } from 'expo-router';

import { readStoredPromoCode } from '@/lib/promoCode';
import { isUserPremium } from '@/types/subscription';
import type { UserProfile } from '@/services/authApi';

function isSafeInternalPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('://');
}

export async function navigateAfterAuth(
  user: UserProfile,
  redirect?: string | null,
): Promise<void> {
  const isRecruiter = user.role === 'recruiter' || user.role === 'admin';
  const pendingPromo = await readStoredPromoCode();

  if (pendingPromo && !isUserPremium(user.subscription)) {
    router.replace('/redeem');
    return;
  }

  if (redirect && isSafeInternalPath(redirect)) {
    router.replace(redirect as '/');
    return;
  }

  router.replace(isRecruiter ? '/(tabs)/recruiter' : '/(tabs)');
}
