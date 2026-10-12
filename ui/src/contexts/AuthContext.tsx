import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { UserProfile, RegisterRequest, LoginRequest } from '../services/authApi';
import { authApi } from '../services/authApi';
import { setAuthRefresh } from '../services/authRefresh';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<UserProfile>;
  completeGoogleLogin: () => Promise<UserProfile>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  refreshAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Auth state lives in httpOnly cookies the BFF sets — nothing sensitive is
// held client-side. `user` is just a cache of the last `/user/profile`
// response used to render the UI; it is never the source of truth for
// whether a request will actually be authorized.
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if the API call fails
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
  }, []);

  const refreshAuth = useCallback(async (): Promise<void> => {
    try {
      await authApi.refreshToken();
      const freshUser = await authApi.getProfile();
      setUser(freshUser);
    } catch (error) {
      setUser(null);
      throw error;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const freshUser = await authApi.getProfile();
      setUser(freshUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<UserProfile> => {
    try {
      setIsLoading(true);
      const authData = await authApi.login(credentials);
      setUser(authData.user);
      return authData.user;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeGoogleLogin = useCallback(async (): Promise<UserProfile> => {
    // The BFF already set the auth cookies on its redirect to the callback
    // page — this just hydrates the profile they now grant access to.
    const freshUser = await authApi.getProfile();
    setUser(freshUser);
    setIsLoading(false);
    return freshUser;
  }, []);

  const register = useCallback(async (userData: RegisterRequest): Promise<void> => {
    try {
      setIsLoading(true);
      await authApi.register(userData);
      // Note: Registration doesn't automatically log in - user needs to verify email first
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthRefresh(refreshAuth);
    return () => setAuthRefresh(null);
  }, [refreshAuth]);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const freshUser = await authApi.getProfile();
        setUser(freshUser);
      } catch {
        // No valid session cookie (or refresh also failed) — signed out.
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void initializeAuth();
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    completeGoogleLogin,
    register,
    logout,
    clearSession,
    refreshAuth,
    refreshUser,
  }), [user, isLoading, login, completeGoogleLogin, register, logout, clearSession, refreshAuth, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};