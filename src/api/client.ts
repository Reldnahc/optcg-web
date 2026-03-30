const BASE = import.meta.env.VITE_API_URL || "";

export function buildApiRootUrl(path: string, params?: Record<string, string>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origin = BASE ? BASE.replace(/\/+$/, "") : window.location.origin;
  const url = new URL(normalizedPath, `${origin}/`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function buildApiUrl(path: string, params?: Record<string, string>) {
  return buildApiRootUrl(`/v1${path}`, params);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message
      || body?.message
      || (res.status === 429 ? "Rate limit exceeded" : `API error ${res.status}`);
    throw new Error(message);
  }
  return res.json();
}

export async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  return fetchJson<T>(buildApiUrl(path, params));
}

export async function apiRootFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  return fetchJson<T>(buildApiRootUrl(path, params));
}
