import type {
  CheckoutStatusResponse,
  CreateOrderResponse,
  PromoBannerInfo,
  ReferralSettings,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  ValidatePromoResponse,
} from '../types/subscription';
import { apiUrl } from '../config/api';

const JSON_HEADERS: HeadersInit = { 'Content-Type': 'application/json' };

class SubscriptionApiService {
  private url(path: string): string {
    return apiUrl(path);
  }

  async getPromoBanner(): Promise<PromoBannerInfo> {
    const res = await fetch(this.url('/subscription/promo'));
    if (!res.ok) throw new Error('Failed to load promo');
    return res.json();
  }

  async validatePromo(code: string): Promise<ValidatePromoResponse> {
    const res = await fetch(this.url(`/subscription/promo/validate?code=${encodeURIComponent(code)}`));
    if (!res.ok) throw new Error('Failed to validate promo code');
    return res.json();
  }

  async getCheckoutStatus(): Promise<CheckoutStatusResponse> {
    const res = await fetch(this.url('/subscription/checkout'), {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to load checkout');
    return res.json();
  }

  async getReferralSettings(): Promise<ReferralSettings> {
    const res = await fetch(this.url('/subscription/referral-settings'));
    if (!res.ok) throw new Error('Failed to load referral settings');
    return res.json();
  }

  async redeemCredits(): Promise<{status: string, message: string}> {
    const res = await fetch(this.url('/subscription/redeem-credits'), {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || 'Failed to redeem credits');
    }
    return res.json();
  }

  async createOrder(promoCode?: string): Promise<CreateOrderResponse> {
    const res = await fetch(this.url('/payments/create-order'), {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: promoCode ? JSON.stringify({ promo_code: promoCode }) : undefined,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || 'Failed to create payment order');
    }
    return res.json();
  }

  async verifyPayment(payload: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const res = await fetch(this.url('/payments/verify-payment'), {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || 'Payment verification failed');
    }
    return res.json();
  }
}

export const subscriptionApi = new SubscriptionApiService();
