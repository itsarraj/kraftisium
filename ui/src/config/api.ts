/** Merged BFF base URL and version (auth + business routes share one backend). */
export function resolveApiBaseUrl(envValue: string | undefined): string {
  if (!envValue || envValue === '__RELATIVE__') {
    return '';
  }
  return envValue.replace(/\/$/, '');
}

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_BFF_API_URL as string | undefined;
  const base = resolveApiBaseUrl(raw);
  if (!base && import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  return base;
}

export function getApiVersion(): string {
  return import.meta.env.VITE_BFF_API_VERSION || 'v1';
}

export function apiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const path = `/api/${getApiVersion()}${endpoint}`;
  return base ? `${base}${path}` : path;
}
