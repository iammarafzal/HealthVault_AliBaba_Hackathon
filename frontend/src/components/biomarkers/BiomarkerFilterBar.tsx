"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BiomarkerDataPoint } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";

interface BiomarkerFilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  availableReadings: BiomarkerDataPoint[];
  selectedTestName: string;
  onSelectTestName: (testName: string) => void;
}

export function BiomarkerFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  availableReadings,
  selectedTestName,
  onSelectTestName,
}: BiomarkerFilterBarProps) {
  const { t, locale } = useLanguage();
  const isUrdu = locale === "ur";

  // Category translation helper
  const translateCategory = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "all":
      case "all tests":
        return isUrdu ? "تمام ٹیسٹ" : "All Tests";
      case "complete blood count":
      case "cbc":
        return isUrdu ? "خون کا مکمل تجزیہ (CBC)" : "Complete Blood Count (CBC)";
      case "liver function":
      case "lfts":
        return isUrdu ? "جگر کے ٹیسٹ (LFTs)" : "Liver Function (LFTs)";
      case "kidney function":
      case "rfts":
      case "renal":
        return isUrdu ? "گردے کے ٹیسٹ (RFTs)" : "Kidney Function (RFTs)";
      case "lipid profile":
        return isUrdu ? "کولیسٹرول اور لیپڈز" : "Lipid Profile";
      case "diabetes":
      case "glycemic":
        return isUrdu ? "شوگر اور ذیابیطس" : "Diabetes / Blood Sugar";
      case "thyroid":
        return isUrdu ? "تھائیرائڈ (TSH)" : "Thyroid Panel";
      case "electrolytes":
        return isUrdu ? "الیکٹرولائٹس" : "Electrolytes";
      case "vitamins":
        return isUrdu ? "وٹامنز اور آئرن" : "Vitamins & Minerals";
      case "other":
        return isUrdu ? "دیگر ٹیسٹس" : "Other Analytes";
      default:
        return cat;
    }
  };

  // Filter available test chips by category
  const filteredReadings =
    selectedCategory === "all" || selectedCategory === "All Tests"
      ? availableReadings
      : availableReadings.filter(
          (r) => r.category?.toLowerCase() === selectedCategory.toLowerCase()
        );

  const allCategories = ["all", ...categories];

  return (
    <div className="space-y-3">
      {/* ── Category Pills Horizontal Scroll Bar ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
        {allCategories.map((cat) => {
          const isActive =
            selectedCategory.toLowerCase() === cat.toLowerCase() ||
            (cat === "all" && selectedCategory === "all");

          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-200",
                isActive
                  ? "bg-vault-teal text-white shadow-xs dark:bg-teal-600"
                  : "bg-vault-light text-vault-teal hover:bg-vault-teal/10 dark:bg-card dark:text-teal-300 dark:hover:bg-teal-950/50 border border-vault-border dark:border-border"
              )}
            >
              {translateCategory(cat)}
            </button>
          );
        })}
      </div>

      {/* ── Analyte Chips Selection Grid ── */}
      {filteredReadings.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {filteredReadings.map((r) => {
            const isSelected =
              selectedTestName.toLowerCase() === (r.biomarker_name || "").toLowerCase();

            const isAbnormal = r.status === "high" || r.status === "low" || r.status === "critical";

            return (
              <button
                key={r.biomarker_name}
                onClick={() => onSelectTestName(r.biomarker_name || "")}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all duration-150 shadow-2xs",
                  isSelected
                    ? "border-vault-teal bg-vault-light/60 font-bold text-vault-teal ring-1 ring-vault-teal dark:border-teal-400 dark:bg-card dark:text-teal-300"
                    : "border-vault-border bg-card text-foreground hover:border-vault-teal/40 dark:border-border"
                )}
              >
                <span className="font-semibold">{r.biomarker_name}</span>
                <span className="text-[11px] font-bold text-muted-foreground" dir="ltr">
                  {r.value} {r.unit}
                </span>
                {isAbnormal && (
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      r.status === "high" || r.status === "critical"
                        ? "bg-vault-red animate-pulse"
                        : "bg-blue-500"
                    )}
                    title={r.status}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
