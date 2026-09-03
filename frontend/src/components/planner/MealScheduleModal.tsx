"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Moon,
  Sparkles,
  Sun,
  Utensils,
  X,
  Check,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import {
  type RoutineSchedule,
  getRoutineSchedule,
  updateRoutineSchedule,
} from "@/services/routineService";
import { useToast } from "@/components/ui/toast";

interface MealScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (schedule: RoutineSchedule) => void;
  currentSchedule?: RoutineSchedule | null;
}

const PRESETS = [
  {
    id: "early",
    labelEn: "Early Bird",
    labelUr: "صبح سویرے",
    breakfast: "07:00",
    lunch: "12:30",
    dinner: "19:30",
  },
  {
    id: "standard",
    labelEn: "Standard",
    labelUr: "معمول کے مطابق",
    breakfast: "08:00",
    lunch: "13:30",
    dinner: "20:30",
  },
  {
    id: "late",
    labelEn: "Late Routine",
    labelUr: "دیر سے",
    breakfast: "09:30",
    lunch: "14:30",
    dinner: "21:30",
  },
];

export default function MealScheduleModal({
  isOpen,
  onClose,
  onSaved,
  currentSchedule,
}: MealScheduleModalProps) {
  const { t, isUrdu } = useLanguage();
  const { toast } = useToast();

  const [breakfast, setBreakfast] = useState("08:00");
  const [lunch, setLunch] = useState("13:30");
  const [dinner, setDinner] = useState("20:30");
  const [leadMinutes, setLeadMinutes] = useState(15);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state with currentSchedule or fetch on open
  useEffect(() => {
    if (!isOpen) return;

    if (currentSchedule) {
      setBreakfast(currentSchedule.breakfast_time || "08:00");
      setLunch(currentSchedule.lunch_time || "13:30");
      setDinner(currentSchedule.dinner_time || "20:30");
      setLeadMinutes(currentSchedule.reminder_lead_minutes ?? 15);
    } else {
      setLoading(true);
      getRoutineSchedule()
        .then((res) => {
          setBreakfast(res.breakfast_time || "08:00");
          setLunch(res.lunch_time || "13:30");
          setDinner(res.dinner_time || "20:30");
          setLeadMinutes(res.reminder_lead_minutes ?? 15);
        })
        .catch((err) => {
          console.error("Failed to load routine schedule:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, currentSchedule]);

  if (!isOpen) return null;

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setBreakfast(preset.breakfast);
    setLunch(preset.lunch);
    setDinner(preset.dinner);
  };

  const handleSave = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      const updated = await updateRoutineSchedule({
        breakfast_time: breakfast,
        lunch_time: lunch,
        dinner_time: dinner,
        reminder_lead_minutes: leadMinutes,
      });

      toast({
        title: t(
          "planner.routineSavedToast",
          "Meal routine timings updated successfully."
        ),
        variant: "success",
      });

      if (onSaved) {
        onSaved(updated);
      }
      onClose();
    } catch (err: unknown) {
      console.error("Failed to update routine schedule:", err);
      setErrorMsg(
        isUrdu
          ? "اوقات محفوظ کرنے میں خرابی پیش آگئی۔ براہ کرم دوبارہ کوشش کریں۔"
          : "Failed to update routine schedule. Please check the timings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      dir={isUrdu ? "rtl" : "ltr"}
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {t(
                  "planner.routineModalTitle",
                  "Custom Meal & Routine Timings"
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t(
                  "planner.routineModalSubtitle",
                  "Personalize your breakfast, lunch, and dinner times for tailored dose reminders."
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto pr-2 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/50 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {t("planner.quickPresets", "Quick Presets")}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => {
                const isActive =
                  breakfast === p.breakfast &&
                  lunch === p.lunch &&
                  dinner === p.dinner;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition flex flex-col items-center gap-0.5 text-center ${
                      isActive
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="font-semibold">{isUrdu ? p.labelUr : p.labelEn}</span>
                    <span className="text-[10px] text-slate-400">
                      {p.breakfast} • {p.lunch}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meal Timing Pickers */}
          <div className="space-y-2.5">
            {/* Breakfast */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Utensils className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("planner.breakfastLabel", "Breakfast (Morning)")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isUrdu ? "صبح کا ناشتہ" : "Ante/Post Cibum base"}
                  </div>
                </div>
              </div>
              <input
                type="time"
                value={breakfast}
                onChange={(e) => setBreakfast(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Lunch */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("planner.lunchLabel", "Lunch (Afternoon)")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isUrdu ? "دوپہر کا کھانا" : "Midday regimen"}
                  </div>
                </div>
              </div>
              <input
                type="time"
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Dinner */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {t("planner.dinnerLabel", "Dinner (Night)")}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isUrdu ? "رات کا کھانا" : "Evening & bedtime regimen"}
                  </div>
                </div>
              </div>
              <input
                type="time"
                value={dinner}
                onChange={(e) => setDinner(e.target.value)}
                className="px-3 py-1.5 text-sm font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Alert Lead Offset */}
          <div className="p-3.5 rounded-xl border border-emerald-100 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
            <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 text-xs">
              <Check className="w-3.5 h-3.5" />
              {isUrdu
                ? "اسمارٹ یاد دہانی اور کھانے کے اوقات:"
                : "Smart Meal-Offset Logic:"}
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] leading-relaxed">
              <li>
                <strong>{isUrdu ? "کھانے سے پہلے (AC):" : "Before Meal (AC):"}</strong>{" "}
                {isUrdu
                  ? "مقررہ کھانے کے وقت سے 30 منٹ پہلے الرٹ موصول ہوگا۔"
                  : "Alert triggers 30 minutes before meal time."}
              </li>
              <li>
                <strong>{isUrdu ? "کھانے کے بعد (PC):" : "After Meal (PC):"}</strong>{" "}
                {isUrdu
                  ? "کھانے کے وقت یا 15 منٹ بعد الرٹ موصول ہوگا۔"
                  : "Alert triggers at meal time or +15 min."}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="text-xs h-8"
          >
            {isUrdu ? "منسوخ کریں" : "Cancel"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-4 shadow-xs flex items-center gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t("planner.savingRoutine", "Saving...")}</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t("planner.saveRoutine", "Save Routine")}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
