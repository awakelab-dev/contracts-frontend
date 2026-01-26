import axios from "axios";

// Axios instance configured for the backend
// Base URL per user request
const api = axios.create({
  baseURL: "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: attach JWT from localStorage under key 'token'
api.interceptors.request.use((config) => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      // Ensure headers exists and set Authorization
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore storage access errors
  }
  return config;
});

// Optional: Response interceptor to surface backend error messages consistently
api.interceptors.response.use(
  (res) => res,
  (error) => {
    // You can centralize 401 handling here if needed (e.g., redirect to login)
    // const status = error?.response?.status;
    // if (status === 401) { /* handle unauthorized */ }
    return Promise.reject(error);
  }
);

export default api;
