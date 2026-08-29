"use client";

import {
  CalendarDays,
  Eye,
  Pill,
  ShieldAlert,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExtractionResponse } from "@/types/api";

const docTypeColor: Record<string, string> = {
  prescription:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  lab_report:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  discharge_summary:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface RecordTableProps {
  records: ExtractionResponse[];
  onViewDetails: (record: ExtractionResponse) => void;
  onInterpret: (record: ExtractionResponse) => void;
  onDelete: (recordId: string) => void;
}

export default function RecordTable({
  records,
  onViewDetails,
  onInterpret,
  onDelete,
}: RecordTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Type
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Doctor
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Hospital
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Date
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Diagnoses
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Meds
            </th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">
              Allergies
            </th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr
              key={record.record_id}
              className="border-b transition-colors hover:bg-muted/30 last:border-0"
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
                  {record.document_type.replace(/_/g, " ")}
                </Badge>
              </td>

              {/* Doctor name */}
              <td className="px-4 py-3 font-medium">
                {record.doctor_name ?? "—"}
              </td>

              {/* Hospital */}
              <td className="px-4 py-3 text-muted-foreground">
                {record.hospital_name ?? "—"}
              </td>

              {/* Date */}
              <td className="px-4 py-3">
                {record.consultation_date ? (
                  <span className="flex items-center gap-1 text-xs">
                    <CalendarDays className="h-3 w-3 text-muted-foreground" />
                    {new Date(record.consultation_date).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric", year: "numeric" }
                    )}
                  </span>
                ) : (
                  "—"
                )}
              </td>

              {/* Diagnoses */}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {record.diagnoses.length > 0 ? (
                    record.diagnoses.slice(0, 2).map((dx) => (
                      <Badge
                        key={dx}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {dx}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {record.diagnoses.length > 2 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{record.diagnoses.length - 2}
                    </Badge>
                  )}
                </div>
              </td>

              {/* Medications count */}
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-xs">
                  <Pill className="h-3 w-3 text-muted-foreground" />
                  {record.medications.length}
                </span>
              </td>

              {/* Allergies count */}
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-xs">
                  <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                  {record.allergies.length}
                </span>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onViewDetails(record)}
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onInterpret(record)}
                    title="Interpret"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => onDelete(record.record_id)}
                    title="Delete record"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                No records match your filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
