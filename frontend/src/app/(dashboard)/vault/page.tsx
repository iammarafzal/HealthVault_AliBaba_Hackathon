"use client";

import { useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
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
import FileUploadDropzone from "@/components/vault/FileUploadDropzone";
import RecordCard from "@/components/vault/RecordCard";
import RecordTable from "@/components/vault/RecordTable";
import type { ExtractionResponse } from "@/types/api";
import { mockExtractionResponse } from "@/lib/mockData";
import { uploadDocument } from "@/services/apiService";

/* ── Mock recent records ──────────────────────────────────── */
const initialRecords: ExtractionResponse[] = [
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

type DocType = "all" | "prescription" | "lab_report" | "discharge_summary";
type ViewMode = "grid" | "table";

export default function VaultPage() {
  const [records, setRecords] = useState<ExtractionResponse[]>(initialRecords);
  const [isExtracting, setIsExtracting] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRecord, setSelectedRecord] =
    useState<ExtractionResponse | null>(null);

  /* ── Filtered records ────────────────────────────────────── */
  const filteredRecords = useMemo(() => {
    let result = records;

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((r) => r.document_type === typeFilter);
    }

    // Date range filter
    if (dateFrom) {
      result = result.filter(
        (r) => r.consultation_date && r.consultation_date >= dateFrom
      );
    }
    if (dateTo) {
      result = result.filter(
        (r) => r.consultation_date && r.consultation_date <= dateTo
      );
    }

    // Search filter (doctor name or disease)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.doctor_name?.toLowerCase().includes(q) ||
          r.hospital_name?.toLowerCase().includes(q) ||
          r.diagnoses.some((dx) => dx.toLowerCase().includes(q))
      );
    }

    return result;
  }, [records, typeFilter, dateFrom, dateTo, searchQuery]);

  /* ── Upload handler with backend integration ─────────────── */
  const handleExtract = async (files: File[]) => {
    setIsExtracting(true);
    try {
      const extractionResult = await uploadDocument(files[0]);
      setRecords((prev) => [extractionResult, ...prev]);
      setSelectedRecord(extractionResult);
    } catch {
      // Fallback: use mock data (handled inside uploadDocument)
      setRecords((prev) => [mockExtractionResponse, ...prev]);
      setSelectedRecord(mockExtractionResponse);
    } finally {
      setIsExtracting(false);
    }
  };

  /* ── Delete handler ──────────────────────────────────────── */
  const handleDelete = (recordId: string) => {
    setRecords((prev) => prev.filter((r) => r.record_id !== recordId));
  };

  /* ── Clear all filters ───────────────────────────────────── */
  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    typeFilter !== "all" || dateFrom || dateTo || searchQuery.trim();

  const typeFilters: { label: string; value: DocType }[] = [
    { label: "All", value: "all" },
    { label: "Prescription", value: "prescription" },
    { label: "Lab Report", value: "lab_report" },
    { label: "Discharge Summary", value: "discharge_summary" },
  ];

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

      {/* Extraction result modal */}
      {selectedRecord && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Extraction Complete
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSelectedRecord(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              {selectedRecord.document_type.replace(/_/g, " ")} —{" "}
              {selectedRecord.doctor_name ?? "Unknown"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Diagnoses
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {selectedRecord.diagnoses.map((dx) => (
                    <Badge key={dx} variant="secondary" className="text-[11px]">
                      {dx}
                    </Badge>
                  ))}
                  {selectedRecord.diagnoses.length === 0 && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Medications
                </p>
                <p className="text-sm font-semibold">
                  {selectedRecord.medications.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Allergies
                </p>
                <p className="text-sm font-semibold">
                  {selectedRecord.allergies.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records section */}
      <div>
        {/* Toolbar: Search + Filters + View toggle */}
        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">
              Recent Records ({filteredRecords.length})
            </h2>

            {/* View toggle */}
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`rounded-md p-1.5 transition-colors ${
                    viewMode === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-label="Table view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by doctor, hospital, or diagnosis…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
                placeholder="From"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border bg-background px-2 py-2 text-xs outline-none focus:border-primary"
                placeholder="To"
              />
            </div>
          </div>

          {/* Type filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {typeFilters.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTypeFilter(tf.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  typeFilter === tf.value
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                {tf.label}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Records display */}
        {viewMode === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecords.map((record) => (
              <RecordCard
                key={record.record_id}
                record={record}
                onViewDetails={setSelectedRecord}
                onInterpret={setSelectedRecord}
                onDelete={handleDelete}
              />
            ))}
            {filteredRecords.length === 0 && (
              <div className="col-span-full py-8 text-center text-muted-foreground">
                No records match your filters.
              </div>
            )}
          </div>
        ) : (
          <RecordTable
            records={filteredRecords}
            onViewDetails={setSelectedRecord}
            onInterpret={setSelectedRecord}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
}
