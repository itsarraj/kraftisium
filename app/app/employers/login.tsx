import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput } from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';

export default function EmployerLoginScreen() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const onSubmit = async () => {
    setError('');
    try {
      const u = await login(form);
      const isRecruiter = u.role === 'recruiter' || u.role === 'admin';
      const target = isRecruiter ? '/(tabs)/recruiter' : '/(tabs)';
      requestAnimationFrame(() => {
        router.replace(target);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    }
  };

  return (
    <KeyboardAwareScreen
      screenClassName="flex-1 bg-[#2b2b2b]"
      contentClassName="flex-1 px-4 py-8">
      <Text className="text-2xl font-bold text-white">Employer login</Text>
      <Text className="mt-2 text-white/60">Sign in to manage jobs and candidates</Text>
      <Text className="mt-6 text-sm text-white/80">Email</Text>
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
      {error ? <Text className="mt-2 text-red-400">{error}</Text> : null}
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
            const loggedIn = await loginWithGoogle('recruiter');
            const isRecruiter = loggedIn.role === 'recruiter' || loggedIn.role === 'admin';
            const target = isRecruiter ? '/(tabs)/recruiter' : '/(tabs)';
            requestAnimationFrame(() => {
              router.replace(target);
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Google sign-in failed');
          }
        }}
        disabled={isLoading}
        className="k-btn-outline mt-4">
        <Text className="font-semibold text-white">Continue with Google</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/reset-password')} className="mt-4 self-end">
        <Text style={{ color: brand.accent }}>Forgot password?</Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
