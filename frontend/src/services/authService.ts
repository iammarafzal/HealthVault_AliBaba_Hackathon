/**
 * HealthVault AI — Auth Service
 * Thin API layer for authentication endpoints.
 */

import apiClient from "@/services/apiClient";
import type {
  UserRegisterPayload,
  UserLoginPayload,
  TokenResponse,
  UserResponse,
} from "@/types/api";

export type RegisterPayload = UserRegisterPayload;
export type LoginPayload = UserLoginPayload;
export type { TokenResponse };

/** Register a new patient account. */
export async function register(data: RegisterPayload): Promise<TokenResponse> {
  return apiClient.post("/auth/register", data) as unknown as TokenResponse;
}

/** Authenticate with email + password. */
export async function login(credentials: LoginPayload): Promise<TokenResponse> {
  return apiClient.post("/auth/login", credentials) as unknown as TokenResponse;
}

/** Fetch the currently authenticated user's profile (requires Bearer token). */
export async function getCurrentUser(): Promise<UserResponse> {
  return apiClient.get("/auth/me") as unknown as UserResponse;
}

/** Clear local session data. The backend is stateless (JWT), so no server call needed. */
export function logout(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}
