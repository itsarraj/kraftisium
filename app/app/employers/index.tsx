import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';

export default function EmployersLandingScreen() {
  const { isAuthenticated } = useAuth();

  return (
    <ScrollView className="flex-1 bg-[#2b2b2b] px-4 py-8" contentContainerStyle={{ paddingBottom: 48 }}>
      <Text className="text-3xl font-bold text-white">Hire smarter with AI matching</Text>
      <Text className="mt-3 text-base leading-6 text-white/70">
        Post jobs, review applications, and reach candidates whose profiles align with your roles.
      </Text>

      {!isAuthenticated ? (
        <View className="mt-8 gap-3">
          <Pressable
            onPress={() => router.push('/employers/signup')}
            className="items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Create employer account
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/employers/login')}
            className="items-center rounded-xl border py-4"
            style={{ borderColor: brand.border }}>
            <Text className="font-bold text-white">Employer login</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => router.replace('/(tabs)/recruiter')}
          className="mt-8 items-center rounded-xl py-4"
          style={{ backgroundColor: brand.accent }}>
          <Text className="font-bold" style={{ color: brand.bg }}>
            Open recruiter dashboard
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
