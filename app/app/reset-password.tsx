import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { brand } from '@/constants/brand';
import { authApi } from '@/services/authApi';
import { KeyboardAwareScreen } from '@/components/KeyboardAwareScreen';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [resetOk, setResetOk] = useState(false);

  const requestReset = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.requestPasswordReset({ email });
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmReset = async () => {
    setError('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing reset token');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, new_password: newPassword });
      setResetOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  if (resetOk) {
    return (
      <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-6">
        <Text className="text-4xl">✓</Text>
        <Text className="mt-4 text-2xl font-bold text-white">Password reset</Text>
        <Text className="mt-2 text-center text-white/70">You can now log in.</Text>
        <Pressable
          onPress={() => router.replace('/login')}
          className="k-btn mt-8 w-full">
          <Text className="font-bold text-brand-bg">
            Back to login
          </Text>
        </Pressable>
      </View>
    );
  }

  if (token) {
    return (
      <KeyboardAwareScreen
        screenClassName="flex-1 bg-[#2b2b2b]"
        contentClassName="flex-1 justify-center px-6 py-8">
        <Text className="text-2xl font-bold text-white">Set new password</Text>
        <Text className="mt-4 text-sm text-white/80">New password</Text>
        <TextInput
          className="k-input mt-1"
          placeholderTextColor="rgba(255,255,255,0.4)"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <Text className="mt-4 text-sm text-white/80">Confirm</Text>
        <TextInput
          className="k-input mt-1"
          placeholderTextColor="rgba(255,255,255,0.4)"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />
        {error ? <Text className="mt-2 text-red-400">{error}</Text> : null}
        <Pressable
          onPress={confirmReset}
          disabled={loading}
          className="k-btn mt-8"
          style={loading ? { opacity: 0.5 } : undefined}>
          <Text className="font-bold text-brand-bg">
            {loading ? 'Saving…' : 'Reset password'}
          </Text>
        </Pressable>
      </KeyboardAwareScreen>
    );
  }

  return (
    <KeyboardAwareScreen
      screenClassName="flex-1 bg-[#2b2b2b]"
      contentClassName="flex-1 justify-center px-6 py-8">
      <Text className="text-2xl font-bold text-white">Reset password</Text>
      <Text className="mt-2 text-white/60">We will email you a reset link.</Text>
      <Text className="mt-6 text-sm text-white/80">Email</Text>
      <TextInput
        className="k-input mt-1"
        placeholderTextColor="rgba(255,255,255,0.4)"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      {error ? <Text className="mt-2 text-red-400">{error}</Text> : null}
      {submitted ? (
        <Text className="mt-4 text-green-400">If the account exists, check your email.</Text>
      ) : null}
      <Pressable
        onPress={requestReset}
        disabled={loading}
        className="k-btn mt-8"
        style={loading ? { opacity: 0.5 } : undefined}>
        <Text className="font-bold text-brand-bg">
          {loading ? 'Sending…' : 'Send reset link'}
        </Text>
      </Pressable>
    </KeyboardAwareScreen>
  );
}
