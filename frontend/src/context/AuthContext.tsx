"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { UserResponse } from "@/types/api";
import * as authService from "@/services/authService";
import type { LoginPayload, RegisterPayload } from "@/services/authService";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------
interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: hydrate session from stored token
  useEffect(() => {
    const hydrate = async () => {
      const stored = localStorage.getItem("token");
      if (!stored) {
        setIsLoading(false);
        return;
      }
      try {
        // Verify token is still valid by calling /auth/me
        const profile = await authService.getCurrentUser();
        setToken(stored);
        setUser(profile);
      } catch {
        // Token invalid / expired — clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } finally {
        setIsLoading(false);
      }
    };
    hydrate();
  }, []);

  const login = useCallback(
    async (credentials: LoginPayload) => {
      const res = await authService.login(credentials);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
      router.push("/vault");
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const res = await authService.register(data);
      localStorage.setItem("token", res.access_token);
      localStorage.setItem("user", JSON.stringify(res.user));
      setToken(res.access_token);
      setUser(res.user);
      router.push("/vault");
    },
    [router]
  );

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  /** Re-fetch the current user from the API and sync local + storage state. */
  const refreshUser = useCallback(async () => {
    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      localStorage.setItem("user", JSON.stringify(profile));
    } catch {
      // Silently ignore — the user will see stale data until next refresh
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
