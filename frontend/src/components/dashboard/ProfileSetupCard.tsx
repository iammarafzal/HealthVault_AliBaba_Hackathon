"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Heart,
  Phone,
  Save,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { apiClient } from "@/services/apiClient";
import type { UserProfileUpdate } from "@/types/api";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfileSetupCard() {
  const { user, refreshUser } = useAuth();
  const [isOpen, setIsOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // Form state initialized from user profile
  const [bloodGroup, setBloodGroup] = useState(user?.profile?.blood_group || "");
  const [phone, setPhone] = useState(user?.profile?.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.profile?.date_of_birth ? String(user.profile.date_of_birth) : ""
  );
  const [gender, setGender] = useState(user?.profile?.gender || "");
  const [contactName, setContactName] = useState(
    user?.profile?.emergency_contacts?.[0]?.name || ""
  );
  const [contactRelation, setContactRelation] = useState(
    user?.profile?.emergency_contacts?.[0]?.relation || ""
  );
  const [contactPhone, setContactPhone] = useState(
    user?.profile?.emergency_contacts?.[0]?.phone || ""
  );

  // Check if previously dismissed in this session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("hv_profile_popup_dismissed");
      if (dismissed === "true") {
        setIsOpen(false);
      }
    }
  }, []);

  if (!user || !isOpen) return null;

  const completeness = user.profile_completeness ?? 0;
  if (completeness >= 100) return null;

  const handleDismiss = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("hv_profile_popup_dismissed", "true");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSaveSuccess(false);

    try {
      const payload: UserProfileUpdate = {};

      if (bloodGroup) payload.blood_group = bloodGroup;
      if (phone) payload.phone = phone;
      if (dateOfBirth) payload.date_of_birth = dateOfBirth as any;
      if (gender) payload.gender = gender;

      // Include emergency contact if filled
      if (contactName.trim() && contactPhone.trim()) {
        payload.emergency_contacts = [
          {
            name: contactName.trim(),
            relation: contactRelation.trim() || "Family Member",
            phone: contactPhone.trim(),
          },
        ];
      }

      await apiClient.patch("/user/profile", payload);
      await refreshUser();
      setSaveSuccess(true);

      // Auto-close modal after success
      setTimeout(() => {
        setIsOpen(false);
      }, 2000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosError?.response?.data?.detail || "Failed to save profile details. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* ── High-Contrast Backdrop Blur over the entire dashboard ── */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* ── Main Modal Card ── */}
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-[#DCE8E5] bg-white shadow-2xl shadow-teal-950/20 animate-in fade-in zoom-in-95 duration-200 dark:border-border dark:bg-card my-auto">
        {/* Top Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0D5C4A] via-[#094A3B] to-[#043329] p-6 text-white sm:p-7">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close dialog"
            title="Skip for now"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3.5 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 text-emerald-300 backdrop-blur-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                  Account Created Successfully!
                </h2>
              </div>
              <p className="text-xs leading-relaxed text-emerald-100/90 sm:text-sm">
                Welcome to HealthVault AI! Please fill in your basic health details below so your emergency QR card and 1-page doctor visit sheets are ready.
              </p>
            </div>
          </div>

          {/* Profile Completeness Bar */}
          <div className="mt-5 space-y-1.5 border-t border-white/15 pt-3">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-300">
                Profile Setup: {completeness}% Complete
              </span>
              <span className="text-emerald-100/70 text-[11px]">
                Takes ~30 seconds
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-500 ease-out"
                style={{ width: `${Math.max(completeness, 10)}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── Form Body ── */}
        <div className="p-6 sm:p-7 space-y-5 bg-[#F5F8F7]/60 dark:bg-card">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-vault-red dark:border-red-900/40 dark:bg-red-950/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="font-semibold">{error}</p>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>Great job! Your health profile and emergency card have been saved.</span>
            </div>
          )}

          {/* 4-Field Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Blood Group */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A2826] dark:text-foreground">
                <Heart className="h-3.5 w-3.5 text-vault-red" />
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-[#DCE8E5] bg-white px-3 text-xs font-medium text-foreground outline-none transition-all focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              >
                <option value="">Select Blood Group...</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A2826] dark:text-foreground">
                <Phone className="h-3.5 w-3.5 text-vault-teal" />
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 1234567"
                className="flex h-11 w-full rounded-xl border border-[#DCE8E5] bg-white px-3 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
            </div>

            {/* Date of Birth */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A2826] dark:text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-[#DCE8E5] bg-white px-3 text-xs font-medium text-foreground outline-none transition-all focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
            </div>

            {/* Gender */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-[#1A2826] dark:text-foreground">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-[#DCE8E5] bg-white px-3 text-xs font-medium text-foreground outline-none transition-all focus:border-vault-teal focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              >
                <option value="">Select Gender...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Emergency Contact Box */}
          <div className="rounded-2xl border border-[#DCE8E5] bg-white p-4 shadow-xs dark:border-border dark:bg-card">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-vault-teal" />
              <div>
                <span className="text-xs font-bold text-[#1A2826] dark:text-foreground">
                  Emergency Contact (In Case of Emergency - ICE)
                </span>
                <p className="text-[11px] text-muted-foreground">
                  First responders will see this direct phone number on your emergency QR card.
                </p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Name (e.g. Ali Khan)"
                className="flex h-10 w-full rounded-xl border border-[#DCE8E5] bg-[#F5F8F7] px-3 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:bg-white focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
              <input
                type="text"
                value={contactRelation}
                onChange={(e) => setContactRelation(e.target.value)}
                placeholder="Relation (e.g. Brother)"
                className="flex h-10 w-full rounded-xl border border-[#DCE8E5] bg-[#F5F8F7] px-3 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:bg-white focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
              <input
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="Phone (+92 300 9876543)"
                className="flex h-10 w-full rounded-xl border border-[#DCE8E5] bg-[#F5F8F7] px-3 text-xs font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-vault-teal focus:bg-white focus:ring-2 focus:ring-vault-teal/20 dark:border-border dark:bg-card"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              Skip for now / I&apos;ll do this later
            </button>

            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-11 w-full sm:w-auto px-7 rounded-xl bg-vault-teal text-xs font-bold text-white shadow-md shadow-teal-950/10 transition-all hover:bg-vault-active active:scale-[0.99] disabled:opacity-70"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving Details…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="h-3.5 w-3.5" />
                  Save &amp; Complete Profile
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
