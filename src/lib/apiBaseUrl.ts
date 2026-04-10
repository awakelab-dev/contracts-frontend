export const API_BASE_URL_STORAGE_KEY = "app.apiBaseUrl";
const LOCAL_DEV_DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const DEPLOYED_DEFAULT_API_BASE_URL = "/api";

function isLocalHostname(hostname: string): boolean {
  const h = (hostname || "").toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

function getDefaultApiBaseUrl(): string {
  if (typeof window === "undefined") return LOCAL_DEV_DEFAULT_API_BASE_URL;
  return isLocalHostname(window.location.hostname)
    ? LOCAL_DEV_DEFAULT_API_BASE_URL
    : DEPLOYED_DEFAULT_API_BASE_URL;
}

function pointsToLocalhost(baseUrl: string): boolean {
  if (!baseUrl || typeof window === "undefined") return false;
  try {
    const parsed = new URL(baseUrl, window.location.origin);
    return isLocalHostname(parsed.hostname);
  } catch {
    return false;
  }
}

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
  const normalized = normalizeBaseUrl(raw);
  if (normalized) {
    const browserIsLocal =
      typeof window !== "undefined" && isLocalHostname(window.location.hostname);
    if (!browserIsLocal && pointsToLocalhost(normalized)) {
      return getDefaultApiBaseUrl();
    }
    return normalized;
  }
  return getDefaultApiBaseUrl();
}

export function resolveApiBaseUrl(): string {
  // 1) UI override from Settings page
  try {
    const v = typeof window !== "undefined" ? localStorage.getItem(API_BASE_URL_STORAGE_KEY) : null;
    const normalized = normalizeBaseUrl(v || "");
    if (normalized) {
      const browserIsLocal =
        typeof window !== "undefined" && isLocalHostname(window.location.hostname);
      if (!browserIsLocal && pointsToLocalhost(normalized)) {
        localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
      } else {
        return normalized;
      }
    }
  } catch {
    // ignore
  }

  // 2) Build-time env (VITE_API_URL preferred, VITE_API_BASE_URL kept for compatibility)
  return getApiBaseUrlFromEnvOrDefault();
}
