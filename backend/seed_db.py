"""Seed script: creates all tables and inserts realistic mock data into healthvault_db."""

import asyncio
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import text

from app.core.database import engine, async_session_factory, Base
# Import all models so Base.metadata knows about them
from app.models import (  # noqa: F401
    User, PrivacySettings, MedicalRecord,
    Medication, Allergy, Biomarker,
)
from app.core.security import hash_password
from app.services.security_service import generate_emergency_token


# ── Fixed UUIDs for reproducibility ──────────────────────────────────
USER_1_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")
USER_2_ID = uuid.UUID("a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d")

RECORD_1_ID = uuid.UUID("b2c3d4e5-f6a7-4b5c-9d0e-1f2a3b4c5d6e")  # prescription
RECORD_2_ID = uuid.UUID("c3d4e5f6-a7b8-4c5d-9e0f-1a2b3c4d5e6f")  # lab report
RECORD_3_ID = uuid.UUID("d4e5f6a7-b8c9-4d5e-9f0a-1b2c3d4e5f6a")  # lab report (user 2)
RECORD_4_ID = uuid.UUID("e5f6a7b8-c9d0-4e5f-9a0b-1c2d3e4f5a6b")  # discharge (user 1)


async def seed():
    # ── 1. Create all tables ─────────────────────────────────────────
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Tables created successfully")

    # ── 2. Seed data ─────────────────────────────────────────────────
    async with async_session_factory() as db:
        # Check if data already exists
        result = await db.scalar(text("SELECT COUNT(*) FROM users"))
        if result and result > 0:
            print("[WARN] Users already exist -- skipping seed")
            return

        # ── Users ────────────────────────────────────────────────────
        user1 = User(
            id=USER_1_ID,
            health_id="HV-PAK-98214",
            emergency_token=generate_emergency_token(),
            emergency_enabled=True,
            full_name="Ahmad Raza",
            email="ahmad.raza@example.com",
            phone="+92-300-1234567",
            hashed_password=hash_password("Patient123!"),
            role="patient",
            blood_group="B+",
            date_of_birth=date(1971, 6, 15),
            gender="male",
            emergency_contacts=[
                {"name": "Ali Raza", "relation": "Son", "phone": "+92-300-9876543"},
                {"name": "Fatima Bibi", "relation": "Spouse", "phone": "+92-321-1234567"},
            ],
        )
        user2 = User(
            id=USER_2_ID,
            health_id="HV-PAK-55123",
            emergency_token=generate_emergency_token(),
            emergency_enabled=True,
            full_name="Sara Khan",
            email="sara.khan@example.com",
            phone="+92-321-9876543",
            hashed_password=hash_password("Patient456!"),
            role="patient",
            blood_group="A+",
            date_of_birth=date(1988, 3, 22),
            gender="female",
            emergency_contacts=[
                {"name": "Imran Khan", "relation": "Brother", "phone": "+92-333-5551234"},
            ],
        )
        db.add_all([user1, user2])
        await db.flush()
        print(f"[OK] Created 2 users ({user1.full_name}, {user2.full_name})")

        # ── Privacy Settings ─────────────────────────────────────────
        ps1 = PrivacySettings(user_id=USER_1_ID)
        ps2 = PrivacySettings(user_id=USER_2_ID)
        db.add_all([ps1, ps2])
        await db.flush()
        print("[OK] Created privacy settings for both users")

        # ── Medical Records ──────────────────────────────────────────
        record1 = MedicalRecord(
            id=RECORD_1_ID,
            user_id=USER_1_ID,
            document_type="prescription",
            document_url="http://localhost:8000/uploads/documents/sample_prescription.pdf",
            doctor_name="Dr. Tariq Mahmood",
            hospital_name="Shifa International Hospital, Islamabad",
            consultation_date=date(2025, 2, 15),
            raw_ocr_text=(
                "Dr. Tariq Mahmood - Shifa International Hospital\n"
                "Date: 15/02/2025\nPatient: Ahmad Raza (54M)\nRx:\n"
                "1. Tab. Metformin 500mg BD (PC)\n2. Tab. Amlodipine 5mg OD\n"
                "Allergies: Penicillin (Severe)\n"
                "Adv: Monitor fasting blood glucose weekly."
            ),
            extracted_data={
                "diagnoses": ["Type 2 Diabetes Mellitus", "Essential Hypertension"],
                "doctor_name": "Dr. Tariq Mahmood",
                "hospital_name": "Shifa International Hospital, Islamabad",
            },
        )
        record2 = MedicalRecord(
            id=RECORD_2_ID,
            user_id=USER_1_ID,
            document_type="lab_report",
            document_url="http://localhost:8000/uploads/documents/sample_lab_report.pdf",
            doctor_name="Dr. Farhan Siddiqui (Pathologist)",
            hospital_name="Chughtai Lab",
            consultation_date=date(2025, 2, 14),
            raw_ocr_text=(
                "CHUGHTAI LAB - COMPREHENSIVE METABOLIC PANEL\n"
                "Date: 14/02/2025\nPatient: Ahmad Raza | Ref: Dr. Tariq Mahmood\n"
                "HbA1c: 7.4 % (High, Ref: 4.0 - 5.6 %)\n"
                "Fasting Blood Glucose: 145 mg/dL (High, Ref: 70 - 99 mg/dL)\n"
                "Total Cholesterol: 210 mg/dL (High, Ref: < 200 mg/dL)\n"
                "Serum Creatinine: 0.9 mg/dL (Normal, Ref: 0.7 - 1.2 mg/dL)"
            ),
            extracted_data={
                "diagnoses": ["Impaired Glycemic Control", "Dyslipidemia"],
            },
        )
        record3 = MedicalRecord(
            id=RECORD_3_ID,
            user_id=USER_2_ID,
            document_type="lab_report",
            document_url="http://localhost:8000/uploads/documents/lab_report_sara.pdf",
            doctor_name="Dr. Ayesha Tariq",
            hospital_name="IDC Diagnostic Lab",
            consultation_date=date(2025, 3, 10),
            raw_ocr_text="CBC Report - Sara Khan\nHemoglobin: 11.2 g/dL (Low)\nWBC: 7,200 /uL (Normal)",
            extracted_data={"diagnoses": ["Mild Anemia"]},
        )
        record4 = MedicalRecord(
            id=RECORD_4_ID,
            user_id=USER_1_ID,
            document_type="discharge_summary",
            document_url="http://localhost:8000/uploads/documents/discharge_summary.pdf",
            doctor_name="Dr. Nasreen Akhtar",
            hospital_name="Shifa International Hospital, Islamabad",
            consultation_date=date(2025, 1, 20),
            raw_ocr_text=(
                "DISCHARGE SUMMARY\nPatient: Ahmad Raza\n"
                "Admitted: 15/01/2025 - Discharged: 20/01/2025\n"
                "Diagnosis: Community Acquired Pneumonia\n"
                "Treatment: IV Ceftriaxone 1g BD x 5 days\n"
                "Follow-up: Repeat CXR in 4 weeks"
            ),
            extracted_data={
                "diagnoses": ["Community Acquired Pneumonia"],
                "doctor_name": "Dr. Nasreen Akhtar",
            },
        )
        db.add_all([record1, record2, record3, record4])
        await db.flush()
        print("[OK] Created 4 medical records")

        # ── Medications ──────────────────────────────────────────────
        meds = [
            Medication(
                user_id=USER_1_ID, record_id=RECORD_1_ID,
                name="Metformin", dosage="500mg", frequency="BD (Twice Daily)",
                timing="After Meals (Morning / Night)",
                instructions_en="Take 1 tablet twice daily after meals with water.",
                instructions_ur="کھانے کے بعد دن میں دو بار ایک گولی پانی کے ساتھ لیں۔",
                is_active=True, start_date=date(2025, 2, 15),
            ),
            Medication(
                user_id=USER_1_ID, record_id=RECORD_1_ID,
                name="Amlodipine", dosage="5mg", frequency="OD (Once Daily)",
                timing="Morning",
                instructions_en="Take 1 tablet once daily in the morning.",
                instructions_ur="صبح کے وقت روزانہ ایک گولی لیں۔",
                is_active=True, start_date=date(2025, 2, 15),
            ),
            Medication(
                user_id=USER_1_ID,
                name="Atorvastatin", dosage="20mg", frequency="OD (Once Daily)",
                timing="Night",
                instructions_en="Take 1 tablet at night for cholesterol management.",
                instructions_ur="کولیسٹرول کے لیے رات کو ایک گولی لیں۔",
                is_active=True, start_date=date(2025, 2, 20),
            ),
            Medication(
                user_id=USER_2_ID,
                name="Ferrous Sulfate", dosage="200mg", frequency="OD (Once Daily)",
                timing="After Lunch",
                instructions_en="Take 1 tablet after lunch with orange juice for better absorption.",
                instructions_ur="دوپہر کے کھانے کے بعد بہتر جذب کے لیے نارنجی جوس کے ساتھ ایک گولی لیں۔",
                is_active=True, start_date=date(2025, 3, 10),
            ),
        ]
        db.add_all(meds)
        await db.flush()
        print(f"[OK] Created {len(meds)} medications")

        # ── Allergies ────────────────────────────────────────────────
        allergies = [
            Allergy(
                user_id=USER_1_ID,
                allergen="Penicillin",
                severity="severe",
                reaction_details="Anaphylaxis and hives upon exposure",
            ),
            Allergy(
                user_id=USER_1_ID,
                allergen="Sulfa Drugs",
                severity="moderate",
                reaction_details="Skin rash and itching",
            ),
            Allergy(
                user_id=USER_2_ID,
                allergen="Latex",
                severity="mild",
                reaction_details="Contact dermatitis",
            ),
        ]
        db.add_all(allergies)
        await db.flush()
        print(f"[OK] Created {len(allergies)} allergies")

        # ── Biomarkers (longitudinal timeline data) ──────────────────
        biomarkers = [
            # HbA1c — worsening trend for user 1
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="HbA1c",
                      value=6.8, unit="%", reference_min=4.0, reference_max=5.6,
                      status="high", test_date=date(2024, 8, 10)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="HbA1c",
                      value=7.1, unit="%", reference_min=4.0, reference_max=5.6,
                      status="high", test_date=date(2024, 11, 15)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="HbA1c",
                      value=7.4, unit="%", reference_min=4.0, reference_max=5.6,
                      status="high", test_date=date(2025, 2, 14)),
            # Fasting Glucose
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Fasting Blood Glucose",
                      value=128, unit="mg/dL", reference_min=70, reference_max=99,
                      status="high", test_date=date(2024, 8, 10)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Fasting Blood Glucose",
                      value=136, unit="mg/dL", reference_min=70, reference_max=99,
                      status="high", test_date=date(2024, 11, 15)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Fasting Blood Glucose",
                      value=145, unit="mg/dL", reference_min=70, reference_max=99,
                      status="high", test_date=date(2025, 2, 14)),
            # Total Cholesterol
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Total Cholesterol",
                      value=198, unit="mg/dL", reference_min=0, reference_max=200,
                      status="normal", test_date=date(2024, 8, 10)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Total Cholesterol",
                      value=205, unit="mg/dL", reference_min=0, reference_max=200,
                      status="high", test_date=date(2024, 11, 15)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Total Cholesterol",
                      value=210, unit="mg/dL", reference_min=0, reference_max=200,
                      status="high", test_date=date(2025, 2, 14)),
            # Serum Creatinine — stable
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Serum Creatinine",
                      value=0.9, unit="mg/dL", reference_min=0.7, reference_max=1.2,
                      status="normal", test_date=date(2024, 8, 10)),
            Biomarker(user_id=USER_1_ID, record_id=RECORD_2_ID, biomarker_name="Serum Creatinine",
                      value=0.8, unit="mg/dL", reference_min=0.7, reference_max=1.2,
                      status="normal", test_date=date(2025, 2, 14)),
            # Hemoglobin — user 2 (improving anemia)
            Biomarker(user_id=USER_2_ID, record_id=RECORD_3_ID, biomarker_name="Hemoglobin",
                      value=10.2, unit="g/dL", reference_min=12.0, reference_max=17.5,
                      status="low", test_date=date(2024, 12, 5)),
            Biomarker(user_id=USER_2_ID, record_id=RECORD_3_ID, biomarker_name="Hemoglobin",
                      value=11.2, unit="g/dL", reference_min=12.0, reference_max=17.5,
                      status="low", test_date=date(2025, 3, 10)),
            # WBC — user 2
            Biomarker(user_id=USER_2_ID, record_id=RECORD_3_ID, biomarker_name="WBC",
                      value=7200, unit="/uL", reference_min=4500, reference_max=11000,
                      status="normal", test_date=date(2025, 3, 10)),
        ]
        db.add_all(biomarkers)
        await db.flush()
        print(f"[OK] Created {len(biomarkers)} biomarker data points")

        await db.commit()
        print("\n[DONE] Database seeded successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
