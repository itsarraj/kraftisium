import 'react-native-reanimated';

import { HotUpdater } from '@hot-updater/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { PromoCodeCapture } from '@/components/PromoCodeCapture';
import { AuthProvider } from '@/contexts/AuthContext';
import { brand } from '@/constants/brand';
import { queryClient } from '@/lib/queryClient';
import '../global.css';

const hotUpdaterBaseUrl = process.env.EXPO_PUBLIC_HOT_UPDATER_BASE_URL;

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: brand.accent,
    background: brand.bg,
    card: brand.surface,
    text: brand.text,
    border: brand.border,
  },
};

function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PromoCodeCapture />
        <ThemeProvider value={navTheme}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: brand.bg },
              headerTintColor: brand.accent,
              headerTitleStyle: { color: brand.text, fontWeight: '700' },
              contentStyle: { backgroundColor: brand.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="job/[id]" options={{ title: 'Job details' }} />
            <Stack.Screen name="login" options={{ title: 'Log in' }} />
            <Stack.Screen name="register" options={{ title: 'Sign up' }} />
            <Stack.Screen name="reset-password" options={{ title: 'Reset password' }} />
            <Stack.Screen name="profile" options={{ title: 'My profile' }} />
            <Stack.Screen name="account-deleted" options={{ title: 'Account deleted', headerShown: false }} />
            <Stack.Screen name="about" options={{ title: 'About' }} />
            <Stack.Screen name="contact" options={{ title: 'Contact' }} />
            <Stack.Screen name="pricing" options={{ title: 'Premium' }} />
            <Stack.Screen name="upgrade" options={{ title: 'Yearly Premium' }} />
            <Stack.Screen name="redeem" options={{ title: 'Redeem Premium' }} />
            <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
            <Stack.Screen name="auth/google/callback" options={{ title: 'Google sign-in', headerShown: false }} />
            <Stack.Screen name="verify-email/[token]" options={{ title: 'Verify email' }} />
            <Stack.Screen name="employers" options={{ headerShown: false }} />
            <Stack.Screen name="unauthorized" options={{ title: 'Unauthorized' }} />
            <Stack.Screen name="+not-found" options={{ title: 'Not found' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Only wraps with OTA update checks once EXPO_PUBLIC_HOT_UPDATER_BASE_URL is provisioned
// (see hot-updater.config.ts) — until then this is a no-op passthrough.
export default hotUpdaterBaseUrl
  ? HotUpdater.wrap({
      baseURL: hotUpdaterBaseUrl,
      updateStrategy: 'appVersion', // or "fingerprint" — see hot-updater docs
      updateMode: 'auto',
    })(RootLayout)
  : RootLayout;
