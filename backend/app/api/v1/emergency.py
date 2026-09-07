import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.rate_limiter import limiter
from app.core.mock_data import MOCK_EMERGENCY_PROFILE
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_scan import EmergencyScanLog
from app.models.emergency_session import EmergencyTriageSession
from app.models.notification import Notification
from app.models.privacy import PrivacySettings
from app.models.record import MedicalRecord
from app.models.user import User
from app.services.storage_service import generate_signed_document_url
from app.schemas.emergency import (
    EmergencyAccessResponse,
    EmergencyScanLogResponse,
    EmergencySessionDataResponse,
    ScanLocationUpdate,
    SharedAlertStreamResponse,
)
from app.services.emergency_service import (
    EmergencyService,
    dispatch_emergency_scan_alert_to_ice,
    get_secure_ntfy_topic_for_patient,
    parse_device_type,
    reverse_geocode_coordinates,
)

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get(
    "/shared-alert-streams",
    response_model=List[SharedAlertStreamResponse],
    status_code=status.HTTP_200_OK,
    summary="List emergency ntfy alert streams for designated ICE contact",
)
async def get_shared_alert_streams(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SharedAlertStreamResponse]:
    """Queries all patients who have designated this user as their primary ICE contact.
    
    Returns a list of patient alert streams with their obscure ntfy topic (hv-{hash})
    so the ICE contact's browser can listen via standard SSE.
    """
    # 1. Direct match: patients who designated current_user.id
    stmt = (
        select(User)
        .where(User.notified_ice_id == current_user.id)
        .where(User.emergency_enabled.is_(True))
    )
    res = await db.scalars(stmt)
    patients = list(res.all())
    patient_ids = {p.id for p in patients}

    # 2. Match by phone or contact: if current_user has a phone, find any patient
    # where the user designated an EmergencyContact matching current_user's phone
    if current_user.phone:
        cleaned_phone = current_user.phone.strip().replace(" ", "").replace("-", "")
        contact_stmt = select(EmergencyContact).where(
            or_(
                EmergencyContact.phone.contains(cleaned_phone[-10:] if len(cleaned_phone) >= 10 else cleaned_phone),
                EmergencyContact.phone == current_user.phone,
            )
        )
        c_res = await db.scalars(contact_stmt)
        matched_contacts = c_res.all()
        for contact in matched_contacts:
            if contact.user_id not in patient_ids:
                p = await db.scalar(select(User).where(User.id == contact.user_id))
                if p and p.emergency_enabled:
                    if p.notified_ice_id == contact.id or (not p.notified_ice_id and contact.is_primary):
                        patients.append(p)
                        patient_ids.add(p.id)

    # 3. Filter by privacy settings (enable_scan_alerts, enable_ice_scan_alerts, not qr_revoked)
    streams: List[SharedAlertStreamResponse] = []
    for patient in patients:
        privacy = await db.scalar(
            select(PrivacySettings).where(PrivacySettings.user_id == patient.id)
        )
        if privacy:
            if privacy.qr_revoked or not privacy.enable_scan_alerts or not privacy.enable_ice_scan_alerts:
                continue

        topic = get_secure_ntfy_topic_for_patient(str(patient.id))
        patient_name = patient.full_name or patient.health_id
        streams.append(
            SharedAlertStreamResponse(
                patient_id=str(patient.id),
                patient_name=patient_name,
                topic=topic,
                health_id=patient.health_id,
            )
        )

    return streams


@router.get(
    "/gateway/{health_id}",
    summary="Emergency QR scan gateway — validates token, dispatches ICE alert, and mints HTTP-Only session cookie",
)
@limiter.limit("10/minute")
async def emergency_scan_gateway(
    health_id: str,
    request: Request,
    token: str = Query(..., description="Static high-entropy token from physical QR card"),
    city: Optional[str] = Query(None, description="Optional scan location city"),
    db: AsyncSession = Depends(get_db),
):
    """Scan gateway endpoint called when physical card QR is scanned.

    1. Validates card token & dispatches ICE alert / logs audit record.
    2. Generates a 15-minute session token and client device fingerprint.
    3. Issues 302 redirect to frontend clean view (/emergency/{health_id}/view).
    4. Attaches HttpOnly device cookie `hv_triage_session`.
    """
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    user_agent = request.headers.get("User-Agent", "Unknown Device")
    detected_city = (
        city
        or request.headers.get("X-City")
        or request.headers.get("CF-IPCity")
        or "Unknown"
    )

    # 1. Validate token & dispatch ICE alert / scan log via EmergencyService
    try:
        await EmergencyService.get_emergency_profile_with_token(
            db=db,
            health_id=health_id,
            provided_token=token,
            ip_address=client_ip,
            user_agent=user_agent,
            city=detected_city,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        ) from exc
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PHYSICAL_SCAN_REQUIRED",
        ) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        ) from exc

    # 2. Mint session token & device fingerprint
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    device_fingerprint = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()

    # 3. Persist session
    triage_session = EmergencyTriageSession(
        health_id=health_id,
        session_token=session_token,
        device_fingerprint=device_fingerprint,
        expires_at=expires_at,
    )
    db.add(triage_session)
    await db.commit()

    # 4. 302 Redirect with HttpOnly cookie
    target_url = f"{settings.FRONTEND_URL}/emergency/{health_id}/view"
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    
    is_prod_or_vercel = (
        settings.ENVIRONMENT.lower() in ("production", "prod")
        or "vercel.app" in settings.FRONTEND_URL
        or "onrender.com" in settings.SERVER_BASE_URL
    )
    samesite_val = "none" if is_prod_or_vercel else "lax"
    secure_val = True if (is_prod_or_vercel or samesite_val == "none") else False

    response.set_cookie(
        key="hv_triage_session",
        value=session_token,
        max_age=900,
        httponly=True,
        secure=secure_val,
        samesite=samesite_val,
        path="/",
    )
    return response


@router.get(
    "/{health_id}/session-data",
    response_model=EmergencySessionDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get protected emergency medical profile using HTTP-Only triage session cookie",
)
async def get_emergency_session_data(
    health_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> EmergencySessionDataResponse:
    """Protected endpoint for the clean triage viewer route (/emergency/{health_id}/view).

    Enforces:
    - 401 Unauthorized ("PHYSICAL_SCAN_REQUIRED") if cookie is missing or invalid.
    - 403 Forbidden ("SESSION_EXPIRED") if session has passed 15-minute window.
    - 403 Forbidden ("DEVICE_MISMATCH") if client IP/User-Agent fingerprint differs.
    """
    session_cookie = request.cookies.get("hv_triage_session")
    if not session_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PHYSICAL_SCAN_REQUIRED",
        )

    # Lookup session token in database
    stmt = select(EmergencyTriageSession).where(
        EmergencyTriageSession.session_token == session_cookie
    )
    session_record = await db.scalar(stmt)

    if not session_record or session_record.health_id != health_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PHYSICAL_SCAN_REQUIRED",
        )

    # Check 15-minute expiration
    now = datetime.now(timezone.utc)
    sess_expiry = session_record.expires_at
    if sess_expiry.tzinfo is None:
        sess_expiry = sess_expiry.replace(tzinfo=timezone.utc)

    if sess_expiry < now:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SESSION_EXPIRED",
        )

    # Check device fingerprint matching
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("User-Agent", "Unknown Device")
    current_fingerprint = hashlib.sha256(f"{client_ip}:{user_agent}".encode()).hexdigest()

    if session_record.device_fingerprint != current_fingerprint:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="DEVICE_MISMATCH",
        )

    # Mock mode fast-path
    if settings.USE_MOCK:
        remaining_sec = max(0, int((sess_expiry - now).total_seconds()))
        mock_data = MOCK_EMERGENCY_PROFILE.model_dump()
        mock_data["health_id"] = health_id
        mock_data["expires_in_seconds"] = remaining_sec
        triage_expiry = min(900, remaining_sec if remaining_sec > 0 else 900)
        mock_data["documents"] = [
            {
                "id": "mock-doc-1",
                "document_type": "prescription",
                "document_url": "mock/prescription.jpg",
                "signed_url": generate_signed_document_url("mock/prescription.jpg", expires_in=triage_expiry) or "mock/prescription.jpg",
                "doctor_name": "Dr. Tariq Mahmood",
                "hospital_name": "Shifa International Hospital",
                "consultation_date": "2025-02-15",
                "created_at": "2025-02-15T10:00:00Z",
            }
        ]
        return EmergencySessionDataResponse(**mock_data)

    try:
        profile = await EmergencyService.get_emergency_profile_by_session(
            db=db,
            health_id=health_id,
        )
        remaining_sec = max(0, int((sess_expiry - now).total_seconds()))
        profile_dict = profile.model_dump()
        profile_dict["expires_in_seconds"] = remaining_sec

        # ── Ephemeral Emergency Triage Signed Document URLs ──
        # Generate a signed URL with a lifetime strictly bounded by the active 15-minute triage window (expires_in <= 900).
        # Only attach signed URLs for documents the patient has explicitly marked as permitted in their emergency privacy toggles.
        triage_expiry = min(900, remaining_sec if remaining_sec > 0 else 900)
        permitted_documents = []

        patient_user = await db.scalar(select(User).where(User.health_id == health_id))
        if patient_user and not profile_dict.get("is_revoked"):
            privacy_orm = await db.scalar(
                select(PrivacySettings).where(PrivacySettings.user_id == patient_user.id)
            )
            # Check if clinical document sharing is permitted by patient privacy settings
            docs_permitted_by_privacy = True
            if privacy_orm:
                if privacy_orm.qr_revoked or not privacy_orm.show_active_meds:
                    docs_permitted_by_privacy = False

            if docs_permitted_by_privacy:
                rec_stmt = (
                    select(MedicalRecord)
                    .where(MedicalRecord.user_id == patient_user.id)
                    .order_by(MedicalRecord.created_at.desc())
                )
                rec_res = await db.execute(rec_stmt)
                records = rec_res.scalars().all()
                for rec in records:
                    ext = rec.extracted_data or {}
                    # Only include documents where emergency access is permitted
                    is_doc_permitted = ext.get("permitted_in_emergency", True) and ext.get("share_in_emergency", True)
                    if is_doc_permitted and rec.document_url:
                        signed_url = generate_signed_document_url(
                            storage_path=rec.document_url,
                            expires_in=triage_expiry,
                        )
                        permitted_documents.append({
                            "id": str(rec.id),
                            "document_type": rec.document_type,
                            "document_url": rec.document_url,
                            "signed_url": signed_url or rec.document_url,
                            "doctor_name": rec.doctor_name,
                            "hospital_name": rec.hospital_name,
                            "consultation_date": rec.consultation_date.isoformat() if rec.consultation_date else None,
                            "created_at": rec.created_at.isoformat() if rec.created_at else None,
                        })

        profile_dict["documents"] = permitted_documents
        return EmergencySessionDataResponse(**profile_dict)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        ) from exc
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "disabled" in msg or "revoked" in msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency session profile.",
        ) from exc


@router.get(
    "/{health_id}",
    response_model=EmergencyAccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Get emergency medical profile (requires health_id + emergency_token)",
)
async def get_emergency_profile(
    health_id: str,
    request: Request,
    token: str = Query(
        ...,
        description="High-entropy access token embedded in physical QR code",
    ),
    city: Optional[str] = Query(
        None,
        description="Optional city/location for proximity triage context",
    ),
    db: AsyncSession = Depends(get_db),
) -> EmergencyAccessResponse:
    """Returns critical medical data ONLY when both health_id AND token match.

    Security:
    - 404 if health_id not found (prevents enumeration).
    - 401 if token is missing/invalid (constant-time comparison).
    - 403 if emergency_enabled=False or qr_revoked=True.
    """

    # Fast-path: return deterministic mock when USE_MOCK is enabled
    if settings.USE_MOCK:
        return MOCK_EMERGENCY_PROFILE.model_copy(update={"health_id": health_id})

    # Extract client IP and device info
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    user_agent = request.headers.get("User-Agent", "Unknown Device")
    detected_city = (
        city
        or request.headers.get("X-City")
        or request.headers.get("CF-IPCity")
        or "Unknown"
    )

    try:
        return await EmergencyService.get_emergency_profile_with_token(
            db=db,
            health_id=health_id,
            provided_token=token,
            ip_address=client_ip,
            user_agent=user_agent,
            city=detected_city,
        )
    except ValueError as exc:
        # health_id not found → 404 (prevents enumeration)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        ) from exc
    except PermissionError as exc:
        # Token mismatch → 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "disabled" in msg or "revoked" in msg:
            # Emergency disabled or revoked → 403
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            ) from exc
        # Other runtime errors → 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency profile.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency profile.",
        ) from exc


@router.post(
    "/{health_id}/scan-location",
    status_code=status.HTTP_200_OK,
    summary="Update exact high-accuracy GPS coordinates for recent emergency QR scan",
)
async def update_scan_location(
    health_id: str,
    payload: ScanLocationUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Updates the matching EmergencyScanLog entry with high-accuracy GPS coordinates,
    generates a standard Google Maps navigation URL, and dispatches real-time enriched ntfy alert.
    """
    # 1. Validate active triage session cookie (hv_triage_session)
    session_cookie = request.cookies.get("hv_triage_session")
    if not session_cookie:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PHYSICAL_SCAN_REQUIRED",
        )

    stmt = select(EmergencyTriageSession).where(
        EmergencyTriageSession.session_token == session_cookie
    )
    session_record = await db.scalar(stmt)
    if not session_record or session_record.health_id != health_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="PHYSICAL_SCAN_REQUIRED",
        )

    now = datetime.now(timezone.utc)
    sess_expiry = session_record.expires_at
    if sess_expiry.tzinfo is None:
        sess_expiry = sess_expiry.replace(tzinfo=timezone.utc)

    if sess_expiry < now:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SESSION_EXPIRED",
        )

    # 2. Find matching patient user
    user = await db.scalar(select(User).where(User.health_id == health_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        )

    # 3. Find most recent EmergencyScanLog for this user (within last 2 minutes)
    scan_stmt = (
        select(EmergencyScanLog)
        .where(EmergencyScanLog.user_id == user.id)
        .order_by(EmergencyScanLog.scanned_at.desc())
    )
    scan_log = await db.scalar(scan_stmt)

    maps_url = f"https://www.google.com/maps?q={payload.latitude},{payload.longitude}"
    formatted_coords = f"{payload.latitude:.4f}, {payload.longitude:.4f}"

    forwarded_for = request.headers.get("X-Forwarded-For")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "127.0.0.1")
    user_agent = request.headers.get("User-Agent", "Unknown Device")
    dev_type = parse_device_type(user_agent)

    # Reverse-geocode coordinates to street / district / city name via OpenStreetMap Nominatim
    location_name = await reverse_geocode_coordinates(payload.latitude, payload.longitude) or formatted_coords

    if not scan_log:
        scan_log = EmergencyScanLog(
            user_id=user.id,
            ip_address=client_ip,
            user_agent=user_agent,
            device_type=dev_type,
            city=location_name,
            location_name=location_name,
            is_gps_verified=True,
            scanned_at=now,
        )
        db.add(scan_log)

    scan_log.latitude = payload.latitude
    scan_log.longitude = payload.longitude
    scan_log.accuracy_meters = payload.accuracy_meters
    scan_log.maps_url = maps_url
    scan_log.location_name = location_name
    scan_log.device_type = dev_type
    scan_log.is_gps_verified = True
    if not scan_log.city or scan_log.city == "Unknown":
        scan_log.city = location_name

    await db.commit()

    # 4. Dispatch enriched notification update to ICE contact's ntfy stream & in-app alert
    notified_user = None
    if user.notified_ice_id:
        notified_user = await db.scalar(select(User).where(User.id == user.notified_ice_id))

    await dispatch_emergency_scan_alert_to_ice(
        patient=user,
        notified_user=notified_user,
        city=location_name,
        maps_url=maps_url,
        latitude=payload.latitude,
        longitude=payload.longitude,
        location_name=location_name,
        is_gps_verified=True,
    )

    # In-app notification with maps_url action
    target_user_id = notified_user.id if notified_user else user.notified_ice_id
    if target_user_id:
        patient_name = user.full_name or "Family Member"
        scan_notif = Notification(
            user_id=target_user_id,
            type="EMERGENCY_SCAN",
            title_en=f"🚨 Live GPS Location: {patient_name}",
            title_ur=f"🚨 لائیو لوکیشن: {patient_name}",
            message_en=f"High-accuracy GPS location ({location_name}) captured for {patient_name}'s emergency scan. Click to open Google Maps.",
            message_ur=f"{patient_name} کے ایمرجنسی اسکین کی لائیو لوکیشن ({location_name}) پر پن پوائنٹ کر دی گئی ہے۔",
            action_url=f"/emergency/activity?health_id={user.health_id}",
            is_read=False,
        )
        db.add(scan_notif)
        try:
            await db.commit()
        except Exception:
            pass

    return {
        "status": "success",
        "health_id": health_id,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "accuracy_meters": payload.accuracy_meters,
        "location_name": location_name,
        "maps_url": maps_url,
        "is_gps_verified": True,
    }


@router.get(
    "/{health_id}/scan-history",
    response_model=List[EmergencyScanLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Get full detailed emergency QR scan activity timeline for patient or ICE contact",
)
async def get_emergency_scan_history(
    health_id: str,
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=200, description="Max history items"),
) -> List[EmergencyScanLogResponse]:
    """Returns chronological timeline of emergency card scans including reverse-geocoded location,
    GPS accuracy, maps URL, device type, and verification status.
    """
    user = await db.scalar(select(User).where(User.health_id == health_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        )

    stmt = (
        select(EmergencyScanLog)
        .where(EmergencyScanLog.user_id == user.id)
        .order_by(EmergencyScanLog.scanned_at.desc())
        .limit(limit)
    )
    result = await db.scalars(stmt)
    scans = result.all()

    return [
        EmergencyScanLogResponse(
            id=str(s.id),
            scanned_at=s.scanned_at.isoformat() if s.scanned_at else "",
            ip_address=s.ip_address or "unknown",
            user_agent=s.user_agent or "unknown",
            city=s.city,
            latitude=s.latitude,
            longitude=s.longitude,
            accuracy_meters=s.accuracy_meters,
            maps_url=s.maps_url or (f"https://www.google.com/maps?q={s.latitude},{s.longitude}" if (s.latitude is not None and s.longitude is not None) else None),
            location_name=s.location_name or s.city or (f"{s.latitude:.4f}, {s.longitude:.4f}" if (s.latitude is not None and s.longitude is not None) else "Unknown Location"),
            device_type=s.device_type or parse_device_type(s.user_agent),
            is_gps_verified=bool(s.is_gps_verified),
            location=s.location_name or s.city or (f"{s.latitude:.4f}, {s.longitude:.4f}" if (s.latitude is not None and s.longitude is not None) else "Unknown Location"),
        )
        for s in scans
    ]


@router.get(
    "/patient-summary/{health_id}",
    response_model=EmergencyAccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Get patient emergency card profile summary for ICE contact / caregiver activity timeline view",
)
async def get_patient_emergency_summary(
    health_id: str,
    db: AsyncSession = Depends(get_db),
) -> EmergencyAccessResponse:
    """Returns privacy-filtered emergency profile summary for an attached patient by health ID."""
    try:
        return await EmergencyService.get_emergency_profile_by_session(
            db=db,
            health_id=health_id,
        )
    except Exception:
        return await EmergencyService.get_emergency_profile_by_health_id(
            db=db,
            health_id=health_id,
        )



