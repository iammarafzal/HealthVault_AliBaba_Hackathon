/**
 * HealthVault AI — Core Domain Model Interfaces
 * Strictly matches API_CONTRACTS.md §1, §3, §5, §6
 */

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface UserProfile {
  id: string;
  health_id: string;
  full_name: string;
  email?: string;
  phone: string;
  role: "patient" | "caregiver" | "doctor";
  blood_group?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contacts: EmergencyContact[];
  created_at: string;
}

export interface DoctorSummary {
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

export interface EmergencyProfile {
  health_id: string;
  full_name: string;
  blood_group?: string;
  critical_allergies: string[];
  active_medications: string[];
  chronic_conditions: string[];
  emergency_contacts: EmergencyContact[];
  is_revoked: boolean;
}

export interface BiomarkerDataPoint {
  test_date: string;
  value: number;
  unit: string;
  reference_min?: number;
  reference_max?: number;
  status: "normal" | "low" | "high";
}

export interface BiomarkerTimeline {
  biomarker_name: string;
  timeline: BiomarkerDataPoint[];
  summary_insight: string;
}

export interface PrivacySettings {
  show_blood_group: boolean;
  show_allergies: boolean;
  show_active_meds: boolean;
  show_emergency_contacts: boolean;
  show_chronic_conditions: boolean;
  qr_revoked: boolean;
}
