"use client";

import { Check, Clock, Pill, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

export interface PlannedMed {
  /** Composite key: `${medicationId}_${slot}` for per-slot tracking */
  id: string;
  /** Base medication UUID (same med appears in multiple slots) */
  medicationId?: string;
  name: string;
  dosage: string;
  instruction: string;
  instruction_ur?: string;
  timing: "morning" | "noon" | "night";
  scheduled_time: string;
  taken: boolean;
  /** Meal relation label, e.g. "After meals" */
  meal_label?: string;
  /** Meal relation label in Urdu */
  meal_label_ur?: string;
}

interface MedicationTimelineProps {
  medications: PlannedMed[];
  onToggleTaken: (id: string) => void;
}

export default function MedicationTimeline({
  medications,
  onToggleTaken,
}: MedicationTimelineProps) {
  const { locale, t } = useLanguage();

  if (medications.length === 0) {
    return (
      <Card className="border border-dashed border-vault-border bg-card dark:border-border">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-vault-light text-vault-teal dark:bg-vault-dark">
            <Pill className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            {t("planner.noMedsScheduled")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("planner.switchWindow")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((med) => {
        // Locale-aware instruction: show ONLY the active locale text
        const displayInstruction =
          locale === "ur"
            ? med.instruction_ur || med.instruction
            : med.instruction;

        // Locale-aware meal label
        const displayMeal =
          locale === "ur"
            ? med.meal_label_ur || med.meal_label
            : med.meal_label || med.meal_label_ur;

        return (
          <Card
            key={med.id}
            className={cn(
              "border transition-all duration-200 shadow-xs",
              med.taken
                ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                : "border-vault-border bg-card hover:border-vault-teal/40 dark:border-border"
            )}
          >
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-3.5 p-4">
              {/* Status icon */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors shadow-xs",
                  med.taken
                    ? "bg-emerald-600 text-white"
                    : "bg-vault-light text-vault-teal dark:bg-vault-dark dark:text-vault-light"
                )}
              >
                {med.taken ? (
                  <Check className="h-5 w-5 stroke-[2.5]" />
                ) : (
                  <Pill className="h-5 w-5" />
                )}
              </div>

              {/* Medication info */}
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    {med.name}
                  </span>
                  <span className="rounded bg-vault-light px-2 py-0.5 text-xs font-semibold text-vault-teal dark:bg-muted dark:text-foreground">
                    {med.dosage}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                    <Clock className="h-3 w-3 text-vault-teal" />
                    {med.scheduled_time}
                  </span>
                </div>

                {/* Single-locale instruction — no dual stacking */}
                {displayInstruction && (
                  <p
                    className={cn(
                      "text-xs text-muted-foreground",
                      locale === "ur" &&
                        "font-medium text-vault-teal dark:text-teal-400"
                    )}
                    dir={locale === "ur" ? "rtl" : "ltr"}
                  >
                    {displayInstruction}
                  </p>
                )}

                {/* Meal timing indicator */}
                {displayMeal && (
                  <span
                    className="inline-flex items-center rounded-md bg-vault-light px-2 py-0.5 text-[10px] font-semibold text-vault-teal dark:bg-vault-dark dark:text-teal-300"
                    dir={locale === "ur" ? "rtl" : "ltr"}
                  >
                    {displayMeal}
                  </span>
                )}
              </div>

              {/* Status badge + action button */}
              <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                {med.taken ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold"
                  >
                    <Check className="mr-1 h-3 w-3" />
                    {t("planner.taken")}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-vault-border text-xs text-muted-foreground"
                  >
                    {t("planner.pending")}
                  </Badge>
                )}

                <Button
                  variant={med.taken ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs font-bold shadow-xs",
                    med.taken
                      ? "border-border text-muted-foreground hover:bg-background"
                      : "bg-vault-teal text-white hover:bg-vault-active"
                  )}
                  onClick={() => onToggleTaken(med.id)}
                >
                  {med.taken ? (
                    <>
                      <Undo2 className="mr-1.5 h-3.5 w-3.5" />
                      {t("planner.undo")}
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      {t("planner.markAsTaken")}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
