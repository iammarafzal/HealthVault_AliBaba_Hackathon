"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Filter,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToastProvider, useToast } from "@/components/ui/toast";
import FileUploadDropzone from "@/components/vault/FileUploadDropzone";
import { useDocumentStream } from "@/hooks/useDocumentStream";
import HITLReviewModal from "@/components/vault/HITLReviewModal";
import InvalidDocumentCard from "@/components/vault/InvalidDocumentCard";
import VaultRecordCard from "@/components/vault/VaultRecordCard";
import RecordDetailModal from "@/components/vault/RecordDetailModal";
import RecordTable from "@/components/vault/RecordTable";
import ProfileSetupCard from "@/components/dashboard/ProfileSetupCard";
import type {
  DocumentDraftExtractionResponse,
  MedicalRecord,
  VaultDocumentType,
  VisionExtractedEntities,
} from "@/types/api";
import {
  confirmRecord,
  deleteRecord,
  extractDraft,
  getRecords,
} from "@/services/vaultService";
import { getApiErrorMessage } from "@/services/apiClient";
import {
  getRecordDisplayDate,
  mapServerRecord,
} from "@/lib/vaultMappers";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

type TypeFilter = "all" | VaultDocumentType;
type ViewMode = "grid" | "table";
type ProcessingStage =
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

const typeFilters: { labelKey: string; defaultLabel: string; value: TypeFilter }[] = [
  { labelKey: "vault.categories.all", defaultLabel: "All", value: "all" },
  { labelKey: "vault.categories.prescription", defaultLabel: "Prescription", value: "prescription" },
  { labelKey: "vault.categories.lab_report", defaultLabel: "Lab Report", value: "lab_report" },
  { labelKey: "vault.categories.ultrasound_report", defaultLabel: "Ultrasound", value: "ultrasound_report" },
  { labelKey: "vault.categories.imaging_report", defaultLabel: "X-Ray / Scan", value: "imaging_report" },
  { labelKey: "vault.categories.discharge_summary", defaultLabel: "Discharge Summary", value: "discharge_summary" },
  { labelKey: "vault.categories.other_medical", defaultLabel: "Other", value: "other_medical" },
];

type DraftReviewState = {
  draft: DocumentDraftExtractionResponse;
  previewUrl: string;
  fileName: string;
};

type RejectionState = {
  rejectionReason: string | null;
  previewUrl: string;
};

function VaultPageInner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { locale, dir, t } = useLanguage();

  /* ── Records state — hydrated exclusively from the backend ── */
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* ── Upload state ── */
  const [isExtracting, setIsExtracting] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>("idle");
  const [dropzoneResetSignal, setDropzoneResetSignal] = useState(0);
  const [pendingDraft, setPendingDraft] = useState<DraftReviewState | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [rejection, setRejection] = useState<RejectionState | null>(null);
  const currentLocalPreviewRef = useRef<string>("");

  /* ── Real-Time SSE Stream Consumer ── */
  const documentStream = useDocumentStream({
    onProgress: (prog) => {
      setProcessingStage(prog.step as ProcessingStage);
    },
    onComplete: (rec, tempUrl) => {
      setIsExtracting(false);
      setProcessingStage("complete");
      const detectedType = rec.detected_document_type || rec.document_type || "prescription";
      const draft: DocumentDraftExtractionResponse = {
        temp_file_url: tempUrl || rec.temp_file_url || rec.document_url || currentLocalPreviewRef.current,
        is_medical_document: true,
        rejection_reason: null,
        detected_document_type: detectedType,
        confidence_score: rec.confidence_score || 0.95,
        document_type: detectedType,
        extracted_data: {
          doctor_name: rec.doctor_name || null,
          clinic_hospital_name: rec.clinic_hospital_name || rec.hospital_name || null,
          consultation_date: rec.consultation_date || null,
          diagnoses: rec.diagnoses || [],
          medications: rec.medications || [],
          allergies: rec.allergies || [],
          biomarkers: rec.biomarkers || [],
          raw_text: rec.raw_text || "",
        },
      };

      setPendingDraft({
        draft,
        previewUrl: currentLocalPreviewRef.current || tempUrl || rec.temp_file_url || "",
        fileName: "Medical Document",
      });

      toast({
        title: locale === "ur" ? "دستاویز کی تصدیق مکمل" : "Document Verified",
        description:
          locale === "ur"
            ? `طبی دستاویز کی قسم: ${detectedType}۔ براہ کرم تفصیلات کا جائزہ لے کر محفوظ کریں۔`
            : `Detected as ${detectedType.replace(/_/g, " ")}. Please review details before saving.`,
        variant: "info",
      });
      window.setTimeout(() => setProcessingStage("idle"), 1200);
    },
    onError: (msgEn, msgUr) => {
      setIsExtracting(false);
      setProcessingStage("error");
      if (currentLocalPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(currentLocalPreviewRef.current);
      }
      setRejection({
        rejectionReason: msgEn,
        previewUrl: "",
      });
      toast({
        title: locale === "ur" ? "دستاویز اپلوڈ کی خرابی" : "Document Notice",
        description: locale === "ur" ? msgUr : msgEn,
        variant: "error",
      });
      window.setTimeout(() => setProcessingStage("idle"), 2000);
    },
  });

  /* ── Detailed Record Modal state ── */
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  /* ── Filters & view state ── */
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* ── Hydrate records from GET /api/v1/vault/records/{user_id} ── */
  const fetchRecords = useCallback(
    async (silent = false) => {
      if (!user?.id) return;
      if (!silent) {
        setIsLoadingRecords(true);
      }
      setLoadError(null);
      try {
        const data = await getRecords(user.id);
        setRecords(data.map(mapServerRecord));
      } catch (err: unknown) {
        const message = getApiErrorMessage(err, "Failed to load medical records");
        setLoadError(message);
        if (!silent) {
          toast({
            title: "Unable to load records",
            description: message,
            variant: "error",
          });
        }
      } finally {
        setIsLoadingRecords(false);
      }
    },
    [user?.id, toast]
  );

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /* ── Upload → Real-Time SSE Stream → HITL Review ──────────────────── */
  const handleExtract = async (files: File[]) => {
    if (!user?.id) {
      toast({
        title: locale === "ur" ? "سائن ان کریں" : "Not signed in",
        description: locale === "ur" ? "دستاویز اپلوڈ کرنے کے لیے سائن ان کریں۔" : "Sign in again to upload documents.",
        variant: "error",
      });
      return;
    }
    if (files.length === 0) return;

    const file = files[0];
    const localPreviewUrl = URL.createObjectURL(file);
    currentLocalPreviewRef.current = localPreviewUrl;
    setIsExtracting(true);
    setProcessingStage("reading");
    setRejection(null);

    await documentStream.startStream(file, "prescription", user.id);
  };

  const handleCancelDraft = () => {
    if (pendingDraft?.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(pendingDraft.previewUrl);
    }
    setPendingDraft(null);
  };

  const handleDismissRejection = () => {
    setRejection(null);
  };

  const handleUploadNewFromRejection = () => {
    setRejection(null);
    setDropzoneResetSignal((n) => n + 1);
  };

  const handleConfirmDraft = async (confirmedData: VisionExtractedEntities) => {
    if (!user?.id || !pendingDraft) return;
    setIsSavingDraft(true);
    try {
      const saved = await confirmRecord({
        user_id: user.id,
        document_type: pendingDraft.draft.document_type,
        file_url: pendingDraft.draft.temp_file_url,
        confirmed_data: confirmedData,
      });
      setRecords((prev) => [mapServerRecord(saved), ...prev]);
      if (pendingDraft.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(pendingDraft.previewUrl);
      }
      setPendingDraft(null);
      setDropzoneResetSignal((n) => n + 1);
      toast({
        title: "Record saved",
        description: "Your reviewed medical details were saved to the vault.",
        variant: "success",
      });
      fetchRecords(true);
    } catch (err: unknown) {
      toast({
        title: "Unable to save record",
        description: getApiErrorMessage(err, "Confirm & save failed"),
        variant: "error",
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  /* ── Open / Close Detail Modal ─────────────────────────────── */
  const handleViewRecord = (record: MedicalRecord) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedRecord(null);
  };

  /* ── Protected persisted delete ─────────────────────────────── */
  const handleDelete = async (recordId: string) => {
    try {
      await deleteRecord(recordId);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      if (selectedRecord?.id === recordId) {
        setIsDetailModalOpen(false);
        setSelectedRecord(null);
      }
      toast({
        title: "Record deleted",
        description: "The record and its linked entities were removed from your vault.",
        variant: "success",
      });
    } catch (err: unknown) {
      toast({
        title: "Unable to delete record",
        description: getApiErrorMessage(err, "Delete failed"),
        variant: "error",
      });
    }
  };

  /* ── Filtered records ─────────────────────────────────────── */
  const filteredRecords = useMemo(() => {
    let result = records;

    if (typeFilter !== "all") {
      result = result.filter((r) => r.document_type === typeFilter);
    }
    if (dateFrom) {
      result = result.filter((r) => {
        const d = getRecordDisplayDate(r);
        return d && d.slice(0, 10) >= dateFrom;
      });
    }
    if (dateTo) {
      result = result.filter((r) => {
        const d = getRecordDisplayDate(r);
        return d && d.slice(0, 10) <= dateTo;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const ed = r.extracted_data;
        return (
          r.doctor_name?.toLowerCase().includes(q) ||
          r.hospital_name?.toLowerCase().includes(q) ||
          r.test_name?.toLowerCase().includes(q) ||
          ed.diagnoses.some((dx) => dx.toLowerCase().includes(q)) ||
          ed.medications.some((m) => m.name.toLowerCase().includes(q)) ||
          ed.biomarkers.some((b) => b.analyte_name.toLowerCase().includes(q))
        );
      });
    }

    return result;
  }, [records, typeFilter, dateFrom, dateTo, searchQuery]);

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters =
    typeFilter !== "all" || Boolean(dateFrom) || Boolean(dateTo) || Boolean(searchQuery.trim());

  return (
    <div className="mx-auto max-w-6xl space-y-6" dir={dir}>
      {/* ── Page Header (Minimal & Clean) ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0D5C4A] dark:text-[#0A8C6A]">
            {t("vault.title", "Medical Vault")}
          </h1>
          <p className="text-xs text-[#3D5450] dark:text-[#B2DFD4] sm:text-sm">
            {t("vault.subtitle", "Secure storage for your prescriptions, lab tests, and hospital reports.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-[#DCE8E5] bg-[#E8F7F4] px-3 py-1 text-xs font-semibold text-[#0D5C4A] dark:border-white/10 dark:bg-teal-950/60 dark:text-[#B2DFD4]"
          >
            {records.length} {t("vault.recordsCount", "Records")}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-[#3D5450] hover:text-[#0D5C4A] hover:bg-[#E8F7F4] dark:text-[#B2DFD4] dark:hover:bg-zinc-800"
            onClick={() => fetchRecords()}
            disabled={isLoadingRecords}
            title={t("vault.refreshRecords", "Refresh records")}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingRecords ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* ── Progressive Profile Setup Card ── */}
      <ProfileSetupCard />

      {/* ── Minimal Document Upload Card ── */}
      <FileUploadDropzone
        onExtract={handleExtract}
        isExtracting={isExtracting || documentStream.isStreaming}
        processingStage={processingStage}
        streamStep={documentStream.step}
        percent={documentStream.percent}
        messageEn={documentStream.messageEn}
        messageUr={documentStream.messageUr}
        resetSignal={dropzoneResetSignal}
      />

      {/* ── Non-Medical Document Rejection Card ── */}
      {rejection && (
        <InvalidDocumentCard
          rejectionReason={rejection.rejectionReason}
          onDismiss={handleDismissRejection}
          onUploadNew={handleUploadNewFromRejection}
        />
      )}

      {/* ── HITL Review Modal (During Upload) ── */}
      {pendingDraft && (
        <HITLReviewModal
          draft={pendingDraft.draft}
          previewUrl={pendingDraft.previewUrl}
          fileName={pendingDraft.fileName}
          isSaving={isSavingDraft}
          onCancel={handleCancelDraft}
          onConfirm={handleConfirmDraft}
        />
      )}

      {/* ── Detailed Record Modal (On Card Click) ── */}
      <RecordDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={handleCloseDetailModal}
      />

      {/* ── Toolbar: Filter tabs, search, date range, view toggle ── */}
      <div className="space-y-3.5 rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#1A2826] dark:text-white">
              {t("vault.archivedRecords", "Saved Records")}
            </h2>
            <span className="rounded-full bg-[#E8F7F4] dark:bg-teal-950/60 px-2 py-0.5 text-xs font-bold text-[#0D5C4A] dark:text-[#B2DFD4]">
              {filteredRecords.length}
            </span>
          </div>

          {/* View Toggle Button Group */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7] dark:bg-zinc-900 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "grid"
                    ? "bg-[#0D5C4A] text-white shadow-xs dark:bg-[#0A8C6A]"
                    : "text-[#3D5450] dark:text-[#B2DFD4] hover:text-[#1A2826]"
                }`}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>{t("vault.viewGrid", "Grid")}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  viewMode === "table"
                    ? "bg-[#0D5C4A] text-white shadow-xs dark:bg-[#0A8C6A]"
                    : "text-[#3D5450] dark:text-[#B2DFD4] hover:text-[#1A2826]"
                }`}
                aria-label="Table view"
              >
                <List className="h-3.5 w-3.5" />
                <span>{t("vault.viewTable", "Table")}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {typeFilters.map((tf) => {
            const label = t(tf.labelKey, tf.defaultLabel);
            return (
              <button
                key={tf.value}
                onClick={() => setTypeFilter(tf.value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  typeFilter === tf.value
                    ? "bg-[#0D5C4A] text-white shadow-2xs dark:bg-[#0A8C6A]"
                    : "border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 text-[#3D5450] dark:text-[#B2DFD4] hover:border-[#0D5C4A] hover:text-[#0D5C4A]"
                }`}
              >
                {label}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-[#C0392B] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <X className="h-3 w-3" />
              {t("vault.resetFilters", "Reset Filters")}
            </button>
          )}
        </div>

        {/* Search Bar & Date Filter */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 ${locale === "ur" ? "right-3" : "left-3"}`} />
            <input
              type="text"
              placeholder={t("vault.searchPlaceholder", "Search by doctor, condition, or medicine...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-[#0D5C4A] focus:ring-1 focus:ring-[#0D5C4A] ${
                locale === "ur" ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
              }`}
              dir={dir}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-lg border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-[#1A2826] dark:text-[#B2DFD4] outline-none focus:border-[#0D5C4A]"
              title="From date"
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-lg border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-zinc-900 px-2 py-1.5 text-xs text-[#1A2826] dark:text-[#B2DFD4] outline-none focus:border-[#0D5C4A]"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* ── Records Display: skeleton / error / empty / grid / table ── */}
      {isLoadingRecords ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-[#DCE8E5] dark:border-white/10 rounded-xl bg-white dark:bg-[#223431]">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/40 dark:bg-red-950/20">
          <p className="text-sm font-semibold text-[#C0392B]">{locale === "ur" ? "ریکارڈز لوڈ کرنے میں ناکامی" : "Error loading records"}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-zinc-400">{loadError}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 text-xs border-red-300"
            onClick={() => fetchRecords()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {locale === "ur" ? "دوبارہ کوشش کریں" : "Retry"}
          </Button>
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] py-16 px-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A] border border-[#B2DFD4] dark:border-teal-800 mb-3">
            <FileText className="w-10 h-10 text-slate-400 dark:text-[#B2DFD4]" />
          </div>
          <h3 className="text-base font-bold text-[#1A2826] dark:text-white">
            {t("vault.noRecordsTitle", "No records found")}
          </h3>
          <p className="mt-1 text-xs text-[#3D5450] dark:text-[#B2DFD4] max-w-md mx-auto">
            {t("vault.noRecordsSub", "Upload your first prescription or report above to get started.")}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRecords.map((record) => (
            <VaultRecordCard
              key={record.id}
              record={record}
              onView={handleViewRecord}
              onDelete={handleDelete}
            />
          ))}

          {filteredRecords.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] py-12 text-center text-xs text-[#3D5450] dark:text-[#B2DFD4]">
              <Filter className="mx-auto h-8 w-8 text-slate-300 dark:text-zinc-600 mb-2" />
              <p className="font-semibold text-[#1A2826] dark:text-white">{t("vault.noRecordsTitle", "No records found")}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{t("vault.noRecordsSub", "Upload your first prescription or report above to get started.")}</p>
            </div>
          )}
        </div>
      ) : (
        <RecordTable
          records={filteredRecords}
          onView={handleViewRecord}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

export default function VaultPage() {
  return (
    <ToastProvider>
      <VaultPageInner />
    </ToastProvider>
  );
}
