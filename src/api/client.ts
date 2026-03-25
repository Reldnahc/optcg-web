const BASE = import.meta.env.VITE_API_URL || "";

export function buildApiUrl(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE}/v1${path}`, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const res = await fetch(buildApiUrl(path, params));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `API error ${res.status}`);
  }
  return res.json();
}
