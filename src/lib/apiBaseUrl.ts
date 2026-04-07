export const API_BASE_URL_STORAGE_KEY = "app.apiBaseUrl";
export const DEFAULT_API_BASE_URL = "http://localhost:4000/api";

export function normalizeBaseUrl(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "";

  // Keep optional base path (e.g. https://domain.com/api) but strip a trailing "/auth"
  // to avoid ending up with "/auth/auth/login".
  const trimmed = v.replace(/\/+$/, "");

  try {
    const u = new URL(trimmed);

    // Remove trailing slashes and a final "/auth" segment only.
    let path = (u.pathname || "/").replace(/\/+$/, "");
    path = path.replace(/\/auth$/, "");
    path = path.replace(/\/+$/, "");

    return u.origin + path;
  } catch {
    // Non-URL fallback (best-effort): remove trailing /auth and trailing slashes.
    return trimmed.replace(/\/auth$/, "").replace(/\/+$/, "");
  }
}

export function getApiBaseUrlFromEnvOrDefault(): string {
  const env = ((import.meta as any)?.env || {}) as Record<string, string | undefined>;
  const raw = (env.VITE_API_URL || env.VITE_API_BASE_URL || "").toString().trim();
  return normalizeBaseUrl(raw) || DEFAULT_API_BASE_URL;
}

export function resolveApiBaseUrl(): string {
  // 1) UI override from Settings page
  try {
    const v = typeof window !== "undefined" ? localStorage.getItem(API_BASE_URL_STORAGE_KEY) : null;
    const normalized = normalizeBaseUrl(v || "");
    if (normalized) return normalized;
  } catch {
    // ignore
  }

  // 2) Build-time env (VITE_API_URL preferred, VITE_API_BASE_URL kept for compatibility)
  return getApiBaseUrlFromEnvOrDefault();
}
