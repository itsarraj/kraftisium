import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { BrandLogo } from '@/components/BrandLogo';
import { TermsAgreement } from '@/components/TermsAgreement';
import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';
import { navigateAfterAuth } from '@/lib/authNavigation';
import { normalizePromoCode, writeStoredPromoCode } from '@/lib/promoCode';

export default function RegisterScreen() {
  const { register, loginWithGoogle, isLoading } = useAuth();
  const params = useLocalSearchParams<{ ref?: string; promo?: string; code?: string }>();
  const refCode = typeof params.ref === 'string' ? params.ref : undefined;
  const promoFromUrl =
    (typeof params.promo === 'string' ? params.promo : undefined) ??
    (typeof params.code === 'string' ? params.code : undefined);

  useEffect(() => {
    if (promoFromUrl) void writeStoredPromoCode(normalizePromoCode(promoFromUrl));
  }, [promoFromUrl]);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) e.terms = 'You must accept the Terms of Service to register';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setSuccess('');
    setErrors({});
    if (!validate()) return;
    try {
      await register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        role: 'user',
        referral_code: refCode,
        terms_accepted: termsAccepted,
      });
      // Email verification is off for now.
      // setSuccess('Registration successful! Check your email to verify your account.');
      setSuccess('Registration successful! You can log in now.');
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' });
    }
  };

  const field = (key: keyof typeof form, label: string, secure?: boolean) => (
    <View className="mt-4">
      <Text className="text-sm text-white/80">{label}</Text>
      <TextInput
        className={`k-input ${errors[key] ? 'border-red-500' : ''}`}
        placeholderTextColor="rgba(255,255,255,0.4)"
        secureTextEntry={!!secure}
        keyboardType={key === 'email' ? 'email-address' : 'default'}
        autoCapitalize={key === 'email' ? 'none' : 'words'}
        value={form[key]}
        onChangeText={(v) => {
          setForm((f) => ({ ...f, [key]: v }));
          if (errors[key]) setErrors((er) => ({ ...er, [key]: '' }));
        }}
      />
      {errors[key] ? <Text className="text-xs text-red-400">{errors[key]}</Text> : null}
    </View>
  );

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
      <Text className="text-center text-2xl font-bold text-white">Create your account</Text>
      <Text className="mb-4 text-center text-4xl font-bold text-white">Register</Text>
      {errors.general ? <Text className="text-center text-red-400">{errors.general}</Text> : null}
      {success ? <Text className="text-center text-green-400">{success}</Text> : null}
      {field('fullName', 'Full name')}
      {field('email', 'Email')}
      {field('password', 'Password', true)}
      {field('confirmPassword', 'Confirm password', true)}
      <Pressable
        onPress={() => {
          setTermsAccepted((v) => !v);
          if (errors.terms) setErrors((er) => ({ ...er, terms: '' }));
        }}
        className="mt-6 flex-row items-start gap-2.5">
        <View
          className="mt-0.5 h-4 w-4 items-center justify-center rounded border"
          style={{
            borderColor: brand.accent,
            backgroundColor: termsAccepted ? brand.accent : 'transparent',
          }}>
          {termsAccepted ? (
            <Text className="text-[10px] font-bold" style={{ color: brand.bg }}>
              ✓
            </Text>
          ) : null}
        </View>
        <View className="flex-1">
          <TermsAgreement role="candidate" />
        </View>
      </Pressable>
      {errors.terms ? <Text className="mt-1 text-center text-xs text-red-400">{errors.terms}</Text> : null}
      <Pressable
        onPress={onSubmit}
        disabled={isLoading}
        className="k-btn mt-8"
        style={isLoading ? { opacity: 0.5 } : undefined}>
        <Text className="font-bold text-brand-bg">
          {isLoading ? 'Please wait…' : 'Create account'}
        </Text>
      </Pressable>

      <Pressable
        onPress={async () => {
          setErrors({});
          setSuccess('');
          try {
            const loggedIn = await loginWithGoogle('user');
            await navigateAfterAuth(loggedIn);
          } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'Google sign-up failed' });
          }
        }}
        disabled={isLoading}
        className="k-btn-outline mt-4">
        <Text className="font-semibold text-white">Continue with Google</Text>
      </Pressable>

      <TermsAgreement role="candidate" className="mt-4" />

      <Pressable onPress={() => router.push('/login')} className="mt-6">
        <Text className="text-center text-white/70">
          Have an account? <Text style={{ color: brand.accent }}>Log in</Text>
        </Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
