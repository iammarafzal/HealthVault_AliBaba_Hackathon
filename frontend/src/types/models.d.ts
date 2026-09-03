/**
 * HealthVault AI — Core Domain Model Interfaces
 * Re-exports from api.d.ts for backward compatibility.
 * All types are strictly aligned with backend Pydantic schemas.
 */

export type {
  EmergencyContact,
  UserResponse as UserProfile,
  DoctorSummaryResponse as DoctorSummary,
  EmergencyProfileResponse as EmergencyProfile,
  BiomarkerDataPoint,
  PrivacySettings,
  PrivacySettingsResponse,
} from "./api";
