"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultDocumentType } from "@/types/api";
import { useLanguage } from "@/context/LanguageContext";

export type ProcessingStage =
  | "idle"
  | "reading"
  | "identifying"
  | "verifying"
  | "uploading"
  | "ocr_processing"
  | "ai_extraction"
  | "verification"
  | "complete"
  | "error";

interface LiveClinicalScannerProps {
  stage: ProcessingStage;
  streamStep?: "reading" | "identifying" | "verifying" | "complete" | "error" | "idle";
  percent?: number;
  messageEn?: string;
  messageUr?: string;
  fileName?: string;
  previewUrl?: string;
  documentType?: VaultDocumentType;
  className?: string;
}

interface StepInfo {
  id: string;
  matchStages: string[];
  en: string;
  ur: string;
  targetPercent: number;
}

const STREAM_CLINICAL_STEPS: StepInfo[] = [
  {
    id: "reading",
    matchStages: ["reading", "uploading"],
    en: "Reading your document...",
    ur: "آپ کی فائل پڑھی جا رہی ہے...",
    targetPercent: 35,
  },
  {
    id: "identifying",
    matchStages: ["identifying", "ocr_processing", "ai_extraction"],
    en: "Identifying medicines and dosages...",
    ur: "ادویات اور خوراک کی تفصیل سمجھی جا رہی ہے...",
    targetPercent: 70,
  },
  {
    id: "verifying",
    matchStages: ["verifying"],
    en: "Checking doctor instructions...",
    ur: "ڈاکٹر کی ہدایات کی تصدیق کی جا رہی ہے...",
    targetPercent: 90,
  },
];

const HEALTH_TIPS_EN = [
  "HealthVault standardizes doctor notes into clear morning, afternoon, and night schedules.",
  "Dosages and drug safety guidelines are cross-referenced with accredited medical standards.",
  "Doctor handwriting and bilingual prescription directions are deciphered accurately.",
  "Your medical documents are secured with AES-256 encryption and always kept private.",
  "Prescriptions saved to your Vault are immediately accessible in your Emergency Health Profile.",
];

const HEALTH_TIPS_UR = [
  "ہیلتھ والٹ ڈاکٹر کے نسخے کو صبح، دوپہر اور رات کے واضح اوقات میں تبدیل کرتا ہے۔",
  "ادویات کی خوراک اور احتیاطی تدابیر کو تصدیق شدہ طبی معیار سے چیک کیا جاتا ہے۔",
  "ڈاکٹر کی تحریر اور اردو ہدایات کو آسانی سے پڑھ کر واضح سمجھایا جاتا ہے۔",
  "آپ کے تمام طبی کاغذات جدید ترین AES-256 انکرپشن کے ساتھ محفوظ رہتے ہیں۔",
  "والٹ میں محفوظ نسخے آپ کے ایمرجنسی ہیلتھ کارڈ پر فوری دستیاب ہوتے ہیں۔",
];

export default function LiveClinicalScanner({
  stage,
  streamStep,
  percent: propPercent,
  messageEn,
  messageUr,
  fileName,
  previewUrl,
  documentType = "prescription",
  className,
}: LiveClinicalScannerProps) {
  const { locale, dir } = useLanguage();
  const isUrdu = locale === "ur";
  const [tipIndex, setTipIndex] = useState(0);

  const tips = isUrdu ? HEALTH_TIPS_UR : HEALTH_TIPS_EN;

  // Rotate health tips every 3.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [tips.length]);

  // Determine current active step index
  const activeStageKey = streamStep || stage;
  let activeIndex = 0;
  if (activeStageKey === "reading" || activeStageKey === "uploading") {
    activeIndex = 0;
  } else if (
    activeStageKey === "identifying" ||
    activeStageKey === "ocr_processing" ||
    activeStageKey === "ai_extraction"
  ) {
    activeIndex = 1;
  } else if (activeStageKey === "verifying") {
    activeIndex = 2;
  } else if (activeStageKey === "complete") {
    activeIndex = 3;
  }

  // Calculate dynamic progress percent (0 -> 35 -> 70 -> 100)
  const computedPercent =
    propPercent !== undefined
      ? propPercent
      : activeStageKey === "complete"
        ? 100
        : activeIndex === 0
          ? 35
          : activeIndex === 1
            ? 70
            : 88;

  // Active friendly message
  const defaultStepMsg = STREAM_CLINICAL_STEPS[Math.min(activeIndex, 2)];
  const currentMessage = isUrdu
    ? messageUr || defaultStepMsg?.ur || "آپ کی فائل پڑھی جا رہی ہے..."
    : messageEn || defaultStepMsg?.en || "Reading your document...";

  return (
    <div
      dir={dir}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7]/70 dark:bg-[#223431] p-5 sm:p-6 shadow-md transition-all text-[#1A2826] dark:text-white",
        className
      )}
    >
      {/* Background ambient gradient glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#0D5C4A]/10 dark:bg-teal-950/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-[#0D5C4A]/5 dark:bg-teal-950/20 blur-3xl" />

      {/* ── Top Soft Animated Pulsing Pill ── */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-full border border-[#0D5C4A]/20 bg-white/90 dark:bg-[#1A2826] px-3.5 py-1.5 shadow-xs backdrop-blur-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0D5C4A] opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0D5C4A]" />
          </span>
          <span className="text-xs font-bold text-[#0D5C4A] dark:text-[#B2DFD4]">
            {currentMessage}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0D5C4A] dark:text-[#B2DFD4]">
          <span>{computedPercent}%</span>
        </div>
      </div>

      {/* ── Linear Progress Bar (0% -> 35% -> 70% -> 100%) ── */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-[#DCE8E5] dark:bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-[#0D5C4A] via-[#0A8C6A] to-teal-400 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${computedPercent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      <div className="relative z-10 grid gap-6 md:grid-cols-[180px_1fr] items-center">
        {/* ── Left: Document Preview & Laser Line ── */}
        <div className="relative mx-auto flex h-48 w-36 sm:h-52 sm:w-40 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Reading Document"
              className="h-full w-full object-cover filter contrast-105 opacity-90"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A] mb-2">
                <FileText className="h-6 w-6" />
              </div>
              <p className="line-clamp-2 text-[11px] font-semibold text-[#1A2826] dark:text-white">
                {fileName || (isUrdu ? "طبی نسخہ" : "Prescription")}
              </p>
            </div>
          )}

          {/* Animated Scanning Beam */}
          <motion.div
            className="pointer-events-none absolute left-0 right-0 z-20"
            initial={{ top: "0%" }}
            animate={{ top: ["5%", "92%", "5%"] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#0D5C4A] to-transparent shadow-[0_0_10px_#0D5C4A]" />
            <div className="h-5 w-full bg-gradient-to-b from-[#0D5C4A]/15 to-transparent" />
          </motion.div>

          {/* Corner Markers */}
          <div className="pointer-events-none absolute top-1.5 left-1.5 h-3 w-3 border-t-2 border-l-2 border-[#0D5C4A]" />
          <div className="pointer-events-none absolute top-1.5 right-1.5 h-3 w-3 border-t-2 border-r-2 border-[#0D5C4A]" />
          <div className="pointer-events-none absolute bottom-1.5 left-1.5 h-3 w-3 border-b-2 border-l-2 border-[#0D5C4A]" />
          <div className="pointer-events-none absolute bottom-1.5 right-1.5 h-3 w-3 border-b-2 border-r-2 border-[#0D5C4A]" />
        </div>

        {/* ── Right: Real-time Stages & Reassuring Health Insight ── */}
        <div className="flex flex-col justify-between space-y-3.5">
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A]">
                <HeartPulse className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1A2826] dark:text-white">
                  {isUrdu ? "طبی رہنمائی تیار ہو رہی ہے" : "Understanding Your Care Plan"}
                </h4>
                <p className="text-[11px] font-medium text-[#3D5450] dark:text-[#B2DFD4]">
                  {isUrdu
                    ? "ڈاکٹر کے نسخے اور دوائیوں کی تفصیل کا جائزہ"
                    : "Reviewing medication names, dosage fractions, and schedules"}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white dark:bg-teal-950/60 px-2.5 py-1 text-[11px] font-bold text-[#0D5C4A] dark:text-[#B2DFD4] border border-[#DCE8E5] dark:border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0D5C4A]" />
              <span>{isUrdu ? "مکمل محفوظ" : "Private & Encrypted"}</span>
            </div>
          </div>

          {/* Sequential Live Steps */}
          <div className="space-y-2">
            {STREAM_CLINICAL_STEPS.map((step, idx) => {
              const isCompleted = idx < activeIndex || activeStageKey === "complete";
              const isCurrent = idx === activeIndex && activeStageKey !== "complete" && activeStageKey !== "error";
              const stepLabel = isUrdu ? step.ur : step.en;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all",
                    isCurrent
                      ? "bg-white dark:bg-teal-950/50 border border-[#0D5C4A]/30 shadow-xs"
                      : isCompleted
                        ? "bg-white/60 dark:bg-[#1A2826]/40"
                        : "opacity-40"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0D5C4A]" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#0D5C4A]" />
                  ) : (
                    <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300 dark:border-white/20" />
                  )}

                  <span
                    className={cn(
                      "text-xs flex-1 min-w-0 truncate",
                      isCurrent
                        ? "text-[#0D5C4A] dark:text-[#B2DFD4] font-bold"
                        : isCompleted
                          ? "text-[#1A2826] dark:text-white font-medium"
                          : "text-[#3D5450] dark:text-slate-400 font-normal"
                    )}
                  >
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Patient Reassurance Insight Box */}
          <div className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white/80 dark:bg-[#1A2826] p-2.5 sm:px-3.5">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#0D5C4A] text-[10px] font-bold text-white">
                i
              </span>
              <div className="flex-1 overflow-hidden min-h-[2.2rem]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#0D5C4A] dark:text-[#0A8C6A]">
                  {isUrdu ? "مفید طبی معلومات" : "Helpful Health Insight"}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={tipIndex}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs text-[#3D5450] dark:text-[#B2DFD4] leading-snug"
                  >
                    {tips[tipIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
