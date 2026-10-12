import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { brand } from '@/constants/brand';

export default function AccountDeletedScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-8">
      <Text className="text-center text-2xl font-bold" style={{ color: brand.accent }}>
        Account deleted
      </Text>
      <Text className="mt-3 text-center text-lg text-white/70">
        Thank you. Your account has been deleted.
      </Text>
      <Pressable
        onPress={() => router.replace('/login')}
        className="mt-8 w-full items-center rounded-xl py-4"
        style={{ backgroundColor: brand.accent }}>
        <Text className="font-bold" style={{ color: brand.bg }}>
          Back to login
        </Text>
      </Pressable>
    </View>
  );
}
