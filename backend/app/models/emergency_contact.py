# HealthVault AI — Emergency Contact ORM Model
# In Case of Emergency (ICE) contacts associated with a user

import uuid
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    relation: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    priority_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    # HealthVault user account binding
    contact_health_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    contact_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id], back_populates="ice_contacts")
    contact_user: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[contact_user_id], lazy="selectin"
    )
