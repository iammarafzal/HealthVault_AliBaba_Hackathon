"use client";

import { useState } from "react";
import { Mic, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioRecorder, {
  type RecordingState,
} from "@/components/voice/AudioRecorder";
import VoiceResponseModal from "@/components/voice/VoiceResponseModal";
import type { AlertAction } from "@/components/voice/StructuredAlertCard";
import { transcribeAudio, sendVoiceQuery } from "@/services/voiceService";
import { useAuth } from "@/context/AuthContext";
import type { VoiceQueryResponse, VoiceIntentResponse } from "@/types/api";

/**
 * Floating voice assistant widget (bottom-right corner).
 * Records audio → transcribes via /voice/transcribe → sends to /voice/query.
 */
export default function VoiceAssistantWidget() {
  const { user } = useAuth();
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

  /* ── Handle recording complete: transcribe then query ──── */
  const handleRecordingComplete = async (audioBase64: string) => {
    try {
      // Step 1: Convert base64 back to blob for transcription
      const byteChars = atob(audioBase64);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const audioBlob = new Blob([byteArray], { type: "audio/webm" });

      // Step 2: Transcribe audio
      const transcription = await transcribeAudio(audioBlob);
      const queryText = transcription.transcribed_text;

      // Step 3: Send voice query
      const intentResult = await sendVoiceQuery(user?.id || "", queryText);

      // Step 4: Map VoiceIntentResponse → VoiceQueryResponse for the modal
      const mapped: VoiceQueryResponse = {
        transcription_ur: queryText,
        intent: mapIntent(intentResult.intent),
        response_ur: intentResult.answer_ur,
        response_en: intentResult.answer_en,
        structured_payload: intentResult.entities_detected,
      };

      setResponse(mapped);
      setShowResponse(true);
    } catch (err) {
      console.error("[VoiceAssistant] Error:", err);
      setToast("Voice query failed. Please try again.");
      setTimeout(() => setToast(null), 3000);
    }
  };

  /* ── Handle alert actions ──────────────────────────────── */
  const handleAction = (action: AlertAction) => {
    if (action.type === "add_to_planner") {
      setToast("Added to Medication Planner");
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
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 print:hidden">
        {/* Toast Notification */}
        {toast && (
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-lg border border-vault-border bg-vault-teal px-4 py-2.5 text-xs font-semibold text-white shadow-xl">
            {toast}
          </div>
        )}

        {/* Expanded Panel */}
        {isOpen && (
          <div className="w-80 rounded-2xl border border-vault-border bg-card p-5 shadow-2xl transition-all dark:border-border">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-vault-light text-vault-teal dark:bg-vault-dark dark:text-vault-light">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">
                    Urdu Voice Assistant
                  </h3>
                  <p
                    className="text-[11px] font-medium font-urdu text-vault-teal dark:text-teal-400"
                    dir="rtl"
                  >
                    اردو میں بول کر معلوم کریں
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
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

            <div className="mt-3 rounded-lg bg-vault-light/60 p-2 text-center text-[11px] text-vault-teal dark:bg-muted dark:text-muted-foreground">
              <span>بولیں: &quot;میری شوگر کی دوا کا وقت کیا ہے؟&quot;</span>
            </div>
          </div>
        )}

        {/* FAB Trigger Button */}
        {!isOpen && (
          <div className="relative">
            <span className="absolute inset-0 animate-ping rounded-full bg-vault-active/30" />
            <button
              onClick={toggleWidget}
              className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-vault-teal to-vault-active text-white shadow-xl transition-all duration-200 hover:scale-105 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-vault-teal/30 min-h-[44px] min-w-[44px]"
              aria-label="Open Urdu Voice Assistant"
            >
              <Mic className="h-6 w-6" strokeWidth={2.2} />
            </button>
          </div>
        )}
      </div>

      {/* ── Response Modal ────────────────────────────────── */}
      <VoiceResponseModal
        response={response}
        isOpen={showResponse}
        onClose={() => setShowResponse(false)}
        onAction={handleAction}
      />
    </>
  );
}

/** Map backend intent string to the union type expected by UI components. */
function mapIntent(
  intent: string
): "medication_schedule" | "symptom_log" | "allergy_check" {
  const lower = intent.toLowerCase();
  if (lower.includes("medication") || lower.includes("medicine") || lower.includes("dose")) {
    return "medication_schedule";
  }
  if (lower.includes("symptom") || lower.includes("pain")) {
    return "symptom_log";
  }
  if (lower.includes("allergy") || lower.includes("allergen")) {
    return "allergy_check";
  }
  return "medication_schedule"; // default
}
