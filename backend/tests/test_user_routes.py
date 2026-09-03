# HealthVault AI — Unit & Integration Tests for User Privacy & QR Management Endpoints

from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.config import settings
from app.main import app
from app.models.privacy import PrivacySettings as PrivacySettingsORM
from app.models.user import User
from app.schemas.user import PrivacySettingsUpdate
from app.services.privacy_service import PrivacyFilterService


def _create_mock_user(user_id: uuid.UUID, health_id: str = "HV-PAK-12345") -> User:
    user = User(
        id=user_id,
        email="testuser@example.com",
        health_id=health_id,
        full_name="Fatima Noor",
        gender="female",
        blood_group="B+",
        emergency_contacts=[],
        emergency_enabled=True,
    )
    user.privacy_settings = None
    return user


# ==============================================================================
# Unit Tests for PrivacyFilterService.regenerate_health_id
# ==============================================================================

@pytest.mark.asyncio
async def test_regenerate_health_id_success():
    user_id = uuid.uuid4()
    user = _create_mock_user(user_id, "HV-OLD-11111")
    privacy = PrivacySettingsORM(user_id=user_id, qr_revoked=True)

    mock_db = AsyncMock()
    # 1. user lookup -> user, 2. collision check -> None (unique), 3. privacy lookup -> privacy
    mock_db.scalar.side_effect = [user, None, privacy]

    updated_user = await PrivacyFilterService.regenerate_health_id(db=mock_db, user_id=user_id)

    assert updated_user.health_id != "HV-OLD-11111"
    assert updated_user.health_id.startswith("HV-PAK-")
    assert len(updated_user.health_id) == 12  # "HV-PAK-" (7) + 5 chars
    # qr_revoked should be reset to False
    assert privacy.qr_revoked is False
    mock_db.flush.assert_awaited()


@pytest.mark.asyncio
async def test_regenerate_health_id_user_not_found():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_db.scalar.return_value = None

    with pytest.raises(ValueError, match="No user found with id"):
        await PrivacyFilterService.regenerate_health_id(db=mock_db, user_id=user_id)


# ==============================================================================
# Integration Tests: PATCH /api/v1/user/privacy-settings
# ==============================================================================

@pytest.mark.asyncio
async def test_patch_privacy_settings_success():
    user_id = uuid.uuid4()
    updated_orm = PrivacySettingsORM(
        user_id=user_id,
        show_blood_group=False,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=False,
        show_emergency_contacts=True,
        qr_revoked=True,
    )

    with patch(
        "app.api.v1.user.PrivacyFilterService.update_user_privacy_settings",
        new_callable=AsyncMock,
    ) as mock_update:
        mock_update.return_value = updated_orm

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch(
                f"/api/v1/user/privacy-settings?user_id={user_id}",
                json={"show_blood_group": False, "qr_revoked": True},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == str(user_id)
            assert data["show_blood_group"] is False
            assert data["qr_revoked"] is True
            assert data["show_allergies"] is True


@pytest.mark.asyncio
async def test_patch_privacy_settings_invalid_uuid():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            "/api/v1/user/privacy-settings?user_id=invalid-uuid",
            json={"show_blood_group": False},
        )
        assert response.status_code == 400
        assert "Invalid user_id format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_patch_privacy_settings_empty_body():
    user_id = str(uuid.uuid4())
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/v1/user/privacy-settings?user_id={user_id}",
            json={},
        )
        assert response.status_code == 400
        assert "At least one privacy field must be provided" in response.json()["detail"]


@pytest.mark.asyncio
async def test_patch_privacy_settings_user_not_found():
    user_id = uuid.uuid4()

    with patch(
        "app.api.v1.user.PrivacyFilterService.update_user_privacy_settings",
        new_callable=AsyncMock,
    ) as mock_update:
        mock_update.side_effect = ValueError(f"No privacy settings found for user_id '{user_id}'")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch(
                f"/api/v1/user/privacy-settings?user_id={user_id}",
                json={"show_blood_group": False},
            )
            assert response.status_code == 404
            assert "No privacy settings found" in response.json()["detail"]


@pytest.mark.asyncio
async def test_patch_privacy_settings_internal_error():
    user_id = uuid.uuid4()

    with patch(
        "app.api.v1.user.PrivacyFilterService.update_user_privacy_settings",
        new_callable=AsyncMock,
    ) as mock_update:
        mock_update.side_effect = RuntimeError("DB write error")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.patch(
                f"/api/v1/user/privacy-settings?user_id={user_id}",
                json={"show_blood_group": False},
            )
            assert response.status_code == 500
            assert "Failed to update privacy settings" in response.json()["detail"]


# ==============================================================================
# Integration Tests: POST /api/v1/user/regenerate-qr (Protected)
# ==============================================================================

@pytest.mark.asyncio
async def test_regenerate_qr_success():
    user_id = uuid.uuid4()
    mock_user = _create_mock_user(user_id, "HV-PAK-98765")
    mock_user.emergency_token = "newly-generated-token-12345678"
    mock_user.emergency_enabled = True

    new_token = "newly-generated-token-12345678"

    with patch(
        "app.api.v1.user.regenerate_emergency_access",
        new_callable=AsyncMock,
    ) as mock_regen:
        mock_regen.return_value = {
            "health_id": "HV-PAK-98765",
            "emergency_token": new_token,
            "qr_url": f"http://localhost:8000/api/v1/emergency/HV-PAK-98765?token={new_token}",
            "emergency_enabled": True,
        }

        app.dependency_overrides[get_current_user] = lambda: mock_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/user/regenerate-qr",
                    headers={"Authorization": "Bearer fake-jwt"},
                )
                assert response.status_code == 201
                data = response.json()
                assert data["health_id"] == "HV-PAK-98765"
                assert data["emergency_token"] == new_token
                assert "?token=" in data["qr_url"]
                assert "/api/v1/emergency/HV-PAK-98765" in data["qr_url"]
        finally:
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_regenerate_qr_user_not_found():
    user_id = uuid.uuid4()
    mock_user = _create_mock_user(user_id)

    with patch(
        "app.api.v1.user.regenerate_emergency_access",
        new_callable=AsyncMock,
    ) as mock_regen:
        mock_regen.side_effect = ValueError(f"No user found with id '{user_id}'")

        app.dependency_overrides[get_current_user] = lambda: mock_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/user/regenerate-qr",
                    headers={"Authorization": "Bearer fake-jwt"},
                )
                assert response.status_code == 404
        finally:
            app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_regenerate_qr_internal_error():
    user_id = uuid.uuid4()
    mock_user = _create_mock_user(user_id)

    with patch(
        "app.api.v1.user.regenerate_emergency_access",
        new_callable=AsyncMock,
    ) as mock_regen:
        mock_regen.side_effect = RuntimeError("DB write error")

        app.dependency_overrides[get_current_user] = lambda: mock_user
        try:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/api/v1/user/regenerate-qr",
                    headers={"Authorization": "Bearer fake-jwt"},
                )
                assert response.status_code == 500
                assert "Failed to regenerate QR code" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()
