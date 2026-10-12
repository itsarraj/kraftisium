import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { brand } from '@/constants/brand';

export default function NotFoundScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-8">
      <Text className="text-6xl font-bold text-white">404</Text>
      <Text className="mt-2 text-lg text-white/70">This screen does not exist.</Text>
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        className="mt-8 rounded-xl px-8 py-4"
        style={{ backgroundColor: brand.accent }}>
        <Text className="font-bold" style={{ color: brand.bg }}>
          Home
        </Text>
      </Pressable>
    </View>
  );
}
