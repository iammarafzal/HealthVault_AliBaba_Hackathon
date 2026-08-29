"use client";

import { useState } from "react";
import { Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioRecorder, {
  type RecordingState,
} from "@/components/voice/AudioRecorder";
import VoiceResponseModal from "@/components/voice/VoiceResponseModal";
import type { AlertAction } from "@/components/voice/StructuredAlertCard";
import { sendVoiceQuery } from "@/services/apiService";
import { mockVoiceResponse } from "@/lib/mockData";
import type { VoiceQueryResponse } from "@/types/api";

/**
 * Floating voice assistant widget (bottom-right corner).
 * Integrates AudioRecorder, VoiceResponseModal, and StructuredAlertCard.
 */
export default function VoiceAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [response, setResponse] = useState<VoiceQueryResponse | null>(null);
  const [showResponse, setShowResponse] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ── Open/close widget ─────────────────────────────────── */
  const toggleWidget = () => {
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setRecordingState("idle");
    }
  };

  /* ── Handle recording complete ─────────────────────────── */
  const handleRecordingComplete = async (audioBase64: string) => {
    try {
      const data = await sendVoiceQuery("mock-user-id", audioBase64);
      setResponse(data);
      setShowResponse(true);
    } catch {
      setResponse(mockVoiceResponse);
      setShowResponse(true);
    }
  };

  /* ── Handle alert actions ──────────────────────────────── */
  const handleAction = (action: AlertAction) => {
    if (action.type === "add_to_planner") {
      setToast("Added to Medication Planner ✓");
    } else if (action.type === "dismiss") {
      setToast("Dismissed");
    }
    setShowResponse(false);
    setIsOpen(false);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <>
      {/* ── Floating FAB ──────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {/* Toast */}
        {toast && (
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium shadow-lg">
            {toast}
          </div>
        )}

        {/* Expanded panel */}
        {isOpen && (
          <div className="w-72 rounded-2xl border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  Urdu Voice Assistant
                </h3>
                <p
                  className="text-xs text-muted-foreground"
                  dir="rtl"
                  lang="ur"
                >
                  اردو آواز معاون
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={toggleWidget}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <AudioRecorder
              state={recordingState}
              onStateChange={setRecordingState}
              onRecordingComplete={handleRecordingComplete}
            />

            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Tap mic to speak in Urdu
            </p>
          </div>
        )}

        {/* FAB trigger button */}
        {!isOpen && (
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <button
              onClick={toggleWidget}
              className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-2xl transition-transform hover:scale-105 min-h-[44px] min-w-[44px]"
              aria-label="Open Urdu Voice Assistant"
            >
              <Mic className="h-8 w-8" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ── Response modal ────────────────────────────────── */}
      <VoiceResponseModal
        response={response}
        isOpen={showResponse}
        onClose={() => setShowResponse(false)}
        onAction={handleAction}
      />
    </>
  );
}
