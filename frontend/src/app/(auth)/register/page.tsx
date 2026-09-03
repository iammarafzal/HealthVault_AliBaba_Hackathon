"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthLayout from "@/components/auth/AuthLayout";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const { register, isLoading: authLoading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── Password Strength Calculation ───────────────────────── */
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "", color: "bg-muted" };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-red-500" };
    if (score === 2 || score === 3) return { score: 2, label: "Good", color: "bg-amber-500" };
    return { score: 3, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError("Please check the box to agree to the Terms of Service.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await register({
        full_name: fullName,
        email,
        password,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string | Array<{ msg?: string }> } } };
      const detail = axiosError?.response?.data?.detail;
      const message = typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0]?.msg
        ? detail[0].msg
        : "Registration could not be completed. An account with this email may already exist.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="register">
      <div className="w-full space-y-6">
        {/* Form Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-[#1A2826] sm:text-3xl dark:text-foreground">
            Create Account
          </h1>
          <p className="text-xs text-[#3D5450] sm:text-sm dark:text-muted-foreground">
            Takes only 15 seconds. You can add your blood type and emergency contacts later.
          </p>
        </div>

        {/* Inline Error Alert */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-vault-red dark:border-red-900/40 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="font-semibold leading-relaxed">{error}</p>
          </div>
        )}

        {/* Fast 3-Field Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#1A2826] dark:text-foreground">
              Your Full Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Abdullah Ahmed"
                className="flex h-12 w-full rounded-xl border border-[#DCE8E5] bg-white pl-10 pr-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
            </div>
          </div>

          {/* Email Address Field */}
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
            <label className="block text-xs font-bold text-[#1A2826] dark:text-foreground">
              Create Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
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

            {/* Dynamic Password Strength Indicator Bar */}
            {password.length > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="text-muted-foreground">Password strength:</span>
                  <span
                    className={
                      passwordStrength.score === 1
                        ? "text-red-500"
                        : passwordStrength.score === 2
                        ? "text-amber-500"
                        : "text-emerald-600 dark:text-emerald-400"
                    }
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 1 ? passwordStrength.color : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 2 ? passwordStrength.color : "bg-transparent"
                    }`}
                  />
                  <div
                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 3 ? passwordStrength.color : "bg-transparent"
                    }`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Terms Agreement Checkbox */}
          <div className="pt-1">
            <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#3D5450] dark:text-muted-foreground">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#DCE8E5] text-vault-teal accent-vault-teal focus:ring-vault-teal/30"
              />
              <span className="leading-snug">
                I agree to the Terms of Service and Privacy Policy.
              </span>
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
                Creating account…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Account
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        </form>

        {/* Bottom Switcher */}
        <div className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-vault-teal hover:underline dark:text-teal-400"
          >
            Sign in
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
