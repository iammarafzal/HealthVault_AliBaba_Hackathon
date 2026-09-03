/**
 * HealthVault AI — Bilingual Prescription Interpreter & Chat Service
 * Direct integration with /api/v1/interpreter endpoints.
 */

import apiClient from "@/services/apiClient";
import type {
  ExtractedMedication,
  ExtractionResponse,
  PrescriptionChatRequest,
  PrescriptionChatResponse,
} from "@/types/api";

export interface TranslationResponse {
  medications: ExtractedMedication[];
  summary_ur: string;
  summary_en: string;
}

/** Ephemeral document upload for explanation without DB persistence */
export async function uploadAndInterpret(file: File): Promise<ExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await apiClient.post("/interpreter/upload-interpret", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response as unknown as ExtractionResponse;
}

/** Fetch the audited Pakistani clinical prescription sample */
export async function getSamplePrescription(): Promise<ExtractionResponse> {
  const response = await apiClient.get("/interpreter/sample");
  return response as unknown as ExtractionResponse;
}

/** Send message to conversational Sehat Sahulat Prescription Chatbot */
export async function chatPrescription(
  payload: PrescriptionChatRequest
): Promise<PrescriptionChatResponse> {
  const response = await apiClient.post("/interpreter/chat", payload);
  return response as unknown as PrescriptionChatResponse;
}

/** Translate / enrich prescription medications with Urdu audio & timing */
export async function translatePrescription(
  medications: ExtractedMedication[],
  rawText?: string
): Promise<TranslationResponse> {
  const response = await apiClient.post("/interpreter/translate", {
    medications,
    raw_text: rawText,
  });
  return response as unknown as TranslationResponse;
}

/** Explain prescription text */
export async function explainPrescription(rawText: string): Promise<Record<string, unknown>> {
  const response = await apiClient.post("/interpreter/explain", {
    raw_text: rawText,
  });
  return response as unknown as Record<string, unknown>;
}
