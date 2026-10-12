import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { TermsAgreement } from '@/components/TermsAgreement';
import { brand } from '@/constants/brand';
import { EMPLOYER_SIGNUP_STORAGE_KEY } from '@/constants/config';
import { useAuth } from '@/contexts/AuthContext';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';

export default function EmployerSignupScreen() {
  const { register, loginWithGoogle, isLoading } = useAuth();
  const [form, setForm] = useState({
    companyName: '',
    role: '',
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyType: 'direct' as 'direct' | 'agency',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = 'Company name is required';
    if (!form.role.trim()) e.role = 'Your role is required';
    if (!form.fullName.trim()) e.fullName = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!termsAccepted) e.terms = 'You must accept the Terms of Service to register';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async () => {
    setSuccessMessage('');
    setErrors({});
    if (!validate()) return;
    try {
      await register({
        name: form.fullName,
        email: form.email,
        password: form.password,
        role: 'recruiter',
        terms_accepted: termsAccepted,
      });
      await AsyncStorage.setItem(
        EMPLOYER_SIGNUP_STORAGE_KEY,
        JSON.stringify({
          companyName: form.companyName,
          role: form.role,
          mobile: form.mobile,
          companyType: form.companyType,
        })
      );
      // Email verification is off for now.
      // setSuccessMessage('Registration successful! Check your email to verify, then log in.');
      setSuccessMessage('Registration successful! You can log in now.');
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Registration failed' });
    }
  };

  const input = 'k-input';

  return (
    <KeyboardAwareScreen
      screenClassName="flex-1 bg-[#2b2b2b]"
      contentClassName="px-4 py-6">
      <Text className="text-2xl font-bold text-white">Create employer account</Text>
      {errors.general ? <Text className="mt-2 text-red-400">{errors.general}</Text> : null}
      {successMessage ? <Text className="mt-2 text-green-400">{successMessage}</Text> : null}

      {(
        [
          ['companyName', 'Company name', false],
          ['role', 'Your role', false],
          ['fullName', 'Full name', false],
          ['mobile', 'Mobile', false],
          ['email', 'Email', false],
          ['password', 'Password', true],
          ['confirmPassword', 'Confirm password', true],
        ] as const
      ).map(([key, label, secure]) => (
        <View key={key} className="mt-4">
          <Text className="text-sm text-white/80">{label}</Text>
          <TextInput
            className={`${input} mt-1`}
            placeholderTextColor="rgba(255,255,255,0.4)"
            secureTextEntry={secure}
            keyboardType={key === 'email' ? 'email-address' : 'default'}
            value={form[key]}
            onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
          />
          {errors[key] ? <Text className="text-xs text-red-400">{errors[key]}</Text> : null}
        </View>
      ))}

      <View className="mt-4 flex-row items-center gap-3">
        <Text className="text-white/80">Agency</Text>
        <Switch
          value={form.companyType === 'agency'}
          onValueChange={(v) => setForm((f) => ({ ...f, companyType: v ? 'agency' : 'direct' }))}
        />
      </View>

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
          <TermsAgreement role="employer" />
        </View>
      </Pressable>
      {errors.terms ? <Text className="mt-1 text-xs text-red-400">{errors.terms}</Text> : null}

      <Pressable
        onPress={onSubmit}
        disabled={isLoading}
        className="mt-6 items-center rounded-xl py-4"
        style={{ backgroundColor: brand.accent, opacity: isLoading ? 0.7 : 1 }}>
        <Text className="font-bold" style={{ color: brand.bg }}>
          {isLoading ? 'Please wait…' : 'Register'}
        </Text>
      </Pressable>

      <Pressable
        onPress={async () => {
          setErrors({});
          setSuccessMessage('');
          try {
            const loggedIn = await loginWithGoogle('recruiter');
            requestAnimationFrame(() => {
              router.replace(
                loggedIn.role === 'recruiter' || loggedIn.role === 'admin'
                  ? '/(tabs)/recruiter'
                  : '/(tabs)',
              );
            });
          } catch (err) {
            setErrors({ general: err instanceof Error ? err.message : 'Google sign-up failed' });
          }
        }}
        disabled={isLoading}
        className="mt-4 items-center rounded-xl border border-white/20 py-4">
        <Text className="font-semibold text-white">Continue with Google</Text>
      </Pressable>

      <TermsAgreement role="employer" className="mt-4" />

      <Pressable onPress={() => router.push('/employers/login')} className="mt-4 py-2">
        <Text style={{ color: brand.accent }}>Already have an account? Log in</Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
