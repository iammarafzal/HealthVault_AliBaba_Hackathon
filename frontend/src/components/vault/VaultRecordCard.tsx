"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  Calendar,
  ChevronRight,
  ClipboardList,
  Eye,
  FileText,
  FlaskConical,
  MapPin,
  Pill,
  ShieldAlert,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MedicalRecord } from "@/types/api";
import {
  formatDisplayDate,
  getFilenameFromUrl,
  getRecordDisplayDate,
} from "@/lib/vaultMappers";
import { cn } from "@/lib/utils";

import { useLanguage } from "@/context/LanguageContext";
import DeleteRecordModal from "@/components/vault/DeleteRecordModal";

interface VaultRecordCardProps {
  record: MedicalRecord;
  onView: (record: MedicalRecord) => void;
  onDelete: (recordId: string) => void;
}

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

export default function VaultRecordCard({
  record,
  onView,
  onDelete,
}: VaultRecordCardProps) {
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  // Calculate abnormal biomarker count for lab reports
  const abnormalCount =
    record.document_type === "lab_report"
      ? entities.biomarkers.filter(
        (b) => b.flag === "high" || b.flag === "low"
      ).length
      : 0;

  return (
    <div
      className="group relative flex flex-col justify-between rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0D5C4A]/40 dark:hover:border-teal-700/50 hover:shadow-md"
      dir={dir}
    >
      {/* ── Top Section: Type Pill + Date ── */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-bold tracking-tight rounded-md border",
              docMeta.badgeClass
            )}
          >
            <docMeta.icon className="h-3 w-3" />
            {categoryLabel}
          </Badge>

          {displayDate && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              <Calendar className="h-3 w-3 text-[#0D5C4A] dark:text-teal-400" />
              {formatDisplayDate(displayDate)}
            </span>
          )}
        </div>

        {/* ── Doctor / Clinician Title & Hospital ── */}
        <div className="mt-3">
          <h3
            className="text-sm sm:text-base font-bold text-[#1A2826] dark:text-white line-clamp-1 group-hover:text-[#0D5C4A] dark:group-hover:text-teal-400 transition-colors"
            title={record.doctor_name || record.test_name || filename || (isUrdu ? "طبی ریکارڈ" : "Medical Record")}
          >
            {record.doctor_name || record.test_name || filename || (isUrdu ? "طبی دستاویز" : "Medical Document")}
          </h3>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#3D5450] dark:text-[#B2DFD4] line-clamp-1">
            {record.hospital_name ? (
              <>
                <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                <span className="truncate">{record.hospital_name}</span>
              </>
            ) : filename ? (
              <>
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500" />
                <span className="truncate">{filename}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">{isUrdu ? "کلینک یا ہسپتال درج نہیں" : "No facility specified"}</span>
            )}
          </p>
        </div>

        {/* ── Diagnoses Preview ── */}
        {entities.diagnoses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {entities.diagnoses.slice(0, 2).map((dx, i) => (
              <span
                key={i}
                className="inline-flex items-center rounded-md bg-[#F5F8F7] dark:bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-zinc-300 border border-[#DCE8E5] dark:border-zinc-700"
              >
                {dx}
              </span>
            ))}
            {entities.diagnoses.length > 2 && (
              <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                +{entities.diagnoses.length - 2} {isUrdu ? "مزید" : "more"}
              </span>
            )}
          </div>
        )}

        {/* ── Key Metric Chips (Compact Summary Row) ── */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
          {record.document_type === "prescription" && (
            <>
              {entities.medications.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F7F4] dark:bg-teal-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0D5C4A] dark:text-teal-300">
                  <Pill className="h-3 w-3" />
                  {isUrdu
                    ? `${entities.medications.length} ادویات`
                    : `${entities.medications.length} ${entities.medications.length === 1 ? "Medicine" : "Medicines"}`}
                </span>
              )}
              {entities.diagnoses.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
                  <Stethoscope className="h-3 w-3 text-slate-500" />
                  {isUrdu
                    ? `${entities.diagnoses.length} امراض`
                    : `${entities.diagnoses.length} ${entities.diagnoses.length === 1 ? "Condition" : "Conditions"}`}
                </span>
              )}
            </>
          )}

          {record.document_type === "lab_report" && (
            <>
              {entities.biomarkers.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">
                  <Activity className="h-3 w-3" />
                  {isUrdu ? `${entities.biomarkers.length} ٹیسٹ` : `${entities.biomarkers.length} Biomarkers`}
                </span>
              )}
              {abnormalCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  {isUrdu ? `${abnormalCount} غیر معمولی` : `${abnormalCount} Abnormal`}
                </span>
              )}
            </>
          )}

          {record.document_type === "discharge_summary" && (
            <>
              {entities.diagnoses.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  <Stethoscope className="h-3 w-3" />
                  {isUrdu ? `${entities.diagnoses.length} امراض` : `${entities.diagnoses.length} Diagnoses`}
                </span>
              )}
              {entities.medications.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F7F4] dark:bg-teal-950/50 px-2.5 py-0.5 text-[11px] font-semibold text-[#0D5C4A] dark:text-teal-300">
                  <Pill className="h-3 w-3" />
                  {isUrdu ? `${entities.medications.length} ادویات` : `${entities.medications.length} Meds`}
                </span>
              )}
            </>
          )}

          {/* Allergy Alert Badge */}
          {entities.allergies.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF5E4] dark:bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-bold text-[#C47C1A] dark:text-amber-300">
              <ShieldAlert className="h-3 w-3 text-[#C47C1A]" />
              {isUrdu ? `${entities.allergies.length} الرجی الرٹ` : `${entities.allergies.length} Allergy Warning`}
            </span>
          )}
        </div>
      </div>

      {/* ── Viewport-Level Portal Delete Confirmation Modal ── */}
      <DeleteRecordModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(record.id);
        }}
        record={record}
        documentType={record.document_type}
      />

      {/* ── Card Footer: View Action CTA + Delete Icon ── */}
      <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-white/10">
        <Button
          type="button"
          onClick={() => onView(record)}
          className="flex-1 h-9 rounded-lg bg-[#E8F7F4] hover:bg-[#0D5C4A] text-[#0D5C4A] hover:text-white dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-[#0D5C4A] dark:hover:text-white font-semibold text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{isUrdu ? "مکمل ریکارڈ دیکھیں" : "View Full Record"}</span>
          <ChevronRight className={cn("h-3.5 w-3.5 opacity-70", isUrdu && "rotate-180")} />
        </Button>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="rounded-lg p-2 text-slate-400 hover:text-[#C0392B] hover:bg-[#FDF2F2] dark:hover:bg-red-950/40 transition-colors"
          title={isUrdu ? "ریکارڈ کو حذف کریں" : "Delete this record"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
