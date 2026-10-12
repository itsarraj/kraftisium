import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { brand } from '@/constants/brand';

export default function UnauthorizedScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-8">
      <Text className="text-center text-2xl font-bold text-white">Unauthorized</Text>
      <Text className="mt-3 text-center text-white/60">You do not have access to this area.</Text>
      <Pressable
        onPress={() => router.replace('/(tabs)')}
        className="mt-8 w-full items-center rounded-xl py-4"
        style={{ backgroundColor: brand.accent }}>
        <Text className="font-bold" style={{ color: brand.bg }}>
          Go home
        </Text>
      </Pressable>
    </View>
  );
}
