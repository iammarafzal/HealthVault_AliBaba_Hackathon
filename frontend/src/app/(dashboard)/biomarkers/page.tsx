"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BiomarkerFilterBar } from "@/components/biomarkers/BiomarkerFilterBar";
import { BiomarkerTrendCard } from "@/components/biomarkers/BiomarkerTrendCard";
import { getBiomarkerHistory, getBiomarkerSummary } from "@/services/biomarkerService";
import type { BiomarkerDataPoint, BiomarkerHistoryResponse, BiomarkerSummaryResponse } from "@/types/api";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

export default function BiomarkersPage() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const isUrdu = locale === "ur";

  const [summaryData, setSummaryData] = useState<BiomarkerSummaryResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedTestName, setSelectedTestName] = useState<string>("");
  const [historyData, setHistoryData] = useState<BiomarkerHistoryResponse | null>(null);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── 1. Fetch Biomarker Summary ─────────────────────────── */
  const fetchSummary = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingSummary(true);
    setError(null);
    try {
      const data = await getBiomarkerSummary(user.id);
      setSummaryData(data);

      // Auto-select first test if none selected
      if (data.latest_readings.length > 0 && !selectedTestName) {
        setSelectedTestName(data.latest_readings[0].biomarker_name || "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab summary");
    } finally {
      setIsLoadingSummary(false);
    }
  }, [user?.id, selectedTestName]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  /* ── 2. Fetch Selected Test History ─────────────────────── */
  const fetchHistory = useCallback(
    async (testName: string) => {
      if (!user?.id || !testName) return;
      setIsLoadingHistory(true);
      try {
        const data = await getBiomarkerHistory(user.id, testName);
        setHistoryData(data);
      } catch (err: unknown) {
        console.error("Failed to load analyte history", err);
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    if (selectedTestName) {
      fetchHistory(selectedTestName);
    }
  }, [selectedTestName, fetchHistory]);

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    if (!summaryData) return;

    const filtered =
      cat === "all" || cat === "All Tests"
        ? summaryData.latest_readings
        : summaryData.latest_readings.filter(
            (r) => r.category?.toLowerCase() === cat.toLowerCase()
          );

    if (filtered.length > 0) {
      setSelectedTestName(filtered[0].biomarker_name || "");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-vault-teal dark:text-teal-400">
            {t("biomarkers.title", "Lab Tests & Health Trends")}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("biomarkers.subtitle", "Track your blood sugar, cholesterol, and test reports over time with safe normal ranges and clear insights.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-vault-border bg-vault-light text-xs font-bold text-vault-teal dark:bg-card"
          >
            {summaryData
              ? `${summaryData.total_tests} ${isUrdu ? "ٹیسٹ ریکارڈ شدہ" : "Analytes Tracked"}`
              : isUrdu
              ? "فعال ٹریکنگ"
              : "Active Engine"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-vault-teal"
            onClick={fetchSummary}
            disabled={isLoadingSummary}
            title={isUrdu ? "ٹیسٹ کے نتائج تازہ کریں" : "Refresh test results"}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingSummary ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Out-of-Range Clinical Attention Banner ── */}
      {summaryData && summaryData.abnormal_count > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-2xs dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/20">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-amber-900 dark:text-amber-300">
                  {isUrdu
                    ? `توجہ طلب نتائج (${summaryData.abnormal_count} ٹیسٹ معمول سے باہر)`
                    : `Clinical Attention Needed (${summaryData.abnormal_count} Analytes Out of Range)`}
                </h3>
                <Badge variant="destructive" className="text-[10px] font-bold">
                  {isUrdu ? "معائنہ ضروری" : "Review Required"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-amber-800 dark:text-amber-400">
                {isUrdu
                  ? "مندرجہ ذیل ٹیسٹ کے نتائج معیاری حد سے باہر ہیں۔ برائے کرم اپنے معالج سے مشورہ کریں۔"
                  : "The following lab parameters are outside safe reference boundaries. Please review with your healthcare provider."}
              </p>

              {/* Abnormal Analytes Chips */}
              <div className="mt-3 flex flex-wrap gap-2">
                {summaryData.abnormal_readings.map((ab) => (
                  <button
                    key={ab.biomarker_name}
                    onClick={() => {
                      if (ab.biomarker_name) setSelectedTestName(ab.biomarker_name);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white/80 px-2.5 py-1 text-xs font-bold text-amber-950 transition-all hover:bg-white dark:border-amber-800 dark:bg-card dark:text-amber-200"
                  >
                    <span>{ab.biomarker_name}:</span>
                    <span dir="ltr" className="font-extrabold text-vault-red">
                      {ab.value} {ab.unit}
                    </span>
                    <span className="text-[10px] uppercase text-amber-700 dark:text-amber-400">
                      ({ab.status})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading Skeleton ── */}
      {isLoadingSummary ? (
        <Card className="border border-vault-border dark:border-border">
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-vault-red">Error: {error}</p>
          <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={fetchSummary}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {isUrdu ? "دوبارہ کوشش کریں" : "Try Again"}
          </Button>
        </div>
      ) : !summaryData || summaryData.total_tests === 0 ? (
        /* ── Minimal Empty State ── */
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-vault-border bg-vault-surface/30 py-20 text-center dark:border-border dark:bg-card">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-vault-light text-vault-teal dark:bg-teal-950 dark:text-teal-400 shadow-xs">
            <Activity className="h-7 w-7" />
          </div>
          <div className="max-w-md px-4">
            <h3 className="text-base font-bold text-foreground">
              {isUrdu ? "کوئی لیب ریکارڈ موجود نہیں" : "No Lab Records Found"}
            </h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              {isUrdu
                ? "لیب رپورٹس (CBC, LFTs, RFTs, Blood Sugar, Lipids) اپ لوڈ کریں تاکہ آپ کے نتائج اور رجحانات یہاں خودکار طور پر ظاہر ہوں۔"
                : "Upload CBC, Liver, Kidney, Blood Sugar, or Lipid reports in your Medical Vault to visualize automated tracking and trends."}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Dynamic Category Filter & Analyte Selector Bar ── */}
          <BiomarkerFilterBar
            categories={summaryData.categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            availableReadings={summaryData.latest_readings}
            selectedTestName={selectedTestName}
            onSelectTestName={setSelectedTestName}
          />

          {/* ── Active Analyte Trend Card ── */}
          {isLoadingHistory ? (
            <Card className="border border-vault-border dark:border-border">
              <CardContent className="p-8 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-vault-teal" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {isUrdu ? "ڈیٹا لوڈ ہو رہا ہے..." : "Loading analyte trend graph..."}
                </p>
              </CardContent>
            </Card>
          ) : historyData ? (
            <BiomarkerTrendCard historyData={historyData} />
          ) : null}

          {/* ── All Analytes Overview Grid ── */}
          <Card className="border border-vault-border shadow-xs dark:border-border">
            <CardHeader className="border-b border-border bg-vault-surface/40 pb-3 dark:bg-card">
              <CardTitle className="text-sm font-bold text-vault-teal dark:text-teal-300">
                {isUrdu ? "تمام لیب ٹیسٹس کا خلاصہ" : "All Laboratory Analytes Overview"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isUrdu
                  ? "تمام اپ لوڈ شدہ لیب رپورٹس کا حالیہ ریکارڈ"
                  : "Latest measured values and reference ranges across all recorded panels"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {summaryData.latest_readings.map((reading) => {
                  const isSelected =
                    selectedTestName.toLowerCase() === (reading.biomarker_name || "").toLowerCase();

                  return (
                    <div
                      key={reading.biomarker_name}
                      onClick={() => {
                        if (reading.biomarker_name) setSelectedTestName(reading.biomarker_name);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-vault-light/40 dark:hover:bg-card",
                        isSelected && "bg-vault-light/60 dark:bg-card"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {reading.biomarker_name}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[9px] font-semibold text-muted-foreground"
                          >
                            {reading.category}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {reading.ref_range_text
                            ? `${isUrdu ? "معیاری حد:" : "Ref Range:"} ${reading.ref_range_text}`
                            : `${isUrdu ? "تاریخ:" : "Date:"} ${reading.test_date}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right" dir="ltr">
                          <span className="text-sm font-black text-foreground">
                            {reading.value}
                          </span>
                          <span className="ml-1 text-xs font-bold text-muted-foreground">
                            {reading.unit}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "rounded px-2 py-0.5 text-[10px] font-bold uppercase",
                            reading.status === "normal"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : reading.status === "high"
                              ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300"
                              : reading.status === "critical"
                              ? "bg-red-100 text-vault-red dark:bg-red-950 dark:text-red-300"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                          )}
                        >
                          {reading.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
