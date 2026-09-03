/**
 * HealthVault AI — Voice Service
 * Urdu speech-to-text transcription and voice query endpoints.
 */

import apiClient from "@/services/apiClient";
import type {
  VoiceTranscriptionResponse,
  VoiceIntentResponse,
} from "@/types/api";

/** Transcribe an audio blob via Groq Whisper (multipart/form-data). */
export async function transcribeAudio(audioBlob: Blob): Promise<VoiceTranscriptionResponse> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  return apiClient.post("/voice/transcribe", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }) as unknown as VoiceTranscriptionResponse;
}

/** Send a voice or text query to the Urdu voice intent agent. */
export async function sendVoiceQuery(
  userId: string,
  queryText: string
): Promise<VoiceIntentResponse> {
  return apiClient.post("/voice/query", {
    user_id: userId,
    text_prompt: queryText,
  }) as unknown as VoiceIntentResponse;
}
