import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { PromoCodeRedeem } from '@/components/PromoCodeRedeem';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { getAccessToken } from '@/lib/auth-storage';
import { subscriptionApi } from '@/services/subscriptionApi';
import { isUserPremium } from '@/types/subscription';

export default function RedeemScreen() {
  const params = useLocalSearchParams<{ promo?: string; code?: string }>();
  const urlPromo =
    (typeof params.promo === 'string' ? params.promo : undefined) ??
    (typeof params.code === 'string' ? params.code : undefined);

  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const promo = usePromoCode({
    captureFromUrl: true,
    autoValidate: Boolean(urlPromo),
    initialCode: urlPromo,
  });

  const [claiming, setClaiming] = useState(false);
  const premium = isUserPremium(user?.subscription);
  const yearlyPrice = user?.subscription?.yearly_price_usd ?? 199;

  const handleClaim = useCallback(async () => {
    const token = await getAccessToken();
    if (!token || !promo.isValid) return;

    setClaiming(true);
    try {
      const order = await subscriptionApi.createOrder(token, promo.code);
      if (order.amount === 0) {
        await refreshUser();
        Alert.alert('Welcome to Premium', 'Your gift is active!');
        router.replace('/(tabs)/matches');
        return;
      }
      router.push('/checkout');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not redeem promo code');
    } finally {
      setClaiming(false);
    }
  }, [promo.code, promo.isValid, refreshUser]);

  if (isLoading || !promo.hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b]">
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#2b2b2b]" contentContainerClassName="px-4 py-10">
      <Text className="text-center text-xs font-bold uppercase tracking-widest" style={{ color: brand.accent }}>
        Kraftisium Premium
      </Text>
      <Text className="mt-3 text-center text-3xl font-bold text-white">Redeem your gift</Text>
      <Text className="mt-3 text-center text-white/60">
        Yearly Premium — unlimited AI matches, top placement, full access.
      </Text>

      <View className="mt-8">
        <PromoCodeRedeem
          variant="hero"
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

      {premium ? (
        <View className="mt-8 rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
          <Text className="text-center text-lg font-bold" style={{ color: brand.accent }}>
            You&apos;re already Premium
          </Text>
          <Pressable
            onPress={() =>
              router.replace(
                user?.role === 'recruiter' || user?.role === 'admin' ? '/(tabs)/recruiter' : '/(tabs)/matches',
              )
            }
            className="mt-4 items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Back to app
            </Text>
          </Pressable>
        </View>
      ) : promo.isValid ? (
        <View className="mt-8 gap-3">
          {isAuthenticated ? (
            promo.isFree ? (
              <Pressable
                onPress={() => void handleClaim()}
                disabled={claiming}
                className="items-center rounded-xl py-4"
                style={{ backgroundColor: brand.accent, opacity: claiming ? 0.6 : 1 }}>
                <Text className="text-lg font-bold" style={{ color: brand.bg }}>
                  {claiming ? 'Activating…' : 'Claim your free year →'}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push('/checkout')}
                className="items-center rounded-xl py-4"
                style={{ backgroundColor: brand.accent }}>
                <Text className="text-lg font-bold" style={{ color: brand.bg }}>
                  Continue to checkout — ${promo.validation!.final_price_usd}/yr
                </Text>
              </Pressable>
            )
          ) : (
            <>
              <Pressable
                onPress={() =>
                  router.push(
                    promo.code
                      ? `/register?promo=${encodeURIComponent(promo.code)}`
                      : '/register',
                  )
                }
                className="items-center rounded-xl py-4"
                style={{ backgroundColor: brand.accent }}>
                <Text className="text-lg font-bold" style={{ color: brand.bg }}>
                  {promo.isFree ? 'Create account & claim gift →' : 'Sign up to redeem →'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  const redeemPath = promo.code
                    ? `/redeem?promo=${encodeURIComponent(promo.code)}`
                    : '/redeem';
                  router.push(`/login?redirect=${encodeURIComponent(redeemPath)}`);
                }}
                className="mt-2">
                <Text className="text-center text-sm text-white/50">
                  Already have an account?{' '}
                  <Text style={{ color: brand.accent }} className="underline">
                    Log in
                  </Text>
                </Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <Text className="mt-8 text-center text-sm text-white/40">
          No code yet? Ask whoever invited you — each code is personal and single-use.
        </Text>
      )}

      <Pressable onPress={() => router.push('/upgrade')} className="mt-10">
        <Text className="text-center text-xs text-white/30 underline">View Premium benefits</Text>
      </Pressable>
    </ScrollView>
  );
}
