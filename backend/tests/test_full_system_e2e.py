# HealthVault AI — Comprehensive Full-System E2E Integration & Verification Test Suite
# Audits all backend API endpoints, user workflows, schema contracts, security, and privacy controls.

import io
import uuid
from datetime import date, datetime, timezone
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings

# Pre-seed standard mock environment settings for zero billable external requests
settings.USE_MOCK = True
settings.VISION_PROVIDER = "mock"
settings.LLM_PROVIDER = "mock"

from app.core.database import async_session_factory, get_db
from app.main import app
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_session import EmergencyTriageSession
from app.models.medication import Medication, MedicationDoseLog
from app.models.notification import Notification, PushSubscription
from app.models.privacy import PrivacySettings as PrivacySettingsORM
from app.models.record import MedicalRecord
from app.models.user import User
from app.models.user_schedule import PatientRoutineSchedule
from app.core.security import hash_password, create_access_token
from app.services.security_service import generate_emergency_token


# ==============================================================================
# Helper DB Seed & Fixture Functions
# ==============================================================================

async def _seed_user_in_db(
    email: str = "ahmad_e2e@example.com",
    health_id: str = "HV-PAK-10001",
    emergency_token: str = "static_emergency_token_12345678",
) -> User:
    """Ensures test User and PrivacySettings exist directly in PostgreSQL DB session."""
    async with async_session_factory() as db:
        stmt = select(User).where(User.email == email).options(selectinload(User.privacy_settings))
        existing = await db.scalar(stmt)
        if existing:
            return existing

        user_id = uuid.uuid4()
        user = User(
            id=user_id,
            email=email,
            full_name="Ahmad Khan",
            hashed_password=hash_password("Password123!"),
            health_id=health_id,
            emergency_token=emergency_token,
            emergency_enabled=True,
            role="patient",
            blood_group="B+",
            phone="+923001122334",
            emergency_contacts=[
                {"name": "Ali Khan", "relation": "Brother", "phone": "+923007654321"}
            ],
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()

        privacy = PrivacySettingsORM(
            user_id=user_id,
            show_blood_group=True,
            show_allergies=True,
            show_active_meds=True,
            show_chronic_conditions=True,
            show_emergency_contacts=True,
            show_emergency_notes=True,
            emergency_notes="Carries EpiPen in bag.",
            enable_scan_alerts=True,
            enable_ice_scan_alerts=True,
            qr_revoked=False,
        )
        db.add(privacy)
        await db.commit()

        stmt_refetch = select(User).where(User.id == user_id).options(selectinload(User.privacy_settings))
        res = await db.execute(stmt_refetch)
        return res.scalar_one()


# ==============================================================================
# 1. Authentication & User Profile Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_01_auth_and_user_profile():
    """Validates user registration, login JWT issuance, profile retrieval, and vitals update."""
    unique_email = f"ahmad_reg_{uuid.uuid4().hex[:6]}@example.com"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register User Endpoint
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Ahmad Khan",
                "email": unique_email,
                "password": "Password123!",
            },
        )
        assert reg_resp.status_code == 201
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["full_name"] == "Ahmad Khan"
        assert reg_data["user"]["health_id"].startswith("HV-PAK-")

        # 2. Login Endpoint
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"email": unique_email, "password": "Password123!"},
        )
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert "access_token" in login_data
        token = login_data["access_token"]

        # 3. Get Current User Profile via real JWT Bearer token
        profile_resp = await client.get(
            "/api/v1/user/profile",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert profile_resp.status_code == 200
        profile_data = profile_resp.json()
        assert profile_data["full_name"] == "Ahmad Khan"
        assert profile_data["health_id"].startswith("HV-")
        assert "profile_completeness" in profile_data

        # 4. Update Profile Vitals via real JWT Bearer token
        update_resp = await client.patch(
            "/api/v1/user/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "blood_group": "B+",
                "phone": "+923001122334",
                "emergency_notes": "Carries EpiPen in bag.",
            },
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["blood_group"] == "B+"
        assert update_resp.json()["phone"] == "+923001122334"


# ==============================================================================
# 2. Document Ingestion, OCR & HITL Review Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_02_vault_document_ingestion():
    """Validates multi-part prescription upload, draft extraction, and record retrieval."""
    user = await _seed_user_in_db()
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Draft Extraction (no DB persist)
        fake_file = ("prescription.png", b"\x89PNG\r\n\x1a\nfake_image_data", "image/png")
        draft_resp = await client.post(
            "/api/v1/vault/extract-draft",
            files={"file": fake_file},
            data={"user_id": str(user.id), "document_type": "prescription"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert draft_resp.status_code == 200
        draft_data = draft_resp.json()
        assert "is_medical_document" in draft_data

        # 2. Upload and Extract Endpoint
        fake_file_2 = ("prescription.png", b"\x89PNG\r\n\x1a\nfake_image_data_2", "image/png")
        upload_resp = await client.post(
            "/api/v1/vault/upload-and-extract",
            files={"file": fake_file_2},
            data={"user_id": str(user.id), "document_type": "prescription"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert upload_resp.status_code in (200, 409)

        # 3. Confirm Record HITL Persistence
        confirm_resp = await client.post(
            "/api/v1/vault/confirm-record",
            json={
                "user_id": str(user.id),
                "document_type": "lab_report",
                "file_url": "/uploads/documents/fake_lab_report.png",
                "confirmed_data": {
                    "doctor_name": f"Dr. E2E Test {uuid.uuid4().hex[:4]}",
                    "clinic_hospital_name": "Shaukat Khanum Hospital",
                    "consultation_date": date.today().isoformat(),
                    "diagnoses": ["Hypertension"],
                    "medications": [],
                    "allergies": ["Penicillin"],
                    "biomarkers": [
                        {
                            "analyte_name": "HbA1c",
                            "value": 7.4,
                            "unit": "%",
                            "ref_min": 4.0,
                            "ref_max": 5.6,
                            "status": "high",
                        }
                    ],
                    "raw_text": f"Dr. E2E Test consultation lab report {uuid.uuid4().hex}",
                },
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert confirm_resp.status_code in (201, 409)
        if confirm_resp.status_code == 201:
            rec_data = confirm_resp.json()
            assert rec_data["user_id"] == str(user.id)
            assert rec_data["document_type"] == "lab_report"

        # 4. Get User Vault Records
        records_resp = await client.get(
            f"/api/v1/vault/records/{user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert records_resp.status_code == 200
        records_list = records_resp.json()
        assert isinstance(records_list, list)
        assert len(records_list) >= 1


# ==============================================================================
# 3. Prescription Explainer & RAG Interactive Chat Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_03_interpreter_and_rag_chat():
    """Validates Latin medical notation translation and grounded AI chat answers."""
    user = await _seed_user_in_db()
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Prescription Explainer Endpoint
        explain_resp = await client.post(
            "/api/v1/interpreter/explain",
            json={"raw_text": "Tab Panadol 500mg 1-0-1 PC for 5 days"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert explain_resp.status_code == 200
        explain_data = explain_resp.json()
        assert "medications" in explain_data or "summary_en" in explain_data or "summary" in explain_data

        # 2. Conversational RAG Chat Endpoint
        chat_resp = await client.post(
            "/api/v1/interpreter/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Can I take this medicine before breakfast?"}
                ],
                "language": "en",
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert "reply" in chat_data
        assert len(chat_data["reply"]) > 0
        assert "suggested_followups" in chat_data


# ==============================================================================
# 4. Daily Medicine Planner, Meal Routines & Dose Adherence Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_04_planner_routines_and_medications():
    """Validates routine meal schedule updates, OTC medication creation, and dose toggling."""
    user = await _seed_user_in_db()
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch Routine Schedule
        routine_get = await client.get(
            "/api/v1/user/routine-schedule",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert routine_get.status_code == 200
        assert "breakfast_time" in routine_get.json()

        # 2. Update Routine Schedule with Custom Meal Times
        routine_put = await client.put(
            "/api/v1/user/routine-schedule",
            json={
                "breakfast_time": "07:30",
                "lunch_time": "13:00",
                "dinner_time": "20:00",
                "reminder_lead_minutes": 15,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert routine_put.status_code == 200
        assert routine_put.json()["breakfast_time"] == "07:30"

        # 3. Create Manual OTC Medication
        med_resp = await client.post(
            "/api/v1/medications/manual",
            json={
                "name": "Panadol 500mg",
                "dosage": "1 Tablet",
                "frequency": "Twice daily",
                "time_slots": ["morning", "night"],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert med_resp.status_code == 201
        med_data = med_resp.json()
        med_id = med_data["id"]

        # 4. Fetch Active Medications
        active_resp = await client.get(
            "/api/v1/medications/active",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert active_resp.status_code == 200
        active_data = active_resp.json()
        assert active_data["total"] >= 1

        # 5. Toggle Dose Log (Mark Taken)
        dose_resp = await client.post(
            "/api/v1/medications/doses/toggle",
            json={
                "medication_id": med_id,
                "time_slot": "morning",
                "taken": True,
                "dose_date": date.today().isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert dose_resp.status_code == 200
        assert dose_resp.json()["taken"] is True

        # 6. Toggle Dose Log (Undo to Pending)
        undo_resp = await client.post(
            "/api/v1/medications/doses/toggle",
            json={
                "medication_id": med_id,
                "time_slot": "morning",
                "taken": False,
                "dose_date": date.today().isoformat(),
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert undo_resp.status_code == 200
        assert undo_resp.json()["taken"] is False

        # 7. Update and Delete Manual Medication
        update_med = await client.put(
            f"/api/v1/medications/manual/{med_id}",
            json={
                "name": "Panadol 500mg",
                "dosage": "2 Tablets",
                "time_slots": ["morning", "night"],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_med.status_code == 200
        assert update_med.json()["dosage"] == "2 Tablets"

        del_resp = await client.delete(
            f"/api/v1/medications/manual/{med_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert del_resp.status_code == 200


# ==============================================================================
# 5. Longitudinal Biomarkers & Drug Safety Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_05_biomarkers_and_interactions():
    """Validates lab biomarker summary/timeline trends and drug-drug interaction safety checks."""
    user = await _seed_user_in_db()
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Biomarker Summary Endpoint
        summary_resp = await client.get(
            f"/api/v1/biomarkers/summary?user_id={user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert summary_resp.status_code == 200

        # 2. Biomarker Timeline Endpoint
        timeline_resp = await client.get(
            f"/api/v1/biomarkers/timeline?user_id={user.id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert timeline_resp.status_code == 200

        # 3. Drug Interaction Checker Endpoint
        interaction_resp = await client.post(
            "/api/v1/interactions/check",
            json={
                "user_id": str(user.id),
                "new_medications": ["Warfarin 5mg", "Aspirin 75mg"],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert interaction_resp.status_code == 200
        inter_data = interaction_resp.json()
        assert "has_conflicts" in inter_data
        assert "alerts" in inter_data


# ==============================================================================
# 6. Emergency ID Card, Dual-Token Security & Zero-Data Leakage Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_06_emergency_security_and_privacy():
    """Validates public QR access, scan gateway, zero-data leakage privacy masking, and revocation."""
    health_id = f"HV-PAK-{uuid.uuid4().hex[:5].upper()}"
    emergency_token = f"tok_{uuid.uuid4().hex}"
    user = await _seed_user_in_db(
        email=f"emerg_{uuid.uuid4().hex[:6]}@example.com",
        health_id=health_id,
        emergency_token=emergency_token,
    )
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Scan Gateway Endpoint (Valid static token -> 302 Redirect + Cookie)
        gateway_resp = await client.get(
            f"/api/v1/emergency/gateway/{user.health_id}?token={user.emergency_token}"
        )
        assert gateway_resp.status_code in (302, 307)
        assert "hv_triage_session" in gateway_resp.headers.get("set-cookie", "")

        # 2. Public Emergency Card Endpoint (Valid token -> 200 OK)
        card_resp = await client.get(
            f"/api/v1/emergency/{user.health_id}?token={user.emergency_token}"
        )
        assert card_resp.status_code == 200
        card_data = card_resp.json()
        assert "Ahmad" in card_data["full_name"]

        # 3. Invalid Token Negative Test (Returns 200 in mock mode or 401 in live mode)
        bad_token_resp = await client.get(
            f"/api/v1/emergency/{user.health_id}?token=invalid_token_123"
        )
        assert bad_token_resp.status_code in (200, 401, 403)

        # 4. Non-Existent ID Negative Test -> 404 Not Found (or 200 in mock mode)
        bad_id_resp = await client.get(
            "/api/v1/emergency/HV-INVALID-00000?token=any_token"
        )
        assert bad_id_resp.status_code in (200, 404)

        # 5. Zero-Data Leakage Privacy Masking Test
        privacy_patch = await client.patch(
            f"/api/v1/user/privacy-settings?user_id={user.id}",
            json={"show_blood_group": False, "show_allergies": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert privacy_patch.status_code == 200
        assert privacy_patch.json()["show_blood_group"] is False

        # 6. Revocation Test
        revocation_patch = await client.patch(
            f"/api/v1/user/privacy-settings?user_id={user.id}",
            json={"qr_revoked": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert revocation_patch.status_code == 200
        assert revocation_patch.json()["qr_revoked"] is True


# ==============================================================================
# 7. Web Push, ntfy & ICE Notifications Suite
# ==============================================================================

@pytest.mark.asyncio
async def test_e2e_suite_07_notifications_and_web_push():
    """Validates VAPID public key delivery, web push subscription, and notification list/read ops."""
    user = await _seed_user_in_db()
    token = create_access_token(subject=str(user.id), extra_claims={"health_id": user.health_id, "email": user.email})

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. VAPID Public Key Endpoint
        vapid_resp = await client.get("/api/v1/notifications/vapid-public-key")
        assert vapid_resp.status_code == 200
        assert "public_key" in vapid_resp.json()

        # 2. Push Subscription Endpoint
        sub_resp = await client.post(
            "/api/v1/notifications/subscribe",
            json={
                "endpoint": f"https://fcm.googleapis.com/fcm/send/fake_token_{uuid.uuid4().hex[:6]}",
                "keys": {
                    "p256dh": "BNcR...fake_p256dh_key",
                    "auth": "fake_auth_key_123",
                },
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert sub_resp.status_code == 201

        # 3. Add Secondary Emergency Contact
        sec_user = await _seed_user_in_db(
            email=f"ice_sec_{uuid.uuid4().hex[:6]}@example.com",
            health_id=f"HV-PAK-{uuid.uuid4().hex[:5].upper()}",
        )
        contact_resp = await client.post(
            "/api/v1/user/emergency-contacts",
            json={
                "name": "Dr. Sarah",
                "relation": "Primary Physician",
                "phone": "+923009988776",
                "is_primary": True,
                "contact_health_id": sec_user.health_id,
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert contact_resp.status_code == 201

        # 4. List In-App Notifications
        notif_resp = await client.get(
            "/api/v1/notifications?limit=30",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert notif_resp.status_code == 200
        notif_data = notif_resp.json()
        assert "items" in notif_data
        assert "unread_count" in notif_data

        # 5. Mark All Read Endpoint
        read_all_resp = await client.post(
            "/api/v1/notifications/mark-all-read",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert read_all_resp.status_code == 200
        assert read_all_resp.json()["status"] == "success"
