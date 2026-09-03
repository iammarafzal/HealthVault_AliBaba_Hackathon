# HealthVault AI — Security Service
# Cryptographic token generation and emergency access management.

import logging
import secrets
import string
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger("healthvault")


def generate_health_id() -> str:
    """Return a human-readable ``HV-PAK-XXXXX`` identifier.

    Uses 5 uppercase-alphanumeric characters (34^5 = ~45M combinations).
    Collision resistance is enforced at the DB layer (unique index).
    """
    charset = string.ascii_uppercase + string.digits
    suffix = "".join(secrets.choice(charset) for _ in range(5))
    return f"HV-PAK-{suffix}"


def generate_emergency_token() -> str:
    """Return a 128-bit (24-byte) cryptographically secure URL-safe token.

    Produced via ``secrets.token_urlsafe(24)`` → 32-character string with
    ~192 bits of entropy, immune to brute-force and enumeration attacks.
    """
    return secrets.token_urlsafe(24)


async def regenerate_emergency_access(
    db: AsyncSession,
    user_id: UUID,
) -> dict:
    """Generate a new emergency_token for *user_id*, invalidating all prior QR codes.

    Returns:
        dict with keys: ``health_id``, ``emergency_token``, ``qr_url``, ``emergency_enabled``.

    Raises:
        ValueError: If user does not exist.
    """
    user: User | None = await db.scalar(
        select(User).where(User.id == user_id)
    )
    if not user:
        raise ValueError(f"No user found with id '{user_id}'")

    new_token = generate_emergency_token()
    user.emergency_token = new_token
    user.emergency_enabled = True

    await db.flush()
    logger.info("Regenerated emergency_token for user %s", user_id)

    from app.core.config import settings

    qr_url = (
        f"{settings.SERVER_BASE_URL}/api/v1/emergency/{user.health_id}"
        f"?token={new_token}"
    )

    return {
        "health_id": user.health_id,
        "emergency_token": new_token,
        "qr_url": qr_url,
        "emergency_enabled": user.emergency_enabled,
    }
