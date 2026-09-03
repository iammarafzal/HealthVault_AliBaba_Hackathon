/**
 * HealthVault AI — Generic Biomarker API Service
 * Endpoint wrappers for biomarker summary, history, abnormal markers, and timeline.
 */

import apiClient from "@/services/apiClient";
import type {
  BiomarkerDataPoint,
  BiomarkerHistoryResponse,
  BiomarkerSummaryResponse,
  BiomarkerTimelineResponse,
} from "@/types/api";

/** Fetch dynamic biomarker summary grouped by category. */
export async function getBiomarkerSummary(
  userId: string
): Promise<BiomarkerSummaryResponse> {
  return apiClient.get("/biomarkers/summary", {
    params: { user_id: userId },
  }) as unknown as BiomarkerSummaryResponse;
}

/** Fetch detailed time-series history for a selected analyte test name. */
export async function getBiomarkerHistory(
  userId: string,
  testName: string
): Promise<BiomarkerHistoryResponse> {
  return apiClient.get("/biomarkers/history", {
    params: { user_id: userId, test_name: testName },
  }) as unknown as BiomarkerHistoryResponse;
}

/** Fetch out-of-range clinical attention items. */
export async function getAbnormalBiomarkers(
  userId: string
): Promise<BiomarkerDataPoint[]> {
  return apiClient.get("/biomarkers/abnormal", {
    params: { user_id: userId },
  }) as unknown as BiomarkerDataPoint[];
}

/** Fetch biomarker timeline for a user (backwards compatible). */
export async function getBiomarkerTimeline(
  userId: string,
  biomarkerNames?: string[]
): Promise<BiomarkerTimelineResponse> {
  return apiClient.get("/biomarkers/timeline", {
    params: {
      user_id: userId,
      ...(biomarkerNames?.length ? { biomarkers: biomarkerNames.join(",") } : {}),
    },
  }) as unknown as BiomarkerTimelineResponse;
}
