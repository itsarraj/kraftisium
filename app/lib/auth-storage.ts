import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { STORAGE_KEYS } from '@/constants/config';

// Tokens go in SecureStore (iOS Keychain / Android Keystore) — plain
// AsyncStorage is readable in cleartext from a rooted device or an ADB
// backup, which would hand over a long-lived refresh token. The cached user
// profile isn't sensitive the same way and can be larger than SecureStore's
// per-item limit comfortably allows, so it stays in AsyncStorage.
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.accessToken);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(STORAGE_KEYS.refreshToken);
}

export async function setAuthBundle(access: string, refresh: string, userJson: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.accessToken, access),
    SecureStore.setItemAsync(STORAGE_KEYS.refreshToken, refresh),
    AsyncStorage.setItem(STORAGE_KEYS.userProfile, userJson),
  ]);
}

export async function clearAuthStorage(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.accessToken),
    SecureStore.deleteItemAsync(STORAGE_KEYS.refreshToken),
    AsyncStorage.removeItem(STORAGE_KEYS.userProfile),
  ]);
}

export async function getStoredUserJson(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.userProfile);
}
