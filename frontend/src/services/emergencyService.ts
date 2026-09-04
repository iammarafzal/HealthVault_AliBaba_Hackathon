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

export interface EmergencySessionDataResponse extends EmergencyProfileResponse {
  expires_in_seconds: number;
}

/** Fetch public emergency profile by health ID (no auth required). */
export async function getPublicEmergencyProfile(
  healthId: string,
  token: string
): Promise<EmergencyProfileResponse> {
  return apiClient.get(`/emergency/${healthId}`, {
    params: { token },
  }) as unknown as EmergencyProfileResponse;
}

/** Fetch protected emergency profile using HTTP-Only triage session cookie. */
export async function getEmergencySessionData(
  healthId: string
): Promise<EmergencySessionDataResponse> {
  return apiClient.get(`/emergency/${healthId}/session-data`, {
    withCredentials: true,
  }) as unknown as EmergencySessionDataResponse;
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

/** Fetch real-time emergency alert streams for designated ICE contact. */
export async function getSharedAlertStreams(): Promise<import("@/hooks/useSharedEmergencyListeners").SharedAlertStream[]> {
  return apiClient.get("/emergency/shared-alert-streams") as unknown as import("@/hooks/useSharedEmergencyListeners").SharedAlertStream[];
}

/** Designate primary ICE contact for real-time scan alerting. */
export async function updateNotifiedIce(
  notifiedIceId: string | null
): Promise<import("@/types/api").UserResponse> {
  return apiClient.put("/user/notified-ice", {
    notified_ice_id: notifiedIceId,
  }) as unknown as import("@/types/api").UserResponse;
}

/** Fetch detailed scan history timeline for a patient by health ID. */
export async function getEmergencyScanHistory(
  healthId: string
): Promise<import("@/types/api").EmergencyScanLog[]> {
  return apiClient.get(`/emergency/${healthId}/scan-history`) as unknown as import("@/types/api").EmergencyScanLog[];
}

/** Fetch patient emergency card summary profile for caregiver/ICE timeline view by health ID. */
export async function getPatientEmergencySummary(
  healthId: string
): Promise<{
  health_id: string;
  full_name: string;
  blood_group?: string;
  critical_allergies?: string[];
  active_medications?: string[];
  chronic_conditions?: string[];
  emergency_contacts?: import("@/types/api").EmergencyContactResponse[];
  emergency_notes?: string;
  is_revoked?: boolean;
}> {
  return apiClient.get(`/emergency/patient-summary/${healthId}`) as unknown as Promise<{
    health_id: string;
    full_name: string;
    blood_group?: string;
    critical_allergies?: string[];
    active_medications?: string[];
    chronic_conditions?: string[];
    emergency_contacts?: import("@/types/api").EmergencyContactResponse[];
    emergency_notes?: string;
    is_revoked?: boolean;
  }>;
}



