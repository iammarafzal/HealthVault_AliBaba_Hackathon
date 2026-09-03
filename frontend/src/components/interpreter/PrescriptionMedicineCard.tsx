"use client";

import React from "react";
import { Moon, Sun, SunMedium, Utensils, UtensilsCrossed } from "lucide-react";
import type { ExtractedMedication } from "@/types/api";

interface PrescriptionMedicineCardProps {
  med: ExtractedMedication;
  index: number;
  isUrdu: boolean;
}

export function PrescriptionMedicineCard({
  med,
  index,
  isUrdu,
}: PrescriptionMedicineCardProps) {
  const tb = med.timing_breakdown || {};
  const comb = `${med.timing || ""} ${med.frequency || ""} ${med.instructions_ur || ""} ${med.instructions_en || ""}`.toLowerCase();

  const isOnlyEvening =
    (comb.includes("شام کو") || comb.includes("evening") || comb.includes("once daily in the evening") || comb.includes("روزانہ شام")) &&
    !comb.includes("1+1") &&
    !comb.includes("1+1+1") &&
    !comb.includes("1+0+1") &&
    !comb.includes("صبح") &&
    !comb.includes("bd");

  const morningActive = isOnlyEvening
    ? false
    : (tb.morning ?? (comb.includes("صبح") || comb.includes("morning") || comb.includes("1+1") || comb.includes("1+1+1") || comb.includes("1+0+1") || comb.includes("1-0-1") || comb.includes("bd")));

  const afternoonActive = isOnlyEvening
    ? false
    : (tb.afternoon ?? (comb.includes("دوپہر") || comb.includes("afternoon") || comb.includes("1+1+1") || comb.includes("0+1+0")));

  const nightActive = isOnlyEvening
    ? true
    : (tb.night ?? (comb.includes("شام") || comb.includes("رات") || comb.includes("night") || comb.includes("evening") || comb.includes("1+1") || comb.includes("1+1+1") || comb.includes("1+0+1") || comb.includes("1-0-1") || comb.includes("0+0+1")));

  const isBeforeMeal =
    med.meal_context === "before_meal" ||
    comb.includes("پہلے") ||
    comb.includes("before") ||
    comb.includes("نہار منہ");

  // Single verified dose quantity (No generic conflicting sub-badges!)
  const doseText = isUrdu
    ? med.fraction_label_ur || med.dosage_quantity || med.dosage || "1 گولی"
    : med.dosage_quantity || med.fraction_label_en || med.dosage || "1 Tablet";

  return (
    <div className="p-3.5 bg-white dark:bg-card rounded-xl border border-[#DCE8E5] dark:border-border shadow-xs space-y-2 flex flex-col justify-between hover:border-[#0D5C4A]/60 transition-colors">
      {/* Line 1 (Header): Index Badge + Medicine Name & Form */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0D5C4A]/10 text-[11px] font-black text-[#0D5C4A] dark:bg-teal-500/20 dark:text-teal-300">
          {index + 1}
        </span>
        <h3 className="text-sm font-bold text-foreground leading-tight">
          {med.name}
        </h3>
      </div>

      {/* Line 2 (Timing & Dosage Row) */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
        {/* Compact Timing Badges */}
        <div className="flex items-center gap-1">
          <div
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              morningActive
                ? "border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                : "border border-muted/30 text-muted-foreground/30 opacity-30"
            }`}
          >
            <Sun className="h-3 w-3" />
            <span>{isUrdu ? "صبح" : "Morning"}</span>
          </div>

          <div
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              afternoonActive
                ? "border border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300"
                : "border border-muted/30 text-muted-foreground/30 opacity-30"
            }`}
          >
            <SunMedium className="h-3 w-3" />
            <span>{isUrdu ? "دوپہر" : "Afternoon"}</span>
          </div>

          <div
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
              nightActive
                ? "border border-indigo-500/30 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300"
                : "border border-muted/30 text-muted-foreground/30 opacity-30"
            }`}
          >
            <Moon className="h-3 w-3" />
            <span>{isUrdu ? "رات" : "Night"}</span>
          </div>
        </div>

        {/* Single Unified Dose Badge */}
        <div className="rounded-md border border-teal-500/40 bg-teal-500/10 px-2 py-0.5 text-[11px] font-extrabold text-[#0D5C4A] dark:text-teal-300">
          {doseText}
        </div>

        {/* Meal Timing Tag */}
        <div
          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
            isBeforeMeal
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-300"
          }`}
        >
          {isBeforeMeal ? (
            <UtensilsCrossed className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Utensils className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          )}
          <span>
            {isUrdu
              ? isBeforeMeal
                ? "کھانے سے پہلے"
                : "کھانے کے بعد"
              : isBeforeMeal
              ? "Before Meals"
              : "After Meals"}
          </span>
        </div>
      </div>

      {/* Line 3 (Patient Instruction) */}
      <div className="pt-1 border-t border-slate-100 dark:border-border/40">
        <p className={`text-xs text-slate-700 dark:text-slate-300 leading-normal ${isUrdu ? "font-urdu text-right" : "text-left"}`}>
          {isUrdu ? med.instructions_ur || med.instructions_en : med.instructions_en || med.instructions_ur}
        </p>
      </div>
    </div>
  );
}
