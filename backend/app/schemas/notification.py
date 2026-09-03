# HealthVault AI — Push Notification Schemas
# Defines Pydantic validation schemas for Web Push subscriptions & test notifications

import uuid
from datetime import datetime
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(..., description="Client public encryption key")
    auth: str = Field(..., description="Client authentication secret")


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(..., description="Browser Push Service endpoint URL")
    keys: Dict[str, str] = Field(..., description="Client cryptographic keys containing p256dh and auth")
    user_agent: Optional[str] = Field(None, description="Optional browser/platform user-agent")


class PushSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    endpoint: str
    user_agent: Optional[str] = None
    created_at: datetime


class VapidPublicKeyResponse(BaseModel):
    public_key: str = Field(..., description="Application server VAPID public key")


class TestPushRequest(BaseModel):
    title: Optional[str] = Field("HealthVault AI", description="Test notification title")
    body: Optional[str] = Field("This is a test notification from HealthVault AI.", description="Test notification body")
    url: Optional[str] = Field("/planner", description="Action click target URL")


class TestPushResponse(BaseModel):
    status: str
    message: str
    sent_count: int
