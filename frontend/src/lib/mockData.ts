import type {
  ExtractionResponse,
  InteractionCheckResponse,
  VoiceQueryResponse,
} from "@/types/api";
import type {
  BiomarkerTimeline,
  DoctorSummary,
  EmergencyProfile,
} from "@/types/models";

/** Mock extraction result for a prescription upload. */
export const mockExtractionResponse: ExtractionResponse = {
  record_id: "rec-001-mock",
  document_type: "prescription",
  doctor_name: "Dr. Amina Tariq",
  hospital_name: "Shifa International Hospital",
  consultation_date: "2025-01-15",
  diagnoses: ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
  medications: [
    {
      name: "Metformin",
      dosage: "500mg",
      frequency: "BD (Twice Daily)",
      timing: "Morning / Night",
      instructions_en: "Take with meals to reduce GI side effects",
      instructions_ur: "کھانے کے ساتھ لیں تاکہ معدے تکلیف کم ہو",
      is_active: true,
    },
    {
      name: "Amlodipine",
      dosage: "5mg",
      frequency: "OD (Once Daily)",
      timing: "Morning",
      instructions_en: "Take in the morning, monitor blood pressure",
      instructions_ur: "صبح لیں، بلڈ پریشر کی نگرانی کریں",
      is_active: true,
    },
  ],
  allergies: [
    {
      allergen: "Penicillin",
      severity: "severe",
      reaction_details: "Anaphylaxis risk — avoid all beta-lactams",
    },
  ],
  raw_ocr_text:
    "Rx: Tab Metformin 500mg BD — Tab Amlodipine 5mg OD\nAllergy: Penicillin (Severe)\nDx: T2DM, HTN",
};

/** Mock executive clinical summary. */
export const mockDoctorSummary: DoctorSummary = {
  patient_name: "Saeed Asif",
  health_id: "HV-PAK-98214",
  age_gender: "34Y / Male",
  blood_group: "B+",
  active_diagnoses: [
    "Type 2 Diabetes Mellitus",
    "Essential Hypertension",
  ],
  current_medications: [
    "Metformin 500mg BD",
    "Amlodipine 5mg OD",
    "Atorvastatin 10mg OD",
  ],
  known_allergies: ["Penicillin (Severe)", "Sulfonamides (Moderate)"],
  surgical_history: ["Appendectomy (2018)"],
  recent_abnormal_biomarkers: [
    "HbA1c 7.8% (target < 7%)",
    "LDL 142 mg/dL (target < 100)",
  ],
  risk_factors: [
    "Family history of cardiovascular disease",
    "Sedentary lifestyle",
    "BMI 28.4 (Overweight)",
  ],
  clinical_notes:
    "Patient requires close monitoring of glycemic control and lipid profile. Recommend dietary counseling and 30 min daily physical activity. Follow-up in 3 months.",
};

/** Mock emergency profile for public QR access. */
export const mockEmergencyProfile: EmergencyProfile = {
  health_id: "HV-PAK-98214",
  full_name: "Saeed Asif",
  blood_group: "B+",
  critical_allergies: ["Penicillin", "Sulfonamides"],
  active_medications: ["Metformin 500mg", "Amlodipine 5mg"],
  chronic_conditions: ["Type 2 Diabetes", "Hypertension"],
  emergency_contacts: [
    { name: "Ali Khan", relation: "Brother", phone: "+92-300-1234567" },
    { name: "Fatima Asif", relation: "Spouse", phone: "+92-321-9876543" },
  ],
  is_revoked: false,
};

/** Mock HbA1c longitudinal biomarker timeline. */
export const mockBiomarkerTimeline: BiomarkerTimeline = {
  biomarker_name: "HbA1c",
  timeline: [
    {
      test_date: "2024-03-15",
      value: 8.2,
      unit: "%",
      reference_min: 4.0,
      reference_max: 5.6,
      status: "high",
    },
    {
      test_date: "2024-06-20",
      value: 7.9,
      unit: "%",
      reference_min: 4.0,
      reference_max: 5.6,
      status: "high",
    },
    {
      test_date: "2024-09-10",
      value: 7.5,
      unit: "%",
      reference_min: 4.0,
      reference_max: 5.6,
      status: "high",
    },
    {
      test_date: "2025-01-15",
      value: 7.1,
      unit: "%",
      reference_min: 4.0,
      reference_max: 5.6,
      status: "high",
    },
  ],
  summary_insight:
    "HbA1c shows a gradual downward trend from 8.2% to 7.1% over the past year, indicating improving glycemic control with current medication regimen. Target of < 7% is within reach — maintain adherence.",
};

/** Mock Fasting Blood Glucose longitudinal timeline. */
export const mockGlucoseTimeline: BiomarkerTimeline = {
  biomarker_name: "Fasting Blood Glucose",
  timeline: [
    { test_date: "2024-03-15", value: 142, unit: "mg/dL", reference_min: 70, reference_max: 99, status: "high" },
    { test_date: "2024-06-20", value: 128, unit: "mg/dL", reference_min: 70, reference_max: 99, status: "high" },
    { test_date: "2024-09-10", value: 118, unit: "mg/dL", reference_min: 70, reference_max: 99, status: "high" },
    { test_date: "2025-01-15", value: 108, unit: "mg/dL", reference_min: 70, reference_max: 99, status: "high" },
    { test_date: "2025-04-10", value: 96, unit: "mg/dL", reference_min: 70, reference_max: 99, status: "normal" },
  ],
  summary_insight:
    "Fasting glucose has improved from 142 to 96 mg/dL, now within normal range (70–99 mg/dL). Continue current medication and dietary plan.",
};

/** Mock Lipid Profile longitudinal timeline (multi-line). */
export const mockLipidTimeline = {
  biomarker_name: "Lipid Profile",
  lines: [
    {
      key: "ldl",
      label: "LDL Cholesterol",
      color: "#ef4444",
      data: [
        { test_date: "2024-03-15", value: 142, unit: "mg/dL" },
        { test_date: "2024-06-20", value: 138, unit: "mg/dL" },
        { test_date: "2024-09-10", value: 130, unit: "mg/dL" },
        { test_date: "2025-01-15", value: 118, unit: "mg/dL" },
        { test_date: "2025-04-10", value: 105, unit: "mg/dL" },
      ],
    },
    {
      key: "hdl",
      label: "HDL Cholesterol",
      color: "#22c55e",
      data: [
        { test_date: "2024-03-15", value: 38, unit: "mg/dL" },
        { test_date: "2024-06-20", value: 40, unit: "mg/dL" },
        { test_date: "2024-09-10", value: 42, unit: "mg/dL" },
        { test_date: "2025-01-15", value: 44, unit: "mg/dL" },
        { test_date: "2025-04-10", value: 48, unit: "mg/dL" },
      ],
    },
    {
      key: "triglycerides",
      label: "Triglycerides",
      color: "#f59e0b",
      data: [
        { test_date: "2024-03-15", value: 220, unit: "mg/dL" },
        { test_date: "2024-06-20", value: 198, unit: "mg/dL" },
        { test_date: "2024-09-10", value: 180, unit: "mg/dL" },
        { test_date: "2025-01-15", value: 162, unit: "mg/dL" },
        { test_date: "2025-04-10", value: 145, unit: "mg/dL" },
      ],
    },
  ],
  summary_insight:
    "LDL trending down (142→105), HDL improving (38→48), triglycerides decreasing (220→145). Lipid profile showing consistent improvement with statin therapy.",
};

/** Mock drug interaction check result. */
export const mockInteractionResponse: InteractionCheckResponse = {
  has_conflicts: true,
  alerts: [
    {
      severity: "critical",
      interacting_drugs: ["Metformin", "Contrast Dye (Iodine)"],
      clinical_risk:
        "Increased risk of lactic acidosis when metformin is combined with iodinated contrast agents.",
      recommendation_en:
        "Discontinue metformin 48 hours before contrast procedure. Restart after renal function confirmed normal.",
      recommendation_ur:
        "کانٹراسٹprocedure سے 48 گھنٹے پہلے میٹفارمن بند کریں۔ گردے کی تصدیق کے بعد دوبارہ شروع کریں۔",
    },
    {
      severity: "low",
      interacting_drugs: ["Amlodipine", "Simvastatin"],
      clinical_risk:
        "Mild increased risk of myopathy due to elevated simvastatin levels.",
      recommendation_en:
        "Limit simvastatin dose to 20mg daily when co-prescribed with amlodipine.",
      recommendation_ur:
        "ایملوڈیپین کے ساتھ سِمواسٹیٹین کی خوراک 20mg یومیہ تک محدود رکھیں۔",
    },
  ],
};

/** Mock Urdu voice assistant response. */
export const mockVoiceResponse: VoiceQueryResponse = {
  transcription_ur: "میری آج کی دوائیاں کیا ہیں؟",
  intent: "medication_schedule",
  response_ur:
    "آج آپ کی تین ادویات ہیں: میٹفارمن صبح اور رات، ایملوڈیپین صبح، اور اٹورواسٹیٹن رات کو۔",
  response_en:
    "You have 3 medications today: Metformin morning & night, Amlodipine in the morning, and Atorvastatin at night.",
  structured_payload: {
    medications: [
      { name: "Metformin 500mg", timing: "Morning", taken: false },
      { name: "Amlodipine 5mg", timing: "Morning", taken: false },
      { name: "Atorvastatin 10mg", timing: "Night", taken: false },
    ],
  },
};
