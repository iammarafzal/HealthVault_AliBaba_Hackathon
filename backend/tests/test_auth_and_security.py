# HealthVault AI — Unit & Integration Tests for Auth & Security
import uuid
from unittest.mock import AsyncMock
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

    from datetime import datetime, timezone

    mock_user = User(
        id=user_id,
        email=test_email,
        full_name="Ammar Afzal",
        phone="+92-300-1112233",
        hashed_password=hash_password(raw_password),
        health_id="HV-PAK-99999",
        role="patient",
        created_at=datetime.now(timezone.utc),
        emergency_contacts=[],
    )

    mock_session = AsyncMock()
    # 1. register duplicate check -> None, 2. unique health_id check -> None
    mock_session.scalar.side_effect = [None, None, mock_user, mock_user, mock_user]
    mock_session.flush = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Register new user
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "full_name": "Ammar Afzal",
                    "email": test_email,
                    "phone": "+92-300-1112233",
                    "password": raw_password,
                    "blood_group": "A+",
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

            # 4. Access /user/profile with user_id query
            profile_resp = await client.get(f"/api/v1/user/profile?user_id={user_id}")
            assert profile_resp.status_code == 200
            assert profile_resp.json()["full_name"] == "Ammar Afzal"
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_auth_login_invalid_password():
    user_id = uuid.uuid4()
    mock_user = User(
        id=user_id,
        email="user@example.com",
        full_name="User",
        phone="+92-300-1112233",
        hashed_password=hash_password("RealPassword"),
        health_id="HV-PAK-12345",
    )

    mock_session = AsyncMock()
    mock_session.scalar.return_value = mock_user

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
