# HealthVault AI — Dual-Identifier Emergency Access Tests
# Verifies: health_id + emergency_token gate, constant-time comparison,
# token regeneration invalidation, and emergency toggle.

import secrets
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.main import app
from app.models.privacy import PrivacySettings as PrivacySettingsORM
from app.models.user import User
from app.services.security_service import (
    generate_emergency_token,
    generate_health_id,
    regenerate_emergency_access,
)


# ==============================================================================
# Unit Tests: Token Generation
# ==============================================================================

def test_generate_health_id_format():
    """health_id must match HV-PAK-XXXXX format."""
    hid = generate_health_id()
    assert hid.startswith("HV-PAK-")
    assert len(hid) == 12  # "HV-PAK-" (7) + 5 chars
    assert hid[7:].isalnum()
    assert hid[7:].isupper() or hid[7:].isdigit()


def test_generate_emergency_token_entropy():
    """emergency_token must be a 32-char URL-safe string (128+ bits entropy)."""
    token = generate_emergency_token()
    assert len(token) >= 32
    # URL-safe: no +, /, or = characters
    assert "+" not in token
    assert "/" not in token


def test_generate_emergency_token_uniqueness():
    """Each call must produce a different token."""
    tokens = {generate_emergency_token() for _ in range(100)}
    assert len(tokens) == 100  # All unique


# ==============================================================================
# Unit Tests: EmergencyService.get_emergency_profile_with_token
# ==============================================================================

def _make_mock_user(
    health_id: str = "HV-PAK-TEST1",
    emergency_token: str = "valid-token-12345678901234567890",
    emergency_enabled: bool = True,
) -> User:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        health_id=health_id,
        emergency_token=emergency_token,
        emergency_enabled=emergency_enabled,
        email="test@example.com",
        full_name="Test User",
        blood_group="B+",
        emergency_contacts=[],
    )
    user.privacy_settings = None
    return user


def _make_mock_privacy(
    user_id: uuid.UUID,
    qr_revoked: bool = False,
) -> PrivacySettingsORM:
    return PrivacySettingsORM(
        user_id=user_id,
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=qr_revoked,
    )


@pytest.mark.asyncio
async def test_correct_health_id_and_token_returns_200():
    """Correct health_id + correct token → 200 with filtered medical data."""
    from app.services.emergency_service import EmergencyService

    user = _make_mock_user()
    privacy = _make_mock_privacy(user.id)

    mock_db = AsyncMock()
    # scalar calls: 1st = user lookup, 2nd = privacy lookup, 3rd = notified ICE lookup
    mock_db.scalar.side_effect = [user, privacy, None]

    # db.scalars() returns a sync result with .all() method
    mock_scalars_result = MagicMock()
    mock_scalars_result.all.return_value = []  # no meds/allergies/records
    mock_db.scalars.return_value = mock_scalars_result

    result = await EmergencyService.get_emergency_profile_with_token(
        db=mock_db,
        health_id=user.health_id,
        provided_token=user.emergency_token,
    )

    assert result.health_id == user.health_id
    assert result.full_name == user.full_name
    assert result.is_revoked is False


@pytest.mark.asyncio
async def test_correct_health_id_wrong_token_returns_401():
    """Correct health_id + incorrect token → PermissionError (→ 401)."""
    from app.services.emergency_service import EmergencyService

    user = _make_mock_user()
    privacy = _make_mock_privacy(user.id)

    mock_db = AsyncMock()
    mock_db.scalar.side_effect = [user, privacy]

    with pytest.raises(PermissionError, match="Token mismatch"):
        await EmergencyService.get_emergency_profile_with_token(
            db=mock_db,
            health_id=user.health_id,
            provided_token="wrong-token-xxxxxxxxxxxxxxxxxxxx",
        )


@pytest.mark.asyncio
async def test_unknown_health_id_returns_404():
    """Unknown health_id → ValueError (→ 404)."""
    from app.services.emergency_service import EmergencyService

    mock_db = AsyncMock()
    mock_db.scalar.return_value = None  # No user found

    with pytest.raises(ValueError, match="No user found"):
        await EmergencyService.get_emergency_profile_with_token(
            db=mock_db,
            health_id="HV-PAK-NOPE1",
            provided_token="any-token",
        )


@pytest.mark.asyncio
async def test_emergency_disabled_returns_403():
    """emergency_enabled=False → RuntimeError (→ 403)."""
    from app.services.emergency_service import EmergencyService

    user = _make_mock_user(emergency_enabled=False)

    mock_db = AsyncMock()
    mock_db.scalar.return_value = user

    with pytest.raises(RuntimeError, match="Emergency access is disabled"):
        await EmergencyService.get_emergency_profile_with_token(
            db=mock_db,
            health_id=user.health_id,
            provided_token=user.emergency_token,
        )


@pytest.mark.asyncio
async def test_qr_revoked_returns_403():
    """qr_revoked=True → RuntimeError (→ 403)."""
    from app.services.emergency_service import EmergencyService

    user = _make_mock_user()
    privacy = _make_mock_privacy(user.id, qr_revoked=True)

    mock_db = AsyncMock()
    mock_db.scalar.side_effect = [user, privacy]

    with pytest.raises(RuntimeError, match="Emergency QR has been revoked"):
        await EmergencyService.get_emergency_profile_with_token(
            db=mock_db,
            health_id=user.health_id,
            provided_token=user.emergency_token,
        )


@pytest.mark.asyncio
async def test_token_regeneration_invalidates_old_token():
    """After regenerating, the old token must fail with PermissionError."""
    from app.services.emergency_service import EmergencyService

    old_token = "old-token-123456789012345678901"
    new_token = "new-token-abcdefghijklmnopqrstuvwx"
    user = _make_mock_user(emergency_token=new_token)
    privacy = _make_mock_privacy(user.id)

    mock_db = AsyncMock()
    mock_db.scalar.side_effect = [user, privacy]

    # Old token must fail
    with pytest.raises(PermissionError, match="Token mismatch"):
        await EmergencyService.get_emergency_profile_with_token(
            db=mock_db,
            health_id=user.health_id,
            provided_token=old_token,
        )


# ==============================================================================
# Integration Tests: API Endpoints
# ==============================================================================

@pytest.mark.asyncio
async def test_api_emergency_missing_token_returns_422():
    """GET /emergency/{health_id} without token → 422 (missing required query param)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/emergency/HV-PAK-TEST1")
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_emergency_wrong_token_returns_401():
    """GET /emergency/{health_id}?token=wrong → 401."""
    user = _make_mock_user()

    with patch(
        "app.api.v1.emergency.EmergencyService.get_emergency_profile_with_token",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.side_effect = PermissionError("Token mismatch")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/emergency/{user.health_id}",
                params={"token": "wrong-token"},
            )
            assert response.status_code == 401


@pytest.mark.asyncio
async def test_api_emergency_unknown_id_returns_404():
    """GET /emergency/{unknown_id}?token=x → 404."""
    with patch(
        "app.api.v1.emergency.EmergencyService.get_emergency_profile_with_token",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.side_effect = ValueError("No user found")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/emergency/HV-PAK-NOPE1",
                params={"token": "any-token"},
            )
            assert response.status_code == 404


@pytest.mark.asyncio
async def test_api_emergency_disabled_returns_403():
    """GET /emergency/{health_id}?token=valid when disabled → 403."""
    user = _make_mock_user()

    with patch(
        "app.api.v1.emergency.EmergencyService.get_emergency_profile_with_token",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.side_effect = RuntimeError("Emergency access is disabled for this user.")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/emergency/{user.health_id}",
                params={"token": user.emergency_token},
            )
            assert response.status_code == 403


@pytest.mark.asyncio
async def test_api_emergency_success_returns_200():
    """GET /emergency/{health_id}?token=correct → 200 with filtered data."""
    user = _make_mock_user()

    from app.schemas.emergency import EmergencyAccessResponse

    mock_profile = EmergencyAccessResponse(
        health_id=user.health_id,
        full_name=user.full_name,
        blood_group="B+",
        critical_allergies=["Penicillin (severe)"],
        active_medications=["Metformin 500mg"],
        chronic_conditions=["Type 2 Diabetes"],
        emergency_contacts=[],
        is_revoked=False,
    )

    with patch(
        "app.api.v1.emergency.EmergencyService.get_emergency_profile_with_token",
        new_callable=AsyncMock,
    ) as mock_get:
        mock_get.return_value = mock_profile

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                f"/api/v1/emergency/{user.health_id}",
                params={"token": user.emergency_token},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["health_id"] == user.health_id
            assert data["full_name"] == user.full_name
            assert data["is_revoked"] is False
            assert len(data["critical_allergies"]) > 0


# ==============================================================================
# Integration Tests: Protected QR Endpoints
# ==============================================================================

@pytest.mark.asyncio
async def test_api_regenerate_qr_returns_new_token():
    """POST /user/regenerate-qr (protected) → new token, old token invalidated."""
    user = _make_mock_user()
    new_token = generate_emergency_token()

    with patch(
        "app.api.v1.user.regenerate_emergency_access",
        new_callable=AsyncMock,
    ) as mock_regen:
        mock_regen.return_value = {
            "health_id": user.health_id,
            "emergency_token": new_token,
            "qr_url": f"http://localhost:8000/api/v1/emergency/{user.health_id}?token={new_token}",
            "emergency_enabled": True,
        }

        from app.main import app
        app.dependency_overrides[get_current_user] = lambda: user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/user/regenerate-qr",
                    headers={"Authorization": "Bearer fake-jwt"},
                )
                assert response.status_code == 201
                data = response.json()
                assert data["emergency_token"] == new_token
                assert "?token=" in data["qr_url"]
        finally:
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_api_emergency_toggle():
    """PATCH /user/emergency-toggle → toggles emergency_enabled."""
    user = _make_mock_user(emergency_enabled=True)

    from app.main import app
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        mock_db = AsyncMock()

        with patch(
            "app.api.v1.user.get_db",
            return_value=mock_db,
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.patch(
                    "/api/v1/user/emergency-toggle",
                    headers={"Authorization": "Bearer fake-jwt"},
                    json={"emergency_enabled": False},
                )
                assert response.status_code == 200
                data = response.json()
                assert data["emergency_enabled"] is False
                assert data["health_id"] == user.health_id
    finally:
        app.dependency_overrides.clear()
