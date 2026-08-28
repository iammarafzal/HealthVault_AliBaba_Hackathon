/**
 * HealthVault AI — API Request/Response Interfaces
 * Strictly matches API_CONTRACTS.md §2, §4, §7
 */

export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  instructions_en: string;
  instructions_ur: string;
  is_active: boolean;
}

export interface ExtractedAllergy {
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction_details?: string;
}

export interface ExtractionResponse {
  record_id: string;
  document_type: "prescription" | "lab_report" | "discharge_summary";
  doctor_name?: string;
  hospital_name?: string;
  consultation_date?: string;
  diagnoses: string[];
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  raw_ocr_text: string;
}

export interface DrugInteractionAlert {
  severity: "low" | "medium" | "critical";
  interacting_drugs: string[];
  clinical_risk: string;
  recommendation_en: string;
  recommendation_ur: string;
}

export interface InteractionCheckResponse {
  has_conflicts: boolean;
  alerts: DrugInteractionAlert[];
}

export interface VoiceQueryResponse {
  transcription_ur: string;
  intent: "medication_schedule" | "symptom_log" | "allergy_check";
  response_ur: string;
  response_en: string;
  structured_payload?: Record<string, any>;
}
