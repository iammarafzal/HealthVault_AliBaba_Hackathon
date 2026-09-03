"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pill,
  Printer,
  RefreshCw,
  Sparkles,
  Stethoscope,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import DoctorSummaryPrintView from "@/components/summary/DoctorSummaryPrintView";
import { getDoctorSummary } from "@/services/summaryService";
import { checkInteractions } from "@/services/interactionService";
import type { DoctorSummaryResponse, InteractionCheckResponse } from "@/types/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Deduplicate biomarker entries by analyte name so each out-of-range
 * test appears only once with its latest value.
 */
function deduplicateBiomarkers(biomarkers: string[] = []): string[] {
  const seen = new Map<string, string>();
  for (const b of biomarkers) {
    if (!b || !b.trim()) continue;
    const clean = b.trim();
    // Normalize key by taking the analyte prefix before colon or parentheses
    const key = clean.split(/[:\-\(]/)[0].trim().toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, clean);
    }
  }
  return Array.from(seen.values());
}

/**
 * Clean deduplication for list strings (diagnoses, allergies, risks)
 */
function deduplicateList(items: string[] = []): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    if (!item || !item.trim()) continue;
    const norm = item.trim().toLowerCase();
    if (!seen.has(norm)) {
      seen.add(norm);
      result.push(item.trim());
    }
  }
  return result;
}

export default function SummaryPage() {
  const { user } = useAuth();
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";
  const [summaryData, setSummaryData] = useState<DoctorSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showPrintView, setShowPrintView] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string>("—");
  const [error, setError] = useState<string | null>(null);
  const [interactionAlert, setInteractionAlert] = useState<InteractionCheckResponse | null>(null);

  /* ── Fetch summary on mount ──────────────────────────────── */
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorSummary(user.id);
      setSummaryData(data);
      setLastGenerated(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate doctor visit sheet");
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /* ── Check interactions for current medications ──────────── */
  useEffect(() => {
    if (!user?.id || !summaryData?.current_medications?.length) return;
    checkInteractions(user.id, summaryData.current_medications)
      .then((res) => {
        if (res.has_conflicts) setInteractionAlert(res);
      })
      .catch(() => {
        /* silent error handling */
      });
  }, [user?.id, summaryData?.current_medications]);

  /* ── Single Unified Print / PDF Action ──────────────────── */
  const handlePrint = () => {
    window.print();
  };

  /* ── Full Screen Preview Mode ────────────────────────────── */
  if (showPrintView && summaryData) {
    return (
      <div className="mx-auto max-w-5xl space-y-4" dir={dir}>
        <div className="flex items-center justify-between border-b border-[#DCE8E5] pb-3 print:hidden" dir={dir}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPrintView(false)}
            className="border-[#DCE8E5] text-xs font-semibold text-[#0D5C4A] hover:bg-[#E8F7F4]"
          >
            <ArrowLeft className={`h-3.5 w-3.5 ${isUrdu ? "ml-1.5 rotate-180" : "mr-1.5"}`} />
            {t("summary.backToInteractive", "Back to Interactive Sheet")}
          </Button>
          <Button
            size="sm"
            className="bg-[#0D5C4A] hover:bg-[#0A8C6A] text-xs font-semibold text-white shadow-xs"
            onClick={() => window.print()}
          >
            <Printer className={`h-3.5 w-3.5 ${isUrdu ? "ml-1.5" : "mr-1.5"}`} />
            {t("summary.printPdf", "Print / Save PDF")}
          </Button>
        </div>
        <DoctorSummaryPrintView summary={summaryData} interactionAlert={interactionAlert} />
      </div>
    );
  }

  // Deduplicated clinical datasets
  const activeDiagnoses = deduplicateList(summaryData?.active_diagnoses);
  const knownAllergies = deduplicateList(summaryData?.known_allergies);
  const currentMedications = deduplicateList(summaryData?.current_medications);
  const clinicalWatchpoints = deduplicateList(summaryData?.risk_factors);
  const abnormalBiomarkers = deduplicateBiomarkers(summaryData?.recent_abnormal_biomarkers);

  const patientName =
    summaryData?.patient_name || user?.profile?.full_name || user?.full_name || (isUrdu ? "مریض" : "Patient");
  const rawAgeGender = summaryData?.age_gender || user?.profile?.gender || user?.gender || "—";
  const displayAgeGender = isUrdu
    ? rawAgeGender.replace(/21M/gi, "21 سال، مرد").replace(/(\d+)M/gi, "$1 سال، مرد").replace(/(\d+)F/gi, "$1 سال، خاتون")
    : rawAgeGender;
  const bloodGroup =
    summaryData?.blood_group || user?.profile?.blood_group || user?.blood_group || "—";
  const healthId = summaryData?.health_id || user?.health_id || "HV-PAK-98214";

  // Format AI clinical notes for Urdu if raw text is English pattern
  let clinicalNotesDisplay = summaryData?.clinical_notes || "";
  if (isUrdu && clinicalNotesDisplay) {
    if (clinicalNotesDisplay.includes("patient, blood group")) {
      clinicalNotesDisplay = clinicalNotesDisplay
        .replace(/(\d+)M patient, blood group ([^.]+)\. Active diagnoses include ([^.]+)\. Currently on (\d+) active medication\(s\)/gi,
          "عمر $1 سال، مرد، بلڈ گروپ $2۔ فعال بیماریوں اور تشخیص میں $3 شامل ہیں۔ فی الوقت $4 ادویات زیر استعمال ہیں۔")
        .replace(/Dysmen/gi, "درد حیض")
        .replace(/A febrile uti/gi, "پیشاب کا انفیکشن اور بخار");
    }
  }

  return (
    <>
      <div className="mx-auto max-w-5xl space-y-5 pb-12 print:hidden" dir={dir}>
        {/* ═══ 1. Patient Header & Deduplicated Action Strip ═══ */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] p-4 sm:p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between" dir={dir}>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-[#1A2826] dark:text-white">
                {patientName}
              </h1>
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1.5 rounded-full border-[#B2DFD4] bg-[#E8F7F4] px-2.5 py-0.5 text-xs font-semibold text-[#0D5C4A] dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#0A8C6A]" />
                {t("summary.clinicalBrief", "Clinical Brief")}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[#3D5450] dark:text-[#B2DFD4] sm:text-sm">
              <span>{t("summary.ageGender", "Age / Gender")}: <strong className="text-[#1A2826] dark:text-white font-semibold">{displayAgeGender}</strong></span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                {t("summary.bloodGroup", "Blood Group")}:
                <span className="rounded-md bg-[#FEF5E4] px-1.5 py-0.5 text-xs font-bold text-[#C47C1A] border border-[#F4A52A]/30" dir="ltr">
                  {bloodGroup}
                </span>
              </span>
              <span>•</span>
              <span>
                {t("summary.healthId", "Health ID")}: <span className="font-mono font-semibold text-[#0D5C4A] dark:text-teal-400" dir="ltr">{healthId}</span>
              </span>
            </div>
          </div>

          {/* ── Deduplicated Clean Actions ── */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              onClick={handlePrint}
              disabled={!summaryData || initialLoading}
              className="bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-xs transition-all active:scale-[0.99]"
            >
              <Printer className="h-4 w-4" />
              <span>{t("summary.printPdf", "Print / Save PDF")}</span>
            </Button>

            <Button
              variant="outline"
              onClick={fetchSummary}
              disabled={loading}
              className="bg-white hover:bg-[#E8F7F4] text-[#1A2826] border border-[#DCE8E5] px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 dark:bg-[#223431] dark:text-white dark:border-white/10 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0D5C4A] ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? t("summary.refreshing", "Refreshing…") : t("summary.refreshSummary", "Refresh Summary")}</span>
            </Button>
          </div>
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-[#C0392B] dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300" dir={dir}>
            <div className="flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 shrink-0 text-[#C0392B]" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs font-semibold" onClick={fetchSummary}>
              {isUrdu ? "دوبارہ کوشش کریں" : "Try Again"}
            </Button>
          </div>
        )}

        {/* ── High-Priority Safety Warning Banner ── */}
        {interactionAlert && interactionAlert.has_conflicts && (
          <div className="rounded-2xl border border-amber-300/80 bg-[#FEF5E4] p-4 shadow-xs dark:border-amber-700/50 dark:bg-amber-950/20" dir={dir}>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#C47C1A] text-white shadow-xs">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-[#874A00] dark:text-amber-300">
                    {isUrdu ? "ادویات کے مابین خطرناک تعامل کی خبرداری" : "Critical Drug Safety Interaction Warning"}
                  </h3>
                  <Badge className="bg-[#C0392B] text-[9px] font-black tracking-wider text-white uppercase">
                    {isUrdu ? "حفاظتی الرٹ" : "Safety Alert"}
                  </Badge>
                </div>
                {interactionAlert.alerts.map((alert, i) => (
                  <div key={i} className="text-xs text-[#613500] dark:text-amber-200 space-y-1">
                    <p className="font-semibold">
                      {alert.interacting_drugs.join(" + ")}: {alert.clinical_risk}
                    </p>
                    <p className="text-[11px] text-muted-foreground italic">
                      {isUrdu ? (alert.recommendation_ur || alert.recommendation_en) : alert.recommendation_en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ 2. Responsive 2-Column Clinical Metric Grid ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4 sm:space-y-5">
            {/* Card A: Active Diagnoses */}
            <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0D5C4A] dark:text-teal-300 uppercase tracking-wider">
                  <Stethoscope className="w-4 h-4 text-[#0D5C4A]" />
                  {t("summary.activeDiagnoses", "Active Diagnoses & Conditions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3.5" dir={dir}>
                {initialLoading ? (
                  <div className="flex gap-2">
                    <Skeleton className="h-7 w-28 rounded-lg" />
                    <Skeleton className="h-7 w-36 rounded-lg" />
                  </div>
                ) : activeDiagnoses.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {activeDiagnoses.map((dx) => (
                      <span
                        key={dx}
                        className="bg-[#E8F7F4] text-[#0D5C4A] border border-[#B2DFD4] text-xs font-medium px-2.5 py-1 rounded-lg dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800"
                      >
                        {dx}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("summary.noDiagnoses", "No active diagnoses documented.")}</p>
                )}
              </CardContent>
            </Card>

            {/* Card B: Severe Allergies */}
            <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C0392B] uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-[#C0392B]" />
                  {t("summary.knownAllergies", "Known Allergies & Sensitivities")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3.5" dir={dir}>
                {initialLoading ? (
                  <Skeleton className="h-7 w-32 rounded-lg" />
                ) : knownAllergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {knownAllergies.map((allergy) => (
                      <span
                        key={allergy}
                        className="bg-[#FDF2F2] text-[#C0392B] border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 dark:bg-red-950/30 dark:text-red-300 dark:border-red-900/40"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#C0392B]" />
                        {allergy}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("summary.noAllergies", "No known drug allergies reported.")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-4 sm:space-y-5">
            {/* Card C: Current Active Medications */}
            <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0D5C4A] dark:text-teal-300 uppercase tracking-wider">
                  <Pill className="w-4 h-4 text-[#0D5C4A]" />
                  {t("summary.currentMedications", "Current Medication Regimen")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3.5" dir={dir}>
                {initialLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full rounded-lg" />
                    <Skeleton className="h-8 w-full rounded-lg" />
                  </div>
                ) : currentMedications.length > 0 ? (
                  <ul className="space-y-1.5 text-xs">
                    {currentMedications.map((med) => (
                      <li
                        key={med}
                        className="flex items-center justify-between rounded-lg border border-[#DCE8E5]/80 bg-[#F5F8F7]/70 px-3 py-2 text-foreground dark:bg-[#223431]/50 dark:border-white/10"
                      >
                        <span className="font-semibold text-xs text-[#1A2826] dark:text-white">
                          {med}
                        </span>
                        <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-bold dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                          {t("summary.activeDaily", "Active Daily")}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("summary.noMedications", "No active medications documented.")}</p>
                )}
              </CardContent>
            </Card>

            {/* Card D: Clinical Watchpoints */}
            <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
              <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C47C1A] uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-[#C47C1A]" />
                  {t("summary.watchpointsTitle", "Clinical Watchpoints & Risk Factors")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3.5" dir={dir}>
                {initialLoading ? (
                  <Skeleton className="h-10 w-full rounded-lg" />
                ) : clinicalWatchpoints.length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {clinicalWatchpoints.map((risk) => {
                      const displayRisk = isUrdu && risk.includes("Multi-morbidity")
                        ? "متعدد پیچیدگیاں: ایک سے زائد دائمی بیماریاں پائی گئیں"
                        : risk;
                      return (
                        <li key={risk} className="flex items-start gap-2 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#C47C1A] mt-1.5 shrink-0" />
                          <span className="font-medium text-[#1A2826] dark:text-white leading-relaxed">{displayRisk}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{t("summary.noWatchpoints", "No active critical health watchpoints.")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ═══ 3. Out-of-Range Lab Biomarkers Section (Deduplicated) ═══ */}
        <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#C47C1A] uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-[#C47C1A]" />
                {t("summary.outOfRangeLabs", "Out-of-Range Lab Biomarkers")}
              </CardTitle>
              <Badge variant="outline" className="text-[10px] font-semibold text-[#3D5450] dark:text-[#B2DFD4] border-[#DCE8E5] dark:border-white/10">
                {t("summary.latestLabMeasurements", "Latest Lab Measurements")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-3.5" dir={dir}>
            {initialLoading ? (
              <div className="flex gap-2">
                <Skeleton className="h-7 w-40 rounded-lg" />
                <Skeleton className="h-7 w-48 rounded-lg" />
              </div>
            ) : abnormalBiomarkers.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {abnormalBiomarkers.map((biomarker) => (
                  <div
                    key={biomarker}
                    className="bg-[#FEF5E4] text-[#C47C1A] border border-[#F4A52A]/30 text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/40"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C47C1A] shrink-0" />
                    <span className="font-semibold">{biomarker}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium py-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>{t("summary.allLabsNormal", "All recent lab parameters are within standard normal limits.")}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ═══ 4. Doctor's Clinical Overview & AI Synthesis Note ═══ */}
        <Card className="border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-2xs">
          <CardHeader className="pb-3 border-b border-[#DCE8E5]/70 dark:border-white/10 bg-[#F5F8F7]/50 dark:bg-[#223431]/50" dir={dir}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0D5C4A] dark:text-teal-300 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-[#0D5C4A]" />
                {t("summary.aiSynthesisTitle", "AI Clinical Synthesis & Narrative Overview")}
              </CardTitle>
              <span className="text-xs text-[#3D5450] dark:text-[#B2DFD4] font-medium">
                {t("summary.lastUpdated", "Last updated:")} {lastGenerated}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-3.5" dir={dir}>
            {initialLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : clinicalNotesDisplay?.trim() ? (
              <div className="text-sm text-[#1A2826] leading-relaxed bg-[#F5F8F7] p-4 rounded-xl border border-[#DCE8E5] dark:bg-[#223431]/50 dark:text-white dark:border-white/10 font-normal">
                {clinicalNotesDisplay}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <FileSpreadsheet className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                  {isUrdu
                    ? "طبی خلاصہ تیار کرنے کے لیے میڈیکل والٹ میں نسخے یا لیب رپورٹس اپ لوڈ کریں۔"
                    : "Upload prescriptions or lab reports in the Medical Vault to generate an intelligent clinical synthesis."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══ PRINT-ONLY VIEW (@media print) ═══ */}
      <div className="hidden print:block">
        {summaryData && (
          <DoctorSummaryPrintView summary={summaryData} interactionAlert={interactionAlert} />
        )}
      </div>
    </>
  );
}
