/**
 * HealthVault AI — Medication Management Service
 * Active medication management, toggle, and manual entry.
 *
 * Endpoints:
 *   GET  /api/v1/medications/active               — active-only for planner
 *   GET  /api/v1/medications/all                  — all meds grouped by Rx
 *   PATCH /api/v1/medications/{id}/toggle-active  — toggle is_active
 *   POST /api/v1/medications/manual               — add OTC / unlisted med
 */

import apiClient from "@/services/apiClient";
import type {
  ActiveMedicationsResponse,
  AllMedicationsResponse,
  ManualMedicationPayload,
  ManualMedicationResponse,
  TodayDoseLogsResponse,
  ToggleActiveResponse,
  ToggleDoseLogRequest,
  ToggleDoseLogResponse,
} from "@/types/api";

/** Fetch only active medications (consumed by the Daily Planner). */
export async function getActiveMedications(): Promise<ActiveMedicationsResponse> {
  const response = await apiClient.get("/medications/active");
  return response as unknown as ActiveMedicationsResponse;
}

/** Fetch all medications grouped by prescription record. */
export async function getAllMedications(): Promise<AllMedicationsResponse> {
  const response = await apiClient.get("/medications/all");
  return response as unknown as AllMedicationsResponse;
}

/** Toggle a medication's active / inactive status. */
export async function toggleMedicationActive(
  medicationId: string,
  isActive: boolean
): Promise<ToggleActiveResponse> {
  const response = await apiClient.patch(
    `/medications/${medicationId}/toggle-active`,
    { is_active: isActive }
  );
  return response as unknown as ToggleActiveResponse;
}

/** Manually add an over-the-counter or unlisted medicine. */
export async function addManualMedication(
  payload: ManualMedicationPayload
): Promise<ManualMedicationResponse> {
  const response = await apiClient.post("/medications/manual", payload);
  return response as unknown as ManualMedicationResponse;
}

/** Fetch today's dose logs for the current user. */
export async function getTodayDoseLogs(): Promise<TodayDoseLogsResponse> {
  const response = await apiClient.get("/medications/doses/today");
  return response as unknown as TodayDoseLogsResponse;
}

/** Toggle dose taken status in database. */
export async function toggleDoseLog(
  payload: ToggleDoseLogRequest
): Promise<ToggleDoseLogResponse> {
  const response = await apiClient.post("/medications/doses/toggle", payload);
  return response as unknown as ToggleDoseLogResponse;
}

