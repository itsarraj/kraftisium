export interface SubscriptionInfo {
  is_premium: boolean;
  premium_until?: string | null;
  plan_id?: string | null;
  source?: string | null;
  founding_slot?: number | null;
  can_upgrade: boolean;
  yearly_price_usd: number;
  free_ai_matches_limit: number;
}

export interface PromoBannerInfo {
  founding_premium_limit: number;
  founding_granted_count: number;
  founding_slots_remaining: number;
  founding_offer_active: boolean;
  yearly_price_usd: number;
  free_ai_matches_limit: number;
  message: string;
}

export interface CheckoutStatusResponse {
  status: string;
  message: string;
  is_premium: boolean;
  premium_until?: string | null;
  yearly_price_usd: number;
  payments_enabled?: boolean;
  amount_paise?: number | null;
  currency?: string | null;
  razorpay_key_id?: string | null;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
}

export interface ValidatePromoResponse {
  is_valid: boolean;
  promo_id?: string | null;
  duration_months?: number | null;
  original_price_usd: number;
  discount_amount_usd: number;
  final_price_usd: number;
  error_message?: string | null;
}

export interface ReferralSettings {
  credits_per_referral: number;
  credits_required_for_redemption: number;
  redemption_premium_months: number;
}

export function isUserPremium(sub?: SubscriptionInfo | null): boolean {
  if (!sub?.is_premium) return false;
  if (!sub.premium_until) return true;
  return new Date(sub.premium_until).getTime() > Date.now();
}
