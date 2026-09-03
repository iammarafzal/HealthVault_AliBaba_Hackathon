"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Moon,
  Pill,
  RefreshCw,
  Sunrise,
  Sun,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MedicationTimeline, {
  type PlannedMed,
} from "@/components/planner/MedicationTimeline";
import MedicationManagerTab from "@/components/planner/MedicationManagerTab";
import { cn } from "@/lib/utils";
import {
  getActiveMedications,
  getTodayDoseLogs,
  toggleDoseLog,
} from "@/services/medicationService";
import type { MedicationDetailResponse } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  parseMedSchedule,
  getSlotsForSchedule,
  SLOT_TIMES,
  type SlotKey,
} from "@/lib/scheduleParser";

/* ── Time-window definitions ────────────────────────────────────── */

type TimeKey = SlotKey; // "morning" | "noon" | "night"

interface TimeWindow {
  key: TimeKey;
  labelKey: string;
  timeRange: string;
  icon: typeof Sunrise;
}

const timeWindows: TimeWindow[] = [
  { key: "morning", labelKey: "planner.morning", timeRange: "06:00 – 11:59 AM", icon: Sunrise },
  { key: "noon", labelKey: "planner.afternoon", timeRange: "12:00 – 04:59 PM", icon: Sun },
  { key: "night", labelKey: "planner.night", timeRange: "05:00 PM – Bedtime", icon: Moon },
];

/* ── Meal label helper ──────────────────────────────────────────── */

function getMealLabels(schedule: Record<string, unknown> | null) {
  const meal = (schedule?.meal_relation as string) || "unspecified";
  if (meal === "unspecified" || meal === "as_needed") return { en: "", ur: "" };
  const map: Record<string, { en: string; ur: string }> = {
    before_meals: { en: "Before meals", ur: "کھانے سے پہلے" },
    after_meals: { en: "After meals", ur: "کھانے کے بعد" },
    with_meals: { en: "With meals", ur: "کھانے کے ساتھ" },
  };
  return map[meal] || { en: "", ur: "" };
}

/* ── Convert API meds → PlannedMed[] (multi-slot expansion with dose state) ─────── */

function buildPlannedMeds(
  meds: MedicationDetailResponse[],
  locale: "en" | "ur",
  doseLogs: Record<string, boolean> = {},
): PlannedMed[] {
  const expanded: PlannedMed[] = [];

  for (const m of meds) {
    const schedule = parseMedSchedule(
      m.dosage_schedule,
      m.timing,
      m.frequency,
    );
    const slots = getSlotsForSchedule(schedule);
    const meal = getMealLabels(m.dosage_schedule as Record<string, unknown> | null);

    const instruction = m.instructions_en || `${m.dosage} ${m.frequency}`.trim();
    const instruction_ur = m.instructions_ur || "";

    // Create one PlannedMed per time slot this medication belongs to
    for (const slot of slots) {
      const compositeId = `${m.id}_${slot}`;
      const slotTime = SLOT_TIMES[slot];

      expanded.push({
        id: compositeId,
        medicationId: m.id,
        name: m.name,
        dosage: m.dosage,
        instruction,
        instruction_ur,
        timing: slot,
        scheduled_time: locale === "ur" ? slotTime.ur : slotTime.en,
        taken: Boolean(doseLogs[compositeId]),
        meal_label: meal.en,
        meal_label_ur: meal.ur,
      });
    }
  }

  return expanded;
}

/* ── Top-level page views ───────────────────────────────────────── */

type PageView = "schedule" | "manage";

export default function PlannerPage() {
  const { locale, t } = useLanguage();
  const { user } = useAuth();

  const [view, setView] = useState<PageView>("schedule");
  const [activeTab, setActiveTab] = useState<TimeKey>("morning");
  const [meds, setMeds] = useState<PlannedMed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── LocalStorage Helper ───────────────────────────────────────── */
  const getTodayKey = useCallback(() => {
    return `hv_doses_${new Date().toISOString().split("T")[0]}`;
  }, []);

  const getLocalDoseCache = useCallback((): Record<string, boolean> => {
    if (typeof window === "undefined") return {};
    try {
      const cached = localStorage.getItem(getTodayKey());
      return cached ? JSON.parse(cached) : {};
    } catch {
      return {};
    }
  }, [getTodayKey]);

  const saveLocalDoseCache = useCallback((doses: Record<string, boolean>) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(getTodayKey(), JSON.stringify(doses));
    } catch (e) {
      console.warn("Failed to write dose cache to localStorage", e);
    }
  }, [getTodayKey]);

  /* ── Fetch active medications and today's dose logs ────────────── */
  const fetchMeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const localDoses = getLocalDoseCache();

      const [medsResult, dosesResult] = await Promise.allSettled([
        getActiveMedications(),
        getTodayDoseLogs(),
      ]);

      if (medsResult.status === "rejected") {
        throw medsResult.reason;
      }

      const activeMeds = medsResult.value.medications;
      const remoteDoses =
        dosesResult.status === "fulfilled" ? dosesResult.value.dose_logs : {};

      // Merge remote dose logs on top of local cache
      const mergedDoses = { ...localDoses, ...remoteDoses };
      saveLocalDoseCache(mergedDoses);

      const planned = buildPlannedMeds(activeMeds, locale, mergedDoses);
      setMeds(planned);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setIsLoading(false);
    }
  }, [locale, getLocalDoseCache, saveLocalDoseCache]);

  useEffect(() => {
    if (user?.id) fetchMeds();
  }, [fetchMeds, user?.id]);

  /* ── Per-slot taken toggle with optimistic persistence ─────────── */
  const toggleTaken = async (compositeId: string) => {
    const target = meds.find((m) => m.id === compositeId);
    if (!target) return;

    const nextTaken = !target.taken;

    // 1. Immediate optimistic React state update
    setMeds((prev) =>
      prev.map((m) => (m.id === compositeId ? { ...m, taken: nextTaken } : m))
    );

    // 2. Immediate optimistic localStorage update
    const currentCache = getLocalDoseCache();
    currentCache[compositeId] = nextTaken;
    saveLocalDoseCache(currentCache);

    // 3. Non-blocking async database synchronization
    const baseMedId = target.medicationId || compositeId.split("_")[0];
    try {
      await toggleDoseLog({
        medication_id: baseMedId,
        time_slot: target.timing,
        taken: nextTaken,
      });
    } catch (err) {
      console.error("Failed to sync dose log to server:", err);
    }
  };

  /* ── Per-window metrics ───────────────────────────────────── */
  const windowMeds = useMemo(() => ({
    morning: meds.filter((m) => m.timing === "morning"),
    noon: meds.filter((m) => m.timing === "noon"),
    night: meds.filter((m) => m.timing === "night"),
  }), [meds]);

  const totalDoses = meds.length;
  const totalTaken = meds.filter((m) => m.taken).length;
  const adherencePct = totalDoses > 0 ? Math.round((totalTaken / totalDoses) * 100) : 0;

  const filtered = windowMeds[activeTab];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-vault-teal dark:text-teal-400">
            {t("planner.title")}
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {t("planner.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Adherence Pill — total daily expected doses */}
          <div className="flex items-center gap-2 rounded-xl border border-vault-border bg-card px-3.5 py-2 shadow-xs dark:border-border">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("planner.todayDosesTaken")}
              </p>
              <p className="text-xs font-bold text-foreground">
                {totalTaken} {t("planner.of")} {totalDoses} {t("planner.taken")} ({adherencePct}%)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-vault-teal"
            onClick={fetchMeds}
            disabled={isLoading}
            title={t("planner.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── View Tabs: Schedule / Manage ── */}
      <div className="flex rounded-xl border border-vault-border bg-vault-surface p-1 shadow-xs dark:border-border dark:bg-card">
        <button
          type="button"
          onClick={() => setView("schedule")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer",
            view === "schedule"
              ? "bg-vault-teal text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ClipboardList className="h-4 w-4" />
          <span>{t("planner.todaySchedule")}</span>
        </button>
        <button
          type="button"
          onClick={() => setView("manage")}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all cursor-pointer",
            view === "manage"
              ? "bg-vault-teal text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pill className="h-4 w-4" />
          <span>{t("planner.manageMedicines")}</span>
        </button>
      </div>

      {/* ── Manage Active Medicines View ── */}
      {view === "manage" && <MedicationManagerTab />}

      {/* ── Today's Schedule View ── */}
      {view === "schedule" && (
        <>
          {/* Loading Skeleton */}
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border border-vault-border dark:border-border">
                  <CardContent className="flex items-center gap-3 p-4">
                    <Skeleton className="h-11 w-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
              <p className="text-sm font-semibold text-red-700">Error: {error}</p>
              <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={fetchMeds}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {t("planner.retry")}
              </Button>
            </div>
          ) : (
            <>
              {/* ── Consolidated Interactive Time-Window Control Cards (Unified Filter & Metric) ── */}
              <div className="grid gap-3 sm:grid-cols-3" role="tablist">
                {timeWindows.map((tw) => {
                  const slotMeds = windowMeds[tw.key];
                  const count = slotMeds.length;
                  const taken = slotMeds.filter((m) => m.taken).length;
                  const isCurrent = activeTab === tw.key;
                  const Icon = tw.icon;
                  return (
                    <button
                      key={tw.key}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => setActiveTab(tw.key)}
                      className={cn(
                        "flex w-full text-left items-center gap-3.5 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-xs",
                        isCurrent
                          ? "border-2 border-[#0A8C6A] bg-[#0A8C6A]/10 shadow-sm ring-1 ring-[#0A8C6A]/30 dark:border-[#0A8C6A] dark:bg-[#0A8C6A]/20"
                          : "border border-vault-border bg-card hover:border-[#0A8C6A]/40 opacity-75 hover:opacity-100 dark:border-border dark:bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors shadow-xs",
                          isCurrent
                            ? "bg-[#0A8C6A] text-white"
                            : "bg-vault-light text-[#0A8C6A] dark:bg-vault-dark dark:text-vault-light"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-bold text-foreground">
                            {t(tw.labelKey)}
                          </p>
                          {isCurrent && (
                            <span className="inline-block h-2 w-2 rounded-full bg-[#0A8C6A]" />
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {tw.timeRange}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-xs font-bold transition-colors",
                              isCurrent
                                ? "bg-[#0A8C6A]/20 text-[#0A8C6A] dark:bg-teal-950/60 dark:text-teal-300"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {taken}/{count} {t("planner.dosesTaken")}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── Medication Timeline for Active Window ── */}
              {filtered.length > 0 ? (
                <MedicationTimeline
                  medications={filtered}
                  onToggleTaken={toggleTaken}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-vault-border bg-card py-12 text-center dark:border-border">
                  <Pill className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {t("planner.noMedsScheduled")} {t(`planner.${activeTab === "noon" ? "afternoon" : activeTab}`)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {totalDoses === 0
                      ? t("planner.noActiveMeds")
                      : t("planner.switchWindow")}
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Reminder & Synchronization Card ── */}
      <Card className="border border-dashed border-vault-border bg-vault-surface/40 dark:border-border dark:bg-card">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-vault-light text-vault-teal dark:bg-vault-dark">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">
              {t("planner.automatedAlerts")}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("planner.alertsSub")}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
