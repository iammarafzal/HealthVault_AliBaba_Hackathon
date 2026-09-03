/**
 * HealthVault AI — API Request/Response Interfaces
 * Strictly aligned with backend Pydantic schemas (app/schemas/*)
 * Normalized schema: UserResponse nests UserProfileResponse + PrivacySettingsResponse.
 */

// ---------------------------------------------------------------------------
// Auth Schemas
// ---------------------------------------------------------------------------
export interface EmergencyContactCreate {
  name: string;
  relation: string;
  phone: string;
}

export interface EmergencyContactBase {
  name: string;
  relation: string;
  phone: string;
  is_primary?: boolean;
  priority_order?: number;
}

export interface EmergencyContactCreate extends EmergencyContactBase {}

export interface EmergencyContactUpdate {
  name?: string;
  relation?: string;
  phone?: string;
  is_primary?: boolean;
  priority_order?: number;
}

export interface EmergencyContactResponse extends EmergencyContactBase {
  id?: string;
  user_id?: string;
}

export type EmergencyContact = EmergencyContactResponse;

/** Fast 3-field onboarding registration payload */
export interface UserRegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

/** Nested profile (vitals + demographics) */
export interface UserProfileResponse {
  full_name: string;
  phone?: string;
  blood_group?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contacts: EmergencyContactResponse[];
}

/** Progressive onboarding partial update */
export interface UserProfileUpdate {
  full_name?: string;
  phone?: string;
  blood_group?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contacts?: EmergencyContactCreate[];
}

/** Normalized user response from the backend */
export interface UserResponse {
  id: string;
  health_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  blood_group?: string;
  date_of_birth?: string;
  gender?: string;
  role: string;
  profile: UserProfileResponse;
  privacy: PrivacySettingsResponse;
  profile_completeness: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

// ---------------------------------------------------------------------------
// Vault Schemas
// ---------------------------------------------------------------------------
export type VaultDocumentType =
  | "prescription"
  | "lab_report"
  | "ultrasound_report"
  | "imaging_report"
  | "discharge_summary"
  | "clinical_note"
  | "other_medical";

export interface ExtractedMedication {
  name: string;
  dosage: string;
  dosage_quantity?: string;
  strength?: string;
  frequency: string;
  timing?: string;
  instructions_en: string;
  instructions_ur: string;
  fraction?: "half" | "full" | "2_spoons" | "other" | string;
  fraction_label_en?: string;
  fraction_label_ur?: string;
  meal_context?: "before_meal" | "after_meal" | "with_meal" | "unspecified" | string;
  meal_context_en?: string;
  meal_context_ur?: string;
  purpose_en?: string | null;
  purpose_ur?: string | null;
  duration?: string | null;
  duration_ur?: string | null;
  timing_breakdown?: {
    morning?: boolean;
    afternoon?: boolean;
    night?: boolean;
  };
  audio_script_ur?: string;
  is_active: boolean;
}

export interface ExtractedAllergy {
  allergen: string;
  severity: string;
  reaction_details?: string;
}

/** Normalized medication view model rendered by the vault UI. */
export interface MedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  urdu_instructions?: string;
}

/** Normalized lab biomarker view model rendered by the vault UI. */
export interface BiomarkerItem {
  analyte_name: string;
  value: number;
  unit: string;
  ref_min?: number;
  ref_max?: number;
  flag: "normal" | "high" | "low";
}

export interface ExtractedBiomarker {
  analyte_name: string;
  value: number;
  unit: string;
  ref_min?: number | null;
  ref_max?: number | null;
  status: "normal" | "high" | "low";
}

export interface VisionExtractedEntities {
  doctor_name?: string | null;
  clinic_hospital_name?: string | null;
  consultation_date?: string | null;
  diagnoses: string[];
  medications: ExtractedMedication[];
  allergies: string[];
  biomarkers: ExtractedBiomarker[];
  raw_text: string;
}

/** Structured entities parsed out of a medical document. */
export interface ExtractedEntities {
  diagnoses: string[];
  medications: MedicationItem[];
  allergies: string[];
  biomarkers: BiomarkerItem[];
  raw_text?: string;
}

/** Vault record view model hydrated from the backend (GET /vault/records/{user_id}
 *  or POST /vault/upload-and-extract). */
export interface MedicalRecord {
  id: string;
  user_id: string;
  document_type: string;
  file_url: string;
  created_at: string;
  extracted_data: ExtractedEntities;
  /* Display metadata lifted from the backend record/extraction response */
  doctor_name?: string;
  hospital_name?: string;
  consultation_date?: string;
  test_name?: string;
  test_date?: string;
  surgical_notes: string[];
  follow_up_instructions: string[];
}

export interface ExtractedDocumentEntities {
  document_type?: string;
  doctor_name?: string;
  hospital_name?: string;
  consultation_date?: string;
  diagnoses: string[];
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
}

export interface ExtractionResponse {
  record_id: string;
  document_type: string;
  doctor_name?: string;
  hospital_name?: string;
  consultation_date?: string;
  diagnoses: string[];
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  /* Lab report enrichment */
  biomarkers?: Record<string, unknown>[];
  test_name?: string;
  test_date?: string;
  /* Discharge summary enrichment */
  surgical_notes?: string[];
  follow_up_instructions?: string[];
  /* Persisted document location for client-side preview */
  document_url?: string;
  raw_ocr_text: string;
}

export interface MedicalRecordResponse {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  raw_ocr_text?: string;
  extracted_data: Record<string, unknown>;
  consultation_date?: string;
  doctor_name?: string;
  hospital_name?: string;
  medications?: ExtractedMedication[];
  allergies?: ExtractedAllergy[];
  biomarkers?: ExtractedBiomarker[];
  created_at: string;
}

export interface DocumentDraftExtractionResponse {
  temp_file_url: string;
  is_medical_document: boolean;
  rejection_reason?: string | null;
  detected_document_type?: VaultDocumentType | null;
  confidence_score: number;
  document_type: VaultDocumentType;
  extracted_data: VisionExtractedEntities | null;
}

export interface ConfirmRecordPayload {
  user_id: string;
  document_type: VaultDocumentType;
  file_url: string;
  confirmed_data: VisionExtractedEntities;
}

export interface DeleteRecordResponse {
  status: string;
  message: string;
}

// ---------------------------------------------------------------------------
// Prescription Interpreter & Chat Schemas
// ---------------------------------------------------------------------------
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface PrescriptionChatRequest {
  record_id?: string;
  language: "en" | "ur";
  messages: ChatMessage[];
  prescription_context?: ExtractionResponse | Record<string, unknown>;
}

export interface PrescriptionChatResponse {
  reply: string;
  suggested_followups: string[];
}

// ---------------------------------------------------------------------------
// Interaction Schemas
// ---------------------------------------------------------------------------
export interface InteractionCheckRequest {
  user_id: string;
  new_medications: string[];
}

export interface DrugInteractionAlert {
  severity: string;
  interacting_drugs: string[];
  clinical_risk: string;
  recommendation_en: string;
  recommendation_ur: string;
}

export interface InteractionCheckResponse {
  has_conflicts: boolean;
  alerts: DrugInteractionAlert[];
}

// ---------------------------------------------------------------------------
// Summary Schemas
// ---------------------------------------------------------------------------
export interface DoctorSummaryResponse {
  patient_name: string;
  health_id: string;
  age_gender: string;
  blood_group: string;
  active_diagnoses: string[];
  current_medications: string[];
  known_allergies: string[];
  surgical_history: string[];
  recent_abnormal_biomarkers: string[];
  risk_factors: string[];
  clinical_notes: string;
}

// ---------------------------------------------------------------------------
// Emergency Schemas
// ---------------------------------------------------------------------------
export interface EmergencyProfileResponse {
  health_id: string;
  full_name: string;
  blood_group?: string;
  critical_allergies: string[];
  active_medications: string[];
  chronic_conditions: string[];
  emergency_contacts: EmergencyContactCreate[];
  emergency_notes?: string | null;
  is_revoked: boolean;
}

// ---------------------------------------------------------------------------
// Biomarker Schemas
// ---------------------------------------------------------------------------
export interface BiomarkerDataPoint {
  record_id?: string | null;
  biomarker_name?: string;
  category?: string;
  test_date: string;
  value: number;
  value_text?: string | null;
  unit: string;
  reference_min?: number | null;
  reference_max?: number | null;
  ref_range_text?: string | null;
  status: "normal" | "high" | "low" | "critical" | string;
  lab_name?: string | null;
}

export interface BiomarkerSeries {
  biomarker_name: string;
  category: string;
  unit: string;
  trend: string;
  data_points: BiomarkerDataPoint[];
}

export interface BiomarkerTimelineResponse {
  user_id: string;
  total_biomarkers: number;
  series: BiomarkerSeries[];
}

export interface BiomarkerSummaryResponse {
  user_id: string;
  total_tests: number;
  abnormal_count: number;
  categories: string[];
  latest_readings: BiomarkerDataPoint[];
  abnormal_readings: BiomarkerDataPoint[];
}

export interface BiomarkerHistoryResponse {
  user_id: string;
  test_name: string;
  category: string;
  unit: string;
  latest_value: number;
  latest_status: string;
  ref_range_text?: string | null;
  ref_min?: number | null;
  ref_max?: number | null;
  trend: string;
  history: BiomarkerDataPoint[];
}

// ---------------------------------------------------------------------------
// Voice Schemas
// ---------------------------------------------------------------------------
export interface VoiceQueryRequest {
  user_id: string;
  audio_base64?: string;
  text_prompt?: string;
}

export interface VoiceTranscriptionResponse {
  transcribed_text: string;
  language: string;
  confidence?: number;
}

export interface VoiceIntentResponse {
  intent: string;
  entities_detected: Record<string, unknown>;
  answer_en: string;
  answer_ur: string;
  requires_emergency_care: boolean;
  confidence?: number;
}

/** Legacy alias for backward compatibility with existing components */
export interface VoiceQueryResponse {
  transcription_ur: string;
  intent: string;
  response_ur: string;
  response_en: string;
  structured_payload?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Privacy / QR Schemas
// ---------------------------------------------------------------------------
export interface PrivacySettings {
  show_blood_group: boolean;
  show_allergies: boolean;
  show_active_meds: boolean;
  show_chronic_conditions: boolean;
  show_emergency_contacts: boolean;
  show_emergency_notes: boolean;
  emergency_notes?: string | null;
  enable_scan_alerts: boolean;
  qr_revoked: boolean;
  updated_at?: string;
}

export interface PrivacySettingsUpdate {
  show_blood_group?: boolean;
  show_allergies?: boolean;
  show_active_meds?: boolean;
  show_chronic_conditions?: boolean;
  show_emergency_contacts?: boolean;
  show_emergency_notes?: boolean;
  emergency_notes?: string | null;
  enable_scan_alerts?: boolean;
  qr_revoked?: boolean;
}

export interface PrivacySettingsResponse {
  user_id: string;
  show_blood_group: boolean;
  show_allergies: boolean;
  show_active_meds: boolean;
  show_chronic_conditions: boolean;
  show_emergency_contacts: boolean;
  show_emergency_notes: boolean;
  emergency_notes?: string | null;
  enable_scan_alerts: boolean;
  qr_revoked: boolean;
  updated_at?: string;
}

export interface QRDetailsResponse {
  health_id: string;
  emergency_token: string;
  qr_url: string;
  emergency_enabled: boolean;
}

export interface QRRegenerateResponse {
  health_id: string;
  qr_data_url: string;
  created_at: string;
}

export interface EmergencyToggleResponse {
  health_id: string;
  emergency_enabled: boolean;
  message?: string;
}

export interface EmergencyScanLog {
  id: string;
  scanned_at: string;
  ip_address: string;
  user_agent: string;
  city?: string | null;
}

// ---------------------------------------------------------------------------
// Medication Management Schemas
// ---------------------------------------------------------------------------
export interface DosageSchedulePayload {
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  frequency_per_day: number;
  meal_relation: string;
  custom_time_instruction?: string | null;
}

export interface MedicationDetailResponse {
  id: string;
  user_id: string;
  record_id?: string | null;
  name: string;
  dosage: string;
  frequency: string;
  timing?: string | null;
  dosage_schedule?: DosageSchedulePayload | Record<string, unknown> | null;
  instructions_en?: string | null;
  instructions_ur?: string | null;
  is_active: boolean;
  is_manual?: boolean;
  time_slots?: string[];
  prescription_date?: string | null;
  start_date?: string | null;
  created_at: string;
}

export interface MedicationGroupResponse {
  record_id?: string | null;
  prescription_date?: string | null;
  doctor_name?: string | null;
  hospital_name?: string | null;
  created_at?: string | null;
  medications: MedicationDetailResponse[];
}

export interface AllMedicationsResponse {
  user_id: string;
  groups: MedicationGroupResponse[];
  total_medications: number;
  active_count: number;
}

export interface ActiveMedicationsResponse {
  user_id: string;
  medications: MedicationDetailResponse[];
  total: number;
}

export interface ToggleActiveResponse {
  id: string;
  name: string;
  is_active: boolean;
  message: string;
}

export interface ManualMedicationPayload {
  name: string;
  dosage?: string;
  frequency?: string;
  timing?: string | null;
  dosage_schedule?: DosageSchedulePayload | null;
  time_slots?: string[];
  instructions_en?: string | null;
  instructions_ur?: string | null;
  is_active?: boolean;
}

export interface ManualMedicationUpdatePayload {
  name?: string;
  dosage?: string;
  frequency?: string;
  timing?: string | null;
  dosage_schedule?: DosageSchedulePayload | null;
  time_slots?: string[];
  instructions_en?: string | null;
  instructions_ur?: string | null;
  is_active?: boolean;
}

export interface ManualMedicationResponse {
  id: string;
  name: string;
  dosage: string;
  is_active: boolean;
  is_manual?: boolean;
  time_slots?: string[];
  message: string;
}

export interface TodayDoseLogsResponse {
  dose_date: string;
  dose_logs: Record<string, boolean>;
}

export interface ToggleDoseLogRequest {
  medication_id: string;
  time_slot: string;
  taken: boolean;
  dose_date?: string | null;
}

export interface ToggleDoseLogResponse {
  medication_id: string;
  time_slot: string;
  dose_date: string;
  taken: boolean;
  taken_at?: string | null;
  message: string;
}

