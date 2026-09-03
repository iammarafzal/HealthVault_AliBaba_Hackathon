# HealthVault AI — Mock Data Store
# Provides structured, schema-compliant medical sample data for development & frontend unblocking

from datetime import date, datetime, timezone
import uuid
from typing import List

from app.schemas.emergency import EmergencyProfileResponse
from app.schemas.interactions import DrugInteractionAlert, InteractionCheckResponse
from app.schemas.summary import DoctorSummaryResponse
from app.schemas.user import EmergencyContactResponse
from app.schemas.vault import (
    ExtractedAllergy,
    ExtractedMedication,
    ExtractionResponse,
    MedicalRecordResponse,
)

SAMPLE_USER_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")
SAMPLE_RECORD_ID_1 = uuid.UUID("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d")
SAMPLE_RECORD_ID_2 = uuid.UUID("b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e")

# 1. Mock Prescription Extraction Payload (Audited Pakistani Handwritten Clinical Prescription)
MOCK_PRESCRIPTION_EXTRACTION = ExtractionResponse(
    record_id=SAMPLE_RECORD_ID_1,
    document_type="prescription",
    doctor_name="Dr. Medical Specialist",
    hospital_name="Khursheed Clinic (DHQ Hospital Bhakkar)",
    consultation_date=date(2024, 8, 24),
    diagnoses=[
        "Afebrile UTI (پیشاب کی نالی کا انفیکشن)",
        "Fibroid Uterus (رحم کی رسولی)",
        "Dysmenorrhea (+) (شدید دردِ ماہواری)",
        "Vitals: BP 110/80 mmHg",
    ],
    medications=[
        ExtractedMedication(
            name="Tab Solif 5mg (Solifenacin)",
            dosage="0.5 Tablet",
            dosage_quantity="0.5 Tablet",
            strength="5mg",
            frequency="OD (Once Daily - Evening)",
            timing="Evening (شام کو)",
            fraction="half",
            fraction_label_en="0.5 Tablet",
            fraction_label_ur="0.5 گولی",
            meal_context="after_meal",
            meal_context_en="After meals",
            meal_context_ur="کھانے کے بعد",
            purpose_en="Urinary bladder spasm & UTI symptom relief",
            purpose_ur="پیشاب کے کنٹرول اور مثانے کے سکون کے لیے",
            duration="5 days",
            duration_ur="۵ دن",
            timing_breakdown={"morning": True, "afternoon": False, "night": True},
            instructions_en="Take 0.5 tablet once daily in the evening with water for 5 days.",
            instructions_ur="روزانہ شام کو آدھی گولی پانی کے ساتھ لیں۔ یہ دوا ۵ دن تک جاری رکھیں۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Tab Femax 500mg",
            dosage="1 Tablet",
            dosage_quantity="1 Tablet",
            strength="500mg",
            frequency="OD (Once Daily - Evening)",
            timing="Evening (شام کو)",
            fraction="full",
            fraction_label_en="1 Tablet",
            fraction_label_ur="1 گولی",
            meal_context="after_meal",
            meal_context_en="After meals",
            meal_context_ur="کھانے کے بعد",
            purpose_en="Nutritional supplement for anemia",
            purpose_ur="خون کی کمی اور عمومی کمزوری دور کرنے کے لیے",
            duration="Daily",
            duration_ur="روزانہ",
            timing_breakdown={"morning": False, "afternoon": False, "night": True},
            instructions_en="Take 1 tablet once daily in the evening after meals with water.",
            instructions_ur="روزانہ شام کو کھانے کے بعد ایک گولی پانی کے ساتھ لیں۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Tab Neoprox 250mg",
            dosage="1 Tablet",
            dosage_quantity="1 Tablet",
            strength="250mg",
            frequency="1 + 1 (BD - Twice Daily)",
            timing="Morning & Night (صبح و شام)",
            fraction="full",
            fraction_label_en="1 Tablet",
            fraction_label_ur="1 گولی",
            meal_context="after_meal",
            meal_context_en="After meals",
            meal_context_ur="کھانے کے بعد",
            purpose_en="For pain relief & cramps",
            purpose_ur="درد اور سوزش میں آرام کے لیے",
            duration="3 days",
            duration_ur="۳ دن",
            timing_breakdown={"morning": True, "afternoon": False, "night": True},
            instructions_en="Take 1 tablet twice daily after meals for 3 days for pain relief.",
            instructions_ur="صبح اور شام کھانے کے بعد ایک گولی درد کے لیے لیں۔ یہ دوا ۳ دن کے لیے ہے۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Cap Eso 40mg",
            dosage="1 Capsule",
            dosage_quantity="1 Capsule",
            strength="40mg",
            frequency="1 + 0 + 1 (BD - Morning & Night)",
            timing="Morning & Night (صبح و رات)",
            fraction="full",
            fraction_label_en="1 Capsule",
            fraction_label_ur="1 کیپسول",
            meal_context="before_meal",
            meal_context_en="Before meals",
            meal_context_ur="کھانے سے پہلے",
            purpose_en="Stomach protection",
            purpose_ur="معدے کی حفاظت اور تیزابیت روکنے کے لیے",
            duration="10 days",
            duration_ur="۱۰ دن",
            timing_breakdown={"morning": True, "afternoon": False, "night": True},
            instructions_en="Take 1 capsule twice daily 30 minutes before meals for 10 days.",
            instructions_ur="صبح نہار منہ اور رات کھانے سے آدھا گھنٹہ پہلے ایک کیپسول لیں۔ ۱۰ دن تک جاری رکھیں۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Tab Anafortan Plus",
            dosage="1 Tablet",
            dosage_quantity="1 Tablet",
            strength=None,
            frequency="1 + 1 (BD - Twice Daily)",
            timing="Morning & Night (صبح و شام)",
            fraction="full",
            fraction_label_en="1 Tablet",
            fraction_label_ur="1 گولی",
            meal_context="after_meal",
            meal_context_en="After meals",
            meal_context_ur="کھانے کے بعد",
            purpose_en="For pain & cramps",
            purpose_ur="پیٹ کے مروڑ، کھچاؤ اور اینٹھن کے لیے",
            duration="3 days",
            duration_ur="۳ دن",
            timing_breakdown={"morning": True, "afternoon": False, "night": True},
            instructions_en="Take 1 tablet twice daily after meals for 3 days for pain.",
            instructions_ur="صبح اور شام کھانے کے بعد ایک گولی پیٹ درد اور مروڑ کے لیے لیں۔ ۳ دن تک استعمال کریں۔",
            is_active=True,
        ),
        ExtractedMedication(
            name="Syp Ulsanic",
            dosage="2 Teaspoons",
            dosage_quantity="2 Teaspoons",
            strength=None,
            frequency="2 Teaspoons (BD / TDS)",
            timing="Before meals",
            fraction="2_spoons",
            fraction_label_en="2 Teaspoons",
            fraction_label_ur="۲ چمچ",
            meal_context="before_meal",
            meal_context_en="Before meals",
            meal_context_ur="کھانے سے پہلے",
            purpose_en="Stomach protection",
            purpose_ur="معدے کی حفاظت اور جلن سے بچاؤ کے لیے",
            duration="As advised",
            duration_ur="حسبِ ضرورت",
            timing_breakdown={"morning": True, "afternoon": False, "night": True},
            instructions_en="Take 2 teaspoons 1 hour before meals for stomach protection.",
            instructions_ur="کھانے سے ایک گھنٹہ پہلے ۲ چائے کے چمچ شربت پیئیں۔",
            is_active=True,
        ),
    ],
    allergies=[],
    raw_ocr_text=(
        "Khursheed Clinic - DHQ Hospital Bhakkar\n"
        "Consultant: Dr. Asma Malik\n"
        "Patient: Abida | Date: 24-08-2024 | Vitals: BP 110/80\n"
        "Diagnosis: Afebrile UTI / Fibroid uterus, Dysmenorrhea (+)\n"
        "Rx:\n"
        "1. Tab Solif 5mg — آدھی گولی روزانہ شام کو (۵ دن)\n"
        "2. Tab Femax 500mg — ایک گولی شام کو\n"
        "3. Tab Neoprox 250mg — 1 + 1 درد کے لیے (۳ دن)\n"
        "4. Cap Eso 40mg — 1 + 0 + 1 (۱۰ دن) کھانے سے پہلے\n"
        "5. Tab Anafortan Plus — 1 + 1 درد کے لیے (۳ دن)\n"
        "6. Syp Ulsanic — ۲ چمچ کھانے سے پہلے"
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
    health_id="HV-PAK-98214",
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
    health_id="HV-PAK-98214",
    full_name="Ahmad Raza",
    blood_group="B+",
    critical_allergies=["Penicillin (Severe)"],
    active_medications=["Metformin 500mg BD", "Amlodipine 5mg OD"],
    chronic_conditions=["Type 2 Diabetes Mellitus", "Essential Hypertension"],
    emergency_contacts=[
        EmergencyContactResponse(id=uuid.uuid4(), name="Ali Raza", relation="Son", phone="+92-300-9876543"),
        EmergencyContactResponse(id=uuid.uuid4(), name="Fatima Bibi", relation="Spouse", phone="+92-321-1234567"),
    ],
    emergency_notes="Carries EpiPen in front pocket. Pacemaker fitted in 2024.",
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


# ---------------------------------------------------------------------------
# 7. Mock Voice Intent Resolutions (bilingual EN/UR)
#    Used by MockLLMProvider when prompt matches voice-intent keywords.
# ---------------------------------------------------------------------------

MOCK_VOICE_MEDICATION_SCHEDULE: dict = {
    "intent": "medication_schedule",
    "entities_detected": {
        "medications_mentioned": ["Metformin", "Amlodipine"],
        "symptoms_mentioned": [],
        "dosages_mentioned": [],
    },
    "answer_en": (
        "Based on your records, you are prescribed Metformin 500mg twice daily "
        "after meals (morning and night) and Amlodipine 5mg once daily in the "
        "morning. Please follow this schedule consistently. "
        "Disclaimer: This is informational only and not a substitute for "
        "professional medical advice."
    ),
    "answer_ur": (
        "آپ کے طبی ریکارڈ کے مطابق آپ کو میٹفارمین 500 ملی گرام دن میں دو بار "
        "کھانے کے بعد (صبح اور رات) اور ایملوڈیپین 5 ملی گرام روزانہ صبح لینے "
        "کی ہدایت ہے۔ اس شیڈول کی پابندی کریں۔ "
        "نوٹ: یہ صرف معلوماتی ہے اور پیشہ ورانہ طبی مشورے کا متبادل نہیں ہے۔"
    ),
    "requires_emergency_care": False,
    "confidence": 0.95,
}

MOCK_VOICE_DOSAGE_INQUIRY: dict = {
    "intent": "dosage_inquiry",
    "entities_detected": {
        "medications_mentioned": ["Metformin"],
        "symptoms_mentioned": [],
        "dosages_mentioned": ["500mg"],
    },
    "answer_en": (
        "Your prescribed dosage for Metformin is 500mg, taken twice daily after "
        "meals with water. Do not exceed this dose without consulting your doctor. "
        "Disclaimer: This is informational only."
    ),
    "answer_ur": (
        "میٹفارمین کی آپ کی تجویز کردہ خوراک 500 ملی گرام ہے، جو دن میں دو بار "
        "کھانے کے بعد پانی کے ساتھ لینی ہے۔ اپنے ڈاکٹر سے مشورہ کیے بغیر خوراک "
        "زیادہ نہ کریں۔ نوٹ: یہ صرف معلوماتی ہے۔"
    ),
    "requires_emergency_care": False,
    "confidence": 0.93,
}

MOCK_VOICE_SYMPTOM_TRIAGE: dict = {
    "intent": "symptom_triage",
    "entities_detected": {
        "medications_mentioned": [],
        "symptoms_mentioned": ["headache", "dizziness"],
        "dosages_mentioned": [],
    },
    "answer_en": (
        "You reported headache and dizziness. Given your history of hypertension "
        "and diabetes, these symptoms may relate to blood pressure fluctuations "
        "or blood sugar levels. Please monitor your vitals and consult your "
        "doctor if symptoms persist. "
        "Disclaimer: This is informational only and not a substitute for "
        "professional medical care."
    ),
    "answer_ur": (
        "آپ نے سر درد اور چکر کی شکایت کی ہے۔ آپ کے ہائی بلڈ پریشر اور ذیابیطس "
        "کے سابقے کو دیکھتے ہوئے، یہ علامات بلڈ پریشر یا بلڈ شوگر کی تبدیلی سے "
        "متعلق ہو سکتی ہیں۔ براہ کرم اپنی علامات کی نگرانی کریں اور جاری رہنے "
        "کی صورت میں اپنے ڈاکٹر سے رجوع کریں۔ "
        "نوٹ: یہ صرف معلوماتی ہے اور پیشہ ورانہ طبی دیکھ بھال کا متبادل نہیں ہے۔"
    ),
    "requires_emergency_care": False,
    "confidence": 0.88,
}

MOCK_VOICE_EMERGENCY_SOS: dict = {
    "intent": "emergency_sos",
    "entities_detected": {
        "medications_mentioned": [],
        "symptoms_mentioned": ["chest pain"],
        "dosages_mentioned": [],
    },
    "answer_en": (
        "This appears to be a medical emergency. Please call emergency services "
        "(1122 in Pakistan) or go to the nearest hospital immediately. Do not "
        "delay. This is not a substitute for professional medical care."
    ),
    "answer_ur": (
        "یہ ایک طبی ہنگامی صورتحال لگ رہی ہے۔ براہ کرم فوری طور پر ایمبولینس "
        "(پاکستان میں 1122) کو کال کریں یا قریب ترین ہسپتال جائیں۔ دیر نہ کریں۔ "
        "یہ پیشہ ورانہ طبی دیکھ بھال کا متبادل نہیں ہے۔"
    ),
    "requires_emergency_care": True,
    "confidence": 0.95,
}

MOCK_VOICE_GENERAL_INQUIRY: dict = {
    "intent": "general_inquiry",
    "entities_detected": {},
    "answer_en": (
        "Thank you for your query. Based on your health records, I recommend "
        "consulting your doctor for personalized advice. This is informational "
        "only and not a substitute for professional medical consultation."
    ),
    "answer_ur": (
        "آپ کے سوال کا شکریہ۔ آپ کے طبی ریکارڈ کی بنیاد پر، میں ذاتی مشورے کے "
        "لیے اپنے ڈاکٹر سے رجوع کرنے کی تجویز دیتا ہوں۔ یہ صرف معلوماتی ہے اور "
        "پیشہ ورانہ طبی مشورے کا متبادل نہیں ہے۔"
    ),
    "requires_emergency_care": False,
    "confidence": 0.75,
}

# Aggregate lookup for MockLLMProvider voice-intent routing
MOCK_VOICE_INTENT_MAP: dict = {
    "medication_schedule": MOCK_VOICE_MEDICATION_SCHEDULE,
    "dosage_inquiry": MOCK_VOICE_DOSAGE_INQUIRY,
    "symptom_triage": MOCK_VOICE_SYMPTOM_TRIAGE,
    "emergency_sos": MOCK_VOICE_EMERGENCY_SOS,
    "general_inquiry": MOCK_VOICE_GENERAL_INQUIRY,
}


# ---------------------------------------------------------------------------
# 8. Mock Interaction Check — safe (no conflicts)
# ---------------------------------------------------------------------------

MOCK_INTERACTION_NO_CONFLICT: dict = {
    "has_conflicts": False,
    "alerts": [],
}
