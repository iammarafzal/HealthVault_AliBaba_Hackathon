"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle,
  FileText,
  Loader2,
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

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type ProcessingStage =
  | "idle"
  | "uploading"
  | "ocr_processing"
  | "ai_extraction"
  | "verification"
  | "complete"
  | "error";

const stageLabels: Record<ProcessingStage, { en: string; ur: string }> = {
  idle: { en: "", ur: "" },
  uploading: { en: "Uploading document…", ur: "دستاویز اپ لوڈ ہو رہی ہے…" },
  ocr_processing: { en: "OCR Processing…", ur: "او سی آر پروسیسنگ…" },
  ai_extraction: { en: "AI Extraction…", ur: "اے آئی ایکسٹریکشن…" },
  verification: { en: "Verifying results…", ur: "نتائج کی تصدیق…" },
  complete: { en: "Extraction complete!", ur: "ایکسٹریکشن مکمل!" },
  error: { en: "Extraction failed — using fallback data", ur: "ناکام — فال بیک ڈیٹا استعمال ہو رہا ہے" },
};

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
}

export default function FileUploadDropzone({
  onFilesSelected,
  onExtract,
  isExtracting = false,
  processingStage = "idle",
}: FileUploadDropzoneProps) {
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

  const isProcessing =
    processingStage === "uploading" ||
    processingStage === "ocr_processing" ||
    processingStage === "ai_extraction" ||
    processingStage === "verification";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="h-5 w-5 text-primary" />
          Upload Medical Documents
        </CardTitle>
        <CardDescription>
          Drag & drop or browse — PDF, PNG, JPEG (max 10 MB each)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Processing stage indicator */}
        {processingStage !== "idle" && (
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-3">
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : processingStage === "complete" ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {stageLabels[processingStage].en}
                </p>
                <p className="text-xs text-muted-foreground" dir="rtl" lang="ur">
                  {stageLabels[processingStage].ur}
                </p>
              </div>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-1">
              {(
                [
                  "uploading",
                  "ocr_processing",
                  "ai_extraction",
                  "verification",
                ] as ProcessingStage[]
              ).map((stage, idx) => {
                const stageOrder = [
                  "uploading",
                  "ocr_processing",
                  "ai_extraction",
                  "verification",
                ];
                const currentIdx = stageOrder.indexOf(processingStage);
                const isActive = idx <= currentIdx;
                const isCurrent = stage === processingStage;

                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        "h-1.5 w-full rounded-full transition-colors",
                        isActive
                          ? isCurrent
                            ? "bg-primary animate-pulse"
                            : "bg-primary/60"
                          : "bg-muted"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-medium",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {stage === "uploading"
                        ? "Upload"
                        : stage === "ocr_processing"
                        ? "OCR"
                        : stage === "ai_extraction"
                        ? "Extract"
                        : "Verify"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() =>
            document.getElementById("file-input")?.click()
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ")
              document.getElementById("file-input")?.click();
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
        >
          <UploadCloud
            className={cn(
              "mb-3 h-10 w-10",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )}
          />
          <p className="mb-1 text-sm font-medium">
            {isDragActive
              ? "Drop files here…"
              : "Click to browse or drag & drop"}
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, PNG, JPEG up to 10 MB
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

        {/* File previews */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map(({ id, file, preview }) => (
              <div
                key={id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {/* Thumbnail or icon */}
                {preview ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}

                {/* Metadata */}
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatSize(file.size)}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {file.type.split("/")[1]?.toUpperCase() ?? "FILE"}
                    </Badge>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeFile(id)}
                  disabled={isProcessing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Extract & Save */}
        {files.length > 0 && (
          <Button
            onClick={handleExtract}
            disabled={isExtracting || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing…
              </>
            ) : isExtracting ? (
              <>Extracting…</>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Extract & Save ({files.length} file
                {files.length !== 1 ? "s" : ""})
              </>
            )}
          </Button>
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
