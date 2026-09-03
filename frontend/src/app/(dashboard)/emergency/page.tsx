"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Laptop,
  Loader2,
  Lock,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import WalletCardFront from "@/components/emergency/WalletCardFront";
import EmergencyContactsCard from "@/components/emergency/EmergencyContactsCard";
import EmergencyDataConfigCard from "@/components/emergency/EmergencyDataConfigCard";
import {
  createEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
  getEmergencyScans,
  getQRCodeData,
  regenerateQRCode,
  toggleEmergencyStatus,
  updateEmergencyContact,
  updatePrivacySettings,
} from "@/services/emergencyService";
import { getDoctorSummary } from "@/services/summaryService";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import type {
  EmergencyContactCreate,
  EmergencyContactResponse,
  EmergencyContactUpdate,
  EmergencyScanLog,
  PrivacySettingsResponse,
  PrivacySettingsUpdate,
  QRDetailsResponse,
} from "@/types/api";

export default function EmergencyDashboardPage() {
  const { user } = useAuth();
  const { locale, t } = useLanguage();
  const isUrdu = locale === "ur";

  const [qrData, setQrData] = useState<QRDetailsResponse | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsResponse | null>(null);
  const [draftPrivacy, setDraftPrivacy] = useState<PrivacySettingsResponse | null>(null);
  const [contacts, setContacts] = useState<EmergencyContactResponse[]>([]);
  const [scanLogs, setScanLogs] = useState<EmergencyScanLog[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingScans, setIsLoadingScans] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTogglingKillSwitch, setIsTogglingKillSwitch] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Load initial QR, Contacts, Scan history, and Clinical Summary ── */
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [qr, scans, iceContacts] = await Promise.all([
        getQRCodeData(),
        getEmergencyScans(10).catch(() => []),
        getEmergencyContacts().catch(() => []),
      ]);
      setQrData(qr);
      setScanLogs(scans || []);
      setContacts(iceContacts || []);

      if (user?.privacy) {
        setPrivacySettings(user.privacy);
        setDraftPrivacy(user.privacy);
      }

      if (user?.id) {
        try {
          const summary = await getDoctorSummary(user.id);
          setAllergies(summary.known_allergies ?? []);
        } catch {
          // Summary fallback handled gracefully
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isUrdu ? "ایمرجنسی ترجیحات لوڈ کرنے میں خرابی ہوئی۔" : "Failed to load emergency settings");
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, isUrdu]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Contact CRUD Handlers ── */
  const handleAddContact = async (payload: EmergencyContactCreate) => {
    setIsLoadingContacts(true);
    try {
      const created = await createEmergencyContact(payload);
      if (created.is_primary) {
        setContacts((prev) => [created, ...prev.map((c) => ({ ...c, is_primary: false }))]);
      } else {
        setContacts((prev) => [...prev, created]);
      }
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleUpdateContact = async (id: string, payload: EmergencyContactUpdate) => {
    setIsLoadingContacts(true);
    try {
      const updated = await updateEmergencyContact(id, payload);
      setContacts((prev) => {
        if (updated.is_primary) {
          return prev.map((c) => (c.id === id ? updated : { ...c, is_primary: false }));
        }
        return prev.map((c) => (c.id === id ? updated : c));
      });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    setIsLoadingContacts(true);
    try {
      await deleteEmergencyContact(id);
      setContacts((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (remaining.length > 0 && !remaining.some((c) => c.is_primary)) {
          remaining[0].is_primary = true;
        }
        return [...remaining];
      });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const refreshScans = async () => {
    setIsLoadingScans(true);
    try {
      const scans = await getEmergencyScans(10);
      setScanLogs(scans || []);
    } catch {
      // Ignore scan refresh error
    } finally {
      setIsLoadingScans(false);
    }
  };

  /* ── Effective local settings ── */
  const currentPrivacy: PrivacySettingsResponse = privacySettings || {
    user_id: user?.id || "",
    show_blood_group: true,
    show_allergies: true,
    show_active_meds: true,
    show_chronic_conditions: true,
    show_emergency_contacts: true,
    show_emergency_notes: true,
    emergency_notes: null,
    enable_scan_alerts: true,
    qr_revoked: qrData ? !qrData.emergency_enabled : false,
  };

  const effectivePreviewPrivacy = draftPrivacy || currentPrivacy;

  /* ── Save full config from EmergencyDataConfigCard ── */
  const handleSaveConfig = async (updated: PrivacySettingsUpdate) => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const res = await updatePrivacySettings(user.id, updated);
      setPrivacySettings(res);
      setDraftPrivacy(res);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isUrdu ? "ترجیحات محفوظ نہیں ہو سکیں۔" : "Failed to update emergency preferences");
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Toggle individual field visibility ── */
  const handleTogglePrivacy = async (key: keyof PrivacySettingsUpdate) => {
    if (!user?.id) return;
    const currentVal = Boolean(currentPrivacy[key as keyof PrivacySettingsResponse]);
    const updatedVal = !currentVal;
    const updatedSettings = {
      ...currentPrivacy,
      [key]: updatedVal,
    };
    setPrivacySettings(updatedSettings);
    setIsSaving(true);
    try {
      const res = await updatePrivacySettings(user.id, { [key]: updatedVal });
      setPrivacySettings(res);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } catch (err: unknown) {
      setPrivacySettings(currentPrivacy);
      setError(err instanceof Error ? err.message : isUrdu ? "ترتیب تبدیل نہیں ہو سکی۔" : "Failed to update setting");
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Master Kill Switch Toggle ── */
  const handleToggleKillSwitch = async () => {
    if (!qrData) return;
    const nextState = !qrData.emergency_enabled;
    setIsTogglingKillSwitch(true);
    try {
      const res = await toggleEmergencyStatus(nextState);
      setQrData((prev) => (prev ? { ...prev, emergency_enabled: res.emergency_enabled } : null));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isUrdu ? "ایمرجنسی رسائی تبدیل نہیں ہو سکی۔" : "Failed to toggle emergency access");
    } finally {
      setIsTogglingKillSwitch(false);
    }
  };

  /* ── Regenerate QR Token ── */
  const handleRegenerateQR = async () => {
    setIsRegenerating(true);
    setError(null);
    try {
      const newQR = await regenerateQRCode();
      setQrData(newQR);
      setShowConfirmReset(false);
      refreshScans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isUrdu ? "نیا QR کوڈ نہیں بنایا جا سکا۔" : "Failed to regenerate QR code");
    } finally {
      setIsRegenerating(false);
    }
  };

  /* ── Dynamic Public URL ── */
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const publicEmergencyUrl = qrData?.emergency_token
    ? `${origin}/emergency/${qrData.health_id}?token=${qrData.emergency_token}`
    : `${origin}/emergency/${qrData?.health_id || user?.health_id || ""}`;

  const copyEmergencyLink = () => {
    navigator.clipboard.writeText(publicEmergencyUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const primaryContact =
    contacts.find((c) => c.is_primary) ||
    contacts[0] ||
    user?.profile?.emergency_contacts?.[0] ||
    null;

  const isQRLive = qrData ? qrData.emergency_enabled : true;

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return t("emergency.justNow", "Just now");
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return t("emergency.minutesAgo", "{{count}}m ago").replace("{{count}}", String(diffMin));
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return t("emergency.hoursAgo", "{{count}}h ago").replace("{{count}}", String(diffHours));
      const diffDays = Math.floor(diffHours / 24);
      return t("emergency.daysAgo", "{{count}}d ago").replace("{{count}}", String(diffDays));
    } catch {
      return isoString;
    }
  };

  const getDeviceBadge = (userAgent: string) => {
    const ua = (userAgent || "").toLowerCase();
    if (ua.includes("mobi") || ua.includes("iphone") || ua.includes("android")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
          <Smartphone className="h-3 w-3" /> {t("emergency.mobileScanner", "Mobile Scanner")}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
        <Laptop className="h-3 w-3" /> {t("emergency.desktopTablet", "Desktop / Tablet")}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12" dir={isUrdu ? "rtl" : "ltr"}>
      {/* ── 1. Page Header & Clean Status Indicator Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-vault-teal dark:text-teal-400" />
            {t("emergency.title", "Emergency Profile & QR")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {t("emergency.subtitle", "Choose what info appears when your emergency card is scanned.")}
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center shrink-0">
          {isQRLive ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t("emergency.liveBadge", "LIVE & ACTIVE")}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 shadow-xs">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              {t("emergency.disabledBadge", "SHARING DISABLED")}
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="flex-1 text-xs sm:text-sm">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-7 px-2 text-xs">
            {t("common.dismiss", "Dismiss")}
          </Button>
        </div>
      )}

      {/* Saved Toast Banner */}
      {savedNotice && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <Check className="h-3.5 w-3.5" />
          {t("emergency.saveSuccess", "Emergency preferences updated successfully.")}
        </div>
      )}

      {/* ── 2. Main 2-Column Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ══════════════════════════════════════════════════════════════
            LEFT COLUMN (7 cols): Privacy Toggles, Alerts, Audits, Safety
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-7 space-y-6">
          {/* ── Card 1: Dedicated Emergency Data Config & Triage Directives Card ── */}
          <EmergencyDataConfigCard
            privacySettings={currentPrivacy}
            onSave={handleSaveConfig}
            onDraftChange={setDraftPrivacy}
            isLoading={isLoading || isSaving}
          />

          {/* ── Card 1.5: Emergency Contacts (ICE) Management Card ── */}
          <EmergencyContactsCard
            contacts={contacts}
            onAddContact={handleAddContact}
            onUpdateContact={handleUpdateContact}
            onDeleteContact={handleDeleteContact}
            isLoading={isLoading || isLoadingContacts}
          />

          {/* ── Card 2: Emergency Scan Alerts ── */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                  {t("emergency.scanAlertsTitle", "Emergency Scan Alerts")}
                </CardTitle>
                <Badge
                  variant={currentPrivacy.enable_scan_alerts ? "default" : "secondary"}
                  className={`text-[10px] ${currentPrivacy.enable_scan_alerts
                    ? "bg-vault-teal text-white dark:bg-teal-600"
                    : "text-muted-foreground"
                    }`}
                >
                  {currentPrivacy.enable_scan_alerts
                    ? t("emergency.scanAlertsActive", "Alerts Active")
                    : t("emergency.scanAlertsMuted", "Alerts Muted")}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                {t("emergency.scanAlertsSub", "Notify emergency contacts when your QR code is scanned.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div
                onClick={() => handleTogglePrivacy("enable_scan_alerts")}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${currentPrivacy.enable_scan_alerts
                    ? "border-vault-teal/40 bg-vault-light/30 hover:bg-vault-light/50 dark:border-teal-500/30 dark:bg-vault-dark/40 dark:hover:bg-vault-dark/60 shadow-2xs"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40 opacity-80 hover:opacity-100"
                  }`}
              >
                <span className="font-semibold text-xs sm:text-sm text-foreground block max-w-[80%]">
                  {t("emergency.scanAlertsToggle", "Notify ICE contacts on physical scan")}
                </span>
                <div onClick={(e) => e.stopPropagation()}>
                  <Switch
                    checked={currentPrivacy.enable_scan_alerts}
                    onCheckedChange={() => handleTogglePrivacy("enable_scan_alerts")}
                    disabled={isLoading || isSaving}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Card 3: Recent Scan History ── */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                    {t("emergency.auditTitle", "Recent Scan History")}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("emergency.auditSub", "Log of every time your emergency card was scanned.")}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshScans}
                  disabled={isLoadingScans}
                  className="h-8 text-xs font-semibold gap-1.5 rounded-lg"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingScans ? "animate-spin" : ""}`} />
                  {t("emergency.refreshScans", "Refresh")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : scanLogs.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-border bg-muted/20">
                  <ShieldCheck className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
                  <p className="text-xs font-bold text-foreground">
                    {t("emergency.noScans", "No scans recorded yet")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("emergency.noScansSub", "When paramedics scan your card, the event will appear here.")}
                  </p>
                </div>
              ) : (
                <div className="max-h-[240px] overflow-y-auto overflow-x-auto rounded-xl border border-border/70 scrollbar-thin">
                  <table className="w-full text-start text-xs relative" dir={isUrdu ? "rtl" : "ltr"}>
                    <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-xs border-b border-border/70 text-muted-foreground font-semibold">
                      <tr>
                        <th className="p-2.5 px-3">{t("emergency.timestamp", "Timestamp")}</th>
                        <th className="p-2.5">{t("emergency.deviceType", "Device Type")}</th>
                        <th className="p-2.5">{t("emergency.ipAddress", "IP Address")}</th>
                        <th className="p-2.5 px-3">{t("emergency.location", "Location")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {scanLogs.map((scan) => (
                        <tr key={scan.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-2.5 px-3 font-medium whitespace-nowrap">
                            <span className="text-foreground block">{formatRelativeTime(scan.scanned_at)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                              {new Date(scan.scanned_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </td>
                          <td className="p-2.5">{getDeviceBadge(scan.user_agent)}</td>
                          <td className="p-2.5 font-mono text-[11px] text-muted-foreground" dir="ltr">
                            {scan.ip_address}
                          </td>
                          <td className="p-2.5 px-3 text-muted-foreground">
                            {scan.city || "Network / Cellular"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Card 4: Security & Kill Switches ── */}
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                {t("emergency.securityTitle", "Security & Kill Switches")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("emergency.securitySub", "Instantly revoke access or generate a new secure QR token.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {/* Master Switch */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="space-y-0.5 max-w-[75%]">
                  <span className="font-bold text-xs text-foreground block">
                    {t("emergency.masterSwitch", "Emergency Access")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {t("emergency.masterSwitchSub", "When disabled, scanning the card returns a 403 Forbidden message.")}
                  </p>
                </div>
                <Button
                  variant={isQRLive ? "destructive" : "outline"}
                  size="sm"
                  onClick={handleToggleKillSwitch}
                  disabled={isTogglingKillSwitch || isLoading}
                  className="text-xs font-bold h-8 rounded-lg"
                >
                  {isTogglingKillSwitch ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isQRLive ? (
                    t("emergency.deactivateAccess", "Deactivate")
                  ) : (
                    t("emergency.activateAccess", "Activate")
                  )}
                </Button>
              </div>

              {/* Reset Token */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-muted/20">
                <div className="space-y-0.5 max-w-[75%]">
                  <span className="font-bold text-xs text-foreground block">
                    {t("emergency.resetTokenTitle", "Reset QR Code")}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {t("emergency.resetTokenSub", "Invalidates all prior printed cards and creates a new token.")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmReset(true)}
                  disabled={isRegenerating || isLoading}
                  className="text-xs font-semibold h-8 rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 inline-flex items-center gap-1.5 px-3"
                >
                  <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                  <span>{t("emergency.resetQRButton", "Reset QR Code")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT COLUMN (5 cols): Sticky High-Fidelity Preview & Actions
            ══════════════════════════════════════════════════════════════ */}
        <div className="lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <Card className="border-border bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-vault-teal dark:text-teal-400" />
                  {t("emergency.livePreviewTitle", "Live Preview")}
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                  {t("emergency.frontOnly", "Front Side")}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col items-center gap-4">
              {isLoading ? (
                <Skeleton className="w-full max-w-[390px] aspect-[85.6/54] rounded-2xl" />
              ) : (
                <WalletCardFront
                  patientName={user?.full_name || "N/A"}
                  bloodGroup={effectivePreviewPrivacy.show_blood_group ? user?.blood_group || null : null}
                  healthId={qrData?.health_id || user?.health_id || "HV-PAK-98214"}
                  token={qrData?.emergency_token}
                  primaryContact={effectivePreviewPrivacy.show_emergency_contacts ? primaryContact : null}
                  isActive={isQRLive}
                  compact={true}
                />
              )}

              {/* Action Button Bar Directly Below Card */}
              <div className="w-full space-y-2 pt-1">
                <Link
                  href="/emergency/preview"
                  className="w-full bg-vault-teal hover:bg-vault-teal-dark text-white py-2.5 rounded-xl font-bold shadow-xs flex items-center justify-center gap-2 transition-all text-xs sm:text-sm"
                >
                  <Printer className="h-4 w-4 shrink-0" />
                  <span>{t("emergency.printCard", "Print Emergency Card")}</span>
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyEmergencyLink}
                    className="text-xs font-semibold h-9 rounded-xl border-border hover:bg-muted inline-flex items-center justify-center gap-1.5 px-3"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>{t("emergency.copiedLink", "Copied Link!")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 shrink-0" />
                        <span>{t("emergency.copyLink", "Copy Link")}</span>
                      </>
                    )}
                  </Button>


                  <a
                    href={publicEmergencyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center rounded-xl border border-input bg-background hover:bg-muted text-xs font-semibold h-9 px-3 gap-1.5 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t("emergency.testScan", "Test Scan")}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Micro-Reassurance Tokenized Protection Banner */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-4 text-xs text-muted-foreground space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <Lock className="h-4 w-4 text-vault-teal dark:text-teal-400" />
              {t("emergency.tokenProtectionTitle", "Tokenized Protection")}
            </div>
            <p className="leading-relaxed text-[11px]">
              {t(
                "emergency.tokenProtectionSub",
                "Your card embeds a high-entropy secret token. Only people with physical possession of your card can view your emergency profile."
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal: Reset QR Code ── */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4" dir={isUrdu ? "rtl" : "ltr"}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {t("emergency.modalResetTitle", "Reset QR Access Token?")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("emergency.modalResetSub", "This action will invalidate all previously printed cards.")}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "emergency.modalResetBody",
                "If your wallet card was lost or shared unintentionally, resetting the token immediately blocks all prior QR links from loading your emergency profile. You must print a new card after resetting."
              )}
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold rounded-lg"
                onClick={() => setShowConfirmReset(false)}
                disabled={isRegenerating}
              >
                {t("emergency.cancel", "Cancel")}
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded-lg"
                onClick={handleRegenerateQR}
                disabled={isRegenerating}
              >
                {isRegenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                    <span>{t("emergency.resetting", "Resetting...")}</span>
                  </>
                ) : (
                  <span>{t("emergency.confirmReset", "Confirm Reset")}</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
