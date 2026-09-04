/**
 * HealthVault AI — Axios API Client
 * Centralized HTTP client with JWT interceptors.
 *
 * - Request interceptor: attaches Bearer token from localStorage.
 * - Response interceptor: unwraps `response.data` and handles 401 globally.
 */

import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach Bearer token when present in localStorage
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — unwrap data + handle 401 (clear session, redirect)
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      const path = window.location.pathname;
      if (
        !path.startsWith("/login") &&
        !path.startsWith("/register") &&
        !path.startsWith("/emergency")
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Error helper — normalize FastAPI error payloads into a readable message
// ---------------------------------------------------------------------------
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const axiosError = error as {
    response?: { data?: unknown; status?: number };
    message?: string;
  };

  const detail = axiosError.response?.data as
    | { detail?: unknown }
    | undefined;

  if (detail?.detail) {
    if (typeof detail.detail === "string") return detail.detail;
    // FastAPI 422 payloads: detail is an array of { loc, msg, type }
    if (Array.isArray(detail.detail) && detail.detail.length > 0) {
      return detail.detail
        .map((item: { msg?: string }) => item?.msg)
        .filter(Boolean)
        .join("; ");
    }
  }

  if (axiosError.message === "Network Error") {
    return "Cannot reach the HealthVault API — check that the backend is running.";
  }

  return axiosError.message || fallback;
}

export default apiClient;
