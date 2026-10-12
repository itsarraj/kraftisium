import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { subscriptionApi } from '@/services/subscriptionApi';
import type { PromoBannerInfo } from '@/types/subscription';

const DISMISS_KEY = 'kraftisium_founding_banner_dismissed';

export function FoundingBanner() {
  const [promo, setPromo] = useState<PromoBannerInfo | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    (async () => {
      const d = await AsyncStorage.getItem(DISMISS_KEY);
      setDismissed(d === '1');
      try {
        const p = await subscriptionApi.getPromoBanner();
        setPromo(p);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (dismissed || !promo?.founding_offer_active) return null;

  return (
    <View className="px-3 py-2.5" style={{ backgroundColor: brand.accent }}>
      <Pressable onPress={() => router.push('/register')}>
        <Text className="text-center text-xs font-medium pr-6" style={{ color: brand.bg }}>
          {promo.message}
        </Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          await AsyncStorage.setItem(DISMISS_KEY, '1');
          setDismissed(true);
        }}
        className="absolute right-2 top-2 px-2">
        <Text className="text-lg font-bold opacity-60" style={{ color: brand.bg }}>
          ×
        </Text>
      </Pressable>
    </View>
  );
}
