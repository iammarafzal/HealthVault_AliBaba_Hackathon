"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Quick-fill demo account credentials ── */
  const handleFillDemo = () => {
    setEmail("ahmad.raza@example.com");
    setPassword("Patient123!");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } };
      const detail = axiosError?.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0]?.msg
        ? detail[0].msg
        : "Incorrect email or password. Please check your details and try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="login">
      <div className="w-full space-y-6">
        {/* Form Title & Subtitle */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-black tracking-tight text-[#1A2826] sm:text-3xl dark:text-foreground">
              Sign In
            </h1>
            {/* Quick Demo Pill Button */}
            <button
              type="button"
              onClick={handleFillDemo}
              className="inline-flex items-center gap-1.5 rounded-full border border-vault-border bg-vault-light/80 px-3 py-1.5 text-xs font-bold text-vault-teal transition-all hover:bg-vault-teal hover:text-white dark:border-border dark:bg-card"
              title="Click to fill sample login details"
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span>Fill Demo Account</span>
            </button>
          </div>
          <p className="text-xs text-[#3D5450] sm:text-sm dark:text-muted-foreground">
            Enter your email and password to open your medical records.
          </p>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-vault-red dark:border-red-900/40 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1A2826] dark:text-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="flex h-12 w-full rounded-xl border border-[#DCE8E5] bg-white pl-10 pr-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#1A2826] dark:text-foreground">
                Password
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-vault-teal hover:underline dark:text-teal-400"
                onClick={() => alert("A password reset link will be sent to your email.")}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="flex h-12 w-full rounded-xl border border-[#DCE8E5] bg-white pl-10 pr-11 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-[#3D5450] dark:text-muted-foreground">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-[#DCE8E5] text-vault-teal accent-vault-teal focus:ring-vault-teal/30"
              />
              <span>Remember me on this device</span>
            </label>
          </div>

          {/* Submit CTA Button */}
          <Button
            type="submit"
            disabled={loading || authLoading}
            className="h-12 w-full rounded-xl bg-vault-teal text-sm font-bold text-white shadow-md shadow-teal-950/10 transition-all hover:bg-vault-active active:scale-[0.99] disabled:opacity-70"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Bottom Switcher */}
        <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Don&apos;t have an account yet?{" "}
          <Link
            href="/register"
            className="font-bold text-vault-teal hover:underline dark:text-teal-400"
          >
            Create one in 15 seconds
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
