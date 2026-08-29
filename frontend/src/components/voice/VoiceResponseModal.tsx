"use client";

import { useEffect } from "react";
import { Check, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import StructuredAlertCard, {
  type AlertAction,
} from "@/components/voice/StructuredAlertCard";
import type { VoiceQueryResponse } from "@/types/api";

interface VoiceResponseModalProps {
  response: VoiceQueryResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: AlertAction) => void;
}

/**
 * Drawer/modal displaying structured voice assistant response.
 * Shows transcribed Urdu text (RTL), English AI summary, and actionable alert cards.
 */
export default function VoiceResponseModal({
  response,
  isOpen,
  onClose,
  onAction,
}: VoiceResponseModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !response) return null;

  /* Build alert actions from structured_payload */
  const payload = response.structured_payload;
  const medications = payload?.medications as
    | Array<{ name: string; timing: string; taken: boolean }>
    | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative z-10 mx-0 w-full max-w-lg rounded-t-2xl border bg-background p-0 shadow-2xl sm:mx-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Voice Response</h3>
              <p className="text-xs text-muted-foreground">
                AI-powered Urdu query result
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] space-y-4 overflow-y-auto p-5">
          {/* Transcribed Urdu Text */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Transcribed Urdu / اردو آواز
            </p>
            <p
              className="text-base font-medium leading-relaxed"
              dir="rtl"
              lang="ur"
            >
              {response.transcription_ur}
            </p>
          </div>

          {/* English AI Response */}
          <div className="rounded-lg border p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              AI Response (English)
            </p>
            <p className="text-sm leading-relaxed">{response.response_en}</p>
          </div>

          {/* Urdu AI Response */}
          <div className="rounded-lg border p-4">
            <p className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              AI Response (اردو)
            </p>
            <p
              className="text-sm leading-relaxed"
              dir="rtl"
              lang="ur"
            >
              {response.response_ur}
            </p>
          </div>

          {/* Structured Alert Card */}
          {medications && medications.length > 0 && (
            <StructuredAlertCard
              title="Today's Medication Schedule"
              description={response.response_en}
              intent={response.intent}
              actions={[
                {
                  type: "add_to_planner",
                  label: "Add to Planner",
                },
                { type: "dismiss", label: "Dismiss" },
              ]}
              onAction={onAction}
            />
          )}

          {!medications && (
            <StructuredAlertCard
              title={
                response.intent === "allergy_check"
                  ? "Allergy Safety Check"
                  : response.intent === "symptom_log"
                    ? "Symptom Log"
                    : "Query Result"
              }
              description={response.response_en}
              intent={response.intent}
              actions={[{ type: "dismiss", label: "Dismiss" }]}
              onAction={onAction}
            />
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-5 py-3">
          <Button className="w-full" variant="outline" onClick={onClose}>
            <Check className="mr-2 h-4 w-4" />
            Got it
          </Button>
        </div>
      </div>
    </div>
  );
}
