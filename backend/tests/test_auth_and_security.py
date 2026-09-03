# HealthVault AI — Unit & Integration Tests for Auth & Security
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)
from app.main import app
from app.models.user import User
from app.models.privacy import PrivacySettings as PrivacySettingsORM


def test_password_hashing():
    raw_pass = "MySuperSecret123!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


def test_jwt_access_token():
    user_id = str(uuid.uuid4())
    token = create_access_token(subject=user_id)
    assert isinstance(token, str)

    decoded_subject = verify_access_token(token)
    assert decoded_subject == user_id

    # Invalid token
    assert verify_access_token("invalid.token.payload") is None


@pytest.mark.asyncio
async def test_auth_register_and_login_flow():
    user_id = uuid.uuid4()
    test_email = "ammar@example.com"
    raw_password = "Password123!"

    mock_user = User(
        id=user_id,
        email=test_email,
        full_name="Ammar Afzal",
        hashed_password=hash_password(raw_password),
        health_id="HV-PAK-99999",
        emergency_token="test-token-123",
        emergency_enabled=True,
        role="patient",
        emergency_contacts=[],
        created_at=datetime.now(timezone.utc),
    )
    mock_privacy = PrivacySettingsORM(
        user_id=user_id,
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )
    mock_user.privacy_settings = mock_privacy

    mock_session = AsyncMock()
    # 1. register duplicate check -> None, 2. unique health_id check -> None,
    # 3. re-fetch after register -> mock_user, 4. login lookup -> mock_user,
    # 5. /auth/me lookup -> mock_user, 6. /user/profile via get_current_user -> mock_user
    mock_session.scalar.side_effect = [None, None, mock_user, mock_user, mock_user, mock_user]
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()

    # Mock execute for selectinload queries
    mock_result = MagicMock()
    mock_result.scalar_one.return_value = mock_user
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Register new user (3-field fast onboarding)
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "full_name": "Ammar Afzal",
                    "email": test_email,
                    "password": raw_password,
                },
            )
            assert response.status_code == 201
            data = response.json()
            assert "access_token" in data
            assert data["user"]["email"] == test_email

            # 2. Login with correct credentials
            login_resp = await client.post(
                "/api/v1/auth/login",
                json={"email": test_email, "password": raw_password},
            )
            assert login_resp.status_code == 200
            token = login_resp.json()["access_token"]

            # 3. Access /auth/me with Bearer token
            me_resp = await client.get(
                "/api/v1/auth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert me_resp.status_code == 200
            assert me_resp.json()["id"] == str(user_id)

            # 4. Access /user/profile (protected, uses JWT)
            profile_resp = await client.get(
                "/api/v1/user/profile",
                headers={"Authorization": f"Bearer {token}"},
            )
            assert profile_resp.status_code == 200
            assert profile_resp.json()["profile"]["full_name"] == "Ammar Afzal"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_login_invalid_password():
    user_id = uuid.uuid4()
    mock_user = User(
        id=user_id,
        email="user@example.com",
        hashed_password=hash_password("RealPassword"),
        health_id="HV-PAK-12345",
    )

    mock_session = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_user
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": "user@example.com", "password": "WrongPassword"},
            )
            assert response.status_code == 401
            assert "Invalid email or password" in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)
