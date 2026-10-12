import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { isUserPremium } from '@/types/subscription';

const FEATURES = [
  'Unlimited active job posts',
  'Full applicant pipeline with candidate details',
  'Featured listings & priority placement',
  'Premium recruiter dashboard tools',
];

export default function PricingScreen() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const sub = user?.subscription;
  const premium = isUserPremium(sub);
  const price = sub?.yearly_price_usd ?? 199;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b]">
        <ActivityIndicator color={brand.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.role !== 'recruiter' && user?.role !== 'admin') {
    return <Redirect href="/unauthorized" />;
  }

  return (
    <ScrollView className="flex-1 bg-[#2b2b2b] px-4 py-8">
      <Text className="text-center text-3xl font-bold text-white">Recruiter Yearly Premium</Text>
      <Text className="mt-3 text-center text-white/60">One plan for serious hiring.</Text>

      <View className="mt-8 rounded-2xl border p-6" style={{ borderColor: `${brand.accent}4D`, backgroundColor: brand.surface }}>
        <Text className="text-5xl font-bold" style={{ color: brand.accent }}>
          ${price}
          <Text className="text-lg text-white/50"> / year</Text>
        </Text>
        <Text className="mt-2 text-sm text-white/50">Have a promo code? Enter it at checkout.</Text>

        <View className="mt-6 gap-2">
          {FEATURES.map((f) => (
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
            <Pressable onPress={() => router.push('/checkout')} className="mt-3">
              <Text className="text-center text-sm underline" style={{ color: brand.accent }}>
                Subscription details
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/checkout')}
            className="mt-6 items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Continue to checkout
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={() => router.push('/upgrade')} className="mt-6">
        <Text className="text-center text-xs text-white/40 underline">View full Premium details</Text>
      </Pressable>
    </ScrollView>
  );
}
