"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  ClipboardList,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  FlaskConical,
  Languages,
  Maximize2,
  Minus,
  Pill,
  Plus,
  ShieldAlert,
  Stethoscope,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BiomarkerItem, MedicalRecord } from "@/types/api";
import {
  formatDisplayDate,
  getFilenameFromUrl,
  getRecordDisplayDate,
  resolveFileUrl,
} from "@/lib/vaultMappers";
import { cn } from "@/lib/utils";

import { useLanguage } from "@/context/LanguageContext";

interface RecordDetailModalProps {
  record: MedicalRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

type DetailTab = "details" | "document" | "raw";

const docTypeStyles: Record<
  string,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  prescription: {
    label: "Prescription",
    badgeClass:
      "bg-[#E8F7F4] text-[#0D5C4A] border-[#B2DFD4] dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800",
    icon: Pill,
  },
  lab_report: {
    label: "Lab Report",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
    icon: FlaskConical,
  },
  discharge_summary: {
    label: "Discharge Summary",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
    icon: ClipboardList,
  },
};

const flagStyles: Record<BiomarkerItem["flag"], string> = {
  high: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  low: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  normal:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
};

export default function RecordDetailModal({
  record,
  isOpen,
  onClose,
}: RecordDetailModalProps) {
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("details");
  const [zoom, setZoom] = useState(1);
  const [fitMode, setFitMode] = useState<"width" | "contain">("width");
  const [copiedRawText, setCopiedRawText] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Reset zoom / tab on record change
  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      setZoom(1);
      setFitMode("width");
    }
  }, [isOpen, record?.id]);

  const resolvedPreview = useMemo(() => {
    const rawTarget = record?.signed_url || record?.file_url || record?.document_url;
    if (!rawTarget) return "";
    return resolveFileUrl(rawTarget);
  }, [record?.signed_url, record?.file_url, record?.document_url]);

  const isPdf = useMemo(() => {
    if (!resolvedPreview) return false;
    const checkPath = record?.document_url || record?.file_url || resolvedPreview;
    return (
      resolvedPreview.startsWith("blob:")
        ? checkPath.toLowerCase().split("?")[0].endsWith(".pdf")
        : resolvedPreview.toLowerCase().split("?")[0].endsWith(".pdf")
    );
  }, [resolvedPreview, record?.file_url, record?.document_url]);

  if (!mounted || !isOpen || !record) return null;

  const entities = record.extracted_data;
  const docMeta =
    docTypeStyles[record.document_type] ?? {
      label: record.document_type.replace(/_/g, " "),
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300",
      icon: FileText,
    };
  const categoryLabel = t(`vault.categories.${record.document_type}`, docMeta.label);
  const filename = getFilenameFromUrl(record.file_url);
  const displayDate = getRecordDisplayDate(record);

  const handleCopyRawText = () => {
    if (!entities.raw_text) return;
    navigator.clipboard.writeText(entities.raw_text);
    setCopiedRawText(true);
    setTimeout(() => setCopiedRawText(false), 2000);
  };

  const modalContent = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[9999] flex h-screen w-screen items-center justify-center bg-[#0E1C1A]/80 backdrop-blur-md p-3 sm:p-5 md:p-6 animate-dialog-in overflow-hidden">
      <div className="flex h-[90vh] max-h-[920px] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] shadow-2xl my-auto mx-auto" dir={dir}>
        
        {/* ── 1. Modal Header (Sticky Top) ── */}
        <header className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-[#DCE8E5] dark:border-white/10 bg-white/95 dark:bg-[#223431]/95 backdrop-blur-md px-5 py-4" dir={dir}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A] border border-[#B2DFD4] dark:border-teal-800 shadow-2xs">
              <docMeta.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#1A2826] dark:text-white line-clamp-1">
                  {record.doctor_name || record.test_name || filename || (isUrdu ? "طبی ریکارڈ کی تفصیلات" : "Medical Record Details")}
                </h2>
                <Badge
                  variant="outline"
                  className={cn("hidden sm:inline-flex px-2 py-0.5 text-[11px] font-bold capitalize", docMeta.badgeClass)}
                >
                  {categoryLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-xs text-[#3D5450] dark:text-[#B2DFD4] mt-0.5">
                {record.hospital_name && (
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {record.hospital_name}
                  </span>
                )}
                {displayDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-[#0D5C4A] dark:text-teal-400" />
                    {formatDisplayDate(displayDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#3D5450] dark:text-[#B2DFD4] font-mono bg-slate-100 dark:bg-zinc-800 px-2 py-1 rounded border border-slate-200 dark:border-zinc-700">
              <kbd>Esc</kbd>
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800"
              title="Close modal (Esc)"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* ── 2. Tab Navigation Bar ── */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/60 px-5 py-2" dir={dir}>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("details")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                activeTab === "details"
                  ? "bg-[#0D5C4A] text-white shadow-2xs"
                  : "text-[#3D5450] dark:text-[#B2DFD4] hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900"
              )}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              <span>{isUrdu ? "طبی تفصیلات" : "Medical Details"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("document")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                activeTab === "document"
                  ? "bg-[#0D5C4A] text-white shadow-2xs"
                  : "text-[#3D5450] dark:text-[#B2DFD4] hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900"
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>{isUrdu ? "اصل دستاویز" : "Original Document"}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                activeTab === "raw"
                  ? "bg-[#0D5C4A] text-white shadow-2xs"
                  : "text-[#3D5450] dark:text-[#B2DFD4] hover:bg-slate-200/60 dark:hover:bg-zinc-800 hover:text-slate-900"
              )}
            >
              <FileCode className="h-3.5 w-3.5" />
              <span>{isUrdu ? "اصل اسکین شدہ متن" : "Raw Extracted Text"}</span>
            </button>
          </div>

          {/* Tab 2 Toolbar Controls (when active) */}
          {activeTab === "document" && (
            <div className="flex items-center gap-1 rounded-lg border border-[#DCE8E5] dark:border-zinc-800 bg-white dark:bg-zinc-900 p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.2).toFixed(1))))}
                className="rounded p-1 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] transition-colors"
                title="Zoom Out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setFitMode("width");
                }}
                className="w-12 text-center text-[11px] font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0D5C4A]"
                title="Reset Zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
                className="rounded p-1 text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A] transition-colors"
                title="Zoom In"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <div className="mx-0.5 h-3.5 w-[1px] bg-slate-200 dark:bg-zinc-700" />
              <button
                type="button"
                onClick={() => setFitMode((m) => (m === "width" ? "contain" : "width"))}
                className="rounded px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-[#0D5C4A]"
              >
                {fitMode === "width" ? "Fit Width" : "Fit Page"}
              </button>
            </div>
          )}
        </div>

        {/* ── 3. Tab Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          
          {/* ════════ TAB 1: MEDICAL DETAILS ════════ */}
          {activeTab === "details" && (
            <div className="space-y-6">
              
              {/* Allergy Alert Banner */}
              {entities.allergies.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-[#FDF2F2] dark:bg-red-950/30 p-4 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-[#C0392B]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#C0392B]">
                      {isUrdu ? `الرجی الرٹ (${entities.allergies.length})` : `Critical Allergy Warnings (${entities.allergies.length})`}
                    </h4>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {entities.allergies.map((allergen, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-[#C0392B] text-white px-3 py-1 text-xs font-bold shadow-2xs"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {allergen}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Health Conditions / Diagnoses */}
              <div className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/50 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                    {isUrdu ? `امراض و تشخیص (${entities.diagnoses.length})` : `Health Conditions & Diagnoses (${entities.diagnoses.length})`}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {entities.diagnoses.length > 0 ? (
                    entities.diagnoses.map((dx, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-[#E8F7F4] dark:bg-teal-950/50 text-[#0D5C4A] dark:text-[#B2DFD4] border border-[#B2DFD4] dark:border-teal-800 px-3 py-1 text-xs font-semibold shadow-2xs"
                      >
                        {dx}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isUrdu ? "کوئی تشخیصی مرض درج نہیں" : "No explicit diagnosis listed."}
                    </p>
                  )}
                </div>
              </div>

              {/* Prescribed Medicines (for Prescriptions & Discharge) */}
              {record.document_type !== "lab_report" && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                      {isUrdu ? `تجویز کردہ ادویات (${entities.medications.length})` : `Prescribed Medications & Regimen (${entities.medications.length})`}
                    </h3>
                  </div>

                  {entities.medications.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {entities.medications.map((med, i) => {
                        const m = med as any;
                        const activeInstructions = isUrdu
                          ? (m.instructions_ur || m.urdu_instructions || m.instructions_en || "")
                          : (m.instructions_en || m.instructions_ur || m.urdu_instructions || "");

                        return (
                          <div
                            key={i}
                            className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] p-4 shadow-sm space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-2">
                              <div>
                                <span className="text-xs font-bold text-[#1A2826] dark:text-white flex items-center gap-1.5">
                                  <span className="flex h-5 w-5 items-center justify-center rounded bg-[#E8F7F4] dark:bg-teal-950/60 text-[11px] font-bold text-[#0D5C4A] dark:text-[#0A8C6A]">
                                    #{i + 1}
                                  </span>
                                  {med.name}
                                </span>
                              </div>
                              <span className="rounded bg-[#0D5C4A] px-2 py-0.5 text-[11px] font-bold text-white">
                                {med.dosage || (isUrdu ? "مقدار نہیں" : "Dose N/A")}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                              <span className="rounded bg-[#E8F7F4] dark:bg-teal-950/60 px-2 py-0.5 text-[11px] font-semibold text-[#0D5C4A] dark:text-[#B2DFD4]">
                                {med.frequency || (isUrdu ? "شیڈول درج نہیں" : "Schedule not specified")}
                              </span>
                            </div>

                            {/* Instructions Box */}
                            {activeInstructions && (
                              <div className="rounded-lg border border-[#B2DFD4] dark:border-teal-900 bg-[#E8F7F4]/50 dark:bg-teal-950/30 p-2.5">
                                <div className="flex items-center justify-between text-[10px] font-bold text-[#0D5C4A] dark:text-[#B2DFD4] mb-1">
                                  <span>{isUrdu ? "ہدایات" : "Instructions"}</span>
                                  <span className="rounded bg-[#E8F7F4] dark:bg-teal-950 px-1.5 py-0.2">{isUrdu ? "اردو" : "EN"}</span>
                                </div>
                                <p
                                  className={cn(
                                    "text-xs font-medium leading-relaxed text-[#0D5C4A] dark:text-[#B2DFD4]",
                                    isUrdu ? "text-right font-arabic" : "text-left"
                                  )}
                                  dir={isUrdu ? "rtl" : "ltr"}
                                  lang={isUrdu ? "ur" : "en"}
                                >
                                  {activeInstructions}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      {isUrdu ? "کوئی دوا درج نہیں" : "No medications recorded."}
                    </p>
                  )}
                </div>
              )}

              {/* Lab Biomarkers Table (for Lab Reports) */}
              {record.document_type === "lab_report" && (
                <div className="space-y-3.5">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-[#0D5C4A] dark:text-[#0A8C6A]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                      {isUrdu ? `لیب بائیو مارکرز (${entities.biomarkers.length})` : `Lab Biomarkers & Analyte Values (${entities.biomarkers.length})`}
                    </h3>
                  </div>

                  {entities.biomarkers.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-sm">
                      <table className="w-full text-xs">
                        <thead className="border-b border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#223431]/80 text-[#3D5450] dark:text-[#B2DFD4]">
                          <tr>
                            <th className={`py-2.5 px-4 font-bold ${isUrdu ? "text-right" : "text-left"}`}>{isUrdu ? "ٹیسٹ کا نام" : "Analyte / Test"}</th>
                            <th className={`py-2.5 px-4 font-bold ${isUrdu ? "text-right" : "text-left"}`}>{isUrdu ? "مقدار" : "Measured Value"}</th>
                            <th className={`py-2.5 px-4 font-bold ${isUrdu ? "text-right" : "text-left"}`}>{isUrdu ? "یونٹ" : "Unit"}</th>
                            <th className={`py-2.5 px-4 font-bold ${isUrdu ? "text-right" : "text-left"}`}>{isUrdu ? "نارمل حد" : "Safe Reference Range"}</th>
                            <th className={`py-2.5 px-4 font-bold ${isUrdu ? "text-left" : "text-right"}`}>{isUrdu ? "حالت" : "Status"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
                          {entities.biomarkers.map((bio, i) => {
                            const flag = bio.flag || "normal";
                            const flagText = isUrdu ? (flag === "high" ? "زیادہ" : flag === "low" ? "کم" : "نارمل") : flag;
                            return (
                              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#223431]/50">
                                <td className="py-3 px-4 font-bold text-[#1A2826] dark:text-white">
                                  {bio.analyte_name}
                                </td>
                                <td className="py-3 px-4 font-semibold text-[#1A2826] dark:text-white">
                                  {bio.value}
                                </td>
                                <td className="py-3 px-4 text-[#3D5450] dark:text-[#B2DFD4]">
                                  {bio.unit || "—"}
                                </td>
                                <td className="py-3 px-4 text-[#3D5450] dark:text-[#B2DFD4]">
                                  {bio.ref_min !== null && bio.ref_max !== null && bio.ref_min !== undefined && bio.ref_max !== undefined
                                    ? `${bio.ref_min} – ${bio.ref_max} ${bio.unit || ""}`
                                    : (isUrdu ? "معیاری حد" : "Standard reference")}
                                </td>
                                <td className={`py-3 px-4 ${isUrdu ? "text-left" : "text-right"}`}>
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border",
                                      flagStyles[flag] || flagStyles.normal
                                    )}
                                  >
                                    {flagText}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">{isUrdu ? "کوئی بائیو مارکر درج نہیں" : "No biomarker values extracted."}</p>
                  )}
                </div>
              )}

              {/* Surgical Notes & Follow-up Instructions (Discharge Summaries) */}
              {record.document_type === "discharge_summary" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {record.surgical_notes.length > 0 && (
                    <div className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/50 p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                        {isUrdu ? "سرجیکل نوٹس" : "Surgical Notes"}
                      </h4>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-[#3D5450] dark:text-[#B2DFD4]">
                        {record.surgical_notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {record.follow_up_instructions.length > 0 && (
                    <div className="rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826]/50 p-4 space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2826] dark:text-white">
                        {isUrdu ? "فالو اپ ہدایات" : "Follow-up Instructions"}
                      </h4>
                      <ul className="list-disc space-y-1 pl-4 text-xs text-[#3D5450] dark:text-[#B2DFD4]">
                        {record.follow_up_instructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 2: ORIGINAL DOCUMENT ════════ */}
          {activeTab === "document" && (
            <div className="space-y-3">
              {(record.signed_url || record.file_url || record.document_url) ? (
                <>
                  <div className="relative flex min-h-[460px] flex-col items-center justify-start overflow-auto rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#1A2826] p-4 shadow-inner">
                    {isPdf ? (
                      // eslint-disable-next-line jsx-a11y/iframe-has-title
                      <iframe
                        src={resolvedPreview}
                        className="h-full min-h-[560px] w-full rounded-none transition-transform duration-150 origin-top"
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: "top center",
                        }}
                        aria-label="PDF document preview"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolvedPreview}
                        alt={filename || "Uploaded medical document"}
                        className={`rounded-none object-contain transition-all duration-150 select-none shadow-md ${
                          fitMode === "width"
                            ? "w-full max-w-none h-auto block"
                            : "max-h-full max-w-full object-contain"
                        }`}
                        style={{
                          transform: `scale(${zoom})`,
                          transformOrigin: "top center",
                        }}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{isUrdu ? `فائل: ${filename || "طبی دستاویز"}` : `File: ${filename || "Medical Document"}`}</span>
                    <a
                      href={resolvedPreview}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-[#0D5C4A] dark:text-[#0A8C6A] hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isUrdu ? "نئے ٹیب میں فائل کھولیں" : "Open original file in new tab"}
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#DCE8E5] bg-[#F9FBFA] p-12 text-center">
                  <FileText className="h-10 w-10 text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">
                    {isUrdu ? "اس ریکارڈ کا کوئی فائل یو آر ایل نہیں پایا گیا" : "No original document URL saved for this record."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ════════ TAB 3: RAW EXTRACTED TEXT ════════ */}
          {activeTab === "raw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3D5450] dark:text-[#B2DFD4]">
                  {isUrdu ? `اصل اسکین شدہ متن (${entities.raw_text?.length || 0} حروف)` : `Raw OCR / Vision Output (${entities.raw_text?.length || 0} characters)`}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyRawText}
                  className="h-8 text-xs gap-1.5 border-[#DCE8E5] dark:border-white/10"
                >
                  {copiedRawText ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" /> {isUrdu ? "کاپی ہو گیا" : "Copied"}
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> {isUrdu ? "متن کاپی کریں" : "Copy Text"}
                    </>
                  )}
                </Button>
              </div>

              <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-emerald-300 shadow-inner">
                {entities.raw_text || (isUrdu ? "اس ریکارڈ کا متن دستیاب نہیں ہے۔" : "No raw text available for this record.")}
              </pre>
            </div>
          )}
        </div>

        {/* ── 4. Modal Footer ── */}
        <footer className="sticky bottom-0 z-20 flex shrink-0 items-center justify-end gap-3 border-t border-[#DCE8E5] dark:border-zinc-800 bg-[#F9FBFA] dark:bg-zinc-900 px-5 py-3.5 shadow-md">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white text-xs font-semibold px-5 rounded-lg shadow-sm"
          >
            Close
          </Button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
