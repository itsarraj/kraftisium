import { apiUrl } from '../config/api';

export type GoogleAuthRole = 'user' | 'recruiter';

export function getGoogleCallbackUrl(): string {
  const appUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.replace(/\/$/, '');
  const origin = appUrl || window.location.origin;
  return `${origin}/auth/google/callback`;
}

export function startGoogleSignIn(role: GoogleAuthRole = 'user'): void {
  const redirectTo = getGoogleCallbackUrl();
  const url = `${apiUrl('/auth/google')}?redirect_to=${encodeURIComponent(redirectTo)}&role=${encodeURIComponent(role)}`;
  window.location.href = url;
}

export interface GoogleCallbackResult {
  success: boolean;
  error?: string;
}

/**
 * The BFF sets the auth cookies directly on its redirect to this page — it
 * no longer puts tokens in the URL (that was forgeable: a crafted link with
 * an attacker's own tokens in the fragment would log a victim into the
 * attacker's account). All that's left to read here is a status flag.
 */
export function parseGoogleCallback(location: Location): GoogleCallbackResult | null {
  const raw = location.search.startsWith('?') ? location.search.slice(1) : location.search;
  if (!raw) return null;

  const params = new URLSearchParams(raw);
  const error = params.get('error');
  if (error) {
    return { success: false, error };
  }

  if (params.get('auth') !== 'success') {
    return null;
  }

  return { success: true };
}
