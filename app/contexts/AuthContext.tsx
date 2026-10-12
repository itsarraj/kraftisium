import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearAuthStorage,
  getAccessToken,
  getRefreshToken,
  getStoredUserJson,
  setAuthBundle,
} from '@/lib/auth-storage';
import { signInWithGoogle, type GoogleAuthRole } from '@/lib/google-auth';
import { authApi, LoginRequest, LoginResponse, RegisterRequest, UserProfile } from '@/services/authApi';
import { setAuthRefresh } from '@/services/authRefresh';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  loginWithGoogle: (role?: GoogleAuthRole) => Promise<UserProfile>;
  completeGoogleLogin: (authData: LoginResponse) => Promise<UserProfile>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const storeAuthData = useCallback(async (authData: LoginResponse) => {
    await setAuthBundle(authData.access_token, authData.refresh_token, JSON.stringify(authData.user));
    setUser(authData.user);
  }, []);

  const clearStoredAuth = useCallback(async () => {
    await clearAuthStorage();
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    const authData = await authApi.refreshToken({ refresh_token: refreshToken });
    const freshUser = await authApi.getProfile();
    await storeAuthData({
      ...authData,
      user: freshUser,
    });
  }, [storeAuthData]);

  useEffect(() => {
    setAuthRefresh(refreshAuth);
    return () => setAuthRefresh(null);
  }, [refreshAuth]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const storedUser = await getStoredUserJson();
        if (accessToken && storedUser && !cancelled) {
          // Show cached profile immediately, then refresh Premium/subscription from BFF.
          setUser(JSON.parse(storedUser) as UserProfile);
          try {
            const freshUser = await authApi.getProfile();
            if (!cancelled) {
              setUser(freshUser);
              const access = await getAccessToken();
              const refresh = await getRefreshToken();
              if (access && refresh) {
                await setAuthBundle(access, refresh, JSON.stringify(freshUser));
              }
            }
          } catch {
            try {
              await refreshAuth();
            } catch {
              await clearStoredAuth();
            }
          }
        }
      } catch (e) {
        console.error('Error initializing auth:', e);
        await clearStoredAuth();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clearStoredAuth, refreshAuth]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true);
      try {
        const authData = await authApi.login(credentials);
        await storeAuthData(authData);
        return authData.user;
      } finally {
        setIsLoading(false);
      }
    },
    [storeAuthData]
  );

  const loginWithGoogle = useCallback(
    async (role: GoogleAuthRole = 'user') => {
      setIsLoading(true);
      try {
        const authData = await signInWithGoogle(role);
        await storeAuthData(authData);
        return authData.user;
      } finally {
        setIsLoading(false);
      }
    },
    [storeAuthData]
  );

  const completeGoogleLogin = useCallback(
    async (authData: LoginResponse) => {
      await storeAuthData(authData);
      setIsLoading(false);
      return authData.user;
    },
    [storeAuthData],
  );

  const register = useCallback(async (userData: RegisterRequest) => {
    setIsLoading(true);
    try {
      await authApi.register(userData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await authApi.logout({ refresh_token: refreshToken });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      await clearStoredAuth();
      setIsLoading(false);
    }
  }, [clearStoredAuth]);

  const clearSession = useCallback(async () => {
    await clearStoredAuth();
  }, [clearStoredAuth]);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await authApi.getProfile();
      setUser(freshUser);
      const access = await getAccessToken();
      const refresh = await getRefreshToken();
      if (access && refresh) {
        await setAuthBundle(access, refresh, JSON.stringify(freshUser));
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      loginWithGoogle,
      completeGoogleLogin,
      register,
      logout,
      clearSession,
      refreshAuth,
      refreshUser,
    }),
    [user, isLoading, login, loginWithGoogle, completeGoogleLogin, register, logout, clearSession, refreshAuth, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
