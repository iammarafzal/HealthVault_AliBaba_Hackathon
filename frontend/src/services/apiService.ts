import apiClient from "@/lib/api";
import {
  mockBiomarkerTimeline,
  mockDoctorSummary,
  mockEmergencyProfile,
  mockExtractionResponse,
  mockInteractionResponse,
  mockVoiceResponse,
} from "@/lib/mockData";
import type {
  ExtractionResponse,
  InteractionCheckResponse,
  VoiceQueryResponse,
} from "@/types/api";
import type {
  BiomarkerTimeline,
  DoctorSummary,
  EmergencyProfile,
  PrivacySettings,
} from "@/types/models";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

/**
 * Resolve with mock data when mock mode is enabled or the API call fails.
 */
async function withMockFallback<T>(
  mockData: T,
  apiCall: () => Promise<T>
): Promise<T> {
  if (USE_MOCK) return mockData;
  try {
    return await apiCall();
  } catch {
    if (process.env.NODE_ENV === "development") {
      console.warn("[apiService] Falling back to mock data");
    }
    return mockData;
  }
}

/** Upload a medical document for OCR extraction. */
export async function uploadDocument(
  file: File
): Promise<ExtractionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return withMockFallback(mockExtractionResponse, () =>
    apiClient.post("/vault/upload-and-extract", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }) as unknown as Promise<ExtractionResponse>
  );
}

/** Fetch all medical records for a user. */
export async function getRecords(
  userId: string
): Promise<ExtractionResponse[]> {
  return withMockFallback([mockExtractionResponse], () =>
    apiClient.get("/vault/records", {
      params: { user_id: userId },
    }) as unknown as Promise<ExtractionResponse[]>
  );
}

/** Delete a medical record by ID. */
export async function deleteRecord(
  recordId: string
): Promise<{ success: boolean }> {
  return withMockFallback({ success: true }, () =>
    apiClient.delete(`/vault/records/${recordId}`) as unknown as Promise<{
      success: boolean;
    }>
  );
}

/** Fetch AI-generated clinical summary for a user. */
export async function getDoctorSummary(
  userId: string
): Promise<DoctorSummary> {
  return withMockFallback(mockDoctorSummary, () =>
    apiClient.get("/summary/generate", {
      params: { user_id: userId },
    }) as unknown as Promise<DoctorSummary>
  );
}

/** Check drug interactions for new medications. */
export async function checkInteractions(
  userId: string,
  newMedications: string[]
): Promise<InteractionCheckResponse> {
  return withMockFallback(mockInteractionResponse, () =>
    apiClient.post("/interactions/check", {
      user_id: userId,
      new_medications: newMedications,
    }) as unknown as Promise<InteractionCheckResponse>
  );
}

/** Fetch public emergency profile by health ID (no auth required). */
export async function getEmergencyProfile(
  healthId: string
): Promise<EmergencyProfile> {
  return withMockFallback(mockEmergencyProfile, () =>
    apiClient.get(`/emergency/${healthId}`) as unknown as Promise<EmergencyProfile>
  );
}

/** Fetch longitudinal biomarker timeline. */
export async function getBiomarkers(
  userId: string,
  metric: string
): Promise<BiomarkerTimeline> {
  return withMockFallback(mockBiomarkerTimeline, () =>
    apiClient.get("/biomarkers/timeline", {
      params: { user_id: userId, metric },
    }) as unknown as Promise<BiomarkerTimeline>
  );
}

/** Update privacy visibility settings. */
export async function updatePrivacySettings(
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const defaultSettings: PrivacySettings = {
    show_blood_group: true,
    show_allergies: true,
    show_active_meds: true,
    show_emergency_contacts: true,
    show_chronic_conditions: true,
    qr_revoked: false,
  };
  return withMockFallback({ ...defaultSettings, ...settings }, () =>
    apiClient.put("/emergency/privacy", settings) as unknown as Promise<PrivacySettings>
  );
}

/** Send a voice or text query to the Urdu voice assistant. */
export async function sendVoiceQuery(
  userId: string,
  audioBase64?: string,
  textPrompt?: string
): Promise<VoiceQueryResponse> {
  return withMockFallback(mockVoiceResponse, () =>
    apiClient.post("/voice/query", {
      user_id: userId,
      audio_base64: audioBase64,
      text_prompt: textPrompt,
    }) as unknown as Promise<VoiceQueryResponse>
  );
}
