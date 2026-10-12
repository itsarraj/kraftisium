import { Stack } from 'expo-router';

import { brand } from '@/constants/brand';

export default function EmployersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: brand.bg },
        headerTintColor: brand.accent,
        headerTitleStyle: { color: brand.text, fontWeight: '700' },
        contentStyle: { backgroundColor: brand.bg },
      }}>
      <Stack.Screen name="index" options={{ title: 'For employers' }} />
      <Stack.Screen name="signup" options={{ title: 'Employer sign up' }} />
      <Stack.Screen name="login" options={{ title: 'Employer login' }} />
    </Stack>
  );
}
