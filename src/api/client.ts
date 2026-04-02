const BASE = import.meta.env.VITE_API_URL || "";

type QueryParams = Record<string, string | undefined>;

export function buildApiRootUrl(path: string, params?: QueryParams) {
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

export function buildApiUrl(path: string, params?: QueryParams) {
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

async function fetchJsonInit<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message
      || body?.message
      || (res.status === 429 ? "Rate limit exceeded" : `API error ${res.status}`);
    throw new Error(message);
  }
  return res.json();
}

export async function apiFetch<T>(path: string, params?: QueryParams): Promise<T> {
  return fetchJson<T>(buildApiUrl(path, params));
}

export async function apiRootFetch<T>(path: string, params?: QueryParams): Promise<T> {
  return fetchJson<T>(buildApiRootUrl(path, params));
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return fetchJsonInit<T>(buildApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
