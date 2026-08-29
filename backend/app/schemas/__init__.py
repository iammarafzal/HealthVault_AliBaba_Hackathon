# HealthVault AI — Schemas Package
# Re-export all Pydantic schemas for convenient access

from app.schemas.user import (  # noqa: F401
    EmergencyContact,
    PrivacySettings,
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    QRRegenerateRequest,
    QRRegenerateResponse,
    UserBase,
    UserCreate,
    UserResponse,
)
from app.schemas.vault import (  # noqa: F401
    ExtractedAllergy,
    ExtractedDocumentEntities,
    ExtractedMedication,
    ExtractionResponse,
    MedicalRecordBase,
    MedicalRecordResponse,
)
from app.schemas.emergency import EmergencyProfileResponse  # noqa: F401
from app.schemas.biomarker import (  # noqa: F401
    BiomarkerDataPoint,
    BiomarkerSeries,
    BiomarkerTimelineResponse,
)
from app.schemas.summary import DoctorSummaryResponse  # noqa: F401
from app.schemas.interactions import (  # noqa: F401
    DrugInteractionAlert,
    InteractionCheckRequest,
    InteractionCheckResponse,
)
from app.schemas.voice import (  # noqa: F401
    VoiceIntentRequest,
    VoiceIntentResponse,
    VoiceQueryRequest,
    VoiceQueryResponse,
    VoiceTranscriptionResponse,
)

__all__ = [
    # User
    "EmergencyContact",
    "PrivacySettings",
    "PrivacySettingsResponse",
    "PrivacySettingsUpdate",
    "QRRegenerateRequest",
    "QRRegenerateResponse",
    "UserBase",
    "UserCreate",
    "UserResponse",
    # Vault
    "ExtractedAllergy",
    "ExtractedDocumentEntities",
    "ExtractedMedication",
    "ExtractionResponse",
    "MedicalRecordBase",
    "MedicalRecordResponse",
    # Emergency
    "EmergencyProfileResponse",
    # Biomarker
    "BiomarkerDataPoint",
    "BiomarkerSeries",
    "BiomarkerTimelineResponse",
    # Summary
    "DoctorSummaryResponse",
    # Interactions
    "DrugInteractionAlert",
    "InteractionCheckRequest",
    "InteractionCheckResponse",
    # Voice
    "VoiceIntentRequest",
    "VoiceIntentResponse",
    "VoiceQueryRequest",
    "VoiceQueryResponse",
    "VoiceTranscriptionResponse",
]
