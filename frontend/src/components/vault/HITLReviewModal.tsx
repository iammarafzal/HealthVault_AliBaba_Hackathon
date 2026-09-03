"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  FileCheck,
  FileText,
  FlaskConical,
  Minus,
  Moon,
  Pill,
  Plus,
  RotateCw,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  SunMedium,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DocumentDraftExtractionResponse,
  ExtractedBiomarker,
  ExtractedMedication,
  VisionExtractedEntities,
} from "@/types/api";
import { resolveFileUrl } from "@/lib/vaultMappers";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface HITLReviewModalProps {
  draft: DocumentDraftExtractionResponse;
  previewUrl?: string;
  fileName?: string;
  isSaving?: boolean;
  onCancel: () => void;
  onConfirm: (confirmedData: VisionExtractedEntities) => Promise<void> | void;
}

const emptyMedication: ExtractedMedication = {
  name: "",
  dosage: "",
  frequency: "1-0-1",
  timing: "Morning & Night",
  instructions_en: "",
  instructions_ur: "",
  fraction: "full",
  meal_context: "after_meal",
  timing_breakdown: {
    morning: true,
    afternoon: false,
    night: true,
  },
  is_active: true,
};

const emptyBiomarker: ExtractedBiomarker = {
  analyte_name: "",
  value: 0,
  unit: "",
  ref_min: null,
  ref_max: null,
  status: "normal",
};

/** Parse or infer morning/afternoon/night slots from timing/frequency strings */
function inferTimingBreakdown(med: Partial<ExtractedMedication>): {
  morning: boolean;
  afternoon: boolean;
  night: boolean;
} {
  if (med.timing_breakdown) {
    return {
      morning: Boolean(med.timing_breakdown.morning),
      afternoon: Boolean(med.timing_breakdown.afternoon),
      night: Boolean(med.timing_breakdown.night),
    };
  }

  const combined = `${med.timing || ""} ${med.frequency || ""} ${med.instructions_en || ""}`.toLowerCase();
  
  // Check 1-0-1 or 1-1-1 notation
  const patternMatch = combined.match(/(\d)\s*[-/:]\s*(\d)\s*[-/:]\s*(\d)/);
  if (patternMatch) {
    return {
      morning: patternMatch[1] !== "0",
      afternoon: patternMatch[2] !== "0",
      night: patternMatch[3] !== "0",
    };
  }

  const hasMorning = combined.includes("morn") || combined.includes("صبح") || combined.includes("od") || combined.includes("bd") || combined.includes("tds");
  const hasAfternoon = combined.includes("noon") || combined.includes("afternoon") || combined.includes("دوپہر") || combined.includes("tds");
  const hasNight = combined.includes("night") || combined.includes("eve") || combined.includes("رات") || combined.includes("شام") || combined.includes("bd") || combined.includes("tds") || combined.includes("hs");

  return {
    morning: hasMorning || (!hasAfternoon && !hasNight),
    afternoon: hasAfternoon,
    night: hasNight,
  };
}

function normalizeDraft(data: VisionExtractedEntities | null | undefined): VisionExtractedEntities {
  const src: VisionExtractedEntities = data ?? {
    doctor_name: null,
    clinic_hospital_name: null,
    consultation_date: null,
    diagnoses: [],
    medications: [],
    allergies: [],
    biomarkers: [],
    raw_text: "",
  };
  return {
    doctor_name: src.doctor_name ?? "",
    clinic_hospital_name: src.clinic_hospital_name ?? "",
    consultation_date: src.consultation_date ?? "",
    diagnoses: src.diagnoses ?? [],
    medications: (src.medications ?? []).map((med) => ({
      ...emptyMedication,
      ...med,
      timing: med.timing ?? "",
      instructions_en: med.instructions_en ?? "",
      instructions_ur: med.instructions_ur ?? "",
      timing_breakdown: inferTimingBreakdown(med),
      is_active: med.is_active ?? true,
    })),
    allergies: src.allergies ?? [],
    biomarkers: (src.biomarkers ?? []).map((bio) => ({
      ...emptyBiomarker,
      ...bio,
      ref_min: bio.ref_min ?? null,
      ref_max: bio.ref_max ?? null,
      status: bio.status ?? "normal",
    })),
    raw_text: src.raw_text ?? "",
  };
}

export default function HITLReviewModal({
  draft,
  previewUrl,
  fileName,
  isSaving = false,
  onCancel,
  onConfirm,
}: HITLReviewModalProps) {
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<VisionExtractedEntities>(() =>
    normalizeDraft(draft.extracted_data)
  );
  const [diagnosisInput, setDiagnosisInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");
  const [instructionEditLang, setInstructionEditLang] = useState<Record<number, "en" | "ur">>({});
  
  // Document Viewer interactive states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fitMode, setFitMode] = useState<"width" | "contain">("width");
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [copiedRawText, setCopiedRawText] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setData(normalizeDraft(draft.extracted_data));
  }, [draft]);

  // Lock body scroll while modal is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Keyboard shortcut: Escape to cancel/close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, isSaving]);

  const resolvedPreview = useMemo(
    () => previewUrl || resolveFileUrl(draft.temp_file_url),
    [draft.temp_file_url, previewUrl]
  );
  const isPdf = resolvedPreview.startsWith("blob:")
    ? fileName?.toLowerCase().endsWith(".pdf")
    : resolvedPreview.toLowerCase().endsWith(".pdf");

  const updateField = <K extends keyof VisionExtractedEntities>(
    key: K,
    value: VisionExtractedEntities[K]
  ) => setData((prev) => ({ ...prev, [key]: value }));

  const addDiagnosis = () => {
    const value = diagnosisInput.trim();
    if (!value) return;
    if (!data.diagnoses.includes(value)) {
      updateField("diagnoses", [...data.diagnoses, value]);
    }
    setDiagnosisInput("");
  };

  const removeDiagnosis = (index: number) => {
    updateField(
      "diagnoses",
      data.diagnoses.filter((_, idx) => idx !== index)
    );
  };

  const addAllergy = () => {
    const value = allergyInput.trim();
    if (!value) return;
    if (!data.allergies.includes(value)) {
      updateField("allergies", [...data.allergies, value]);
    }
    setAllergyInput("");
  };

  const removeAllergy = (index: number) => {
    updateField(
      "allergies",
      data.allergies.filter((_, idx) => idx !== index)
    );
  };

  const updateMedication = (
    index: number,
    patch: Partial<ExtractedMedication>
  ) => {
    updateField(
      "medications",
      data.medications.map((med, i) => (i === index ? { ...med, ...patch } : med))
    );
  };

  const toggleTimingSlot = (index: number, slot: "morning" | "afternoon" | "night") => {
    const med = data.medications[index];
    const currentBreakdown = med.timing_breakdown || inferTimingBreakdown(med);
    const updatedBreakdown = {
      ...currentBreakdown,
      [slot]: !currentBreakdown[slot],
    };

    // Construct slot notation (e.g. 1-0-1)
    const slotCode = `${updatedBreakdown.morning ? "1" : "0"}-${updatedBreakdown.afternoon ? "1" : "0"}-${updatedBreakdown.night ? "1" : "0"}`;
    
    // Label
    const activeSlots = [];
    if (updatedBreakdown.morning) activeSlots.push(t("hitl.morning", "Morning"));
    if (updatedBreakdown.afternoon) activeSlots.push(t("hitl.afternoon", "Afternoon"));
    if (updatedBreakdown.night) activeSlots.push(t("hitl.night", "Night"));

    updateMedication(index, {
      timing_breakdown: updatedBreakdown,
      frequency: slotCode,
      timing: activeSlots.join(" + "),
    });
  };

  const removeMedication = (index: number) => {
    updateField(
      "medications",
      data.medications.filter((_, idx) => idx !== index)
    );
  };

  const updateBiomarker = (index: number, patch: Partial<ExtractedBiomarker>) => {
    updateField(
      "biomarkers",
      data.biomarkers.map((bio, i) => (i === index ? { ...bio, ...patch } : bio))
    );
  };

  const removeBiomarker = (index: number) => {
    updateField(
      "biomarkers",
      data.biomarkers.filter((_, idx) => idx !== index)
    );
  };

  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
    setPanOffset({ x: 0, y: 0 });
    setFitMode("width");
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  const handleToggleFitMode = () => {
    setFitMode((prev) => (prev === "width" ? "contain" : "width"));
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Drag-to-Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPdf) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCopyRawText = () => {
    if (!data.raw_text) return;
    navigator.clipboard.writeText(data.raw_text);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  const inputClass =
    "w-full rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] px-3 py-2 text-xs text-[#1A2826] dark:text-white placeholder:text-slate-400 outline-none transition-all focus:border-[#0D5C4A] focus:ring-2 focus:ring-[#0D5C4A]/15";

  if (!mounted) return null;

  const docTypeName = (draft.detected_document_type || draft.document_type || "prescription")
    .replace(/_/g, " ");

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] flex h-screen w-screen items-center justify-center bg-[#0E1C1A]/80 backdrop-blur-md p-2 sm:p-4 md:p-6 overflow-hidden">
      <div className="flex h-[92vh] sm:h-[90vh] max-h-[920px] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] shadow-2xl my-auto mx-auto" dir={dir}>
        
        {/* ── 1. Modal Header (Sticky Top) ── */}
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-[#DCE8E5] dark:border-white/10 bg-white/95 dark:bg-[#223431]/95 backdrop-blur-md px-5 py-3.5" dir={dir}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A] border border-[#B2DFD4] dark:border-teal-800 shadow-2xs">
              <FileCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#1A2826] dark:text-white">
                  {t("hitl.title", "Review Extracted Medical Details")}
                </h2>
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1 bg-[#E8F7F4] text-[#0D5C4A] dark:bg-teal-950/40 dark:text-[#B2DFD4] border-[#B2DFD4] dark:border-teal-800 font-semibold text-[11px] capitalize px-2.5 py-0.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0A8C6A]" />
                  {isUrdu ? "مصدقہ دستاویز" : `${t("hitl.verified", "Verified")} ${docTypeName}`}
                </Badge>
              </div>
              <p className="text-[11px] sm:text-xs text-[#3D5450] dark:text-[#B2DFD4]">
                {t("hitl.subtitle", "Verify detected medicines and dosages before saving to your Vault.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#3D5450] dark:text-[#B2DFD4] font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
              <kbd>Esc</kbd> {isUrdu ? "بند کرنے کے لیے" : "to close"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={isSaving}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              title="Close modal (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── 2. Dual-Pane Split Layout (50/50 Desktop) ── */}
        <div className="grid flex-1 min-h-0 overflow-hidden lg:grid-cols-2">
          
          {/* ── Left Pane: Interactive Original Document Viewer ── */}
          <section className="flex flex-col min-h-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-[#DCE8E5] dark:border-zinc-800 bg-[#F5F8F7] dark:bg-zinc-950/50 p-4">
            {/* Viewer Control Toolbar */}
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="h-3.5 w-3.5 text-[#0D5C4A] dark:text-teal-400 shrink-0" />
                <span
                  className="truncate text-xs font-semibold text-slate-700 dark:text-zinc-300 max-w-[150px] sm:max-w-[200px]"
                  title={fileName || "Original Document"}
                >
                  {fileName || "Original Prescription"}
                </span>
              </div>

              {/* Zoom & View Controls */}
              <div className="flex items-center gap-1 rounded-xl border border-[#DCE8E5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                  className="rounded-lg p-1 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] dark:hover:text-teal-400 transition-colors"
                  title="Zoom Out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="w-12 text-center text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0D5C4A] transition-colors"
                  title="Reset Zoom (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                  className="rounded-lg p-1 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] dark:hover:text-teal-400 transition-colors"
                  title="Zoom In"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>

                <div className="mx-0.5 h-3.5 w-[1px] bg-slate-200 dark:bg-zinc-700" />

                <button
                  type="button"
                  onClick={handleToggleFitMode}
                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] dark:hover:text-teal-400 transition-colors flex items-center gap-1"
                  title={fitMode === "width" ? "Switch to Fit Page" : "Switch to Full Width"}
                >
                  <Eye className="h-3 w-3" />
                  <span>{fitMode === "width" ? "Fit Width" : "Fit Page"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRotate}
                  className="rounded-lg p-1 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] dark:hover:text-teal-400 transition-colors"
                  title="Rotate 90°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Document Canvas with Drag-to-Pan Support */}
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={cn(
                "relative flex-1 min-h-[300px] overflow-hidden rounded-xl border border-[#DCE8E5] dark:border-zinc-800 bg-[#F9FBFA] dark:bg-zinc-950 p-4 shadow-inner flex items-center justify-center select-none",
                !isPdf && zoom > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
              )}
            >
              {isPdf ? (
                // eslint-disable-next-line jsx-a11y/iframe-has-title
                <iframe
                  src={resolvedPreview}
                  className="h-full min-h-[550px] w-full rounded-none transition-transform duration-150 origin-center"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                  aria-label="Uploaded PDF document preview"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedPreview}
                  alt={fileName || "Uploaded medical document"}
                  draggable={false}
                  className={cn(
                    "rounded-md object-contain transition-transform duration-75 select-none shadow-md",
                    fitMode === "width"
                      ? "w-full max-w-none h-auto block"
                      : "max-h-full max-w-full object-contain"
                  )}
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                />
              )}

              {/* Hint badge */}
              {!isPdf && zoom > 1 && (
                <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-xs">
                  Drag to pan image
                </div>
              )}
            </div>
          </section>

          {/* ── Right Pane: Extracted Medical Data Form ── */}
          <section className="flex flex-col min-h-0 overflow-y-auto bg-white dark:bg-[#223431] p-4 sm:p-6 space-y-6" dir={dir}>
            
            {/* ── Section 1: Doctor & Consultation Metadata ── */}
            <div className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/60 p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                  {t("hitl.doctorSummary", "Doctor & Consultation Summary")}
                </h3>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="space-y-1.5 text-xs font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                    {t("hitl.doctorName", "Doctor Name")}
                  </span>
                  <input
                    className={inputClass}
                    value={data.doctor_name ?? ""}
                    onChange={(e) => updateField("doctor_name", e.target.value)}
                    placeholder={isUrdu ? "مثال: ڈاکٹر اسماء ملک" : "e.g. Dr. Asma Malik"}
                  />
                </label>

                <label className="space-y-1.5 text-xs font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {t("hitl.clinicHospital", "Clinic / Hospital")}
                  </span>
                  <input
                    className={inputClass}
                    value={data.clinic_hospital_name ?? ""}
                    onChange={(e) => updateField("clinic_hospital_name", e.target.value)}
                    placeholder={isUrdu ? "مثال: خورشید کلینک" : "e.g. Khursheed Clinic"}
                  />
                </label>

                <label className="space-y-1.5 text-xs font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {t("hitl.consultationDate", "Consultation Date")}
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    value={data.consultation_date ?? ""}
                    onChange={(e) => updateField("consultation_date", e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* ── Section 2: Diagnoses & Conditions Tag Cloud ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                    {t("hitl.diagnoses", "Diagnoses & Health Conditions")}
                  </h3>
                  <span className="rounded-full bg-[#E8F7F4] dark:bg-teal-950/60 px-2 py-0.5 text-[11px] font-bold text-[#0D5C4A] dark:text-[#B2DFD4]">
                    {data.diagnoses.length}
                  </span>
                </div>
              </div>

              {/* Tag Input for Diagnoses */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className={`${inputClass} ${isUrdu ? "pr-8 pl-3 text-right" : "pl-8 pr-3"}`}
                    value={diagnosisInput}
                    onChange={(e) => setDiagnosisInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addDiagnosis();
                      }
                    }}
                    placeholder={t("hitl.typeConditionPlaceholder", "Type condition (e.g. Type 2 Diabetes) and press Enter")}
                  />
                  <Activity className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 ${isUrdu ? "right-2.5" : "left-2.5"}`} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addDiagnosis}
                  disabled={!diagnosisInput.trim()}
                  className="bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white text-xs px-3.5 h-9 shrink-0 font-medium rounded-xl shadow-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("hitl.addCondition", "Add Condition")}
                </Button>
              </div>

              {/* Removable Diagnosis Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {data.diagnoses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {isUrdu ? "کوئی تشخیصی مرض شامل نہیں" : "No diagnoses listed yet."}
                  </p>
                ) : (
                  data.diagnoses.map((dx, i) => (
                    <span
                      key={`${dx}-${i}`}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-[#E8F7F4] dark:bg-teal-950/50 text-[#0D5C4A] dark:text-[#B2DFD4] border border-[#B2DFD4] dark:border-teal-800 px-3 py-1 text-xs font-semibold shadow-2xs transition-all hover:border-[#0D5C4A]"
                    >
                      <span>{dx}</span>
                      <button
                        type="button"
                        onClick={() => removeDiagnosis(i)}
                        className="rounded-full p-0.5 text-[#0D5C4A]/60 dark:text-[#B2DFD4]/60 hover:bg-[#0D5C4A]/10 hover:text-[#C0392B] transition-colors"
                        title={`Remove ${dx}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* ── Section 3: Medicine Cards List ── */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                    {t("hitl.medications", "Medications & Dosage Regimen")}
                  </h3>
                  <span className="rounded-full bg-[#E8F7F4] dark:bg-teal-950/60 px-2 py-0.5 text-[11px] font-bold text-[#0D5C4A] dark:text-[#B2DFD4]">
                    {data.medications.length} {isUrdu ? "دوا" : "detected"}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateField("medications", [...data.medications, { ...emptyMedication }])}
                  className="border-[#DCE8E5] dark:border-white/10 text-[#0D5C4A] dark:text-[#0A8C6A] hover:bg-[#E8F7F4] dark:hover:bg-zinc-800 text-xs font-semibold h-8 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("hitl.addMedicine", "Add Medicine")}
                </Button>
              </div>

              {/* Medicine Cards */}
              <div className="space-y-3">
                {data.medications.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#DCE8E5] dark:border-white/10 p-6 text-center">
                    <Pill className="mx-auto h-6 w-6 text-slate-300 dark:text-zinc-600 mb-1" />
                    <p className="text-xs font-medium text-[#3D5450] dark:text-[#B2DFD4]">
                      {isUrdu ? "کوئی دوا درج نہیں ہے۔ دوا شامل کرنے کے لیے اوپر بٹن دبائیں۔" : "No medications extracted. Click 'Add Medicine' above to include one manually."}
                    </p>
                  </div>
                ) : (
                  data.medications.map((med, i) => {
                    const timingBreakdown = med.timing_breakdown || inferTimingBreakdown(med);

                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7]/60 hover:bg-white dark:bg-[#1A2826]/60 dark:hover:bg-[#1A2826] p-4 shadow-2xs hover:shadow-xs transition-all space-y-3.5"
                      >
                        {/* Medicine Header Row */}
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#E8F7F4] dark:bg-teal-950/60 text-[11px] font-bold text-[#0D5C4A] dark:text-[#0A8C6A]">
                              #{i + 1}
                            </span>
                            <span className="text-xs font-bold text-[#1A2826] dark:text-white">
                              {med.name ? med.name : (isUrdu ? "نئی دوا کا اندراج" : "New Medicine Entry")}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeMedication(i)}
                            className="flex items-center gap-1 rounded-lg p-1 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-[#C0392B] transition-colors text-xs"
                            title="Delete medication entry"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Top Grid: Name & Strength */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-1 text-[11px] font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                            <span>{t("hitl.medicineName", "Medicine Name")}</span>
                            <div className="relative">
                              <input
                                className={`${inputClass} ${isUrdu ? "pr-7 pl-3 text-right" : "pl-7 pr-3"}`}
                                value={med.name}
                                onChange={(e) => updateMedication(i, { name: e.target.value })}
                                placeholder={isUrdu ? "مثال: ٹیبلٹ سولیف / گلوکوفیج" : "e.g. Tab Solif / Glucophage"}
                              />
                              <Pill className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 ${isUrdu ? "right-2.5" : "left-2.5"}`} />
                            </div>
                          </label>

                          <label className="space-y-1 text-[11px] font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                            <span>{t("hitl.dosageStrength", "Strength / Dosage")}</span>
                            <input
                              className={inputClass}
                              value={med.dosage}
                              onChange={(e) => updateMedication(i, { dosage: e.target.value })}
                              placeholder={isUrdu ? "مثال: 5 ملی گرام / 500 ملی گرام" : "e.g. 5mg / 500mg"}
                            />
                          </label>
                        </div>

                        {/* Dosage & Timing Grid (Visual Slots: Morning, Afternoon, Night + Quantity) */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                            {t("hitl.timingSchedule", "Timing & Daily Schedule Slots")}
                          </p>
                          <div className="grid gap-2 sm:grid-cols-4 items-center">
                            {/* Morning Slot */}
                            <button
                              type="button"
                              onClick={() => toggleTimingSlot(i, "morning")}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-semibold transition-all",
                                timingBreakdown.morning
                                  ? "bg-[#0D5C4A] text-white border-[#0D5C4A] shadow-xs dark:bg-[#0A8C6A]"
                                  : "border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 text-[#3D5450] dark:text-[#B2DFD4] hover:bg-[#E8F7F4]"
                              )}
                            >
                              <Sun className="h-3.5 w-3.5" />
                              <span>{t("hitl.morning", "Morning")}</span>
                            </button>

                            {/* Afternoon Slot */}
                            <button
                              type="button"
                              onClick={() => toggleTimingSlot(i, "afternoon")}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-semibold transition-all",
                                timingBreakdown.afternoon
                                  ? "bg-[#0D5C4A] text-white border-[#0D5C4A] shadow-xs dark:bg-[#0A8C6A]"
                                  : "border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 text-[#3D5450] dark:text-[#B2DFD4] hover:bg-[#E8F7F4]"
                              )}
                            >
                              <SunMedium className="h-3.5 w-3.5" />
                              <span>{t("hitl.afternoon", "Afternoon")}</span>
                            </button>

                            {/* Night Slot */}
                            <button
                              type="button"
                              onClick={() => toggleTimingSlot(i, "night")}
                              className={cn(
                                "flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-semibold transition-all",
                                timingBreakdown.night
                                  ? "bg-[#0D5C4A] text-white border-[#0D5C4A] shadow-xs dark:bg-[#0A8C6A]"
                                  : "border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 text-[#3D5450] dark:text-[#B2DFD4] hover:bg-[#E8F7F4]"
                              )}
                            >
                              <Moon className="h-3.5 w-3.5" />
                              <span>{t("hitl.night", "Night")}</span>
                            </button>

                            {/* Quantity & Route input */}
                            <div className="relative">
                              <input
                                className={inputClass}
                                value={med.frequency}
                                onChange={(e) => updateMedication(i, { frequency: e.target.value })}
                                placeholder={isUrdu ? "مثال: 1 گولی / 2 چمچ" : "e.g. 1 tablet / 2 tsp"}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Mutually Exclusive Single-Language Guidance Input */}
                        {(() => {
                          const activeEditLang = instructionEditLang[i] || locale;
                          const isUrduInput = activeEditLang === "ur";
                          const currentVal = isUrduInput ? (med.instructions_ur ?? "") : (med.instructions_en ?? "");

                          return (
                            <div className="pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-[#3D5450] dark:text-[#B2DFD4]">
                                <span className="flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      "rounded px-1.5 py-0.5 text-[9px] font-bold",
                                      isUrduInput
                                        ? "bg-[#E8F7F4] text-[#0D5C4A] dark:bg-teal-950 dark:text-[#B2DFD4]"
                                        : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                                    )}
                                  >
                                    {isUrduInput ? "اردو" : "EN"}
                                  </span>
                                  <span>{t("hitl.instructions", "Medication Instructions")}</span>
                                </span>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setInstructionEditLang((prev) => ({
                                      ...prev,
                                      [i]: activeEditLang === "en" ? "ur" : "en",
                                    }))
                                  }
                                  className="text-[10px] font-bold text-[#0D5C4A] hover:underline dark:text-[#0A8C6A]"
                                >
                                  {activeEditLang === "en"
                                    ? t("hitl.editUrdu", "Switch to Urdu Instructions")
                                    : t("hitl.editEnglish", "Switch to English Instructions")}
                                </button>
                              </div>

                              <input
                                className={cn(
                                  inputClass,
                                  isUrduInput && "text-right font-arabic"
                                )}
                                dir={isUrduInput ? "rtl" : "ltr"}
                                lang={isUrduInput ? "ur" : "en"}
                                value={currentVal}
                                onChange={(e) => {
                                  if (isUrduInput) {
                                    updateMedication(i, { instructions_ur: e.target.value });
                                  } else {
                                    updateMedication(i, { instructions_en: e.target.value });
                                  }
                                }}
                                placeholder={
                                  isUrduInput
                                    ? "مثال: ایک گولی روزانہ کھانے کے بعد لیں"
                                    : "e.g. Take 1 tablet daily after meals"
                                }
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}

                {/* Add Another Medicine Button */}
                <button
                  type="button"
                  onClick={() => updateField("medications", [...data.medications, { ...emptyMedication }])}
                  className="w-full rounded-xl border-2 border-dashed border-[#DCE8E5] dark:border-white/10 py-3 text-xs font-bold text-[#0D5C4A] dark:text-[#0A8C6A] hover:border-[#0D5C4A] hover:bg-[#E8F7F4]/50 dark:hover:bg-zinc-800/40 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Plus className="h-4 w-4" /> {t("hitl.addMedicine", "Add Medicine")}
                </button>
              </div>
            </div>

            {/* ── Section 4: Allergies & Drug Sensitivities Alert Section ── */}
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#C0392B] dark:text-red-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-red-300">
                    {t("hitl.allergies", "Detected Allergies & Drug Sensitivities")}
                  </h3>
                  <span className="rounded-full bg-red-100 dark:bg-red-950/60 px-2 py-0.5 text-[11px] font-bold text-[#C0392B] dark:text-red-300">
                    {data.allergies.length}
                  </span>
                </div>
              </div>

              {/* Tag Input for Allergies */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    className={`${inputClass} ${isUrdu ? "pr-8 pl-3 text-right" : "pl-8 pr-3"} border-red-200 dark:border-red-900/40`}
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAllergy();
                      }
                    }}
                    placeholder={t("hitl.typeAllergyPlaceholder", "Type allergen (e.g. Penicillin, Sulfa) and press Enter")}
                  />
                  <ShieldAlert className={`absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-red-500 ${isUrdu ? "right-2.5" : "left-2.5"}`} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={addAllergy}
                  disabled={!allergyInput.trim()}
                  className="bg-[#C0392B] hover:bg-[#a5281c] text-white text-xs px-3.5 h-9 shrink-0 font-medium rounded-xl shadow-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("hitl.addAllergy", "Add Allergy")}
                </Button>
              </div>

              {/* Removable Allergy Chips */}
              <div className="flex flex-wrap gap-2 pt-1">
                {data.allergies.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    {isUrdu ? "کوئی الرجی درج نہیں" : "No drug allergies detected."}
                  </p>
                ) : (
                  data.allergies.map((allergy, i) => (
                    <span
                      key={`${allergy}-${i}`}
                      className="group inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950/60 text-[#C0392B] dark:text-red-300 border border-red-300 dark:border-red-800 px-3 py-1 text-xs font-semibold shadow-2xs transition-all hover:border-[#C0392B]"
                    >
                      <AlertCircle className="h-3 w-3 text-[#C0392B]" />
                      <span>{allergy}</span>
                      <button
                        type="button"
                        onClick={() => removeAllergy(i)}
                        className="rounded-full p-0.5 text-[#C0392B]/70 hover:bg-[#C0392B]/20 hover:text-[#C0392B] transition-colors"
                        title={`Remove ${allergy}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* ── Section 5: Biomarkers & Lab Results (if present) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                    {t("hitl.biomarkers", "Lab Biomarkers & Test Panels")}
                  </h3>
                  <span className="rounded-full bg-[#E8F7F4] dark:bg-teal-950/60 px-2 py-0.5 text-[11px] font-bold text-[#0D5C4A] dark:text-[#B2DFD4]">
                    {data.biomarkers.length}
                  </span>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => updateField("biomarkers", [...data.biomarkers, { ...emptyBiomarker }])}
                  className="border-[#DCE8E5] dark:border-white/10 text-[#0D5C4A] dark:text-[#0A8C6A] hover:bg-[#E8F7F4] dark:hover:bg-zinc-800 text-xs font-semibold h-8 rounded-lg flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> {t("hitl.addBiomarker", "Add Biomarker")}
                </Button>
              </div>

              {data.biomarkers.length > 0 && (
                <div className="space-y-2">
                  {data.biomarkers.map((bio, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] p-3 shadow-2xs sm:grid-cols-6 items-center"
                    >
                      <input
                        className={`${inputClass} sm:col-span-2`}
                        value={bio.analyte_name}
                        onChange={(e) => updateBiomarker(i, { analyte_name: e.target.value })}
                        placeholder={isUrdu ? "ٹیسٹ کا نام (مثال: HbA1c)" : "Test / Analyte (e.g. HbA1c)"}
                      />
                      <input
                        className={inputClass}
                        type="number"
                        step="any"
                        value={bio.value}
                        onChange={(e) => updateBiomarker(i, { value: Number(e.target.value) })}
                        placeholder="Value"
                      />
                      <input
                        className={inputClass}
                        value={bio.unit}
                        onChange={(e) => updateBiomarker(i, { unit: e.target.value })}
                        placeholder="Unit (e.g. mg/dL)"
                      />
                      <select
                        className={inputClass}
                        value={bio.status}
                        onChange={(e) => updateBiomarker(i, { status: e.target.value as ExtractedBiomarker["status"] })}
                      >
                        <option value="normal">{isUrdu ? "نارمل" : "Normal"}</option>
                        <option value="high">{isUrdu ? "زیادہ" : "High"}</option>
                        <option value="low">{isUrdu ? "کم" : "Low"}</option>
                      </select>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeBiomarker(i)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-[#C0392B] transition-colors"
                          title="Remove biomarker"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Section 6: Raw Vision Extraction Accordion ── */}
            {data.raw_text && (
              <details className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/40 p-3 text-xs group">
                <summary className="flex cursor-pointer items-center justify-between font-bold text-[#3D5450] dark:text-[#B2DFD4] select-none">
                  <span className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                    {t("hitl.viewRawText", "View Raw OCR Transcript")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleCopyRawText();
                      }}
                      className="flex items-center gap-1 text-[11px] font-normal text-[#0D5C4A] dark:text-[#0A8C6A] hover:underline"
                    >
                      {copiedRawText ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" /> {isUrdu ? "کاپی کر لیا" : "Copied"}
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" /> {isUrdu ? "کاپی کریں" : "Copy"}
                        </>
                      )}
                    </button>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180 text-slate-400" />
                  </div>
                </summary>
                <pre className="mt-2.5 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-white dark:bg-[#1A2826] p-3 text-[11px] font-mono leading-relaxed text-[#3D5450] dark:text-[#B2DFD4] border border-[#DCE8E5] dark:border-white/10">
                  {data.raw_text}
                </pre>
              </details>
            )}
          </section>
        </div>

        {/* ── 3. Sticky Action Footer ── */}
        <footer className="sticky bottom-0 z-20 flex shrink-0 flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#223431] px-5 py-3.5 shadow-md" dir={dir}>
          {/* Status summary metrics */}
          <div className="flex items-center gap-2 text-xs text-[#3D5450] dark:text-[#B2DFD4] font-medium">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              {isUrdu
                ? `${data.medications.length} ادویات • ${data.diagnoses.length} امراض${data.allergies.length > 0 ? ` • ${data.allergies.length} الرجی` : ""}${data.biomarkers.length > 0 ? ` • ${data.biomarkers.length} ٹیسٹ` : ""}`
                : `${data.medications.length} medicine${data.medications.length !== 1 ? "s" : ""} detected • ${data.diagnoses.length} condition${data.diagnoses.length !== 1 ? "s" : ""}${data.allergies.length > 0 ? ` • ${data.allergies.length} allergy alert${data.allergies.length !== 1 ? "s" : ""}` : ""}${data.biomarkers.length > 0 ? ` • ${data.biomarkers.length} biomarker${data.biomarkers.length !== 1 ? "s" : ""}` : ""}`}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSaving}
              className="text-[#3D5450] dark:text-[#B2DFD4] hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold px-4 h-9 rounded-xl"
            >
              {t("hitl.cancelDiscard", "Cancel / Discard")}
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(data)}
              disabled={isSaving}
              className="bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white px-6 py-2.5 rounded-xl font-medium shadow-md active:scale-95 flex items-center gap-2 transition-all text-xs"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? t("hitl.saving", "Saving to Vault...") : t("hitl.confirmSave", "Confirm & Save to Vault")}</span>
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
