/**
 * HealthVault AI — Vault Service
 * Document upload, OCR extraction, and medical records retrieval.
 *
 * Live backend endpoints only (no mocks, no static fallbacks):
 *   POST /api/v1/vault/extract-draft       — multipart upload + Vision LLM draft
 *   POST /api/v1/vault/confirm-record      — persist user-reviewed entities
 *   DELETE /api/v1/vault/records/{id}      — delete persisted vault record
 *   GET  /api/v1/vault/records/{user_id}   — historical record list
 */

import apiClient from "@/services/apiClient";
import type {
  ConfirmRecordPayload,
  DeleteRecordResponse,
  DocumentDraftExtractionResponse,
  ExtractionResponse,
  MedicalRecordResponse,
  VaultDocumentType,
} from "@/types/api";

/** Build the multipart payload expected by POST /vault/upload-and-extract. */
export function buildUploadFormData(
  file: File,
  documentType: VaultDocumentType,
  userId: string
): FormData {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("document_type", documentType);
  formData.append("user_id", userId);
  return formData;
}

/** Upload a medical document for draft Vision LLM extraction without DB persistence. */
export async function extractDraft(
  file: File,
  documentType: VaultDocumentType,
  userId: string,
  onUploadProgress?: (percent: number) => void
): Promise<DocumentDraftExtractionResponse> {
  const formData = buildUploadFormData(file, documentType, userId);
  const response = await apiClient.post("/vault/extract-draft", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (event.total && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return response as unknown as DocumentDraftExtractionResponse;
}

/** Persist the user-reviewed extraction payload as a permanent vault record. */
export async function confirmRecord(
  payload: ConfirmRecordPayload
): Promise<MedicalRecordResponse> {
  const response = await apiClient.post("/vault/confirm-record", payload);
  return response as unknown as MedicalRecordResponse;
}

/** Delete a persisted vault record. */
export async function deleteRecord(recordId: string): Promise<DeleteRecordResponse> {
  const response = await apiClient.delete(`/vault/records/${recordId}`);
  return response as unknown as DeleteRecordResponse;
}

/** Upload a medical document for OCR + AI entity extraction. */
export async function uploadAndExtract(
  formData: FormData,
  onUploadProgress?: (percent: number) => void
): Promise<ExtractionResponse> {
  const response = await apiClient.post("/vault/upload-and-extract", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (event.total && onUploadProgress) {
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return response as unknown as ExtractionResponse;
}

/** Fetch all medical records for a user (newest first). */
export async function getRecords(
  userId: string
): Promise<MedicalRecordResponse[]> {
  const response = await apiClient.get(`/vault/records/${userId}`);
  return response as unknown as MedicalRecordResponse[];
}
