import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { appIdentity } from '@/constants/appIdentity';

/**
 * BFF base URL (no trailing slash). Auth + jobs + resumes share this host.
 *
 * Default: https://api.kraftisium.xyz (production).
 * Local BFF (http://localhost:8000): set EXPO_PUBLIC_USE_LOCAL_BFF=1 in .env — see docs/env/mobile.local.env
 */
const PRODUCTION_API_BASE = appIdentity.apiBaseUrl;
const LOCAL_DEV_API_BASE = 'http://localhost:8000';

function isPrivateLanIPv4(host: string): boolean {
  const parts = host.split('.');
  if (parts.length !== 4) return false;
  const n = parts.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b] = n;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function useLocalBff(): boolean {
  return process.env.EXPO_PUBLIC_USE_LOCAL_BFF === '1';
}

function devMachineHostForApi(): string | null {
  if (!__DEV__ || !useLocalBff()) return null;
  // adb reverse tcp:8000 tcp:8000 — keep localhost as-is
  if (process.env.EXPO_PUBLIC_DEV_TRANSPORT === 'adb') return null;

  const explicit = process.env.EXPO_PUBLIC_DEV_API_HOST?.trim();
  if (explicit) return explicit;

  // Android emulator: 10.0.2.2 is the host loopback. Physical Android: set
  // EXPO_PUBLIC_DEV_API_HOST or EXPO_PUBLIC_DEV_TRANSPORT=adb (expo-constants
  // 56 no longer has isDevice, so we cannot tell emulator from phone here).
  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_ANDROID_EMULATOR_HOST?.trim() || '10.0.2.2';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  if (!isPrivateLanIPv4(host)) return null;
  return host;
}

function rewriteLocalhostForDevice(url: string): string {
  const host = devMachineHostForApi();
  if (!host) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      u.hostname = host;
      return u.href.replace(/\/$/, '');
    }
  } catch {
    /* ignore */
  }
  return url.replace(/\/$/, '');
}

function resolveRawBffUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_BFF_API_URL?.trim();
  if (fromEnv) return rewriteLocalhostForDevice(fromEnv.replace(/\/$/, ''));

  const fromExtra = Constants.expoConfig?.extra?.bffApiUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return rewriteLocalhostForDevice(fromExtra.trim().replace(/\/$/, ''));
  }

  if (__DEV__ && useLocalBff()) {
    return rewriteLocalhostForDevice(LOCAL_DEV_API_BASE);
  }

  return PRODUCTION_API_BASE;
}

export const BFF_API_URL = resolveRawBffUrl();
export const BFF_API_VERSION = process.env.EXPO_PUBLIC_BFF_API_VERSION ?? 'v1';

export function apiUrl(endpoint: string): string {
  const base = BFF_API_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}/api/${BFF_API_VERSION}${path}`;
}

if (__DEV__) {
  console.log('[Kraftisium] BFF_API_URL =', BFF_API_URL);

  if (useLocalBff()) {
    const hostUri = Constants.expoConfig?.hostUri;
    const tunnel =
      typeof hostUri === 'string' &&
      (hostUri.includes('exp.direct') ||
        hostUri.includes('ngrok') ||
        hostUri.includes('trycloudflare.com'));
    const apiLocal =
      BFF_API_URL.includes('localhost') || BFF_API_URL.includes('127.0.0.1');
    if (tunnel && apiLocal) {
      console.warn(
        '[Kraftisium] Tunnel Metro + localhost API: use npm run dev:android-tunnel-adb or set EXPO_PUBLIC_BFF_API_URL=https://api.kraftisium.xyz',
      );
    }
  }
}

export const STORAGE_KEYS = {
  accessToken: process.env.EXPO_PUBLIC_ACCESS_TOKEN_KEY ?? 'kraftisium_access_token',
  refreshToken: process.env.EXPO_PUBLIC_REFRESH_TOKEN_KEY ?? 'kraftisium_refresh_token',
  userProfile: process.env.EXPO_PUBLIC_USER_PROFILE_KEY ?? 'kraftisium_user_profile',
} as const;

export const EMPLOYER_SIGNUP_STORAGE_KEY = 'employerSignupData';
