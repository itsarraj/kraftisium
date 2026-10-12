import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { apiUrl } from '@/constants/config';
import type { LoginResponse, UserProfile } from '@/services/authApi';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthRole = 'user' | 'recruiter';

function googleCallbackRedirectUri(): string {
  return makeRedirectUri({
    scheme: 'kraftisium',
    path: 'auth/google/callback',
  });
}

export function parseAuthResultUrl(resultUrl: string): LoginResponse | { error: string } {
  let url: URL;
  try {
    url = new URL(resultUrl);
  } catch {
    return { error: 'Invalid Google sign-in response' };
  }

  const params = new URLSearchParams(
    url.hash.startsWith('#') ? url.hash.slice(1) : url.search.slice(1),
  );

  const error = params.get('error');
  if (error) {
    return { error: decodeURIComponent(error) };
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const expires_in = params.get('expires_in');
  const userRaw = params.get('user');

  if (!access_token || !refresh_token || !userRaw) {
    return { error: 'Invalid Google sign-in response' };
  }

  try {
    const user = JSON.parse(userRaw) as UserProfile;
    return {
      access_token,
      refresh_token,
      expires_in: Number(expires_in || 0),
      user,
    };
  } catch {
    return { error: 'Invalid Google sign-in response' };
  }
}

export async function signInWithGoogle(role: GoogleAuthRole = 'user'): Promise<LoginResponse> {
  const redirectTo = googleCallbackRedirectUri();
  const authUrl = `${apiUrl('/auth/google')}?redirect_to=${encodeURIComponent(redirectTo)}&role=${encodeURIComponent(role)}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Google sign-in was cancelled');
  }

  const parsed = parseAuthResultUrl(result.url);
  if ('error' in parsed) {
    throw new Error(parsed.error);
  }

  return parsed;
}
