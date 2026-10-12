import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { PromoCodeRedeem } from '@/components/PromoCodeRedeem';
import { appIdentity } from '@/constants/appIdentity';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { getAccessToken } from '@/lib/auth-storage';
import { clearStoredPromoCode } from '@/lib/promoCode';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { CheckoutStatusResponse } from '@/types/subscription';

function formatAmount(amountMinor: number, currency?: string | null): string {
  const major = amountMinor / 100;
  if ((currency ?? 'USD').toUpperCase() === 'USD') {
    return `$${major.toFixed(0)}`;
  }
  return `${major.toFixed(2)} ${currency ?? ''}`.trim();
}

export default function CheckoutScreen() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const [status, setStatus] = useState<CheckoutStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promo = usePromoCode({ captureFromUrl: true, autoValidate: true });

  const fetchStatus = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      setStatus(await subscriptionApi.getCheckoutStatus(token));
    } catch {
      setStatus({
        status: 'error',
        message: 'Could not load checkout status.',
        is_premium: false,
        yearly_price_usd: 199,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void fetchStatus();
  }, [isAuthenticated, fetchStatus]);

  const handleClaimOrPay = async () => {
    const token = await getAccessToken();
    if (!token) return;

    setPaying(true);
    setError(null);

    try {
      const appliedCode = promo.isValid ? promo.code : undefined;

      // Free promos complete in-app. Paid checkout always happens on web —
      // do not createOrder first (that orphans Razorpay orders).
      if (promo.isFree && promo.isValid) {
        const order = await subscriptionApi.createOrder(token, appliedCode);
        if (order.amount !== 0) {
          throw new Error('This code is not a free gift. Continue with web checkout.');
        }
        await refreshUser();
        await fetchStatus();
        await clearStoredPromoCode();
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                status: 'already_subscribed',
                is_premium: true,
                message: 'Your Premium gift is active — welcome aboard!',
                payments_enabled: false,
              }
            : prev,
        );
        return;
      }

      const promoQuery = appliedCode ? `?promo=${encodeURIComponent(appliedCode)}` : '';
      await Linking.openURL(`${appIdentity.webUrl}/checkout${promoQuery}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading || loading || !promo.hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b]">
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const already = status?.status === 'already_subscribed' || status?.is_premium;
  const paymentsReady = status?.payments_enabled && status.status === 'ready';
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';
  const yearlyPrice = status?.yearly_price_usd ?? user?.subscription?.yearly_price_usd ?? 199;

  const payLabel = paying
    ? 'Processing…'
    : promo.isFree
      ? 'Claim your free year →'
      : 'Pay on kraftisium.xyz';

  return (
    <ScrollView className="flex-1 bg-[#2b2b2b]" contentContainerClassName="items-center px-6 py-10">
      {already ? (
        <>
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${brand.accent}26` }}>
            <Text className="text-3xl" style={{ color: brand.accent }}>
              ✦
            </Text>
          </View>
          <Text className="mt-6 text-3xl font-bold" style={{ color: brand.accent }}>
            You&apos;re Premium
          </Text>
          <Text className="mt-4 text-center text-lg text-white/80">{status?.message}</Text>
          <Pressable
            onPress={() => router.replace(isRecruiter ? '/(tabs)/recruiter' : '/(tabs)/matches')}
            className="mt-8 rounded-xl px-8 py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Start exploring →
            </Text>
          </Pressable>
        </>
      ) : paymentsReady ? (
        <>
          <Text className="text-3xl font-bold text-white">Checkout</Text>
          <Text className="mt-4 text-center text-white/70">{status?.message}</Text>

          {!promo.isValid && (
            <Text className="mt-6 text-2xl font-bold" style={{ color: brand.accent }}>
              {status?.amount_paise != null
                ? `${formatAmount(status.amount_paise, status.currency)} / year`
                : `$${yearlyPrice} / year`}
            </Text>
          )}

          <View className="mt-8 w-full max-w-sm">
            <PromoCodeRedeem
              code={promo.code}
              onCodeChange={promo.setCode}
              onApply={() => void promo.apply()}
              onClear={() => void promo.clear()}
              validation={promo.validation}
              loading={promo.loading}
              error={promo.error}
              yearlyPrice={yearlyPrice}
            />
          </View>

          {error ? <Text className="mt-4 text-sm text-red-400">{error}</Text> : null}

          <Pressable
            onPress={() => void handleClaimOrPay()}
            disabled={paying}
            className="mt-8 w-full max-w-sm items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent, opacity: paying ? 0.6 : 1 }}>
            <Text className="text-lg font-bold" style={{ color: brand.bg }}>
              {payLabel}
            </Text>
          </Pressable>

          {!promo.isFree && (
            <Text className="mt-4 text-center text-sm text-white/50">
              Secure Razorpay checkout opens in your browser. Sign in with the same account.
            </Text>
          )}

          <Pressable onPress={() => router.push('/upgrade')} className="mt-6">
            <Text className="underline" style={{ color: brand.accent }}>
              View Premium benefits
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text className="text-3xl font-bold text-white">Checkout unavailable</Text>
          <Text className="mt-6 text-center text-white/70">{status?.message}</Text>
          <Text className="mt-4 text-2xl font-bold" style={{ color: brand.accent }}>
            ${yearlyPrice} / year
          </Text>
          <View className="mt-8 w-full max-w-sm">
            <PromoCodeRedeem
              code={promo.code}
              onCodeChange={promo.setCode}
              onApply={() => void promo.apply()}
              onClear={() => void promo.clear()}
              validation={promo.validation}
              loading={promo.loading}
              error={promo.error}
              yearlyPrice={yearlyPrice}
            />
          </View>
          <Pressable onPress={() => router.push('/redeem')} className="mt-6">
            <Text className="underline" style={{ color: brand.accent }}>
              Have a gift code? Redeem here
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}
