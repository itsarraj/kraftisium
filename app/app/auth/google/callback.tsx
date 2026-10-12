import * as Linking from 'expo-linking';
import { useURL } from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { brand } from '@/constants/brand';
import { useAuth } from '@/contexts/AuthContext';
import { navigateAfterAuth } from '@/lib/authNavigation';
import { getStoredUserJson } from '@/lib/auth-storage';
import { parseAuthResultUrl } from '@/lib/google-auth';
import type { UserProfile } from '@/services/authApi';

/**
 * Deep-link fallback for Google OAuth.
 * Primary path is WebBrowser.openAuthSessionAsync in signInWithGoogle();
 * this screen catches cases where the OS opens kraftisium://auth/google/callback
 * with tokens in the hash/query instead of returning to the auth session.
 */
export default function GoogleAuthCallbackScreen() {
  const { completeGoogleLogin, isAuthenticated, user } = useAuth();
  const url = useURL();
  const handled = useRef(false);
  const [message, setMessage] = useState('Completing Google sign-in…');

  useEffect(() => {
    if (handled.current) return;

    const finish = async () => {
      const candidates: string[] = [];
      if (url) candidates.push(url);
      try {
        const initial = await Linking.getInitialURL();
        if (initial) candidates.push(initial);
      } catch {
        /* ignore */
      }

      for (const candidate of candidates) {
        const parsed = parseAuthResultUrl(candidate);
        if ('error' in parsed) {
          if (parsed.error !== 'Invalid Google sign-in response') {
            handled.current = true;
            setMessage(parsed.error);
            router.replace('/login');
            return;
          }
          continue;
        }

        handled.current = true;
        try {
          const loggedIn = await completeGoogleLogin(parsed);
          await navigateAfterAuth(loggedIn);
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Google sign-in failed');
          router.replace('/login');
        }
        return;
      }

      // AuthSession already completed elsewhere — resume if we have a session.
      if (isAuthenticated && user) {
        handled.current = true;
        await navigateAfterAuth(user);
        return;
      }

      const stored = await getStoredUserJson();
      if (stored) {
        handled.current = true;
        try {
          await navigateAfterAuth(JSON.parse(stored) as UserProfile);
          return;
        } catch {
          /* fall through */
        }
      }

      handled.current = true;
      router.replace('/login');
    };

    void finish();
  }, [url, completeGoogleLogin, isAuthenticated, user]);

  return (
    <View className="flex-1 items-center justify-center bg-[#2b2b2b] px-6">
      <ActivityIndicator color={brand.accent} />
      <Text className="mt-4 text-center text-white">{message}</Text>
    </View>
  );
}
