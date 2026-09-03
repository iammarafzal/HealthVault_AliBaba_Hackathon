/**
 * HealthVault AI — Summary Service
 * AI-generated clinical summary endpoint.
 */

import apiClient from "@/services/apiClient";
import type { DoctorSummaryResponse } from "@/types/api";

/** Fetch AI-generated clinical summary for a user. */
export async function getDoctorSummary(userId: string): Promise<DoctorSummaryResponse> {
  return apiClient.get("/summary/generate", {
    params: { user_id: userId },
  }) as unknown as DoctorSummaryResponse;
}
