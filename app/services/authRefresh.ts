let refreshFn: (() => Promise<void>) | null = null;
let inFlight: Promise<void> | null = null;

export function setAuthRefresh(fn: (() => Promise<void>) | null): void {
  refreshFn = fn;
}

/**
 * Multiple screens can hit a 401 off the same expired access token at once.
 * Without sharing one in-flight refresh, each would race its own refresh
 * call — and since a refresh rotates the refresh token, the losers would use
 * an already-invalidated token and spuriously log the user out.
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
