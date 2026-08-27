# HealthVault AI — Mock Data Store
# Provides structured, schema-compliant medical sample data for development & frontend unblocking

from datetime import date, datetime, timezone
import uuid
from typing import List

from app.schemas.emergency import EmergencyProfileResponse
from app.schemas.interactions import DrugInteractionAlert, InteractionCheckResponse
from app.schemas.summary import DoctorSummaryResponse
from app.schemas.user import EmergencyContact
from app.schemas.vault import (
    ExtractedAllergy,
    ExtractedMedication,
    ExtractionResponse,
    MedicalRecordResponse,
)

SAMPLE_USER_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")
SAMPLE_RECORD_ID_1 = uuid.UUID("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d")
SAMPLE_RECORD_ID_2 = uuid.UUID("b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e")

# 1. Mock Prescription Extraction Payload
MOCK_PRESCRIPTION_EXTRACTION = ExtractionResponse(
    record_id=SAMPLE_RECORD_ID_1,
    document_type="prescription",
    doctor_name="Dr. Tariq Mahmood",
    hospital_name="Shifa International Hospital, Islamabad",
    consultation_date=date(2025, 2, 15),
    diagnoses=["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    medications=[
        ExtractedMedication(
            name="Metformin",
            dosage="500mg",
            frequency="BD (Twice Daily)",
            timing="After Meals (Morning / Night)",
            instructions_en="Take 1 tablet twice daily after meals with water.",
            instructions_ur="کھانے کے بعد دن میں دو بار ایک گولی پانی کے ساتھ لیں۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Amlodipine",
            dosage="5mg",
            frequency="OD (Once Daily)",
            timing="Morning",
            instructions_en="Take 1 tablet once daily in the morning.",
            instructions_ur="صبح کے وقت روزانہ ایک گولی لیں۔",
            is_active=True,
        ),
    ],
    allergies=[
        ExtractedAllergy(
            allergen="Penicillin",
            severity="severe",
            reaction_details="Anaphylaxis and hives upon exposure",
        )
    ],
    raw_ocr_text=(
        "Dr. Tariq Mahmood - Shifa International Hospital\n"
        "Date: 15/02/2025\n"
        "Patient: Ahmad Raza (54M)\n"
        "Rx:\n"
        "1. Tab. Metformin 500mg BD (PC)\n"
        "2. Tab. Amlodipine 5mg OD\n"
        "Allergies: Penicillin (Severe)\n"
        "Adv: Monitor fasting blood glucose weekly."
    ),
)

# 2. Mock Lab Report Extraction Payload
MOCK_LAB_EXTRACTION = ExtractionResponse(
    record_id=SAMPLE_RECORD_ID_2,
    document_type="lab_report",
    doctor_name="Dr. Farhan Siddiqui (Pathologist)",
    hospital_name="Chughtai Lab",
    consultation_date=date(2025, 2, 14),
    diagnoses=["Impaired Glycemic Control", "Dyslipidemia"],
    medications=[],
    allergies=[],
    raw_ocr_text=(
        "CHUGHTAI LAB - COMPREHENSIVE METABOLIC PANEL\n"
        "Date: 14/02/2025\n"
        "Patient: Ahmad Raza | Ref: Dr. Tariq Mahmood\n"
        "HbA1c: 7.4 % (High, Ref: 4.0 - 5.6 %)\n"
        "Fasting Blood Glucose: 145 mg/dL (High, Ref: 70 - 99 mg/dL)\n"
        "Total Cholesterol: 210 mg/dL (High, Ref: < 200 mg/dL)\n"
        "Serum Creatinine: 0.9 mg/dL (Normal, Ref: 0.7 - 1.2 mg/dL)"
    ),
)

# 3. Mock Doctor 30-Second Summary
MOCK_DOCTOR_SUMMARY = DoctorSummaryResponse(
    patient_name="Ahmad Raza",
    health_id="HV-98214",
    age_gender="54M",
    blood_group="B+",
    active_diagnoses=[
        "Type 2 Diabetes Mellitus",
        "Essential Hypertension",
        "Dyslipidemia",
    ],
    current_medications=[
        "Metformin 500mg BD",
        "Amlodipine 5mg OD",
        "Atorvastatin 20mg OD",
    ],
    known_allergies=["Penicillin (Severe anaphylaxis)"],
    surgical_history=["Appendectomy (2012)"],
    recent_abnormal_biomarkers=[
        "HbA1c: 7.4% (Elevated)",
        "Fasting Blood Glucose: 145 mg/dL",
        "Total Cholesterol: 210 mg/dL",
    ],
    risk_factors=[
        "Elevated cardiovascular risk due to concurrent diabetes and hypertension",
        "Family history of early CAD",
    ],
    clinical_notes=(
        "54-year-old male with poorly controlled Type 2 DM and Stage 1 Hypertension. "
        "Patient reports occasional compliance gaps with evening Metformin dose. "
        "Renal function is preserved. Recommended lifestyle modifications and titration of anti-glycemic therapy."
    ),
)

# 4. Mock Drug Interaction Alert
MOCK_INTERACTION_ALERT = InteractionCheckResponse(
    has_conflicts=True,
    alerts=[
        DrugInteractionAlert(
            severity="critical",
            interacting_drugs=["Metformin", "Iodinated Contrast Agents"],
            clinical_risk="Increased risk of lactic acidosis in patients with reduced renal clearance.",
            recommendation_en="Temporarily discontinue Metformin 48 hours prior to radiologic procedures involving iodinated contrast.",
            recommendation_ur="ریڈیولاجیکل ٹیسٹ سے 48 گھنٹے پہلے میٹفارمین کا استعمال عارضی طور پر روک دیں۔",
        ),
        DrugInteractionAlert(
            severity="medium",
            interacting_drugs=["Amlodipine", "Simvastatin"],
            clinical_risk="Amlodipine may increase systemic exposure to Simvastatin, raising risk of myopathy / rhabdomyolysis.",
            recommendation_en="Limit Simvastatin dose to 20mg daily or consider switching to Atorvastatin.",
            recommendation_ur="سمواسٹاٹین کی خوراک روزانہ 20 ملی گرام تک محدود رکھیں یا ایٹورواسٹاٹین پر منتقل کریں۔",
        ),
    ],
)

# 5. Mock Emergency Profile Response (Zero-Login Public Access)
MOCK_EMERGENCY_PROFILE = EmergencyProfileResponse(
    health_id="HV-98214",
    full_name="Ahmad Raza",
    blood_group="B+",
    critical_allergies=["Penicillin (Severe)"],
    active_medications=["Metformin 500mg BD", "Amlodipine 5mg OD"],
    chronic_conditions=["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    emergency_contacts=[
        EmergencyContact(name="Ali Raza", relation="Son", phone="+92-300-9876543"),
        EmergencyContact(name="Fatima Bibi", relation="Spouse", phone="+92-321-1234567"),
    ],
    is_revoked=False,
)

# 6. Mock Records List
def get_mock_user_records(user_id: uuid.UUID) -> List[MedicalRecordResponse]:
    return [
        MedicalRecordResponse(
            id=SAMPLE_RECORD_ID_1,
            user_id=user_id,
            document_type="prescription",
            document_url="http://localhost:8000/uploads/documents/sample_prescription.pdf",
            consultation_date=date(2025, 2, 15),
            doctor_name="Dr. Tariq Mahmood",
            hospital_name="Shifa International Hospital, Islamabad",
            raw_ocr_text=MOCK_PRESCRIPTION_EXTRACTION.raw_ocr_text,
            extracted_data=MOCK_PRESCRIPTION_EXTRACTION.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc),
        ),
        MedicalRecordResponse(
            id=SAMPLE_RECORD_ID_2,
            user_id=user_id,
            document_type="lab_report",
            document_url="http://localhost:8000/uploads/documents/sample_lab_report.pdf",
            consultation_date=date(2025, 2, 14),
            doctor_name="Dr. Farhan Siddiqui (Pathologist)",
            hospital_name="Chughtai Lab",
            raw_ocr_text=MOCK_LAB_EXTRACTION.raw_ocr_text,
            extracted_data=MOCK_LAB_EXTRACTION.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc),
        ),
    ]
