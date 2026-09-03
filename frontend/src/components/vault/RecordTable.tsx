"use client";

import { useState } from "react";
import {
  CalendarDays,
  Eye,
  FlaskConical,
  Pill,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MedicalRecord } from "@/types/api";
import { formatDisplayDate, getRecordDisplayDate } from "@/lib/vaultMappers";
import { useLanguage } from "@/context/LanguageContext";
import DeleteRecordModal from "@/components/vault/DeleteRecordModal";

const docTypeColor: Record<string, string> = {
  prescription:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  lab_report:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  discharge_summary:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface RecordTableProps {
  records: MedicalRecord[];
  onView?: (record: MedicalRecord) => void;
  onDelete: (recordId: string) => void;
}

export default function RecordTable({ records, onView, onDelete }: RecordTableProps) {
  const { locale, dir, t } = useLanguage();
  const isUrdu = locale === "ur";
  const [recordToDelete, setRecordToDelete] = useState<MedicalRecord | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] shadow-xs" dir={dir}>
      {/* Viewport-Level Portal Delete Confirmation Modal */}
      <DeleteRecordModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        onConfirm={() => {
          if (recordToDelete) {
            const id = recordToDelete.id;
            setRecordToDelete(null);
            onDelete(id);
          }
        }}
        record={recordToDelete}
      />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#DCE8E5] dark:border-white/10 bg-[#F9FBFA] dark:bg-[#223431]/80 text-xs">
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {t("vault.documentType", "Type")}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {t("vault.doctorClinic", "Doctor / Test")}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {isUrdu ? "ہسپتال / کلینک" : "Hospital / Clinic"}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {t("vault.uploadDate", "Date")}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {isUrdu ? "امراض" : "Diagnoses"}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {isUrdu ? "ادویات" : "Meds"}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {isUrdu ? "ٹیسٹ" : "Biomarkers"}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-right" : "text-left"}`}>
              {isUrdu ? "الرجی" : "Allergies"}
            </th>
            <th className={`px-4 py-3 font-bold text-[#3D5450] dark:text-[#B2DFD4] ${isUrdu ? "text-left" : "text-right"}`}>
              {t("vault.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-white/10">
          {records.map((record) => {
            const displayDate = getRecordDisplayDate(record);
            const docLabel = t(`vault.categories.${record.document_type}`, record.document_type.replace(/_/g, " "));

            return (
              <tr
                key={record.id}
                onClick={() => onView && onView(record)}
                className="cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-[#223431]/50"
              >
                {/* Document type badge */}
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={
                      docTypeColor[record.document_type] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {docLabel}
                  </Badge>
                </td>

                {/* Doctor / test name */}
                <td className="px-4 py-3 font-semibold text-[#1A2826] dark:text-white">
                  {record.doctor_name ?? record.test_name ?? "—"}
                </td>

                {/* Hospital */}
                <td className="px-4 py-3 text-[#3D5450] dark:text-[#B2DFD4]">
                  {record.hospital_name ?? "—"}
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  {displayDate ? (
                    <span className="flex items-center gap-1 text-xs text-[#3D5450] dark:text-[#B2DFD4]">
                      <CalendarDays className="h-3 w-3 text-[#0D5C4A]" />
                      {formatDisplayDate(displayDate)}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>

                {/* Diagnoses */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {record.extracted_data.diagnoses.length > 0 ? (
                      record.extracted_data.diagnoses.slice(0, 2).map((dx) => (
                        <span
                          key={dx}
                          className="rounded bg-[#E8F7F4] dark:bg-teal-950 px-1.5 py-0.5 text-[10px] font-semibold text-[#0D5C4A] dark:text-teal-300"
                        >
                          {dx}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                    {record.extracted_data.diagnoses.length > 2 && (
                      <span className="rounded bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 text-[10px] font-medium text-slate-500">
                        +{record.extracted_data.diagnoses.length - 2}
                      </span>
                    )}
                  </div>
                </td>

                {/* Medications count */}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <Pill className="h-3.5 w-3.5 text-[#0D5C4A]" />
                    {record.extracted_data.medications.length}
                  </span>
                </td>

                {/* Biomarkers count */}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-zinc-300">
                    <FlaskConical className="h-3.5 w-3.5 text-blue-600" />
                    {record.extracted_data.biomarkers.length}
                  </span>
                </td>

                {/* Allergies count */}
                <td className="px-4 py-3">
                  {record.extracted_data.allergies.length > 0 ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-[#C0392B]">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {record.extracted_data.allergies.length}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">0</span>
                  )}
                </td>

                {/* Actions */}
                <td className={`px-4 py-3 ${isUrdu ? "text-left" : "text-right"}`}>
                  <div className={`flex items-center gap-1 ${isUrdu ? "justify-start" : "justify-end"}`} onClick={(e) => e.stopPropagation()}>
                    {onView && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-[#0D5C4A] hover:bg-[#E8F7F4]"
                        onClick={() => onView(record)}
                        title={isUrdu ? "تفصیلات دیکھیں" : "View details"}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-[#C0392B] hover:bg-[#FDF2F2]"
                      onClick={() => setRecordToDelete(record)}
                      title={isUrdu ? "ریکارڈ حذف کریں" : "Remove record"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
          {records.length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-8 text-center text-muted-foreground text-xs"
              >
                {isUrdu ? "کوئی ریکارڈ نہیں ملا" : "No records match your filters."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
