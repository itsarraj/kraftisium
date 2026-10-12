import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { PromoCodeRedeem } from '@/components/PromoCodeRedeem';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { isUserPremium } from '@/types/subscription';

const FEATURES_USER = [
  'Unlimited AI job matches (not just 3)',
  'Full semantic ranking on your resume',
  'Apply to any matched role',
  'Priority refresh when you update your resume',
];

const FEATURES_RECRUITER = [
  'Unlimited active job posts',
  'Full applicant pipeline with candidate details',
  'Featured listings',
  'Premium recruiter dashboard tools',
];

export default function UpgradeScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const sub = user?.subscription;
  const premium = isUserPremium(sub);
  const price = sub?.yearly_price_usd ?? 199;
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';
  const features = isRecruiter ? FEATURES_RECRUITER : FEATURES_USER;

  const promo = usePromoCode({ captureFromUrl: true, autoValidate: true });

  if (isLoading || !promo.hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b]">
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  const checkoutTarget = promo.isValid
    ? isAuthenticated
      ? '/checkout'
      : `/register?promo=${encodeURIComponent(promo.code)}`
    : isAuthenticated
      ? '/checkout'
      : '/register';

  return (
    <ScrollView className="flex-1 bg-[#2b2b2b] px-4 py-8">
      <Text className="text-center text-3xl font-bold text-white">Yearly Premium</Text>
      <Text className="mt-3 text-center text-white/60">One plan. Billed yearly.</Text>

      {!premium && (
        <View className="mt-8">
          <PromoCodeRedeem
            variant={promo.isValid ? 'hero' : 'default'}
            code={promo.code}
            onCodeChange={promo.setCode}
            onApply={() => void promo.apply()}
            onClear={() => void promo.clear()}
            validation={promo.validation}
            loading={promo.loading}
            error={promo.error}
            yearlyPrice={price}
          />
        </View>
      )}

      <View className="mt-8 rounded-2xl border p-6" style={{ borderColor: `${brand.accent}4D`, backgroundColor: brand.surface }}>
        <Text className="text-xs font-bold uppercase" style={{ color: brand.accent }}>
          Best value
        </Text>
        {promo.isValid && !promo.isFree ? (
          <View className="mt-3 flex-row items-end gap-2">
            <Text className="text-2xl text-white/40 line-through">${price}</Text>
            <Text className="text-5xl font-bold" style={{ color: brand.accent }}>
              ${promo.validation!.final_price_usd}
            </Text>
            <Text className="pb-2 text-lg text-white/50">/ year</Text>
          </View>
        ) : promo.isFree ? (
          <Text className="mt-3 text-5xl font-bold" style={{ color: brand.accent }}>
            $0<Text className="text-lg text-white/50"> / year with your code</Text>
          </Text>
        ) : (
          <Text className="mt-3 text-5xl font-bold" style={{ color: brand.accent }}>
            ${price}
            <Text className="text-lg text-white/50"> / year</Text>
          </Text>
        )}

        <View className="mt-6 gap-2">
          {features.map((f) => (
            <Text key={f} className="text-sm text-white/80">
              ✓ {f}
            </Text>
          ))}
        </View>

        {premium ? (
          <View className="mt-6 rounded-xl border border-white/10 p-4">
            <Text className="text-center font-bold" style={{ color: brand.accent }}>
              You&apos;re already Premium
            </Text>
            {sub?.premium_until ? (
              <Text className="mt-2 text-center text-sm text-white/60">
                Until {new Date(sub.premium_until).toLocaleDateString()}
              </Text>
            ) : null}
            <Pressable onPress={() => router.push('/checkout')} className="mt-3">
              <Text className="text-center text-sm underline" style={{ color: brand.accent }}>
                Subscription details
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push(checkoutTarget as '/checkout' | '/register')}
            className="mt-6 items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              {promo.isFree
                ? isAuthenticated
                  ? 'Claim your free year →'
                  : 'Sign up & claim gift →'
                : isAuthenticated
                  ? 'Continue to checkout'
                  : 'Sign up to upgrade'}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => router.push('/redeem')} className="mt-6">
        <Text className="text-center text-xs text-white/40">
          Got a personal invite?{' '}
          <Text style={{ color: brand.accent }} className="underline">
            Redeem your code
          </Text>
        </Text>
      </Pressable>
    </ScrollView>
  );
}
