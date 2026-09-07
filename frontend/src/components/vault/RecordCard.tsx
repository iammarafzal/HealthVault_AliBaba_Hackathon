"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ExternalLink,
  FileCode,
  FileText,
  FlaskConical,
  Hospital,
  Pill,
  ScanText,
  ShieldAlert,
  Stethoscope,
  Terminal,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import type { BiomarkerItem, MedicalRecord } from "@/types/api";
import {
  formatDisplayDate,
  getFilenameFromUrl,
  getRecordDisplayDate,
} from "@/lib/vaultMappers";
import { cn } from "@/lib/utils";
import DeleteRecordModal from "@/components/vault/DeleteRecordModal";

interface RecordCardProps {
  record: MedicalRecord;
  onDelete: (recordId: string) => void;
}

type TabType = "details" | "preview" | "raw";

const docTypeMeta: Record<string, { label: string; color: string }> = {
  prescription: {
    label: "Prescription",
    color:
      "border-emerald-200 bg-emerald-50 text-vault-teal dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-teal-300",
  },
  lab_report: {
    label: "Lab Report",
    color:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300",
  },
  discharge_summary: {
    label: "Discharge Summary",
    color:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300",
  },
};

const flagStyles: Record<BiomarkerItem["flag"], string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  low: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  normal:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
};

export default function RecordCard({ record, onDelete }: RecordCardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("details");
  const [rawExpanded, setRawExpanded] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const entities = record.extracted_data;
  const meta =
    docTypeMeta[record.document_type] ?? {
      label: record.document_type.replace(/_/g, " "),
      color: "bg-muted text-muted-foreground",
    };
  const filename = getFilenameFromUrl(record.file_url);
  const displayDate = getRecordDisplayDate(record);
  // PDF paths and blob: previews (unknown mime) render inside an iframe;
  // extension-based image URLs render as <img>.
  const isBlob = record.file_url.startsWith("blob:");
  const isPdf = isBlob || record.file_url.toLowerCase().endsWith(".pdf");

  /* Entity count chips for the card header */
  const countChips: { label: string; count: number; icon: React.ElementType }[] =
    record.document_type === "lab_report"
      ? [
        { label: "biomarkers", count: entities.biomarkers.length, icon: FlaskConical },
        { label: "diagnoses", count: entities.diagnoses.length, icon: Stethoscope },
        { label: "allergies", count: entities.allergies.length, icon: ShieldAlert },
      ]
      : record.document_type === "discharge_summary"
        ? [
          { label: "diagnoses", count: entities.diagnoses.length, icon: Stethoscope },
          { label: "medications", count: entities.medications.length, icon: Pill },
          { label: "surgical notes", count: record.surgical_notes.length, icon: ClipboardList },
        ]
        : [
          { label: "medications", count: entities.medications.length, icon: Pill },
          { label: "diagnoses", count: entities.diagnoses.length, icon: Stethoscope },
          { label: "allergies", count: entities.allergies.length, icon: ShieldAlert },
        ];

  return (
    <Card className="flex flex-col overflow-hidden border border-vault-border bg-card shadow-xs transition-shadow hover:shadow-md dark:border-border">
      {/* ── Card Header: badge, title, date pill, entity chips ── */}
      <CardHeader className="border-b border-border bg-vault-surface/50 p-3.5 pb-3 dark:bg-card">
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="outline"
            className={cn("px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide", meta.color)}
          >
            {meta.label}
          </Badge>
          {displayDate && (
            <span className="flex items-center gap-1 rounded-full border border-vault-border bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:border-border">
              <CalendarDays className="h-3 w-3 text-vault-teal" />
              {formatDisplayDate(displayDate)}
            </span>
          )}
        </div>

        <div className="mt-2 min-w-0">
          <p className="truncate text-sm font-bold leading-snug text-foreground">
            {record.doctor_name || record.test_name || filename || "Medical Document"}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            {record.hospital_name ? (
              <>
                <Hospital className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                <span className="truncate">{record.hospital_name}</span>
              </>
            ) : filename ? (
              <span className="truncate">{filename}</span>
            ) : null}
          </p>
        </div>

        {/* Quick entity count chips */}
        <div className="mt-2 flex flex-wrap gap-1">
          {countChips
            .filter((chip) => chip.count > 0)
            .map((chip) => (
              <span
                key={chip.label}
                className="flex items-center gap-1 rounded-full bg-vault-light px-2 py-0.5 text-[10px] font-semibold text-vault-teal dark:bg-muted dark:text-foreground"
              >
                <chip.icon className="h-3 w-3" />
                {chip.count} {chip.label}
              </span>
            ))}
        </div>

        {/* Tab navigation */}
        <div className="mt-3 flex rounded-lg border border-border bg-background p-0.5 text-xs font-semibold">
          {(
            [
              { key: "details", label: "Details Found", icon: ScanText },
              { key: "preview", label: "Document", icon: FileText },
              { key: "raw", label: "Raw Text", icon: Terminal },
            ] as { key: TabType; label: string; icon: React.ElementType }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 transition-colors",
                activeTab === tab.key
                  ? "bg-vault-teal text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-3 w-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </CardHeader>

      {/* ── Card Body ── */}
      <CardContent className="flex-1 space-y-3 p-3.5">
        {/* ── TAB 1: Details Found ── */}
        {activeTab === "details" && (
          <div className="space-y-3 text-xs">
            {/* Diagnoses (all document types) */}
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {record.document_type === "discharge_summary"
                  ? "Primary Diagnoses"
                  : "Diagnoses & Conditions"}
              </p>
              <div className="flex flex-wrap gap-1">
                {entities.diagnoses.length > 0 ? (
                  entities.diagnoses.map((dx) => (
                    <span
                      key={dx}
                      className="rounded bg-vault-light px-2 py-0.5 text-[11px] font-semibold text-vault-teal dark:bg-vault-dark dark:text-vault-light"
                    >
                      {dx}
                    </span>
                  ))
                ) : (
                  <span className="text-[11px] italic text-muted-foreground">
                    No specific condition listed
                  </span>
                )}
              </div>
            </div>

            {/* Lab biomarkers with high/low alert badges */}
            {record.document_type === "lab_report" && (
              <div>
                <p className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Biomarkers ({entities.biomarkers.length})</span>
                  <FlaskConical className="h-3 w-3 text-vault-teal" />
                </p>
                {entities.biomarkers.length > 0 ? (
                  <div className="space-y-1.5">
                    {entities.biomarkers.map((bio, idx) => (
                      <div
                        key={`${bio.analyte_name}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded border border-vault-border/60 bg-vault-surface/40 p-2 dark:border-border dark:bg-card"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">
                            {bio.analyte_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {bio.value} {bio.unit}
                            {(bio.ref_min !== undefined || bio.ref_max !== undefined) && (
                              <>
                                {" "}
                                · ref {bio.ref_min ?? "—"}–{bio.ref_max ?? "—"} {bio.unit}
                              </>
                            )}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            flagStyles[bio.flag]
                          )}
                        >
                          {bio.flag}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-muted-foreground">
                    No biomarkers parsed from this report
                  </p>
                )}
              </div>
            )}

            {/* Medications as dosage pill cards with Urdu instructions */}
            {record.document_type !== "lab_report" && (
              <div>
                <p className="mb-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>
                    {record.document_type === "discharge_summary"
                      ? "Discharge Medications"
                      : "Prescribed Medicines"}{" "}
                    ({entities.medications.length})
                  </span>
                  <Pill className="h-3 w-3 text-vault-teal" />
                </p>
                {entities.medications.length > 0 ? (
                  <div className="space-y-1.5">
                    {entities.medications.map((med, idx) => (
                      <div
                        key={`${med.name}-${idx}`}
                        className="rounded border border-vault-border/60 bg-vault-surface/40 p-2 dark:border-border dark:bg-card"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate font-bold text-foreground">
                            {med.name}
                          </span>
                          <span className="shrink-0 rounded bg-vault-teal px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {med.dosage || "—"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="rounded bg-vault-light px-1.5 py-0.2 text-[10px] font-semibold text-vault-teal dark:bg-muted dark:text-foreground">
                            {med.frequency || "frequency n/a"}
                          </span>
                        </div>
                        {med.urdu_instructions && (
                          <p
                            className="mt-1 text-[11px] font-urdu text-vault-teal dark:text-teal-400"
                            dir="rtl"
                            lang="ur"
                          >
                            {med.urdu_instructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] italic text-muted-foreground">
                    No medicines recorded
                  </p>
                )}
              </div>
            )}

            {/* Discharge-only: surgical notes + follow-up instructions */}
            {record.document_type === "discharge_summary" &&
              (record.surgical_notes.length > 0 ||
                record.follow_up_instructions.length > 0) && (
                <div className="space-y-2">
                  {record.surgical_notes.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Surgical Notes
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-foreground">
                        {record.surgical_notes.map((note, i) => (
                          <li key={i}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {record.follow_up_instructions.length > 0 && (
                    <div>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        Follow-up Instructions
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-foreground">
                        {record.follow_up_instructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            {/* Allergy warnings — red alert styling */}
            {entities.allergies.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50/70 p-2 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="flex items-center gap-1 text-[11px] font-bold text-vault-red">
                  <AlertTriangle className="h-3 w-3" />
                  Allergy Warnings
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entities.allergies.map((allergen, i) => (
                    <span
                      key={`${allergen}-${i}`}
                      className="rounded bg-vault-red px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                      {allergen}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nothing parsed at all */}
            {entities.diagnoses.length === 0 &&
              entities.medications.length === 0 &&
              entities.biomarkers.length === 0 &&
              entities.allergies.length === 0 &&
              record.surgical_notes.length === 0 && (
                <p className="rounded border border-dashed border-vault-border p-2 text-center text-[11px] italic text-muted-foreground dark:border-border">
                  No structured entities could be parsed from this document.
                </p>
              )}
          </div>
        )}

        {/* ── TAB 2: Document Preview ── */}
        {activeTab === "preview" && (
          <div className="space-y-2">
            {(record.signed_url || record.file_url || record.document_url) ? (
              <>
                <div className="overflow-hidden rounded-lg border border-vault-border bg-vault-surface/40 dark:border-border dark:bg-card">
                  {isPdf ? (
                    // eslint-disable-next-line jsx-a11y/iframe-has-title
                    <iframe
                      src={record.signed_url || record.file_url || record.document_url}
                      className="h-64 w-full"
                      aria-label="PDF document preview"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={record.signed_url || record.file_url || record.document_url}
                      alt={filename || "Document preview"}
                      className="max-h-64 w-full object-contain"
                    />
                  )}
                </div>
                <a
                  href={record.signed_url || record.file_url || record.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-vault-teal hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open original document
                </a>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-vault-border bg-vault-surface/40 p-6 text-center dark:border-border dark:bg-card">
                <FileText className="h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Preview not available — refresh the vault to load the saved file.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Raw Extracted Text (collapsible terminal block) ── */}
        {activeTab === "raw" && (
          <div className="space-y-1.5">
            <button
              onClick={() => setRawExpanded((v) => !v)}
              className="flex w-full items-center justify-between rounded border border-border bg-muted/40 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1">
                <FileCode className="h-3 w-3" />
                Raw OCR Text
              </span>
              {rawExpanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {rawExpanded && (
              <pre
                className={cn(
                  "max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-300",
                  "dark:border-zinc-700"
                )}
              >
                {entities.raw_text || "No raw OCR text available for this record."}
              </pre>
            )}
            {!rawExpanded && (
              <p className="text-[10px] italic text-muted-foreground">
                {entities.raw_text
                  ? `${entities.raw_text.length.toLocaleString()} characters extracted — click to expand.`
                  : "No raw OCR text stored for this record."}
              </p>
            )}
          </div>
        )}

        {/* ── Viewport-Level Portal Delete Confirmation Modal ── */}
        <DeleteRecordModal
          isOpen={confirmDeleteOpen}
          onClose={() => setConfirmDeleteOpen(false)}
          onConfirm={() => {
            setConfirmDeleteOpen(false);
            onDelete(record.id);
          }}
          record={record}
          documentType={record.document_type}
        />

        {/* Action footer */}
        <div className="flex items-center justify-end border-t border-border pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-vault-red dark:hover:bg-red-950/30"
            onClick={() => setConfirmDeleteOpen(true)}
            title="Delete record"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
