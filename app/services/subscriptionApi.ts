import { apiUrl } from '@/constants/config';
import type {
  CheckoutStatusResponse,
  CreateOrderResponse,
  PromoBannerInfo,
  ReferralSettings,
  ValidatePromoResponse,
} from '@/types/subscription';

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
    if (!res.ok) throw new Error('Failed to validate promo');
    return res.json();
  }

  async getCheckoutStatus(accessToken: string): Promise<CheckoutStatusResponse> {
    const res = await fetch(this.url('/subscription/checkout'), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error('Failed to load checkout');
    return res.json();
  }

  async getReferralSettings(): Promise<ReferralSettings> {
    const res = await fetch(this.url('/subscription/referral-settings'));
    if (!res.ok) throw new Error('Failed to load referral settings');
    return res.json();
  }

  async redeemCredits(accessToken: string): Promise<{ status: string; message: string }> {
    const res = await fetch(this.url('/subscription/redeem-credits'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || 'Failed to redeem credits');
    }
    return res.json();
  }

  async createOrder(accessToken: string, promoCode?: string): Promise<CreateOrderResponse> {
    const res = await fetch(this.url('/payments/create-order'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(promoCode ? { promo_code: promoCode } : {}),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || body.error || 'Failed to create order');
    }
    return res.json();
  }
}

export const subscriptionApi = new SubscriptionApiService();
