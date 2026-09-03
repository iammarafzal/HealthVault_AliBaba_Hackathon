"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { VaultDocumentType } from "@/types/api";
import LiveClinicalScanner, { type ProcessingStage } from "./LiveClinicalScanner";

import { useLanguage } from "@/context/LanguageContext";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface FileWithPreview {
  file: File;
  id: string;
  preview?: string;
}

interface FileUploadDropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  onExtract?: (files: File[]) => void;
  isExtracting?: boolean;
  processingStage?: ProcessingStage;
  streamStep?: "reading" | "identifying" | "verifying" | "complete" | "error" | "idle";
  percent?: number;
  messageEn?: string;
  messageUr?: string;
  /** Increment to clear the selected files (e.g. after a successful upload). */
  resetSignal?: number;
}

export default function FileUploadDropzone({
  onFilesSelected,
  onExtract,
  isExtracting = false,
  processingStage = "idle",
  streamStep,
  percent,
  messageEn,
  messageUr,
  resetSignal,
}: FileUploadDropzoneProps) {
  const { locale, dir, t } = useLanguage();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const valid = Array.from(incoming).filter(
        (f) =>
          (ACCEPTED_TYPES as readonly string[]).includes(f.type) &&
          f.size <= MAX_FILE_SIZE
      );

      const mapped: FileWithPreview[] = valid.map((file) => ({
        file,
        id: crypto.randomUUID(),
        preview: file.type.startsWith("image/")
          ? URL.createObjectURL(file)
          : undefined,
      }));

      setFiles((prev) => {
        const next = [...prev, ...mapped];
        onFilesSelected?.(next.map((f) => f.file));
        return next;
      });
    },
    [onFilesSelected]
  );

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (target?.preview) URL.revokeObjectURL(target.preview);
        const next = prev.filter((f) => f.id !== id);
        onFilesSelected?.(next.map((f) => f.file));
        return next;
      });
    },
    [onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleExtract = () => {
    if (files.length) onExtract?.(files.map((f) => f.file));
  };

  const clearFiles = () => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
  };

  /* Clear staged files when the parent signals a reset (post-upload). */
  useEffect(() => {
    if (resetSignal !== undefined && resetSignal > 0) {
      clearFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  const isProcessing =
    isExtracting ||
    streamStep === "reading" ||
    streamStep === "identifying" ||
    streamStep === "verifying" ||
    processingStage === "reading" ||
    processingStage === "identifying" ||
    processingStage === "verifying" ||
    processingStage === "uploading" ||
    processingStage === "ocr_processing" ||
    processingStage === "ai_extraction" ||
    processingStage === "verification";

  return (
    <Card className="w-full overflow-hidden border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#223431] shadow-xs">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* ── Live Clinical Analysis State (When Processing) ── */}
        {isProcessing ? (
          <LiveClinicalScanner
            stage={processingStage}
            streamStep={streamStep}
            percent={percent}
            messageEn={messageEn}
            messageUr={messageUr}
            fileName={files[0]?.file.name}
            previewUrl={files[0]?.preview}
          />
        ) : (
          <>
            {/* ── 3. Minimal Document Dropzone Area ── */}
            <div
              role="button"
              tabIndex={0}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("file-input")?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  document.getElementById("file-input")?.click();
              }}
              className={cn(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 sm:p-8 transition-all duration-200 text-center",
                isDragActive
                  ? "border-[#0D5C4A] bg-[#E8F7F4]/50 dark:bg-teal-950/30 scale-[1.005]"
                  : "border-[#DCE8E5] dark:border-white/10 bg-[#F5F8F7]/60 dark:bg-zinc-900/40 hover:border-[#0D5C4A] dark:hover:border-[#0A8C6A] hover:bg-white dark:hover:bg-zinc-900"
              )}
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A] transition-all group-hover:scale-105">
                <UploadCloud className="w-8 h-8 text-[#0D5C4A] dark:text-[#0A8C6A]" />
              </div>

              <p className="mb-1 text-xs sm:text-sm font-bold text-[#1A2826] dark:text-white">
                {t("vault.uploadMainText", "Click to upload or drag & drop files here")}
              </p>

              <p className="text-[11px] font-medium text-[#3D5450] dark:text-[#B2DFD4]">
                {t("vault.uploadSubtext", "PDF, JPG, PNG (up to 10 MB)")}
              </p>

              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {/* ── 4. Selected File Queue Pills ── */}
            {files.length > 0 && (
              <div className="space-y-2.5 pt-2" dir={dir}>
                <p className="text-xs font-bold uppercase tracking-wider text-[#3D5450] dark:text-[#B2DFD4]">
                  {t("vault.readyForIngestion", "Ready for Processing")} ({files.length})
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {files.map(({ id, file, preview }) => (
                    <div
                      key={id}
                      className="group flex items-center gap-3 rounded-xl border border-[#DCE8E5] dark:border-white/10 bg-white dark:bg-[#1A2826] p-3 shadow-2xs transition-all hover:border-[#0D5C4A]/40"
                    >
                      {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview}
                          alt={file.name}
                          className="h-11 w-11 shrink-0 rounded-lg object-cover border border-[#DCE8E5] dark:border-white/10"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E8F7F4] dark:bg-teal-950/60 text-[#0D5C4A] dark:text-[#0A8C6A]">
                          <FileText className="h-5 w-5" />
                        </div>
                      )}

                      <div className="flex-1 overflow-hidden min-w-0">
                        <p className="truncate text-xs font-bold text-[#1A2826] dark:text-white">
                          {file.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#3D5450] dark:text-[#B2DFD4]">
                          <span>{formatSize(file.size)}</span>
                          <span>•</span>
                          <span className="font-semibold uppercase text-[#0D5C4A] dark:text-[#0A8C6A]">
                            {file.type.split("/")[1]?.toUpperCase() || "DOCUMENT"}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => removeFile(id)}
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Ingestion Trigger Button */}
                <Button
                  onClick={handleExtract}
                  disabled={isProcessing}
                  className="w-full bg-[#0D5C4A] hover:bg-[#0A8C6A] text-white text-xs sm:text-sm font-bold py-3 rounded-xl shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-3"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {t("vault.analyzeButton", "Analyze & Extract Medical Details")} ({files.length}{" "}
                    {files.length === 1
                      ? t("vault.documentSingular", "Document")
                      : t("vault.documentPlural", "Documents")}
                    )
                  </span>
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
