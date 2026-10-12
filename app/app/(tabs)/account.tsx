import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { isUserPremium } from '@/types/subscription';

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const isRecruiter = user?.role === 'recruiter' || user?.role === 'admin';

  const link = (label: string, href: Parameters<typeof router.push>[0]) => (
    <Pressable onPress={() => router.push(href)} className="border-b border-white/10 py-4">
      <Text className="text-base text-white">{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      className="flex-1 bg-[#2b2b2b]"
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
      <Text className="text-2xl font-bold text-white">Account</Text>

      {!isAuthenticated ? (
        <View className="mt-6">
          {link('Log in', '/login')}
          {link('Sign up', '/register')}
          {link('Reset password', '/reset-password')}
          {link('For employers', '/employers')}
          {link('About', '/about')}
          {link('Contact', '/contact')}
        </View>
      ) : (
        <View className="mt-6 rounded-xl border border-white/10 bg-[#1a1a1a] p-4">
          <View className="h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: brand.accent }}>
            <Text className="text-2xl font-bold" style={{ color: brand.bg }}>
              {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
            </Text>
          </View>
          <Text className="mt-3 text-lg font-bold text-white">{user?.name}</Text>
          <Text className="text-sm text-white/60">{user?.email}</Text>
          <Text className="mt-1 text-xs uppercase text-white/40">Role: {user?.role}</Text>

          <View className="mt-4 rounded-lg border border-white/10 bg-[#2b2b2b] p-3">
            <Text className="text-xs uppercase text-white/40">Subscription</Text>
            {isUserPremium(user?.subscription) ? (
              <Text className="mt-1 text-sm font-bold" style={{ color: brand.accent }}>
                Yearly Premium
                {user?.subscription?.founding_slot != null
                  ? ` · Founding #${user.subscription.founding_slot}`
                  : ''}
              </Text>
            ) : (
              <Text className="mt-1 text-sm text-white/60">
                Free · {user?.subscription?.free_ai_matches_limit ?? 3} AI matches
              </Text>
            )}
            <Pressable onPress={() => router.push('/upgrade')} className="mt-2">
              <Text className="text-sm underline" style={{ color: brand.accent }}>
                {isUserPremium(user?.subscription)
                  ? 'Manage Premium'
                  : `Upgrade — $${user?.subscription?.yearly_price_usd ?? 199}/yr`}
              </Text>
            </Pressable>
          </View>

          {!isRecruiter && user?.role === 'user' ? (
            <>
              <Pressable
                onPress={() => router.push('/profile')}
                className="mt-4 items-center rounded-xl py-4"
                style={{ backgroundColor: brand.accent }}>
                <Text className="font-bold" style={{ color: brand.bg }}>
                  My profile & resume
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/saved-jobs')}
                className="mt-3 items-center rounded-xl border py-4"
                style={{ borderColor: brand.accent }}>
                <Text className="font-bold" style={{ color: brand.accent }}>
                  Saved jobs
                </Text>
              </Pressable>
            </>
          ) : null}

          {isRecruiter ? (
            <>
              <Pressable
                onPress={() => router.replace('/(tabs)/recruiter')}
                className="mt-4 items-center rounded-xl border py-4"
                style={{ borderColor: brand.accent }}>
                <Text className="font-bold" style={{ color: brand.accent }}>
                  Recruiter dashboard
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push('/pricing')}
                className="mt-3 items-center rounded-xl py-4"
                style={{ backgroundColor: brand.surface2 }}>
                <Text className="font-bold text-white">Premium ($199/yr)</Text>
              </Pressable>
            </>
          ) : null}

          <View className="mt-6">
            {link('For employers', '/employers')}
            {link('About', '/about')}
            {link('Contact', '/contact')}
          </View>

          <Pressable
            onPress={() => logout()}
            disabled={isLoading}
            className="mt-8 items-center rounded-xl border border-red-500/40 py-4">
            <Text className="font-bold text-red-400">Log out</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}
