/**
 * HealthVault AI — Emergency Service
 * Public emergency profile, QR code, privacy settings, and toggle endpoints.
 */

import apiClient from "@/services/apiClient";
import type {
  EmergencyProfileResponse,
  QRDetailsResponse,
  EmergencyToggleResponse,
  PrivacySettingsResponse,
  PrivacySettingsUpdate,
} from "@/types/api";

/** Fetch public emergency profile by health ID (no auth required). */
export async function getPublicEmergencyProfile(
  healthId: string,
  token: string
): Promise<EmergencyProfileResponse> {
  return apiClient.get(`/emergency/${healthId}`, {
    params: { token },
  }) as unknown as EmergencyProfileResponse;
}

/** Fetch QR code metadata (requires auth). */
export async function getQRCodeData(): Promise<QRDetailsResponse> {
  return apiClient.get("/user/qr-code") as unknown as QRDetailsResponse;
}

/** Regenerate QR code and emergency token (requires auth). */
export async function regenerateQRCode(): Promise<QRDetailsResponse> {
  return apiClient.post("/user/regenerate-qr") as unknown as QRDetailsResponse;
}

/** Toggle emergency access on/off (requires auth). */
export async function toggleEmergencyStatus(
  emergencyEnabled: boolean
): Promise<EmergencyToggleResponse> {
  return apiClient.patch("/user/emergency-toggle", {
    emergency_enabled: emergencyEnabled,
  }) as unknown as EmergencyToggleResponse;
}

/** Update privacy visibility settings (requires auth). */
export async function updatePrivacySettings(
  userId: string,
  settings: PrivacySettingsUpdate
): Promise<PrivacySettingsResponse> {
  return apiClient.patch("/user/privacy-settings", settings, {
    params: { user_id: userId },
  }) as unknown as PrivacySettingsResponse;
}

/** Fetch recent emergency QR scan history (requires auth). */
export async function getEmergencyScans(
  limit: number = 20
): Promise<import("@/types/api").EmergencyScanLog[]> {
  return apiClient.get("/user/emergency-scans", {
    params: { limit },
  }) as unknown as import("@/types/api").EmergencyScanLog[];
}

/** Fetch all emergency contacts for authenticated user. */
export async function getEmergencyContacts(): Promise<import("@/types/api").EmergencyContactResponse[]> {
  return apiClient.get("/user/emergency-contacts") as unknown as import("@/types/api").EmergencyContactResponse[];
}

/** Create a new emergency contact. */
export async function createEmergencyContact(
  contact: import("@/types/api").EmergencyContactCreate
): Promise<import("@/types/api").EmergencyContactResponse> {
  return apiClient.post("/user/emergency-contacts", contact) as unknown as import("@/types/api").EmergencyContactResponse;
}

/** Update an existing emergency contact. */
export async function updateEmergencyContact(
  contactId: string,
  contact: import("@/types/api").EmergencyContactUpdate
): Promise<import("@/types/api").EmergencyContactResponse> {
  return apiClient.put(`/user/emergency-contacts/${contactId}`, contact) as unknown as import("@/types/api").EmergencyContactResponse;
}

/** Delete an emergency contact. */
export async function deleteEmergencyContact(
  contactId: string
): Promise<{ status: string; message: string }> {
  return apiClient.delete(`/user/emergency-contacts/${contactId}`) as unknown as { status: string; message: string };
}
