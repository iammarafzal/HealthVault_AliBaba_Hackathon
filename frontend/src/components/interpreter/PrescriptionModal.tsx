"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Globe,
  Languages,
  Pill,
  X,
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
import type { ExtractedMedication, ExtractionResponse } from "@/types/api";

type Lang = "en" | "ur";

interface PrescriptionModalProps {
  record: ExtractionResponse | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Interactive prescription interpreter modal.
 * Displays structured dosage guidance with English/Urdu toggle.
 * Supports RTL text alignment and Nastaliq typography for Urdu mode.
 */
export default function PrescriptionModal({
  record,
  isOpen,
  onClose,
}: PrescriptionModalProps) {
  const [lang, setLang] = useState<Lang>("en");

  // Reset language when modal closes/opens with new record
  useEffect(() => {
    if (isOpen) setLang("en");
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !record) return null;

  const isUrdu = lang === "ur";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative z-10 mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Pill className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {isUrdu ? "نسخہ کی تشریح" : "Prescription Interpreter"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {record.doctor_name ?? "Unknown Doctor"} —{" "}
                {record.hospital_name ?? "Unknown Hospital"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex rounded-lg border p-1">
              <button
                onClick={() => setLang("en")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  lang === "en"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLang("ur")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  lang === "ur"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                dir="rtl"
              >
                اردو
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
          {/* Diagnoses */}
          {record.diagnoses.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-primary" />
                {isUrdu ? "تشخیص" : "Diagnoses"}
              </h3>
              <div className="flex flex-wrap gap-2">
                {record.diagnoses.map((dx) => (
                  <Badge key={dx} variant="secondary">
                    {dx}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Medications with dosage guidance */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Languages className="h-4 w-4 text-emerald-500" />
              {isUrdu ? "ادویات کی ہدایات" : "Dosage Guidance"}
            </h3>
            <div className="space-y-3">
              {record.medications.map((med) => (
                <MedicationCard
                  key={med.name}
                  medication={med}
                  lang={lang}
                />
              ))}
              {record.medications.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {isUrdu
                    ? "کوئی دوائی نہیں ملی"
                    : "No medications extracted from this prescription."}
                </p>
              )}
            </div>
          </div>

          {/* Allergies / Warnings */}
          {record.allergies.length > 0 && (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" />
                {isUrdu ? "الرجی انتباہ" : "Allergy Warnings"}
              </h3>
              <div className="space-y-2">
                {record.allergies.map((a) => (
                  <div
                    key={a.allergen}
                    className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div>
                      <p className="text-sm font-semibold">{a.allergen}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.severity === "severe"
                          ? isUrdu
                            ? "شدید — فوری طبی توجہ درکار"
                            : "Severe — Immediate medical attention required"
                          : a.severity === "moderate"
                          ? isUrdu
                            ? "درمیانہ — احتیاط ضروری"
                            : "Moderate — Caution advised"
                          : isUrdu
                          ? "ہلکا"
                          : "Mild"}
                      </p>
                      {a.reaction_details && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {a.reaction_details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-background/95 px-6 py-3 backdrop-blur">
          <Button variant="outline" className="w-full" onClick={onClose}>
            {isUrdu ? "بند کریں" : "Close"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Individual medication card ────────────────────────────── */
function MedicationCard({
  medication,
  lang,
}: {
  medication: ExtractedMedication;
  lang: Lang;
}) {
  const isUrdu = lang === "ur";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{medication.name}</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {medication.dosage}
          </Badge>
        </div>
        <CardDescription>
          {medication.frequency} — {medication.timing}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`rounded-lg border p-3 text-sm leading-relaxed ${
            isUrdu ? "text-right" : "text-left"
          }`}
          dir={isUrdu ? "rtl" : "ltr"}
          lang={isUrdu ? "ur" : "en"}
        >
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {isUrdu ? "ہدایات" : "Instructions"}
          </p>
          <p className={isUrdu ? "font-sans" : ""}>
            {isUrdu
              ? medication.instructions_ur
              : medication.instructions_en}
          </p>
        </div>

        {/* Active status indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              medication.is_active ? "bg-emerald-500" : "bg-muted-foreground/30"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isUrdu
              ? medication.is_active
                ? "فعال"
                : "غیر فعال"
              : medication.is_active
              ? "Active"
              : "Inactive"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
