"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock,
  Moon,
  Pill,
  RefreshCw,
  Sunrise,
  Sun,
  Sparkles,
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
import MealScheduleModal from "@/components/planner/MealScheduleModal";
import { cn } from "@/lib/utils";
import {
  getActiveMedications,
  getTodayDoseLogs,
  toggleDoseLog,
} from "@/services/medicationService";
import {
  getRoutineSchedule,
  type RoutineSchedule,
} from "@/services/routineService";
import type { MedicationDetailResponse } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import {
  parseMedSchedule,
  getSlotsForSchedule,
  SLOT_TIMES,
  type SlotKey,
} from "@/lib/scheduleParser";
import { useToast } from "@/components/ui/toast";

/* ── Time-window definitions ────────────────────────────────────── */

type TimeKey = SlotKey; // "morning" | "noon" | "night"

interface TimeWindow {
  key: TimeKey;
  labelKey: string;
  defaultTimeRange: string;
  icon: typeof Sunrise;
}

const timeWindows: TimeWindow[] = [
  { key: "morning", labelKey: "planner.morning", defaultTimeRange: "08:00 AM", icon: Sunrise },
  { key: "noon", labelKey: "planner.afternoon", defaultTimeRange: "01:30 PM", icon: Sun },
  { key: "night", labelKey: "planner.night", defaultTimeRange: "08:30 PM", icon: Moon },
];

/* ── Helper: 24h "HH:MM" → 12h "hh:mm AM/PM" ──────────────────── */

function format12HourTime(timeStr?: string, defaultFallback = "08:00 AM"): string {
  if (!timeStr || !timeStr.includes(":")) return defaultFallback;
  try {
    const [hStr, mStr] = timeStr.split(":");
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    const hFormatted = h < 10 ? `0${h}` : `${h}`;
    return `${hFormatted}:${mStr} ${ampm}`;
  } catch {
    return defaultFallback;
  }
}

/* ── Helper: parse "HH:MM" to minutes from midnight ─────────────── */

function parseTimeToMinutes(timeStr?: string, defaultMins = 0): number {
  if (!timeStr || !timeStr.includes(":")) return defaultMins;
  try {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  } catch {
    return defaultMins;
  }
}

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
    let slots: SlotKey[] = [];
    if (m.time_slots && Array.isArray(m.time_slots) && m.time_slots.length > 0) {
      const rawSlots = m.time_slots.map((s) => {
        const lower = s.toLowerCase();
        if (lower === "morning") return "morning" as SlotKey;
        if (lower === "afternoon" || lower === "noon") return "noon" as SlotKey;
        if (lower === "night" || lower === "evening") return "night" as SlotKey;
        return "morning" as SlotKey;
      });
      slots = Array.from(new Set(rawSlots));
    } else {
      const schedule = parseMedSchedule(
        m.dosage_schedule,
        m.timing,
        m.frequency,
      );
      slots = getSlotsForSchedule(schedule);
    }
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isUrdu = locale === "ur";

  const [view, setView] = useState<PageView>("schedule");
  const [activeTab, setActiveTab] = useState<TimeKey>("morning");
  const [meds, setMeds] = useState<PlannedMed[]>([]);
  const [routineSchedule, setRoutineSchedule] = useState<RoutineSchedule | null>(null);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Keep client time updated every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentTimeMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync initial activeTab from URL searchParams
  const slotParam = searchParams.get("slot") as TimeKey | null;
  useEffect(() => {
    if (slotParam && ["morning", "noon", "night"].includes(slotParam)) {
      setActiveTab(slotParam);
    }
  }, [slotParam]);

  const selectSlot = (slotKey: TimeKey) => {
    setActiveTab(slotKey);
    router.replace(`/planner?slot=${slotKey}`, { scroll: false });
  };

  /* ── Evaluate Active Live Slot ─────────────────────────────────── */
  const activeLiveSlot = useMemo<TimeKey | null>(() => {
    const bMins = parseTimeToMinutes(routineSchedule?.breakfast_time, 8 * 60);
    const lMins = parseTimeToMinutes(routineSchedule?.lunch_time, 13 * 60 + 30);
    const dMins = parseTimeToMinutes(routineSchedule?.dinner_time, 20 * 60 + 30);

    const m_l_mid = Math.floor((bMins + lMins) / 2);
    const l_d_mid = Math.floor((lMins + dMins) / 2);

    if (currentTimeMinutes >= 300 && currentTimeMinutes < m_l_mid) {
      return "morning";
    } else if (currentTimeMinutes >= m_l_mid && currentTimeMinutes < l_d_mid) {
      return "noon";
    } else if (currentTimeMinutes >= l_d_mid || currentTimeMinutes < 300) {
      return "night";
    }
    return null;
  }, [currentTimeMinutes, routineSchedule]);

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

  /* ── Fetch routine schedule ────────────────────────────────────── */
  const fetchRoutine = useCallback(async () => {
    try {
      const schedule = await getRoutineSchedule();
      setRoutineSchedule(schedule);
    } catch (e) {
      console.error("Failed to fetch routine schedule:", e);
    }
  }, []);

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
    if (user?.id) {
      fetchMeds();
      fetchRoutine();
    }
  }, [fetchMeds, fetchRoutine, user?.id]);

  /* ── Multi-Tab Sync via BroadcastChannel ──────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
    try {
      const channel = new BroadcastChannel("hv_dose_updates");
      channel.onmessage = (event) => {
        console.log("BroadcastChannel message received:", event.data);
        fetchMeds();
      };
      return () => {
        channel.close();
      };
    } catch (e) {
      // Ignore fallback
    }
  }, [fetchMeds]);

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

      // Notify other tabs
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("hv_dose_updates");
        channel.postMessage({ type: "DOSE_TOGGLED", compositeId, taken: nextTaken });
      }
    } catch (err) {
      console.error("Failed to sync dose log to server:", err);
    }
  };

  /* ── Single-Click "Mark Slot Complete" Action ──────────────────── */
  const markSlotComplete = async (slotKey: TimeKey) => {
    const slotMeds = meds.filter((m) => m.timing === slotKey && !m.taken);
    if (slotMeds.length === 0) return;

    // 1. Optimistic UI update
    setMeds((prev) =>
      prev.map((m) => (m.timing === slotKey ? { ...m, taken: true } : m))
    );

    // 2. Optimistic local cache update
    const currentCache = getLocalDoseCache();
    slotMeds.forEach((m) => {
      currentCache[m.id] = true;
    });
    saveLocalDoseCache(currentCache);

    toast({
      title: isUrdu
        ? "اس وقت کی تمام ادویات مکمل درج کر دی گئیں۔"
        : `Marked all ${slotKey} doses as taken.`,
      variant: "success",
    });

    // 3. Sync to server in parallel
    try {
      await Promise.all(
        slotMeds.map((m) =>
          toggleDoseLog({
            medication_id: m.medicationId || m.id.split("_")[0],
            time_slot: m.timing,
            taken: true,
          })
        )
      );

      // Broadcast update across open tabs
      if (typeof BroadcastChannel !== "undefined") {
        const channel = new BroadcastChannel("hv_dose_updates");
        channel.postMessage({ type: "SLOT_COMPLETED", slot: slotKey });
      }
    } catch (err) {
      console.error("Failed to mark slot complete on backend:", err);
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

  // Helper for dynamic window time display (e.g., 08:00 AM · Breakfast)
  const getWindowTimeLabel = (key: TimeKey) => {
    if (key === "morning") {
      const time = format12HourTime(routineSchedule?.breakfast_time, "08:00 AM");
      return `${time} · ${isUrdu ? "صبح کا ناشتہ" : "Breakfast"}`;
    }
    if (key === "noon") {
      const time = format12HourTime(routineSchedule?.lunch_time, "01:30 PM");
      return `${time} · ${isUrdu ? "دوپہر کا کھانا" : "Lunch"}`;
    }
    const time = format12HourTime(routineSchedule?.dinner_time, "08:30 PM");
    return `${time} · ${isUrdu ? "رات کا کھانا" : "Dinner"}`;
  };

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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Custom Routine Timings Trigger Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRoutineModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold border-emerald-600/40 text-emerald-700 dark:text-emerald-300 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
          >
            <Clock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{t("planner.customRoutineTimings", "Custom Routine Timings")}</span>
          </Button>

          {/* Adherence Pill — total daily expected doses */}
          <div className="flex items-center gap-2 rounded-xl border border-vault-border bg-card px-3.5 py-1.5 shadow-xs dark:border-border">
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
              {/* ── Time-Window Slot Cards (Refactored Header & Status Row) ── */}
              <div className="grid gap-3 sm:grid-cols-3" role="tablist">
                {timeWindows.map((tw) => {
                  const slotMeds = windowMeds[tw.key];
                  const count = slotMeds.length;
                  const taken = slotMeds.filter((m) => m.taken).length;
                  const untakenCount = count - taken;
                  const isSelected = activeTab === tw.key;
                  const isLiveActive = activeLiveSlot === tw.key;
                  const isComplete = count > 0 && untakenCount === 0;
                  const Icon = tw.icon;
                  const displayTime = getWindowTimeLabel(tw.key);

                  return (
                    <div
                      key={tw.key}
                      onClick={() => selectSlot(tw.key)}
                      className={cn(
                        "relative flex flex-col justify-between min-h-[116px] rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-xs",
                        isSelected
                          ? "border-2 border-[#0A8C6A] bg-[#0A8C6A]/5 dark:bg-[#0A8C6A]/15 shadow-sm ring-1 ring-[#0A8C6A]/20"
                          : "border border-slate-200 dark:border-white/10 hover:border-slate-300 bg-card hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                      )}
                    >
                      {/* Header Row: Left Icon + Title, Right Time & Meal hint */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                              isSelected
                                ? "bg-[#0A8C6A] text-white"
                                : "bg-vault-light text-[#0A8C6A] dark:bg-vault-dark dark:text-vault-light"
                            )}
                          >
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-bold text-foreground">
                              {t(tw.labelKey)}
                            </p>
                            {isLiveActive && (
                              <span
                                className="relative flex h-2 w-2 shrink-0"
                                title={t("planner.activeSlotBadge", "Active Window")}
                              >
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: Scheduled time & meal hint (08:00 AM · Breakfast) */}
                        <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                          {displayTime}
                        </span>
                      </div>

                      {/* Sub-row / Status Area: Single clean chip on left, Mark Complete on right */}
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {count === 0 ? (
                          <span className="rounded-md px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                            0 {t("planner.dosesScheduled", "Doses Scheduled")}
                          </span>
                        ) : isComplete ? (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {taken}/{count} {t("planner.taken", "Taken")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50">
                            {untakenCount}/{count} {t("planner.dosesPending", "Pending")}
                          </span>
                        )}

                        {/* Single-Click "Mark Slot Complete" Button — ONLY on live active window with pending doses */}
                        {isLiveActive && untakenCount > 0 && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markSlotComplete(tw.key);
                            }}
                            className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                            <span>{t("planner.markSlotComplete", "Mark Complete")}</span>
                          </Button>
                        )}
                      </div>
                    </div>
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

      {/* ── Meal Routine Timings Modal ── */}
      <MealScheduleModal
        isOpen={isRoutineModalOpen}
        onClose={() => setIsRoutineModalOpen(false)}
        currentSchedule={routineSchedule}
        onSaved={(updated) => {
          setRoutineSchedule(updated);
        }}
      />
    </div>
  );
}
