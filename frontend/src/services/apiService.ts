/**
 * HealthVault AI — Legacy API Service (backward-compat re-export)
 *
 * All service functions have been moved to individual modules:
 *   @/services/authService
 *   @/services/vaultService
 *   @/services/summaryService
 *   @/services/interactionService
 *   @/services/emergencyService
 *   @/services/biomarkerService
 *   @/services/voiceService
 */

export { uploadAndExtract as uploadDocument, getRecords } from "@/services/vaultService";
export { getDoctorSummary } from "@/services/summaryService";
export { checkInteractions } from "@/services/interactionService";
export { getPublicEmergencyProfile as getEmergencyProfile, updatePrivacySettings } from "@/services/emergencyService";
export { getBiomarkerTimeline as getBiomarkers } from "@/services/biomarkerService";
export { sendVoiceQuery } from "@/services/voiceService";
