import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { authApi } from '@/services/authApi';

export default function VerifyEmailScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token || typeof token !== 'string') {
      setStatus('err');
      setMessage('Invalid verification link.');
      return;
    }
    (async () => {
      try {
        const res = await authApi.verifyEmail(token);
        setMessage(res.message || 'Email verified.');
        setStatus('ok');
      } catch (e) {
        setMessage(e instanceof Error ? e.message : 'Verification failed');
        setStatus('err');
      }
    })();
  }, [token]);

  return (
    <View className="flex-1 justify-center bg-[#2b2b2b] px-6">
      {status === 'loading' ? (
        <ActivityIndicator size="large" color={brand.accent} />
      ) : (
        <>
          <Text className="text-center text-xl font-bold text-white">
            {status === 'ok' ? 'Email verified' : 'Verification issue'}
          </Text>
          <Text className="mt-4 text-center text-base text-white/70">{message}</Text>
          <Pressable
            onPress={() => router.replace('/login')}
            className="mt-10 items-center rounded-xl py-4"
            style={{ backgroundColor: brand.accent }}>
            <Text className="font-bold" style={{ color: brand.bg }}>
              Go to log in
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
