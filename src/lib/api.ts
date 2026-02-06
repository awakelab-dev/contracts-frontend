import axios from "axios";

function normalizeBaseUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return v;

  // If someone pasted a full endpoint (e.g. http://localhost:4000/auth), keep only the origin.
  // Also strip any trailing slashes.
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    return v.replace(/\/+$/, "");
  }
}

function resolveBaseUrl(): string {
  // 1) UI override from Settings page
  try {
    const v = typeof window !== "undefined" ? localStorage.getItem("app.apiBaseUrl") : null;
    if (v && v.trim()) return normalizeBaseUrl(v);
  } catch {
    // ignore
  }

  // 2) Build-time env
  const envUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (envUrl && envUrl.trim()) return normalizeBaseUrl(envUrl);

  // 3) Default
  return "http://localhost:4000";
}

// Axios instance configured for the backend
// Uses cookie-based session (httpOnly cookie)
const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const url = (error?.config?.url || "").toString();

    // Keep redirect logic simple, but avoid blowing away LoginPage on bad credentials.
    if (status === 401 && typeof window !== "undefined") {
      const onLogin = window.location.pathname === "/login";
      const isAuthCall = url.startsWith("/auth/") || url.includes("/auth/");
      const isLoginAttempt = url.endsWith("/auth/login") || url.includes("/auth/login");

      if (!onLogin && !(isAuthCall && isLoginAttempt)) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
