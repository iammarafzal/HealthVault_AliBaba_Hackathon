# HealthVault AI — Schemas Package
# Re-export all Pydantic schemas for convenient access

from app.schemas.auth import (  # noqa: F401
    UserRegisterRequest,
    UserLogin,
    TokenResponse,
)
from app.schemas.user import (  # noqa: F401
    ChangePasswordRequest,
    DeleteAccountRequest,
    EmergencyContactCreate,
    EmergencyContactResponse,
    EmergencyToggleRequest,
    EmergencyToggleResponse,
    PrivacySettings,
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    QRDetailsResponse,
    QRRegenerateRequest,
    QRRegenerateResponse,
    UpdateEmailRequest,
    UserProfileResponse,
    UserProfileUpdate,
    UserResponse,
)
from app.schemas.vault import (  # noqa: F401
    ConfirmRecordRequest,
    DeleteRecordResponse,
    DocumentDraftExtractionResponse,
    ExtractedAllergy,
    ExtractedBiomarker,
    ExtractedDocumentEntities,
    ExtractedEntities,
    ExtractedMedication,
    ExtractionResponse,
    MedicalRecordBase,
    MedicalRecordResponse,
)
from app.schemas.emergency import (  # noqa: F401
    EmergencyAccessResponse,
    EmergencyProfileResponse,
    EmergencyScanLogResponse,
)
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
from app.schemas.interpreter import (  # noqa: F401
    ChatMessage,
    PrescriptionChatRequest,
    PrescriptionChatResponse,
)
from app.schemas.voice import (  # noqa: F401
    VoiceIntentRequest,
    VoiceIntentResponse,
    VoiceQueryRequest,
    VoiceQueryResponse,
    VoiceTranscriptionResponse,
)
from app.schemas.medications import (  # noqa: F401
    ActiveMedicationsResponse,
    AllMedicationsResponse,
    DosageSchedulePayload,
    ManualMedicationRequest,
    ManualMedicationResponse,
    MedicationDetailResponse,
    MedicationGroupResponse,
    ToggleActiveRequest,
    ToggleActiveResponse,
)

__all__ = [
    # Auth
    "UserRegisterRequest",
    "UserLogin",
    "TokenResponse",
    # User / Profile
    "ChangePasswordRequest",
    "DeleteAccountRequest",
    "EmergencyContactCreate",
    "EmergencyContactResponse",
    "EmergencyToggleRequest",
    "EmergencyToggleResponse",
    "PrivacySettings",
    "PrivacySettingsResponse",
    "PrivacySettingsUpdate",
    "QRDetailsResponse",
    "QRRegenerateRequest",
    "QRRegenerateResponse",
    "UpdateEmailRequest",
    "UserProfileResponse",
    "UserProfileUpdate",
    "UserResponse",
    # Vault
    "ConfirmRecordRequest",
    "DeleteRecordResponse",
    "DocumentDraftExtractionResponse",
    "ExtractedAllergy",
    "ExtractedBiomarker",
    "ExtractedDocumentEntities",
    "ExtractedEntities",
    "ExtractedMedication",
    "ExtractionResponse",
    "MedicalRecordBase",
    "MedicalRecordResponse",
    # Emergency
    "EmergencyAccessResponse",
    "EmergencyProfileResponse",
    "EmergencyScanLogResponse",
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
    # Medications
    "ActiveMedicationsResponse",
    "AllMedicationsResponse",
    "DosageSchedulePayload",
    "ManualMedicationRequest",
    "ManualMedicationResponse",
    "MedicationDetailResponse",
    "MedicationGroupResponse",
    "ToggleActiveRequest",
    "ToggleActiveResponse",
]
