# HealthVault AI — User Privacy & QR Management Routes
# GET   /api/v1/user/qr-code           — Get current QR details (protected)
# POST  /api/v1/user/regenerate-qr     — Regenerate emergency_token (protected)
# PATCH /api/v1/user/emergency-toggle  — Toggle emergency_enabled (protected)
# PATCH /api/v1/user/privacy-settings  — Update visibility toggles
# GET   /api/v1/user/profile           — Get authenticated user's full profile
# PATCH /api/v1/user/profile           — Progressive profile completion

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_scan import EmergencyScanLog
from app.models.user import User
from app.schemas.emergency import EmergencyScanLogResponse
from app.schemas.user import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyContactUpdate,
    EmergencyToggleRequest,
    EmergencyToggleResponse,
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    QRDetailsResponse,
    UpdateEmailRequest,
    UserProfileUpdate,
    UserResponse,
)
from app.services.privacy_service import PrivacyFilterService
from app.services.security_service import regenerate_emergency_access
from app.core.security import hash_password, verify_password

router = APIRouter(prefix="/user", tags=["User"])


# ---------------------------------------------------------------------------
# GET /api/v1/user/qr-code (Protected)
# ---------------------------------------------------------------------------
@router.get(
    "/qr-code",
    response_model=QRDetailsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get current QR code details including emergency_token",
)
async def get_qr_code(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QRDetailsResponse:
    """Return the current health_id, emergency_token, and full QR URL.

    If the user doesn't have an emergency_token yet, one will be generated.
    """
    if not current_user.emergency_token:
        result = await regenerate_emergency_access(
            db=db,
            user_id=current_user.id,
        )
    else:
        qr_url = (
            f"{settings.SERVER_BASE_URL}/api/v1/emergency/{current_user.health_id}"
            f"?token={current_user.emergency_token}"
        )
        result = {
            "health_id": current_user.health_id,
            "emergency_token": current_user.emergency_token,
            "qr_url": qr_url,
            "emergency_enabled": current_user.emergency_enabled,
        }

    return QRDetailsResponse(**result)


# ---------------------------------------------------------------------------
# POST /api/v1/user/regenerate-qr (Protected)
# ---------------------------------------------------------------------------
@router.post(
    "/regenerate-qr",
    response_model=QRDetailsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Regenerate emergency_token, invalidating all prior QR codes",
)
async def regenerate_qr_token(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> QRDetailsResponse:
    """Generate a brand-new emergency_token for the authenticated user.

    Any previously printed / shared QR code will immediately become invalid
    (old token → 401 Unauthorized). The new QR is active by default.
    """
    try:
        result = await regenerate_emergency_access(
            db=db,
            user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate QR code.",
        ) from exc

    return QRDetailsResponse(**result)


# ---------------------------------------------------------------------------
# PATCH / POST /api/v1/user/emergency-toggle (Protected)
# ---------------------------------------------------------------------------
@router.patch(
    "/emergency-toggle",
    response_model=EmergencyToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle emergency mode (emergency_enabled flag) for the user",
)
@router.post(
    "/emergency-toggle",
    response_model=EmergencyToggleResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle emergency mode (POST alias)",
)
async def toggle_emergency_access(
    body: EmergencyToggleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmergencyToggleResponse:
    """Instantly activate or deactivate the public emergency view.

    When disabled (kill switch), scanning the QR returns 403 Forbidden.
    """
    current_user.emergency_enabled = body.emergency_enabled
    await db.flush()

    state = "enabled" if body.emergency_enabled else "disabled"
    return EmergencyToggleResponse(
        health_id=current_user.health_id,
        emergency_enabled=current_user.emergency_enabled,
        message=f"Emergency mode successfully {state}.",
    )


# ---------------------------------------------------------------------------
# GET /api/v1/user/profile (Protected)
# ---------------------------------------------------------------------------
@router.get(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user's full profile",
)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the full profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/profile (Protected) — Progressive Onboarding
# ---------------------------------------------------------------------------
@router.patch(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Partial update of vitals and emergency contacts",
)
async def update_user_profile(
    body: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Progressive onboarding: update any combination of vitals and/or
    replace the emergency contacts list — all without a full-page reload."""

    update_data = body.model_dump(exclude_unset=True)
    contacts_data = update_data.pop("emergency_contacts", None)

    # ── Update vitals on user model ────────────────────────────
    if update_data:
        for field, value in update_data.items():
            if hasattr(current_user, field):
                setattr(current_user, field, value)

    # ── Replace emergency contacts (if provided) ──────────────────
    if contacts_data is not None:
        current_user.emergency_contacts = contacts_data

    await db.flush()

    # Re-fetch with eager-loaded relations for a clean response
    stmt = (
        select(User)
        .where(User.id == current_user.id)
        .options(
            selectinload(User.privacy_settings),
        )
    )
    result = await db.execute(stmt)
    updated_user = result.scalar_one()

    return UserResponse.model_validate(updated_user)


# ---------------------------------------------------------------------------
# GET /api/v1/user/emergency-scans (Protected)
# ---------------------------------------------------------------------------
@router.get(
    "/emergency-scans",
    response_model=List[EmergencyScanLogResponse],
    status_code=status.HTTP_200_OK,
    summary="Get recent emergency QR scan history for the authenticated user",
)
async def get_emergency_scans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(20, ge=1, le=100, description="Max records to return"),
) -> List[EmergencyScanLogResponse]:
    """Return chronological log of all times this user's emergency QR was accessed."""
    stmt = (
        select(EmergencyScanLog)
        .where(EmergencyScanLog.user_id == current_user.id)
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
            maps_url=s.maps_url,
            location_name=s.location_name or s.city,
            device_type=s.device_type,
            is_gps_verified=bool(s.is_gps_verified),
            location=s.location_name or s.city or (f"{s.latitude:.4f}, {s.longitude:.4f}" if (s.latitude is not None and s.longitude is not None) else None),
        )
        for s in scans
    ]


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/privacy-settings (Protected)
# ---------------------------------------------------------------------------
@router.patch(
    "/privacy-settings",
    response_model=PrivacySettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Update privacy visibility toggles for the authenticated user",
)
async def update_privacy_settings(
    body: PrivacySettingsUpdate,
    user_id: str = Query(..., description="UUID of the authenticated user"),
    db: AsyncSession = Depends(get_db),
) -> PrivacySettingsResponse:
    """Partially update any combination of privacy boolean flags."""
    try:
        target_user_id = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id format. Must be a valid UUID.",
        )

    if not body.model_dump(exclude_unset=True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one privacy field must be provided for update.",
        )

    try:
        privacy_orm = await PrivacyFilterService.update_user_privacy_settings(
            db=db, user_id=target_user_id, update_data=body
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update privacy settings.",
        ) from exc

    return PrivacySettingsResponse(
        user_id=privacy_orm.user_id,
        show_blood_group=privacy_orm.show_blood_group,
        show_allergies=privacy_orm.show_allergies,
        show_active_meds=privacy_orm.show_active_meds,
        show_chronic_conditions=privacy_orm.show_chronic_conditions,
        show_emergency_contacts=privacy_orm.show_emergency_contacts,
        show_emergency_notes=privacy_orm.show_emergency_notes,
        emergency_notes=privacy_orm.emergency_notes,
        enable_scan_alerts=privacy_orm.enable_scan_alerts,
        enable_ice_scan_alerts=privacy_orm.enable_ice_scan_alerts,
        qr_revoked=privacy_orm.qr_revoked,
        updated_at=privacy_orm.updated_at,
    )


# ---------------------------------------------------------------------------
# ICE Emergency Contacts CRUD (Protected)
# ---------------------------------------------------------------------------
async def _resolve_contact_binding(
    db: AsyncSession,
    contact_health_id: Optional[str],
    phone: Optional[str],
) -> tuple[Optional[str], Optional[UUID]]:
    """Look up HealthVault user account by Health ID, email, or phone number."""
    matched_user = None
    clean_ident = (contact_health_id or "").strip()
    if clean_ident:
        matched_user = await db.scalar(
            select(User).where(
                or_(
                    func.lower(User.health_id) == clean_ident.lower(),
                    func.lower(User.email) == clean_ident.lower(),
                )
            )
        )
    if not matched_user and phone:
        cleaned = phone.strip().replace(" ", "").replace("-", "")
        if len(cleaned) >= 7:
            matched_user = await db.scalar(
                select(User).where(
                    or_(
                        User.phone.contains(cleaned[-10:] if len(cleaned) >= 10 else cleaned),
                        User.phone == phone,
                    )
                )
            )
    if matched_user:
        return matched_user.health_id, matched_user.id
    return (clean_ident or None), None


async def _sync_user_emergency_contacts_json(db: AsyncSession, user_id: UUID) -> None:
    """Synchronize user.emergency_contacts JSON column with emergency_contacts table."""
    stmt = (
        select(EmergencyContact)
        .where(EmergencyContact.user_id == user_id)
        .order_by(EmergencyContact.is_primary.desc(), EmergencyContact.priority_order.asc())
    )
    res = await db.scalars(stmt)
    contacts = res.all()
    user = await db.scalar(select(User).where(User.id == user_id))
    if user:
        user.emergency_contacts = [
            {
                "id": str(c.id),
                "name": c.name,
                "relation": c.relation,
                "phone": c.phone,
                "is_primary": c.is_primary,
                "priority_order": c.priority_order,
                "contact_health_id": c.contact_health_id,
                "contact_user_id": str(c.contact_user_id) if c.contact_user_id else None,
                "linked_user_id": str(c.contact_user_id) if c.contact_user_id else None,
                "is_linked": bool(c.contact_user_id),
            }
            for c in contacts
        ]
        await db.flush()


@router.get(
    "/emergency-contacts",
    response_model=List[EmergencyContactResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve all emergency contacts for authenticated user",
)
async def get_emergency_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[EmergencyContactResponse]:
    """Retrieve all ICE contacts sorted by is_primary DESC, priority_order ASC."""
    stmt = (
        select(EmergencyContact)
        .where(EmergencyContact.user_id == current_user.id)
        .order_by(EmergencyContact.is_primary.desc(), EmergencyContact.priority_order.asc())
    )
    result = await db.scalars(stmt)
    contacts = result.all()

    # Fallback: if table is empty but user.emergency_contacts JSON has items, populate table
    if not contacts and current_user.emergency_contacts:
        for idx, c in enumerate(current_user.emergency_contacts):
            h_id, u_id = await _resolve_contact_binding(
                db, c.get("contact_health_id"), c.get("phone", "")
            )
            new_c = EmergencyContact(
                user_id=current_user.id,
                name=c.get("name", "Contact"),
                relation=c.get("relation", "Family"),
                phone=c.get("phone", ""),
                is_primary=bool(c.get("is_primary", idx == 0)),
                priority_order=c.get("priority_order", idx + 1),
                contact_health_id=h_id,
                contact_user_id=u_id,
            )
            db.add(new_c)
        await db.flush()
        result = await db.scalars(stmt)
        contacts = result.all()

    response_list: List[EmergencyContactResponse] = []
    for c in contacts:
        # Re-resolve link if not already set
        if not c.contact_user_id:
            h_id, u_id = await _resolve_contact_binding(db, c.contact_health_id, c.phone)
            if u_id:
                c.contact_user_id = u_id
                c.contact_health_id = h_id
                await db.flush()

        response_list.append(
            EmergencyContactResponse(
                id=c.id,
                user_id=c.user_id,
                contact_health_id=c.contact_health_id,
                contact_user_id=c.contact_user_id,
                linked_user_id=c.contact_user_id,
                is_linked=bool(c.contact_user_id),
                name=c.name,
                relation=c.relation,
                phone=c.phone,
                is_primary=c.is_primary,
                priority_order=c.priority_order,
            )
        )
    return response_list


@router.post(
    "/emergency-contacts",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new emergency contact",
)
async def create_emergency_contact(
    body: EmergencyContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmergencyContactResponse:
    """Create a new ICE emergency contact. Auto-adjusts primary flag if set."""
    if body.is_primary:
        # Demote existing primary contacts
        existing_stmt = select(EmergencyContact).where(
            EmergencyContact.user_id == current_user.id,
            EmergencyContact.is_primary == True,
        )
        existing_res = await db.scalars(existing_stmt)
        for ec in existing_res.all():
            ec.is_primary = False

    # Count existing contacts to assign priority order if not explicitly set
    count_stmt = select(EmergencyContact).where(EmergencyContact.user_id == current_user.id)
    count_res = await db.scalars(count_stmt)
    current_count = len(count_res.all())

    # If first contact, make it primary automatically
    is_primary = body.is_primary or (current_count == 0)

    # Resolve account binding via Health ID, Email, or phone
    h_id, u_id = await _resolve_contact_binding(db, body.contact_health_id, body.phone)

    contact = EmergencyContact(
        user_id=current_user.id,
        name=body.name.strip(),
        relation=body.relation.strip(),
        phone=body.phone.strip(),
        is_primary=is_primary,
        priority_order=body.priority_order if body.priority_order > 1 else current_count + 1,
        contact_health_id=h_id,
        contact_user_id=u_id,
    )
    db.add(contact)
    await db.flush()
    await db.refresh(contact)

    await _sync_user_emergency_contacts_json(db, current_user.id)

    return EmergencyContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        contact_health_id=contact.contact_health_id,
        contact_user_id=contact.contact_user_id,
        linked_user_id=contact.contact_user_id,
        is_linked=bool(contact.contact_user_id),
        name=contact.name,
        relation=contact.relation,
        phone=contact.phone,
        is_primary=contact.is_primary,
        priority_order=contact.priority_order,
    )


@router.put(
    "/emergency-contacts/{contact_id}",
    response_model=EmergencyContactResponse,
    status_code=status.HTTP_200_OK,
    summary="Update an existing emergency contact",
)
async def update_emergency_contact(
    contact_id: UUID,
    body: EmergencyContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EmergencyContactResponse:
    """Update an existing contact and handle primary exclusivity."""
    stmt = select(EmergencyContact).where(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id,
    )
    contact = await db.scalar(stmt)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    update_dict = body.model_dump(exclude_unset=True)

    if update_dict.get("is_primary") is True:
        # Demote any other primary contacts for this user
        existing_stmt = select(EmergencyContact).where(
            EmergencyContact.user_id == current_user.id,
            EmergencyContact.id != contact_id,
            EmergencyContact.is_primary == True,
        )
        existing_res = await db.scalars(existing_stmt)
        for ec in existing_res.all():
            ec.is_primary = False

    # Check if contact_health_id or phone changed
    new_h_id = update_dict.get("contact_health_id", contact.contact_health_id)
    new_phone = update_dict.get("phone", contact.phone)
    if "contact_health_id" in update_dict or "phone" in update_dict:
        h_id, u_id = await _resolve_contact_binding(db, new_h_id, new_phone)
        contact.contact_health_id = h_id
        contact.contact_user_id = u_id
        update_dict.pop("contact_health_id", None)

    for field, value in update_dict.items():
        if value is not None:
            if isinstance(value, str):
                value = value.strip()
            setattr(contact, field, value)

    await db.flush()
    await db.refresh(contact)

    await _sync_user_emergency_contacts_json(db, current_user.id)

    return EmergencyContactResponse(
        id=contact.id,
        user_id=contact.user_id,
        contact_health_id=contact.contact_health_id,
        contact_user_id=contact.contact_user_id,
        linked_user_id=contact.contact_user_id,
        is_linked=bool(contact.contact_user_id),
        name=contact.name,
        relation=contact.relation,
        phone=contact.phone,
        is_primary=contact.is_primary,
        priority_order=contact.priority_order,
    )


@router.delete(
    "/emergency-contacts/{contact_id}",
    status_code=status.HTTP_200_OK,
    summary="Remove an emergency contact",
)
async def delete_emergency_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete an ICE contact and promote the next one to primary if needed."""
    stmt = select(EmergencyContact).where(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id,
    )
    contact = await db.scalar(stmt)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency contact not found.",
        )

    was_primary = contact.is_primary
    await db.delete(contact)
    await db.flush()

    # If deleted contact was primary, promote the top remaining contact
    if was_primary:
        remaining_stmt = (
            select(EmergencyContact)
            .where(EmergencyContact.user_id == current_user.id)
            .order_by(EmergencyContact.priority_order.asc())
        )
        next_contact = await db.scalar(remaining_stmt)
        if next_contact:
            next_contact.is_primary = True
            await db.flush()

    await _sync_user_emergency_contacts_json(db, current_user.id)

    return {"status": "success", "message": "Emergency contact deleted successfully."}


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/email (Protected)
# ---------------------------------------------------------------------------
@router.patch(
    "/email",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Change the authenticated user's email address",
)
async def update_email(
    body: UpdateEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Verify current password, check uniqueness, then update email."""
    # ── Verify current password ──
    if not current_user.hashed_password or not verify_password(
        body.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current password is incorrect.",
        )

    # ── Check if new email is already taken ──
    existing = await db.execute(
        select(User).where(User.email == body.new_email, User.id != current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already in use by another account.",
        )

    current_user.email = body.new_email
    await db.flush()

    # Re-fetch with eager-loaded relations
    stmt = (
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.privacy_settings))
    )
    result = await db.execute(stmt)
    return UserResponse.model_validate(result.scalar_one())


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/password (Protected)
# ---------------------------------------------------------------------------
@router.patch(
    "/password",
    status_code=status.HTTP_200_OK,
    summary="Change the authenticated user's password",
)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Verify current password, then hash and store the new one."""
    if not current_user.hashed_password or not verify_password(
        body.current_password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current password is incorrect.",
        )

    current_user.hashed_password = hash_password(body.new_password)
    await db.flush()

    return {"status": "success", "message": "Password updated successfully."}


# ---------------------------------------------------------------------------
# DELETE /api/v1/user/account (Protected)
# ---------------------------------------------------------------------------
@router.delete(
    "/account",
    status_code=status.HTTP_200_OK,
    summary="Permanently delete the authenticated user's account and all data",
)
async def delete_account(
    body: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Permanent account deletion with cascading cleanup.

    Requires password verification and the literal confirmation phrase 'DELETE'.
    All related records (medical_records, medications, allergies, biomarkers,
    privacy_settings) are cascade-deleted via ORM relationships.
    """
    # ── Validate confirmation phrase ──
    if body.confirmation_phrase != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirmation phrase must be exactly 'DELETE'.",
        )

    # ── Verify password ──
    if not current_user.hashed_password or not verify_password(
        body.password, current_user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Password is incorrect.",
        )

    # ── Cascade delete ──
    # ORM relationships have cascade="all, delete-orphan" so deleting the
    # user row automatically removes privacy_settings, medical_records,
    # medications, allergies, and biomarkers.
    await db.delete(current_user)
    await db.flush()

    return {
        "status": "success",
        "message": "Account and all associated medical data permanently deleted.",
    }


# ---------------------------------------------------------------------------
# PUT /api/v1/user/notified-ice (Protected)
# ---------------------------------------------------------------------------
class UpdateNotifiedIceRequest(BaseModel):
    notified_ice_id: Optional[UUID] = None


@router.put(
    "/notified-ice",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Designate primary ICE contact for real-time scan alerts",
)
async def update_notified_ice(
    body: UpdateNotifiedIceRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Designate which ICE contact (User UUID) should receive real-time scan notifications."""
    current_user.notified_ice_id = body.notified_ice_id
    await db.flush()
    stmt = (
        select(User)
        .where(User.id == current_user.id)
        .options(selectinload(User.privacy_settings))
    )
    user = await db.scalar(stmt)
    return user

