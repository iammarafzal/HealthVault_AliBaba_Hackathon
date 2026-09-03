"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import type { MedicalRecord } from "@/types/api";

interface DeleteRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  record?: MedicalRecord | null;
  recordTitle?: string;
  documentType?: string;
  isDeleting?: boolean;
}

export default function DeleteRecordModal({
  isOpen,
  onClose,
  onConfirm,
  record,
  recordTitle,
  documentType,
  isDeleting = false,
}: DeleteRecordModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, isDeleting, onClose]);

  if (!mounted || !isOpen) return null;

  // Resolve title and type formatting
  const title =
    recordTitle ||
    record?.doctor_name ||
    record?.test_name ||
    record?.hospital_name ||
    "Medical Record";

  const rawType = documentType || record?.document_type || "document";
  const formattedType = rawType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Full-Screen Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={() => {
          if (!isDeleting) onClose();
        }}
        aria-hidden="true"
      />

      {/* Centering Wrapper */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        {/* Modal Dialog Surface */}
        <div
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl border border-[#DCE8E5] dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 text-left shadow-2xl transition-all focus:outline-hidden animate-in fade-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon Container */}
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950/50">
            <Trash2 className="h-6 w-6 text-[#C0392B]" />
          </div>

          {/* Header */}
          <div>
            <h3 className="text-xl font-bold text-[#1A2826] dark:text-white">
              Delete Medical Record?
            </h3>
            <p className="mt-0.5 text-sm font-medium text-[#3D5450] dark:text-zinc-400">
              {title} &bull; {formattedType}
            </p>
          </div>

          {/* Description */}
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-zinc-300">
            Are you sure you want to delete this record? This action will permanently remove the uploaded document and all linked clinical data (medications, diagnoses, biomarkers, and allergies). This cannot be undone.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isDeleting}
              onClick={onClose}
              className="rounded-xl border border-[#DCE8E5] dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-[#1A2826] dark:text-zinc-200 transition-colors hover:bg-[#F5F8F7] dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirm}
              className="flex items-center gap-2 rounded-xl bg-[#C0392B] px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-colors hover:bg-[#A93226] disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
