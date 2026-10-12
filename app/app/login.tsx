import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { isUserPremium } from '@/types/subscription';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { navigateAfterAuth } from '@/lib/authNavigation';

export default function LoginScreen() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect =
    typeof params.redirect === 'string' ? params.redirect : undefined;
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    try {
      const loggedIn = await login(form);
      if (isUserPremium(loggedIn.subscription)) {
        Alert.alert('Premium active', 'Your Yearly Premium subscription is active.');
      }
      requestAnimationFrame(() => {
        void navigateAfterAuth(loggedIn, redirect);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <KeyboardAwareScreen
      screenClassName="flex-1 bg-[#2b2b2b]"
      contentClassName="flex-1 justify-center px-6 py-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <Text style={{ color: brand.accent }}>← Back</Text>
      </Pressable>
      <View className="mb-6 items-center">
        <BrandLogo size="md" />
      </View>
      <Text className="text-center text-2xl font-bold text-white">Welcome back</Text>
      <Text className="mb-8 text-center text-4xl font-bold text-white">Login</Text>

      <Text className="text-sm text-white/80">Email</Text>
      <TextInput
        className="k-input mt-1"
        placeholderTextColor="rgba(255,255,255,0.4)"
        autoCapitalize="none"
        keyboardType="email-address"
        value={form.email}
        onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
      />
      <Text className="mt-4 text-sm text-white/80">Password</Text>
      <TextInput
        className="k-input mt-1"
        placeholderTextColor="rgba(255,255,255,0.4)"
        secureTextEntry
        value={form.password}
        onChangeText={(v) => setForm((f) => ({ ...f, password: v }))}
      />
      <Pressable onPress={() => router.push('/reset-password')} className="mt-2 self-end">
        <Text className="text-sm" style={{ color: brand.accent }}>
          Forgot password?
        </Text>
      </Pressable>
      {error ? <Text className="mt-2 text-center text-red-400">{error}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isLoading}
        className="k-btn mt-8"
        style={isLoading ? { opacity: 0.5 } : undefined}>
        <Text className="font-bold text-brand-bg">
          {isLoading ? 'Signing in…' : 'Log in'}
        </Text>
      </Pressable>

      <Pressable
        onPress={async () => {
          setError('');
          try {
            const loggedIn = await loginWithGoogle('user');
            requestAnimationFrame(() => {
              void navigateAfterAuth(loggedIn, redirect);
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Google sign-in failed');
          }
        }}
        disabled={isLoading}
        className="k-btn-outline mt-4">
        <Text className="font-semibold text-white">
          Continue with Google
        </Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')} className="mt-6">
        <Text className="text-center text-white/70">
          No account? <Text style={{ color: brand.accent }}>Sign up</Text>
        </Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
