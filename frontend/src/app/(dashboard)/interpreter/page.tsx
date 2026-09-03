"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  Scan,
  UploadCloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrescriptionAIChat } from "@/components/interpreter/PrescriptionAIChat";
import { PrescriptionMedicineCard } from "@/components/interpreter/PrescriptionMedicineCard";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { uploadAndInterpret } from "@/services/interpreterService";
import type { ExtractionResponse } from "@/types/api";

/* ── Rich Processing / Scanning Skeleton Component ── */
function ProcessingStateCard({
  step,
  isUrdu,
}: {
  step: number;
  isUrdu: boolean;
}) {
  const stepsEN = [
    "Reading & Scanning Prescription Document...",
    "LangGraph Parsing Medications, Dosages & Timings...",
    "Synthesizing Grounded Advice & Simple Instructions...",
  ];

  const stepsUR = [
    "طبی دستاویزات کی اسکیننگ جارہی ہے...",
    "ادویات، خوراک اور اوقات کا تجزیہ...",
    "رہنمائی اور اے آئی کا تیاری...",
  ];

  const activeSteps = isUrdu ? stepsUR : stepsEN;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-2 border-[#0D5C4A]/40 bg-gradient-to-br from-[#0D5C4A]/5 via-background to-emerald-500/5 shadow-xl dark:border-teal-500/40 dark:from-teal-950/30 dark:to-card">
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#0D5C4A] via-emerald-400 to-[#0D5C4A] animate-pulse"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>

        <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center sm:py-12">
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0D5C4A]/20 to-emerald-500/20 p-4 shadow-lg backdrop-blur-md dark:from-teal-500/20 dark:to-emerald-900/30">
            <div className="absolute inset-0 rounded-3xl border-2 border-[#0D5C4A]/40 animate-ping opacity-25" />
            <Scan className="h-10 w-10 text-[#0D5C4A] animate-bounce dark:text-teal-300" />
            <BrainCircuit className="absolute -top-2 -right-2 h-6 w-6 text-emerald-600 animate-spin dark:text-emerald-400" />
          </div>

          <div className="mt-6 space-y-1.5 max-w-md">
            <h2 className="text-lg font-black tracking-tight text-foreground sm:text-xl">
              {isUrdu ? "طبی نسخے کی تشریح و تجزیہ" : "Prescription Analysis"}
            </h2>
            <p className="text-xs text-muted-foreground font-medium">
              {isUrdu
                ? "ادویات کے درست استعمال اور اوقات کی پروسیسنگ"
                : "Parsing medication details, dosages, and patient instructions"}
            </p>
          </div>

          <div className="mt-6 w-full max-w-md space-y-2.5">
            {activeSteps.map((text, idx) => {
              const isCompleted = step > idx;
              const isCurrent = step === idx;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-xl border p-3 transition-all duration-300 ${
                    isCurrent
                      ? "border-[#0D5C4A] bg-[#0D5C4A]/10 text-foreground shadow-xs dark:bg-teal-950/50"
                      : isCompleted
                      ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground"
                      : "border-border/50 bg-muted/20 opacity-40"
                  }`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#0D5C4A] dark:text-teal-300" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                  <span className={`text-xs font-bold ${isCurrent ? "text-[#0D5C4A] dark:text-teal-300" : ""}`}>
                    {text}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 opacity-75">
        <div className="h-16 w-full animate-pulse rounded-2xl bg-muted/40 border border-border/50" />
        <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40 border border-border/50" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40 border border-border/50" />
          <div className="h-32 w-full animate-pulse rounded-xl bg-muted/40 border border-border/50" />
        </div>
      </div>
    </div>
  );
}

export default function InterpreterPage() {
  const { user } = useAuth();
  const { locale, dir } = useLanguage();
  const isUrdu = locale === "ur";

  const [currentRecord, setCurrentRecord] = useState<ExtractionResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const medications = currentRecord?.medications || [];

  /* ── Upload & Sample Triggers ── */
  const runProgressSteps = () => {
    setProcessingStep(0);
    const t1 = setTimeout(() => setProcessingStep(1), 600);
    const t2 = setTimeout(() => setProcessingStep(2), 1400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  };

  const handleFileUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.png,.jpg,.jpeg";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsUploading(true);
      setError(null);
      const cancelSteps = runProgressSteps();

      try {
        const result = await uploadAndInterpret(file);
        setCurrentRecord(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        cancelSteps();
        setIsUploading(false);
      }
    };
    input.click();
  };

  const isProcessing = isUploading;

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12" dir={dir}>
      {/* Title & Subtitle Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0D5C4A]/10 text-[#0D5C4A] shadow-2xs dark:bg-teal-500/20 dark:text-teal-300">
            <Pill className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {isUrdu ? "نسخہ و ادویات معاون" : "Prescription Explainer"}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {isUrdu
            ? "اپنا نسخہ اپلوڈ کریں اور ادویات کے درست استعمال کے بارے میں سوالات پوچھیں۔"
            : "Upload any prescription to get simple dosage instructions and ask questions."}
        </p>
      </div>

      {/* Production-Ready Clean Dropzone Card */}
      {!isProcessing && (
        <Card className="border border-dashed border-[#0D5C4A]/40 bg-gradient-to-br from-[#0D5C4A]/5 via-background to-emerald-500/5 shadow-xs dark:border-teal-500/40 dark:bg-card">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-8 text-center sm:py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0D5C4A] text-white shadow-md">
              <UploadCloud className="h-8 w-8" />
            </div>

            <div className="space-y-1 max-w-md">
              <h2 className="text-base font-extrabold text-foreground sm:text-lg">
                {isUrdu ? "اپنا طبی نسخہ اپلوڈ کریں" : "Upload Prescription File"}
              </h2>
              <p className="text-xs text-muted-foreground font-medium">
                {isUrdu
                  ? "پی ڈی ایف یا تصویر اپلوڈ کریں (PDF, PNG, JPG)"
                  : "Upload PDF or image of your doctor's prescription (PDF, PNG, JPG)"}
              </p>
            </div>

            {error && <p className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-lg">{error}</p>}

            <Button
              className="mt-2 h-10 bg-[#0D5C4A] px-6 text-xs font-extrabold text-white shadow-xs hover:bg-[#0D5C4A]/90 rounded-xl"
              onClick={handleFileUpload}
              disabled={isUploading}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {isUrdu ? "فائل منتخب کریں" : "Select Document"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing State Skeleton */}
      {isProcessing && <ProcessingStateCard step={processingStep} isUrdu={isUrdu} />}

      {/* Main Results View */}
      {!isProcessing && currentRecord && (
        <div className="space-y-6">
          {/* Header Card (Doctor & Diagnoses) — NO AUDIO BUTTON */}
          <Card className="border border-[#DCE8E5] bg-[#0D5C4A]/5 shadow-xs dark:border-border dark:bg-teal-950/20">
            <CardHeader className="py-4 px-4 sm:px-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base font-extrabold text-foreground">
                      {currentRecord.doctor_name || (isUrdu ? "طبی معالج" : "Doctor")}
                    </CardTitle>
                    {currentRecord.hospital_name && (
                      <Badge
                        variant="outline"
                        className="border-[#0D5C4A]/30 bg-white/80 text-xs font-bold text-[#0D5C4A] dark:bg-card dark:text-teal-300"
                      >
                        {currentRecord.hospital_name}
                      </Badge>
                    )}
                  </div>
                  {currentRecord.consultation_date && (
                    <p className="text-xs text-muted-foreground">
                      {isUrdu ? "تاریخ:" : "Date:"} {String(currentRecord.consultation_date)}
                    </p>
                  )}
                </div>

                {/* Diagnosis Badges */}
                {currentRecord.diagnoses && currentRecord.diagnoses.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {currentRecord.diagnoses.map((dx, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-bold dark:border-border dark:bg-card"
                      >
                        {dx}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Compact Medicine Cards Grid */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">
              {isUrdu
                ? `تجویز کردہ ادویات (${medications.length})`
                : `Prescription Dosage Instructions (${medications.length})`}
            </h2>

            {/* Grid 2-column or 3-column */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {medications.map((med, idx) => (
                <PrescriptionMedicineCard
                  key={idx}
                  med={med}
                  index={idx}
                  isUrdu={isUrdu}
                />
              ))}
            </div>
          </div>

          {/* Prescription AI Assistant Chatbot */}
          <PrescriptionAIChat
            currentRecord={currentRecord}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
