# HealthVault AI — Web Push Notification API Endpoints
# Manages VAPID public key distribution, push subscriptions, and test pushes

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.notification import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    TestPushRequest,
    TestPushResponse,
    VapidPublicKeyResponse,
)
from app.services.notification_service import notification_service

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "/vapid-public-key",
    response_model=VapidPublicKeyResponse,
    status_code=status.HTTP_200_OK,
    summary="Get application server VAPID public key",
)
async def get_vapid_public_key() -> VapidPublicKeyResponse:
    """Return the base64-encoded VAPID public key needed by the browser PushManager."""
    return VapidPublicKeyResponse(public_key=settings.VAPID_PUBLIC_KEY)


@router.post(
    "/subscribe",
    response_model=PushSubscriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register or update browser push subscription",
)
async def subscribe_push(
    payload: PushSubscriptionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PushSubscriptionResponse:
    """Save or update the browser Web Push subscription for the authenticated user."""
    p256dh = payload.keys.get("p256dh")
    auth = payload.keys.get("auth")

    if not p256dh or not auth:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Push subscription keys must contain both 'p256dh' and 'auth'.",
        )

    subscription = await notification_service.save_or_update_subscription(
        db=db,
        user_id=current_user.id,
        endpoint=payload.endpoint,
        p256dh=p256dh,
        auth=auth,
        user_agent=payload.user_agent,
    )

    return PushSubscriptionResponse(
        id=subscription.id,
        user_id=subscription.user_id,
        endpoint=subscription.endpoint,
        user_agent=subscription.user_agent,
        created_at=subscription.created_at,
    )


@router.post(
    "/test",
    response_model=TestPushResponse,
    status_code=status.HTTP_200_OK,
    summary="Send an immediate test push notification to user's registered devices",
)
async def send_test_notification(
    payload: Optional[TestPushRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TestPushResponse:
    """Send an immediate test notification to verify browser push receipt and permissions."""
    title = payload.title if payload and payload.title else "HealthVault AI"
    body = (
        payload.body
        if payload and payload.body
        else "Test dose notification received successfully! ادویات کا نوٹیفکیشن موصول ہو گیا۔"
    )
    url = payload.url if payload and payload.url else "/planner"

    sent_count = await notification_service.send_notification_to_user(
        db=db,
        user_id=current_user.id,
        title=title,
        body=body,
        url=url,
    )

    if sent_count == 0:
        return TestPushResponse(
            status="no_active_subscriptions",
            message="No active browser subscriptions found for this account. Please enable notifications first.",
            sent_count=0,
        )

    return TestPushResponse(
        status="success",
        message=f"Test push notification dispatched to {sent_count} active device(s).",
        sent_count=sent_count,
    )


@router.delete(
    "/unsubscribe",
    status_code=status.HTTP_200_OK,
    summary="Remove push subscription for user",
)
async def unsubscribe_push(
    endpoint: Optional[str] = Query(None, description="Specific endpoint to remove"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Unsubscribe browser endpoint from receiving future push notifications."""
    deleted_count = await notification_service.delete_subscription(
        db=db,
        user_id=current_user.id,
        endpoint=endpoint,
    )
    return {
        "status": "unsubscribed",
        "deleted_count": deleted_count,
    }
