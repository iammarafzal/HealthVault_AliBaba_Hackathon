"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Clock,
  Heart,
  Loader2,
  Phone,
  PhoneCall,
  Pill,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import {
  getEmergencySessionData,
  type EmergencySessionDataResponse,
} from "@/services/emergencyService";
import { useCaptureScanLocation } from "@/hooks/useCaptureScanLocation";
import { cn } from "@/lib/utils";

interface EmergencyViewPageProps {
  params: { health_id: string };
}

type Language = "en" | "ur";

/* ── Localization Dictionary ────────────────────────────────────── */

const DICT = {
  en: {
    topBanner: "Official Emergency Medical Summary • Zero-Login Access",
    verifiedBadge: "Verified Emergency ID",
    activeId: "Active ID",
    responderNoteTitle: "Critical Responder Note",
    patientDirectiveBadge: "Patient Directive",
    medicalIdTitle: "EMERGENCY MEDICAL ID",
    bloodLabel: "BLOOD",
    zeroLoginFooter: "Zero-Login Paramedic View",
    immediateFieldAccess: "Immediate Field Access",
    callPrimaryIce: "CALL PRIMARY ICE CONTACT",
    nationalRescueTitle: "NATIONAL EMERGENCY RESCUE",
    callRescue1122: "Call Rescue 1122",
    policeHelplineTitle: "Police Helpline 15",
    callPolice15: "Call Police 15",
    immediateAssistance: "Immediate Emergency Assistance:",
    criticalAllergiesTitle: "CRITICAL ALLERGIES (DO NOT ADMINISTER)",
    criticalAllergiesBadge: "Critical Allergies",
    noAllergiesReported: "No known allergies reported",
    noneReported: "None Reported",
    activeMedsTitle: "CURRENTLY ACTIVE MEDICATIONS",
    chronicConditionsTitle: "DIAGNOSED CHRONIC CONDITIONS",
    secondaryContactsTitle: "SECONDARY EMERGENCY CONTACTS",
    callContact: "Call",
    callNow: "Call Now",
    accessRestricted: "Access Restricted",
    sessionTimerActive: "Triage Session Active",
    remaining: "remaining",
    physicalScanRequiredTitle: "Direct Physical Scan Required",
    physicalScanRequiredDesc:
      "This emergency medical profile is protected against unauthorized link sharing. Access can only be unlocked by scanning the QR code directly from the patient's physical card.",
    sessionExpiredTitle: "Triage Session Expired",
    sessionExpiredDesc:
      "The 15-minute emergency access window has expired. Please re-scan the patient's physical card to restore access.",
    deviceMismatchTitle: "Device Authorization Required",
    deviceMismatchDesc:
      "This session is locked to the physical device that performed the scan. Direct physical scan is required to view this medical profile.",
    sharedLinkNote: "Shared or expired links cannot view this data.",
    revokedTitle: "Emergency Access Disabled by Patient",
    revokedDesc:
      "The patient has temporarily turned off public emergency access or regenerated their wallet QR token.",
    notFoundTitle: "Profile Unavailable",
    notFoundDesc: "No emergency record was found for this ID.",
    loadingTitle: "Validating Secure Emergency Triage Session…",
    footerText:
      "HealthVault AI • Verified Emergency Triage System • Pakistan National Triage Network",
    securityTokenEnforced: "Health ID: {id} • Device-Locked Ephemeral Session",
    permittedDocsTitle: "PERMITTED EMERGENCY PRESCRIPTIONS & RECORDS",
    viewDoc: "View Document",
    ephemeralBadge: "15-Min Ephemeral Access",
  },
  ur: {
    topBanner: "سرکاری ہنگامی طبی خلاصہ • فوری رسائی",
    verifiedBadge: "تصدیق شدہ ایمرجنسی آئی ڈی",
    activeId: "فعال کارڈ",
    responderNoteTitle: "پیرامیڈک اور ہنگامی امدادی ہدایات",
    patientDirectiveBadge: "مریض کی ہدایات",
    medicalIdTitle: "ہنگامی طبی شناختی کارڈ",
    bloodLabel: "بلڈ گروپ",
    zeroLoginFooter: "پیرامیڈک ویو • فوری رسائی",
    immediateFieldAccess: "فوری طبی رسائی",
    callPrimaryIce: "بنیادی ایمرجنسی رابطے کو کال کریں",
    nationalRescueTitle: "قومی ایمرجنسی ریسکیو",
    callRescue1122: "ریسکیو 1122 کو کال کریں",
    policeHelplineTitle: "پولیس ہیلپ لائن 15",
    callPolice15: "پولیس 15 کو کال کریں",
    immediateAssistance: "فوری ہنگامی امداد:",
    criticalAllergiesTitle: "شدید الرجی اور انتباہات (ہرگز نہ دیں)",
    criticalAllergiesBadge: "شدید الرجی",
    noAllergiesReported: "کوئی معلوم الرجی درج نہیں ہے",
    noneReported: "کوئی درج نہیں",
    activeMedsTitle: "موجودہ زیر استعمال ادویات",
    chronicConditionsTitle: "دائمی امراض و تشخیص",
    secondaryContactsTitle: "دیگر ہنگامی رابطے",
    callContact: "کال کریں",
    callNow: "ابھی کال کریں",
    accessRestricted: "رسائی بند ہے",
    sessionTimerActive: "ہنگامی رسائی کا وقت",
    remaining: "باقی",
    physicalScanRequiredTitle: "براہ کرم اصل کارڈ اسکین کریں",
    physicalScanRequiredDesc:
      "یہ ہنگامی طبی پروفائل لنکس شیئر کرنے سے محفوظ ہے۔ معلومات صرف مریض کے اصل کارڈ سے کیو آر کوڈ اسکین کر کے ہی کھولی جا سکتی ہے۔",
    sessionExpiredTitle: "ایمرجنسی رسائی کا وقت ختم ہو گیا ہے",
    sessionExpiredDesc:
      "15 منٹ کا ہنگامی وقت ختم ہو چکا ہے۔ رسائی بحال کرنے کے لیے مریض کا اصل کارڈ دوبارہ اسکین کریں۔",
    deviceMismatchTitle: "غیر متعلقہ ڈیوائس سے رسائی بلاک ہے",
    deviceMismatchDesc:
      "یہ سیشن صرف اسی ڈیوائس کے لیے مخصوص ہے جس سے اسکین کیا گیا تھا۔ معلومات دیکھنے کے لیے براہ راست کارڈ اسکین کریں۔",
    sharedLinkNote: "شیئر کیے گئے یا پرانے لنکس سے یہ معلومات نہیں دیکھی جا سکتیں۔",
    revokedTitle: "مریض کی جانب سے ایمرجنسی رسائی بند ہے",
    revokedDesc:
      "مریض نے عارضی طور پر ایمرجنسی رسائی معطل کر دی ہے یا نیا کارڈ جاری کیا ہے۔",
    notFoundTitle: "پروفائل دستیاب نہیں",
    notFoundDesc: "اس شناختی نمبر کے لیے کوئی ہنگامی ریکارڈ نہیں ملا۔",
    loadingTitle: "سیکیورٹی سیشن کی تصدیق کی جا رہی ہے...",
    footerText:
      "ہیلتھ والٹ اے آئی • تصدیق شدہ ایمرجنسی ٹرائیج سسٹم • قومی ہنگامی نیٹ ورک",
    securityTokenEnforced: "شناختی نمبر: {id} • محفوظ ڈیوائس لاکڈ سیشن",
    permittedDocsTitle: "ہنگامی طور پر مجاز نسخہ جات و طبی دستاویزات",
    viewDoc: "دستاویز دیکھیں",
    ephemeralBadge: "15 منٹ عارضی رسائی",
  },
};

/* ── Relationship Translations ──────────────────────────────────── */

const RELATION_MAP: Record<string, { en: string; ur: string }> = {
  son: { en: "Son", ur: "بیٹا" },
  daughter: { en: "Daughter", ur: "بیٹی" },
  spouse: { en: "Spouse", ur: "اہلیہ / شوہر" },
  wife: { en: "Wife", ur: "اہلیہ" },
  husband: { en: "Husband", ur: "شوہر" },
  father: { en: "Father", ur: "والد" },
  mother: { en: "Mother", ur: "والدہ" },
  brother: { en: "Brother", ur: "بھائی" },
  sister: { en: "Sister", ur: "بہن" },
  friend: { en: "Friend", ur: "دوست" },
  guardian: { en: "Guardian", ur: "سرپرست" },
  parent: { en: "Parent", ur: "والدین" },
  doctor: { en: "Doctor", ur: "ڈاکٹر" },
};

function formatRelation(raw: string | undefined, lang: Language): string {
  if (!raw) return "";
  const key = raw.toLowerCase().trim();
  if (RELATION_MAP[key]) {
    return RELATION_MAP[key][lang];
  }
  return raw;
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function EmergencySecureViewPage({ params }: EmergencyViewPageProps) {
  // Automatically request high-accuracy GPS coordinates on scanner device mount
  useCaptureScanLocation(params.health_id);

  // 1. Language State
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const urlLang = new URLSearchParams(window.location.search).get("lang");
      if (urlLang === "ur" || urlLang === "en") return urlLang;
      const stored = localStorage.getItem("healthvault_public_lang");
      if (stored === "ur" || stored === "en") return stored;
      if (navigator.language?.toLowerCase().startsWith("ur")) return "ur";
    }
    return "en";
  });

  const [, startTransition] = useTransition();

  const handleLanguageChange = (newLang: Language) => {
    startTransition(() => {
      setLang(newLang);
      if (typeof window !== "undefined") {
        localStorage.setItem("healthvault_public_lang", newLang);
      }
    });
  };

  const isUrdu = lang === "ur";
  const t = DICT[lang];

  const [profile, setProfile] = useState<EmergencySessionDataResponse | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // 2. Fetch Session Data
  useEffect(() => {
    let isMounted = true;

    const fetchSession = async () => {
      setIsLoading(true);
      setErrorStatus(null);
      try {
        const data = await getEmergencySessionData(params.health_id);
        if (!isMounted) return;

        if (data.is_revoked) {
          setErrorStatus("revoked");
        } else {
          setProfile(data);
          setRemainingSeconds(data.expires_in_seconds);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "";
        const lowerMsg = msg.toLowerCase();

        if (msg.includes("401") || lowerMsg.includes("physical_scan_required")) {
          setErrorStatus("PHYSICAL_SCAN_REQUIRED");
        } else if (msg.includes("403") && lowerMsg.includes("session_expired")) {
          setErrorStatus("SESSION_EXPIRED");
        } else if (msg.includes("403") && lowerMsg.includes("device_mismatch")) {
          setErrorStatus("DEVICE_MISMATCH");
        } else if (lowerMsg.includes("disabled") || lowerMsg.includes("revoked")) {
          setErrorStatus("revoked");
        } else if (msg.includes("404")) {
          setErrorStatus("not_found");
        } else {
          setErrorStatus("PHYSICAL_SCAN_REQUIRED");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchSession();

    return () => {
      isMounted = false;
    };
  }, [params.health_id]);

  // 3. Interval Timer for 15-Minute Expiration
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0 || errorStatus) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setErrorStatus("SESSION_EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, errorStatus]);

  /* ── 1. Fast Loading State ── */
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex min-h-screen items-center justify-center bg-[#090E17] text-white p-4 antialiased",
          isUrdu ? "font-arabic" : "font-sans"
        )}
        dir={isUrdu ? "rtl" : "ltr"}
      >
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Image
            src="/navbar-footer-dark.png"
            alt="HealthVault AI"
            width={180}
            height={48}
            className="h-10 sm:h-12 w-auto object-contain"
            priority
          />
          <Loader2 className="h-8 w-8 animate-spin text-[#C0392B] mt-2" />
          <div>
            <p className="text-sm sm:text-base font-bold tracking-wide text-white">
              {t.loadingTitle}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-0.5" dir="ltr">
              {params.health_id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── 2. Error & Access Restricted Security Screen ── */
  if (errorStatus || (profile && profile.is_revoked)) {
    const isScanRequired = errorStatus === "PHYSICAL_SCAN_REQUIRED";
    const isExpired = errorStatus === "SESSION_EXPIRED";
    const isDeviceMismatch = errorStatus === "DEVICE_MISMATCH";
    const isRevoked = errorStatus === "revoked";

    let errTitle = t.physicalScanRequiredTitle;
    let errDesc = t.physicalScanRequiredDesc;

    if (isExpired) {
      errTitle = t.sessionExpiredTitle;
      errDesc = t.sessionExpiredDesc;
    } else if (isDeviceMismatch) {
      errTitle = t.deviceMismatchTitle;
      errDesc = t.deviceMismatchDesc;
    } else if (isRevoked) {
      errTitle = t.revokedTitle;
      errDesc = t.revokedDesc;
    } else if (errorStatus === "not_found") {
      errTitle = t.notFoundTitle;
      errDesc = t.notFoundDesc;
    }

    return (
      <div
        className={cn(
          "min-h-screen bg-[#090E17] text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 antialiased",
          isUrdu ? "font-arabic" : "font-sans"
        )}
        dir={isUrdu ? "rtl" : "ltr"}
      >
        {/* Top Branding Header with Language Switcher */}
        <header className="w-full max-w-xl flex items-center justify-between py-3 border-b border-slate-800 gap-2">
          <Image
            src="/navbar-footer-dark.png"
            alt="HealthVault AI"
            width={180}
            height={48}
            className="h-8 sm:h-10 w-auto object-contain shrink-0"
            priority
          />
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-slate-700 bg-[#131C2A] p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  lang === "en"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("ur")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-arabic",
                  lang === "ur"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                اردو
              </button>
            </div>
            <span className="text-[10.5px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 rounded-full uppercase shrink-0">
              {t.accessRestricted}
            </span>
          </div>
        </header>

        {/* Security Barrier Card */}
        <main className="w-full max-w-xl my-auto py-8">
          <div className="rounded-3xl border border-rose-500/30 bg-[#131C2A] p-6 sm:p-8 text-center space-y-6 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-500 shadow-md">
              <ShieldAlert className="h-9 w-9" />
            </div>

            <div className="space-y-3">
              <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-white">
                {errTitle}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                {errDesc}
              </p>
              <p className="text-[11.5px] font-semibold text-amber-400/90 bg-amber-500/10 border border-amber-500/20 py-1.5 px-3 rounded-xl max-w-xs mx-auto">
                {t.sharedLinkNote}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-5 space-y-3">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                {t.immediateAssistance}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href="tel:1122"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white py-3.5 px-4 font-bold text-sm shadow-lg shadow-red-950/50 transition-colors"
                >
                  <PhoneCall className="h-4 w-4 shrink-0 animate-bounce" />
                  <span>{t.callRescue1122}</span>
                </a>
                <a
                  href="tel:15"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-[#1A2536] hover:bg-[#223147] text-white py-3.5 px-4 font-semibold text-sm transition-colors"
                >
                  <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{t.policeHelplineTitle}</span>
                </a>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-mono" dir="ltr">
              {t.securityTokenEnforced.replace("{id}", params.health_id)}
            </p>
          </div>
        </main>

        <footer className="w-full max-w-xl text-center text-[11px] text-slate-500 py-3 border-t border-slate-800/60 font-mono">
          {t.footerText}
        </footer>
      </div>
    );
  }

  if (!profile) return null;

  const primaryContact = profile.emergency_contacts?.[0];
  const hasAllergies = profile.critical_allergies && profile.critical_allergies.length > 0;
  const hasMeds = profile.active_medications && profile.active_medications.length > 0;
  const hasConditions = profile.chronic_conditions && profile.chronic_conditions.length > 0;
  const hasMultipleContacts = profile.emergency_contacts && profile.emergency_contacts.length > 1;
  const hasEmergencyNotes = Boolean(profile.emergency_notes && profile.emergency_notes.trim());
  const hasDocuments = Boolean(profile.documents && profile.documents.length > 0);

  return (
    <div
      className={cn(
        "min-h-screen bg-[#080D16] text-slate-100 antialiased p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-start transition-all",
        isUrdu ? "font-arabic" : "font-sans"
      )}
      dir={isUrdu ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-4xl space-y-4 sm:space-y-5 pb-12">
        {/* ═══ 1. Top Navbar with Branding, Timer Badge & Language Switcher ═══ */}
        <header className="flex items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 gap-2">
          <div className="flex items-center gap-3">
            <Image
              src="/navbar-footer-dark.png"
              alt="HealthVault AI logo"
              width={200}
              height={52}
              className="h-8 sm:h-10 md:h-11 w-auto object-contain shrink-0"
              priority
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sticky Ephemeral Session Countdown Timer Badge */}
            {remainingSeconds !== null && (
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/25 px-3 py-1.5 rounded-full shadow-xs shrink-0 font-mono">
                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                <span className="hidden sm:inline">{t.sessionTimerActive} ·</span>
                <span>{formatCountdown(remainingSeconds)}</span>
                <span className="hidden md:inline text-[10px] text-amber-300/80">({t.remaining})</span>
              </div>
            )}

            {/* Language Switcher Toggle */}
            <div className="flex items-center rounded-xl border border-slate-700 bg-[#131C2A] p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  lang === "en"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("ur")}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer font-arabic",
                  lang === "ur"
                    ? "bg-vault-teal text-white shadow-xs"
                    : "text-slate-400 hover:text-white"
                )}
              >
                اردو
              </button>
            </div>

            {/* Verified Status Pill */}
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full shadow-xs shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">{t.verifiedBadge}</span>
              <span className="sm:hidden">{t.activeId}</span>
            </div>
          </div>
        </header>

        {/* ═══ 1.2. Zero-Login Official Triage Banner ═══ */}
        <div className="rounded-xl border border-vault-teal/30 bg-vault-teal/10 px-4 py-2 text-xs font-semibold text-vault-light flex items-center justify-between gap-2">
          <span>{t.topBanner}</span>
          <span className="font-mono text-[11px] text-emerald-300 opacity-90 hidden sm:inline" dir="ltr">
            {params.health_id}
          </span>
        </div>

        {/* ═══ 1.5. Critical Responder Note (High-Visibility Saffron Amber Directive Banner) ═══ */}
        {hasEmergencyNotes && (
          <div className="rounded-2xl border-2 border-[#C47C1A]/70 bg-[#2A1E0D]/90 p-4 sm:p-5 shadow-xl flex items-start gap-3.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="p-2 rounded-xl bg-[#C47C1A]/20 text-[#C47C1A] shrink-0 mt-0.5 border border-[#C47C1A]/30">
              <AlertCircle className="w-5 h-5 text-[#C47C1A]" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#F5B041]">
                  {t.responderNoteTitle}
                </h2>
                <span className="text-[10px] font-bold text-[#C47C1A] bg-[#C47C1A]/10 border border-[#C47C1A]/30 px-2 py-0.5 rounded-full uppercase shrink-0">
                  {t.patientDirectiveBadge}
                </span>
              </div>
              <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                {profile.emergency_notes}
              </p>
            </div>
          </div>
        )}

        {/* ═══ 2. Responsive 2-Column Grid on Desktop / 1-Col on Mobile ═══ */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
          {/* ── LEFT COLUMN (lg:col-span-5): Patient Vitals & Direct Call CTAs ── */}
          <div className="lg:col-span-5 space-y-3.5 sm:space-y-4 lg:sticky lg:top-6">
            {/* Primary Patient Medical ID Card */}
            <div className="rounded-2xl bg-[#C0392B] text-white p-4 sm:p-5 shadow-xl flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-red-100 block">
                    {t.medicalIdTitle}
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight truncate uppercase">
                    {profile.full_name}
                  </h1>
                  <span className="inline-block text-xs font-mono text-red-200 mt-1 bg-black/20 px-2 py-0.5 rounded" dir="ltr">
                    {profile.health_id}
                  </span>
                </div>

                {/* Blood Group Pill */}
                {profile.blood_group && (
                  <div className="bg-white text-[#C0392B] px-3.5 py-2 rounded-2xl text-center shrink-0 shadow-md">
                    <span className="text-[9px] font-extrabold uppercase tracking-wider block leading-none opacity-85">
                      {t.bloodLabel}
                    </span>
                    <span className="text-2xl sm:text-3xl font-black leading-none mt-1 block" dir="ltr">
                      {profile.blood_group}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-white/20 pt-2.5 flex items-center justify-between text-[11px] text-red-100 font-medium">
                <span>{t.zeroLoginFooter}</span>
                <span>{t.immediateFieldAccess}</span>
              </div>
            </div>

            {/* Direct Instant Action Dialers */}
            <div className="space-y-2.5">
              {primaryContact?.phone && (
                <a
                  href={`tel:${primaryContact.phone}`}
                  className="flex items-center justify-between rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white p-4 shadow-lg shadow-emerald-950/40 font-bold text-sm sm:text-base transition-all active:scale-[0.99] border border-emerald-400/30 gap-3"
                >
                  <div className="flex items-center gap-3 truncate min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                      <PhoneCall className="h-5 w-5 text-white" />
                    </div>
                    <div className="truncate text-start min-w-0">
                      <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-emerald-100 leading-none">
                        {t.callPrimaryIce}
                      </span>
                      <span className="truncate block font-black text-sm mt-0.5">
                        {primaryContact.name}{" "}
                        {primaryContact.relation && (
                          <span className="opacity-85 font-semibold">
                            ({formatRelation(primaryContact.relation, lang)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-mono bg-black/25 px-2.5 py-1 rounded-md shrink-0 font-bold" dir="ltr">
                    {primaryContact.phone}
                  </span>
                </a>
              )}

              <a
                href="tel:1122"
                className="flex items-center justify-between rounded-xl bg-[#C0392B] hover:bg-[#A93226] text-white p-4 shadow-lg shadow-red-950/40 font-bold text-sm sm:text-base transition-all active:scale-[0.99] border border-red-400/30 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-white animate-pulse" />
                  </div>
                  <div className="text-start">
                    <span className="block text-[9.5px] font-extrabold uppercase tracking-wider text-red-100 leading-none">
                      {t.nationalRescueTitle}
                    </span>
                    <span className="block font-black text-sm mt-0.5">
                      {t.callRescue1122}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-mono bg-black/25 px-3 py-1 rounded-md font-black" dir="ltr">
                  1122
                </span>
              </a>
            </div>
          </div>

          {/* ── RIGHT COLUMN (lg:col-span-7): Clinical Data Stream ── */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4">
            {/* Critical Allergies (Highest Priority) */}
            {hasAllergies ? (
              <section className="rounded-2xl border-2 border-red-500/80 bg-red-950/30 p-4 sm:p-5 space-y-2.5 shadow-md">
                <div className="flex items-center gap-2 text-red-400 font-black text-xs sm:text-sm uppercase tracking-wider">
                  <AlertOctagon className="h-5 w-5 shrink-0 text-red-400 animate-pulse" />
                  <span>{t.criticalAllergiesTitle}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {profile.critical_allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="rounded-xl bg-red-600 text-white font-extrabold text-xs sm:text-sm px-3 py-1.5 shadow-sm border border-red-400/30"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </section>
            ) : (
              <div className="rounded-xl border border-slate-800 bg-[#111927] p-3.5 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-slate-500 shrink-0" />
                  {t.criticalAllergiesBadge}
                </span>
                <span className="text-slate-200 font-medium">{t.noneReported}</span>
              </div>
            )}

            {/* Active Medications */}
            {hasMeds && (
              <section className="rounded-2xl border border-slate-800 bg-[#111927] p-4 sm:p-5 space-y-2.5 shadow-md">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Pill className="h-4 w-4 shrink-0" />
                  <span>{t.activeMedsTitle}</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                  {profile.active_medications.map((med, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 font-medium bg-[#192436] p-2.5 rounded-xl border border-slate-800/80 text-slate-200"
                    >
                      <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
                      <span className="truncate">{med}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Chronic Conditions */}
            {hasConditions && (
              <section className="rounded-2xl border border-slate-800 bg-[#111927] p-4 sm:p-5 space-y-2.5 shadow-md">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Activity className="h-4 w-4 shrink-0" />
                  <span>{t.chronicConditionsTitle}</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs sm:text-sm">
                  {profile.chronic_conditions.map((cond, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2.5 font-medium bg-[#192436] p-2.5 rounded-xl border border-slate-800/80 text-slate-200"
                    >
                      <span className="h-2 w-2 rounded-full bg-purple-400 shrink-0" />
                      <span className="truncate">{cond}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Secondary Emergency Contacts */}
            {hasMultipleContacts && (
              <section className="rounded-2xl border border-slate-800 bg-[#111927] p-4 sm:p-5 space-y-2.5 shadow-md">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{t.secondaryContactsTitle}</span>
                </div>
                <div className="space-y-2 pt-1">
                  {profile.emergency_contacts.slice(1).map((contact, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-[#192436] p-3 rounded-xl border border-slate-800/80 text-xs sm:text-sm gap-2"
                    >
                      <div className="truncate min-w-0">
                        <span className="font-bold text-white block truncate">{contact.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {formatRelation(contact.relation, lang) || (isUrdu ? "رابطہ" : "Contact")}
                        </span>
                      </div>
                      <a
                        href={`tel:${contact.phone}`}
                        className="rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold shrink-0 inline-flex items-center gap-1.5"
                      >
                        <PhoneCall className="h-3 w-3 shrink-0" />
                        <span>{t.callContact}</span>
                        <span className="font-mono ml-0.5" dir="ltr">{contact.phone}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Permitted Emergency Medical Documents & Prescriptions */}
            {hasDocuments && (
              <section className="rounded-2xl border border-slate-800 bg-[#111927] p-4 sm:p-5 space-y-3 shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-xs sm:text-sm uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-teal-400" />
                    <span>{t.permittedDocsTitle}</span>
                  </div>
                  <span className="text-[10px] font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-full">
                    {t.ephemeralBadge}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {profile.documents?.map((doc, idx) => {
                    const docSrc = doc.signed_url || doc.document_url;
                    const isPdfDoc = docSrc.toLowerCase().split("?")[0].endsWith(".pdf");
                    return (
                      <div
                        key={doc.id || idx}
                        className="rounded-xl border border-slate-800 bg-[#192436] p-3 space-y-2 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold uppercase text-white tracking-wide">
                              {doc.document_type.replace(/_/g, " ")}
                            </span>
                            {doc.consultation_date && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {doc.consultation_date}
                              </span>
                            )}
                          </div>
                          {(doc.doctor_name || doc.hospital_name) && (
                            <p className="text-[11px] text-slate-300 truncate">
                              {[doc.doctor_name, doc.hospital_name].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="relative rounded-lg overflow-hidden border border-slate-700/60 bg-black/30 aspect-video flex items-center justify-center">
                          {isPdfDoc ? (
                            <iframe
                              src={docSrc}
                              className="h-full w-full pointer-events-none"
                              tabIndex={-1}
                              aria-label="Document preview"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={docSrc}
                              alt={doc.document_type}
                              className="h-full w-full object-contain"
                            />
                          )}
                        </div>
                        <a
                          href={docSrc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full text-center py-1.5 px-2.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all inline-block"
                        >
                          {t.viewDoc}
                        </a>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </main>

        {/* ═══ 3. Minimal Footer ═══ */}
        <footer className="pt-6 sm:pt-8 text-center flex flex-col items-center gap-2 border-t border-slate-800/60">
          <Image
            src="/navbar-footer-dark.png"
            alt="HealthVault AI"
            width={140}
            height={36}
            className="h-6 w-auto object-contain opacity-75"
          />
          <p className="text-[10.5px] text-slate-500 font-mono">
            {t.footerText}
          </p>
        </footer>
      </div>
    </div>
  );
}
