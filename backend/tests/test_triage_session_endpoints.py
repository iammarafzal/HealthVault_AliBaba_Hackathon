# HealthVault AI — Unit & Integration Tests for Ephemeral Triage Session Endpoints

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.models.emergency_session import EmergencyTriageSession
from app.models.user import User
from app.models.privacy import PrivacySettings as PrivacySettingsORM
from sqlalchemy import select


@pytest.mark.asyncio
async def test_gateway_invalid_token_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        resp = await ac.get("/api/v1/emergency/gateway/HV-NONEXISTENT?token=invalid_token")
        assert resp.status_code == 404


@pytest.mark.asyncio
async def test_session_data_missing_cookie_returns_401():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        resp = await ac.get("/api/v1/emergency/HV-TEST-9999/session-data")
        assert resp.status_code == 401
        assert resp.json()["detail"] == "PHYSICAL_SCAN_REQUIRED"
