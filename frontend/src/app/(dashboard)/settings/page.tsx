"use client";

import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateProfile,
  updateEmail,
  changePassword,
  deleteAccount,
} from "@/services/userService";
import { getApiErrorMessage } from "@/services/apiClient";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "credentials" | "danger";

const BLOOD_GROUPS = [
  "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-",
];

const GENDERS = ["Male", "Female", "Other"] as const;

/* ── Toast notification (lightweight inline) ─────────────────── */
function InlineToast({
  message,
  variant = "success",
}: {
  message: string;
  variant?: "success" | "error";
}) {
  if (!message) return null;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold",
        variant === "success"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "bg-red-50 text-[#C0392B] dark:bg-red-950/30 dark:text-red-400"
      )}
    >
      {variant === "success" ? (
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { t, isUrdu } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const settingsTabs = useMemo(
    () => [
      { key: "profile" as const, label: t("settings.tabVitals", "Personal & Medical Vitals"), icon: UserCheck },
      { key: "credentials" as const, label: t("settings.tabCredentials", "Account Credentials"), icon: Lock },
      { key: "danger" as const, label: t("settings.tabDanger", "Danger Zone"), icon: ShieldAlert },
    ],
    [t]
  );

  /* ── Profile form state ──────────────────────────────────── */
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");

  /* ── Email form state ────────────────────────────────────── */
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPwd, setEmailCurrentPwd] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [emailError, setEmailError] = useState("");

  /* ── Password form state ─────────────────────────────────── */
  const [pwdCurrent, setPwdCurrent] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pwdConfirm, setPwdConfirm] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdNotice, setPwdNotice] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [showPwdCurrent, setShowPwdCurrent] = useState(false);
  const [showPwdNew, setShowPwdNew] = useState(false);

  /* ── Delete account state ────────────────────────────────── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  /* ── Hydrate profile fields from auth context ────────────── */
  useEffect(() => {
    if (user) {
      setFullName(user.profile?.full_name || user.full_name || "");
      setPhone(user.profile?.phone || user.phone || "");
      setBloodGroup(user.profile?.blood_group || user.blood_group || "");
      setDob(user.profile?.date_of_birth || user.date_of_birth || "");
      setGender(user.profile?.gender || user.gender || "");
    }
  }, [user]);

  /* ── Save Profile ────────────────────────────────────────── */
  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileNotice("");
    setProfileError("");
    try {
      await updateProfile({
        full_name: fullName || undefined,
        phone: phone || undefined,
        blood_group: bloodGroup || undefined,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
      });
      await refreshUser();
      setProfileNotice(t("settings.profileUpdated", "Profile updated successfully."));
    } catch (err: unknown) {
      setProfileError(getApiErrorMessage(err, t("settings.profileUpdateFailed", "Failed to update profile.")));
    } finally {
      setProfileSaving(false);
    }
  };

  /* ── Change Email ────────────────────────────────────────── */
  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return;
    setEmailSaving(true);
    setEmailNotice("");
    setEmailError("");
    try {
      await updateEmail(newEmail, emailCurrentPwd);
      await refreshUser();
      setEmailNotice(t("settings.emailUpdated", "Email address updated successfully."));
      setNewEmail("");
      setEmailCurrentPwd("");
    } catch (err: unknown) {
      setEmailError(getApiErrorMessage(err, t("settings.emailUpdateFailed", "Failed to update email.")));
    } finally {
      setEmailSaving(false);
    }
  };

  /* ── Change Password ─────────────────────────────────────── */
  const handleChangePassword = async () => {
    if (pwdNew !== pwdConfirm) {
      setPwdError(t("settings.pwdMismatch", "New passwords do not match."));
      return;
    }
    if (pwdNew.length < 6) {
      setPwdError(t("settings.pwdMinLength", "New password must be at least 6 characters."));
      return;
    }
    setPwdSaving(true);
    setPwdNotice("");
    setPwdError("");
    try {
      await changePassword(pwdCurrent, pwdNew);
      setPwdNotice(t("settings.passwordChanged", "Password changed successfully."));
      setPwdCurrent("");
      setPwdNew("");
      setPwdConfirm("");
    } catch (err: unknown) {
      setPwdError(getApiErrorMessage(err, t("settings.pwdChangeFailed", "Failed to change password.")));
    } finally {
      setPwdSaving(false);
    }
  };

  /* ── Delete Account ──────────────────────────────────────── */
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setDeleteError(t("settings.typeDeleteErr", "Please type DELETE to confirm."));
      return;
    }
    setDeleteSaving(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword, "DELETE");
      logout();
      router.push("/login");
    } catch (err: unknown) {
      setDeleteError(getApiErrorMessage(err, t("settings.deleteFailed", "Account deletion failed.")));
      setDeleteSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6" dir={isUrdu ? "rtl" : "ltr"}>
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-[#1A2826] dark:text-foreground">
          {t("settings.title", "Account & Profile Settings")}
        </h1>
        <p className="mt-1 text-xs text-[#3D5450] dark:text-muted-foreground sm:text-sm">
          {t("settings.subtitle", "Manage your personal information, credentials, and account security.")}
        </p>
      </div>

      {/* ── Responsive Layout: Desktop side-nav + Content ── */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Desktop Side Navigation ── */}
        <nav className="hidden w-56 shrink-0 space-y-1 lg:block">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-start text-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#E8F7F4] text-[#0D5C4A] shadow-xs dark:bg-teal-950 dark:text-teal-300"
                    : "text-[#3D5450] hover:bg-muted hover:text-foreground dark:text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive
                      ? "text-[#0D5C4A] dark:text-teal-300"
                      : tab.key === "danger"
                        ? "text-[#C0392B]"
                        : "text-muted-foreground"
                  )}
                />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Mobile Tab Pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {settingsTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-[#0D5C4A] text-white shadow-xs"
                    : "border border-[#DCE8E5] bg-white text-[#3D5450] dark:border-border dark:bg-card dark:text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 space-y-6">
          {/* ═══════════════════════════════════════════════════
              CARD 1: Personal & Medical Vitals
              ═══════════════════════════════════════════════════ */}
          {activeTab === "profile" && (
            <Card className="border border-[#DCE8E5] bg-white shadow-xs dark:border-border dark:bg-card">
              <CardHeader className="border-b border-[#DCE8E5] bg-[#F5F8F7] pb-4 dark:border-border dark:bg-card">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1A2826] dark:text-foreground">
                  <UserCheck className="h-4 w-4 text-[#0D5C4A] dark:text-teal-400 shrink-0" />
                  {t("settings.vitalsTitle", "Personal & Medical Vitals")}
                </CardTitle>
                <CardDescription className="text-xs text-[#3D5450] dark:text-muted-foreground">
                  {t(
                    "settings.vitalsSub",
                    "Update your demographics and medical information for accurate health records."
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-5">
                {profileNotice && <InlineToast message={profileNotice} variant="success" />}
                {profileError && <InlineToast message={profileError} variant="error" />}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.fullName", "Full Name")}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("settings.fullNamePlaceholder", "e.g. Ammar Afzal")}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.phone", "Phone Number")}
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("settings.phonePlaceholder", "+92-300-1234567")}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card font-mono"
                      dir="ltr"
                    />
                  </div>

                  {/* Blood Group */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.bloodGroup", "Blood Group")}
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                    >
                      <option value="">{t("settings.notSpecified", "Not specified")}</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date of Birth */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.dob", "Date of Birth")}
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.gender", "Gender")}
                    </label>
                    <div className="flex gap-2">
                      {GENDERS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={cn(
                            "rounded-lg border px-4 py-2 text-xs font-semibold transition-all",
                            gender === g
                              ? "border-[#0D5C4A] bg-[#E8F7F4] text-[#0D5C4A] dark:border-teal-500 dark:bg-teal-950 dark:text-teal-300"
                              : "border-[#DCE8E5] bg-white text-[#3D5450] hover:border-[#0D5C4A]/40 dark:border-border dark:bg-card dark:text-muted-foreground"
                          )}
                        >
                          {t(`settings.genders.${g}`, g)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="bg-[#0D5C4A] text-xs font-bold text-white shadow-xs hover:bg-[#0A8C6A] gap-1.5"
                >
                  {profileSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {profileSaving
                      ? t("settings.saving", "Saving…")
                      : t("settings.saveProfile", "Save Profile")}
                  </span>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ═══════════════════════════════════════════════════
              CARD 2: Account Credentials
              ═══════════════════════════════════════════════════ */}
          {activeTab === "credentials" && (
            <div className="space-y-6">
              {/* Section A: Change Email */}
              <Card className="border border-[#DCE8E5] bg-white shadow-xs dark:border-border dark:bg-card">
                <CardHeader className="border-b border-[#DCE8E5] bg-[#F5F8F7] pb-4 dark:border-border dark:bg-card">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1A2826] dark:text-foreground">
                    <Mail className="h-4 w-4 text-[#0D5C4A] dark:text-teal-400 shrink-0" />
                    {t("settings.changeEmailTitle", "Change Email Address")}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#3D5450] dark:text-muted-foreground">
                    {t(
                      "settings.changeEmailSub",
                      "Update your sign-in email. Requires your current password for security."
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {emailNotice && <InlineToast message={emailNotice} variant="success" />}
                  {emailError && <InlineToast message={emailError} variant="error" />}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.newEmail", "New Email Address")}
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="newemail@example.com"
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.currentPassword", "Current Password")}
                    </label>
                    <input
                      type="password"
                      value={emailCurrentPwd}
                      onChange={(e) => setEmailCurrentPwd(e.target.value)}
                      placeholder={t("settings.enterCurrentPassword", "Enter your current password")}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                    />
                  </div>
                  <Button
                    onClick={handleChangeEmail}
                    disabled={emailSaving || !newEmail.trim() || !emailCurrentPwd}
                    className="bg-[#0D5C4A] text-xs font-bold text-white shadow-xs hover:bg-[#0A8C6A] gap-1.5"
                  >
                    {emailSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {emailSaving
                        ? t("settings.updating", "Updating…")
                        : t("settings.updateEmail", "Update Email")}
                    </span>
                  </Button>
                </CardContent>
              </Card>

              {/* Section B: Change Password */}
              <Card className="border border-[#DCE8E5] bg-white shadow-xs dark:border-border dark:bg-card">
                <CardHeader className="border-b border-[#DCE8E5] bg-[#F5F8F7] pb-4 dark:border-border dark:bg-card">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#1A2826] dark:text-foreground">
                    <Lock className="h-4 w-4 text-[#0D5C4A] dark:text-teal-400 shrink-0" />
                    {t("settings.changePasswordTitle", "Change Password")}
                  </CardTitle>
                  <CardDescription className="text-xs text-[#3D5450] dark:text-muted-foreground">
                    {t(
                      "settings.changePasswordSub",
                      "Choose a strong password with at least 6 characters."
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  {pwdNotice && <InlineToast message={pwdNotice} variant="success" />}
                  {pwdError && <InlineToast message={pwdError} variant="error" />}

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.currentPassword", "Current Password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwdCurrent ? "text" : "password"}
                        value={pwdCurrent}
                        onChange={(e) => setPwdCurrent(e.target.value)}
                        placeholder={t("settings.enterCurrentPassword", "Enter current password")}
                        className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 pe-10 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdCurrent(!showPwdCurrent)}
                        className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPwdCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.newPassword", "New Password")}
                    </label>
                    <div className="relative">
                      <input
                        type={showPwdNew ? "text" : "password"}
                        value={pwdNew}
                        onChange={(e) => setPwdNew(e.target.value)}
                        placeholder={t("settings.min6Chars", "Minimum 6 characters")}
                        className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 pe-10 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdNew(!showPwdNew)}
                        className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPwdNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-[#3D5450] dark:text-muted-foreground">
                      {t("settings.confirmNewPassword", "Confirm New Password")}
                    </label>
                    <input
                      type="password"
                      value={pwdConfirm}
                      onChange={(e) => setPwdConfirm(e.target.value)}
                      placeholder={t("settings.reenterPassword", "Re-enter new password")}
                      className="w-full rounded-lg border border-[#DCE8E5] bg-white px-3 py-2.5 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] dark:border-border dark:bg-card"
                    />
                  </div>
                  <Button
                    onClick={handleChangePassword}
                    disabled={pwdSaving || !pwdCurrent || !pwdNew || !pwdConfirm}
                    className="bg-[#0D5C4A] text-xs font-bold text-white shadow-xs hover:bg-[#0A8C6A] gap-1.5"
                  >
                    {pwdSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>
                      {pwdSaving
                        ? t("settings.changing", "Changing…")
                        : t("settings.changePassword", "Change Password")}
                    </span>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
              CARD 3: Danger Zone — Delete Account
              ═══════════════════════════════════════════════════ */}
          {activeTab === "danger" && (
            <Card className="border-2 border-red-200 bg-[#FDF2F2]/40 shadow-xs dark:border-red-900/40 dark:bg-red-950/10">
              <CardHeader className="border-b border-red-200 bg-red-50/60 pb-4 dark:border-red-900/30 dark:bg-red-950/20">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-[#C0392B]">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  {t("settings.dangerTitle", "Danger Zone — Delete Account")}
                </CardTitle>
                <CardDescription className="text-xs text-red-800/80 dark:text-red-300/80">
                  {t(
                    "settings.dangerSub",
                    "Permanently delete your account, medical memory, prescriptions, and emergency QR tokens."
                  )}{" "}
                  <strong>{t("settings.cannotBeUndone", "This action cannot be undone.")}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                <div className="rounded-lg border border-red-200 bg-white p-4 dark:border-red-900/30 dark:bg-card">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[#C0392B] dark:bg-red-950/40">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-foreground">
                        {t("settings.removalNotice", "What will be permanently removed:")}
                      </p>
                      <ul className="space-y-1 text-[11px] text-muted-foreground">
                        <li className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                          <span>{t("settings.removeItem1", "All uploaded prescriptions, lab reports, and medical records")}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                          <span>{t("settings.removeItem2", "Extracted medications, allergies, and biomarker data")}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                          <span>{t("settings.removeItem3", "Emergency QR codes, privacy settings, and contacts")}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-red-400 shrink-0" />
                          <span>{t("settings.removeItem4", "Your profile, login credentials, and Health ID")}</span>
                        </li>
                      </ul>
                      <Button
                        variant="outline"
                        className="mt-2 border-[#C0392B] text-xs font-bold text-[#C0392B] hover:bg-[#FDF2F2] hover:text-[#C0392B] dark:border-red-800 dark:hover:bg-red-950/30 gap-1.5"
                        onClick={() => setShowDeleteModal(true)}
                      >
                        <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("settings.deleteBtn", "Delete My Account Permanently")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DELETE ACCOUNT CONFIRMATION MODAL
          ═══════════════════════════════════════════════════ */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteModal(false);
              setDeleteError("");
              setDeletePassword("");
              setDeleteConfirm("");
            }}
          />
          <div
            className="relative z-10 mx-auto w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-2xl dark:border-red-900/40 dark:bg-card"
            dir={isUrdu ? "rtl" : "ltr"}
          >
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                <AlertTriangle className="h-5 w-5 text-[#C0392B]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("settings.modalTitle", "Permanently Delete Account?")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "settings.modalSub",
                    "This will erase all your medical data forever. Enter your password and type DELETE to confirm."
                  )}
                </p>
              </div>
            </div>

            {deleteError && (
              <InlineToast message={deleteError} variant="error" />
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("settings.currentPassword", "Your Password")}
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t("settings.enterCurrentPassword", "Enter password to confirm")}
                    className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 pe-10 text-xs text-foreground outline-none placeholder:text-slate-400 focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B] dark:border-red-900/40 dark:bg-card"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showDeletePassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("settings.typeDeleteToConfirm", 'Type "DELETE" to Confirm')}
                </label>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2.5 text-xs font-bold text-[#C0392B] outline-none placeholder:text-red-300 focus:border-[#C0392B] focus:ring-1 focus:ring-[#C0392B] dark:border-red-900/40 dark:bg-card"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <Button
                className="flex-1 bg-[#C0392B] text-xs font-bold text-white hover:bg-[#C0392B]/90 gap-1.5"
                onClick={handleDeleteAccount}
                disabled={deleteSaving || !deletePassword || deleteConfirm !== "DELETE"}
              >
                {deleteSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span>
                  {deleteSaving
                    ? t("settings.deleting", "Deleting…")
                    : t("settings.confirmDeleteBtn", "Yes, Delete My Account")}
                </span>
              </Button>
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError("");
                  setDeletePassword("");
                  setDeleteConfirm("");
                }}
              >
                {t("settings.cancel", "Cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
