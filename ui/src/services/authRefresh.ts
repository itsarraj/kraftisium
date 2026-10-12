let refreshFn: (() => Promise<void>) | null = null;
let inFlight: Promise<void> | null = null;

export function setAuthRefresh(fn: (() => Promise<void>) | null): void {
  refreshFn = fn;
}

/**
 * Multiple requests can 401 at once off the same expired access-token
 * cookie (e.g. a `Promise.all` of authenticated calls). Without sharing one
 * in-flight refresh, each would race its own `/auth/refresh` call — and
 * since a refresh rotates the refresh token, the losers would use an
 * already-invalidated token and spuriously log the user out.
 */
export async function tryRefreshAuth(): Promise<boolean> {
  if (!refreshFn) return false;
  if (!inFlight) {
    inFlight = refreshFn().finally(() => {
      inFlight = null;
    });
  }
  await inFlight;
  return true;
}
