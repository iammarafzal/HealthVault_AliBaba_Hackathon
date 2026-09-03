"use client";

import { AlertTriangle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvalidDocumentCardProps {
  rejectionReason?: string | null;
  onDismiss: () => void;
  onUploadNew: () => void;
}

export default function InvalidDocumentCard({
  rejectionReason,
  onDismiss,
  onUploadNew,
}: InvalidDocumentCardProps) {
  return (
    <div className="relative rounded-2xl border-2 border-[#C47C1A]/40 bg-[#FEF5E4] dark:bg-amber-950/20 dark:border-amber-800/50 p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Dismiss button */}
      <button
        type="button"
        onClick={onDismiss}
        className="absolute top-3 right-3 rounded-lg p-1 text-[#C47C1A]/60 hover:text-[#C0392B] hover:bg-[#C0392B]/10 dark:text-amber-400/60 dark:hover:text-red-400 transition-colors"
        title="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Icon + Title */}
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#C0392B]/10 dark:bg-red-900/30 text-[#C0392B] dark:text-red-400 border border-[#C0392B]/20 dark:border-red-800/40">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <h3 className="text-sm font-bold text-[#7C3A1A] dark:text-amber-200 leading-snug">
            Document Could Not Be Verified as a Medical Record
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[#8B5E3C] dark:text-amber-300/80">
            The uploaded image does not appear to be a medical record (prescription,
            lab test, or scan report). Please upload a clear medical document.
          </p>

          {/* AI rejection reason */}
          {rejectionReason && (
            <div className="mt-3 rounded-lg border border-[#C47C1A]/20 dark:border-amber-800/30 bg-white/60 dark:bg-amber-950/30 px-3 py-2">
              <p className="text-[11px] font-medium text-[#7C3A1A]/80 dark:text-amber-300/70">
                <span className="font-bold text-[#C47C1A] dark:text-amber-400">AI Analysis: </span>
                {rejectionReason}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2.5 pl-[52px]">
        <Button
          type="button"
          onClick={onUploadNew}
          className="bg-[#C47C1A] hover:bg-[#ab6b15] text-white text-xs font-semibold px-4 h-9 rounded-lg shadow-sm flex items-center gap-2 transition-all"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload New Document
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onDismiss}
          className="text-[#7C3A1A]/70 dark:text-amber-300/60 hover:text-[#7C3A1A] dark:hover:text-amber-200 hover:bg-[#C47C1A]/10 text-xs font-medium h-9"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
