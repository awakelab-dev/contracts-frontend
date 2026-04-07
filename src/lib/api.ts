import axios from "axios";
import { resolveApiBaseUrl } from "./apiBaseUrl";

// Axios instance configured for the backend
// Uses cookie-based session (httpOnly cookie)
const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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
