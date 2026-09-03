/**
 * HealthVault AI — Interaction Service
 * Drug interaction & allergy checking engine.
 */

import apiClient from "@/services/apiClient";
import type { InteractionCheckResponse } from "@/types/api";

/** Check drug interactions for new medications against user's current regimen. */
export async function checkInteractions(
  userId: string,
  newMedications: string[]
): Promise<InteractionCheckResponse> {
  return apiClient.post("/interactions/check", {
    user_id: userId,
    new_medications: newMedications,
  }) as unknown as InteractionCheckResponse;
}
