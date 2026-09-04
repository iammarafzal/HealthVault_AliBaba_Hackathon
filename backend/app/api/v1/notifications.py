# HealthVault AI — Web Push Notification API Endpoints
# Manages VAPID public key distribution, push subscriptions, and test pushes

import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
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


# ---------------------------------------------------------------------------
# In-App Notifications Endpoints
# ---------------------------------------------------------------------------
@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List in-app notifications for authenticated user",
)
async def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationListResponse:
    """Return recent notifications sorted by creation date descending with unread count."""
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    result = await db.scalars(stmt)
    items = result.all()

    unread_stmt = select(func.count(Notification.id)).where(
        Notification.user_id == current_user.id,
        Notification.is_read == False,
    )
    unread_count = await db.scalar(unread_stmt) or 0

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in items],
        total=len(items),
        unread_count=unread_count,
    )


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark single notification as read",
)
async def mark_notification_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationResponse:
    """Mark a single notification as read."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    )
    notification = await db.scalar(stmt)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    notification.is_read = True
    await db.flush()
    return NotificationResponse.model_validate(notification)


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark all user notifications as read",
)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Mark all unread notifications for current user as read."""
    stmt = (
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    res = await db.execute(stmt)
    await db.flush()
    return {
        "status": "success",
        "updated_count": res.rowcount,
    }


@router.delete(
    "/{notification_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an alert notification",
)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a specific notification."""
    stmt = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    )
    notification = await db.scalar(stmt)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    await db.delete(notification)
    await db.flush()
    return {"status": "success", "message": "Notification deleted."}

