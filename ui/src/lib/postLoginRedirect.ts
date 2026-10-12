import type { UserProfile } from '../services/authApi';
import { isUserPremium } from '../types/subscription';
import { readStoredPromoCode } from './promoCode';

export function resolvePostLoginPath(user: UserProfile): string {
  const pendingPromo = readStoredPromoCode();
  if (pendingPromo && !isUserPremium(user.subscription)) {
    return '/redeem';
  }
  if (user.role === 'recruiter' || user.role === 'admin') {
    return '/recruiter';
  }
  return '/';
}
