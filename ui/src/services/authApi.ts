import type { SubscriptionInfo } from '../types/subscription';
import { apiUrl } from '../config/api';
import { tryRefreshAuth } from './authRefresh';

// API types for the merged BFF auth endpoints
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role: string;
  referral_code?: string;
  terms_accepted: boolean;
  turnstile_token?: string;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  turnstile_token?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
  expires_in: number;
}

export interface RefreshTokenRequest {
  // Web has nothing to send here — the refresh token lives in an httpOnly
  // cookie the browser attaches automatically. Kept optional for parity
  // with the BFF's request shape.
  refresh_token?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LogoutRequest {
  refresh_token?: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  subscription?: SubscriptionInfo | null;
  referral_code?: string;
  successful_referrals?: number;
  referral_credits?: number;
  is_premium_candidate?: boolean;
}

export interface ErrorResponse {
  error: string;
  message?: string;
}

class AuthApiService {
  private getFullUrl(endpoint: string): string {
    return apiUrl(endpoint);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);

    // credentials: 'include' is what makes the browser send/store the BFF's
    // httpOnly auth cookies on this (likely cross-subdomain) request.
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json().catch(() => ({
          error: 'NetworkError',
          message: `HTTP ${response.status}: ${response.statusText}`
        }));
        throw new Error(errorData.message || errorData.error);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  /**
   * Same as `request`, but retries once via a token refresh on 401 — the
   * access-token cookie can legitimately expire mid-session. bffApi.ts has
   * always retried this way; this mirrors it so every authenticated call
   * (including profile fetches used to bootstrap auth state) behaves the same.
   */
  private async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const url = this.getFullUrl(endpoint);
    const config: RequestInit = {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    const response = await fetch(url, config);

    if (response.status === 401 && !isRetry) {
      try {
        await tryRefreshAuth();
        return this.authenticatedRequest<T>(endpoint, options, true);
      } catch {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData: ErrorResponse = await response.json().catch(() => ({
        error: 'NetworkError',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(errorData.message || errorData.error);
    }

    return response.json();
  }

  // ===== AUTH ENDPOINTS =====

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async loginWithGoogleIdToken(idToken: string, role = 'user'): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ id_token: idToken, role }),
    });
  }

  async refreshToken(data: RefreshTokenRequest = {}): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(data: LogoutRequest = {}): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyEmail(token: string, signal?: AbortSignal): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      signal,
    });
  }

  async requestPasswordReset(data: RequestPasswordResetRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/password-reset/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ===== USER ENDPOINTS =====

  async getProfile(): Promise<UserProfile> {
    return this.authenticatedRequest<UserProfile>('/user/profile');
  }

  async updateProfile(data: UpdateProfileRequest): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>('/user/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(): Promise<{ message: string }> {
    return this.authenticatedRequest<{ message: string }>('/user/account', {
      method: 'DELETE',
    });
  }
}

export const authApi = new AuthApiService();