"use client";

import { useState } from "react";
import {
  CalendarDays,
  FileText,
  Hospital,
  Pill,
  Stethoscope,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FileUploadDropzone from "@/components/vault/FileUploadDropzone";
import type { ExtractionResponse } from "@/types/api";
import { mockExtractionResponse } from "@/lib/mockData";

/* ── Mock recent records for display ─────────────────────── */
const recentRecords: ExtractionResponse[] = [
  mockExtractionResponse,
  {
    record_id: "rec-002-mock",
    document_type: "lab_report",
    doctor_name: "Dr. Usman Malik",
    hospital_name: "Aga Khan University Hospital",
    consultation_date: "2025-01-10",
    diagnoses: ["Hyperlipidemia"],
    medications: [],
    allergies: [],
    raw_ocr_text:
      "Lipid Panel: Total Cholesterol 218 mg/dL, LDL 142 mg/dL, HDL 38 mg/dL, Triglycerides 190 mg/dL",
  },
  {
    record_id: "rec-003-mock",
    document_type: "discharge_summary",
    doctor_name: "Dr. Sana Javed",
    hospital_name: "PIMS Hospital Islamabad",
    consultation_date: "2024-11-22",
    diagnoses: ["Acute Gastroenteritis", "Dehydration"],
    medications: [
      {
        name: "Omeprazole",
        dosage: "20mg",
        frequency: "OD (Once Daily)",
        timing: "Morning",
        instructions_en: "Take 30 minutes before breakfast",
        instructions_ur: "ناشتے سے 30 منٹ پہلے لیں",
        is_active: false,
      },
    ],
    allergies: [],
    raw_ocr_text:
      "Discharge: Acute gastroenteritis, IV fluids administered, oral rehydration advised. Follow-up in 1 week.",
  },
];

const docTypeColor: Record<string, string> = {
  prescription: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  lab_report: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  discharge_summary: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function VaultPage() {
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async (_files: File[]) => {
    setIsExtracting(true);
    // Simulate extraction delay
    await new Promise((r) => setTimeout(r, 2000));
    setIsExtracting(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Medical Vault</h1>
        <p className="text-muted-foreground">
          Upload prescriptions, lab reports, and discharge summaries for
          AI-powered extraction and secure storage.
        </p>
      </div>

      {/* Upload dropzone */}
      <FileUploadDropzone
        onExtract={handleExtract}
        isExtracting={isExtracting}
      />

      {/* Recent records */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Records</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recentRecords.map((record) => (
            <Card key={record.record_id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={
                      docTypeColor[record.document_type] ??
                      "bg-muted text-muted-foreground"
                    }
                  >
                    {record.document_type.replace(/_/g, " ")}
                  </Badge>
                  {record.consultation_date && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(record.consultation_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </span>
                  )}
                </div>
                <CardTitle className="text-base">
                  {record.doctor_name ?? "Unknown Doctor"}
                </CardTitle>
                {record.hospital_name && (
                  <CardDescription className="flex items-center gap-1">
                    <Hospital className="h-3 w-3" />
                    {record.hospital_name}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="flex-1 space-y-3 pt-0">
                {/* Diagnoses */}
                {record.diagnoses.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Stethoscope className="h-3 w-3" />
                      Diagnoses
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {record.diagnoses.map((dx) => (
                        <Badge
                          key={dx}
                          variant="secondary"
                          className="text-[11px]"
                        >
                          {dx}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medications */}
                {record.medications.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Pill className="h-3 w-3" />
                      Medications ({record.medications.length})
                    </p>
                    <ul className="space-y-0.5 text-xs">
                      {record.medications.slice(0, 3).map((med) => (
                        <li
                          key={med.name}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate font-medium">
                            {med.name} {med.dosage}
                          </span>
                          <span className="shrink-0 text-muted-foreground">
                            {med.frequency}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Allergies */}
                {record.allergies.length > 0 && (
                  <div>
                    <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <User className="h-3 w-3" />
                      Allergies
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {record.allergies.map((a) => (
                        <Badge
                          key={a.allergen}
                          variant="destructive"
                          className="text-[11px]"
                        >
                          {a.allergen}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw OCR preview */}
                <details className="group">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    View raw OCR text
                  </summary>
                  <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[11px] leading-relaxed">
                    {record.raw_ocr_text}
                  </pre>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
