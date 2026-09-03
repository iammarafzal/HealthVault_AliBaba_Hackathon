# HealthVault AI — Database Base & Model Registry
# Used for Alembic migrations and central model discovery

from app.core.database import Base  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.privacy import PrivacySettings  # noqa: F401
from app.models.emergency_scan import EmergencyScanLog  # noqa: F401
from app.models.record import MedicalRecord  # noqa: F401
from app.models.medication import Medication, MedicationDoseLog  # noqa: F401
from app.models.allergy import Allergy  # noqa: F401
from app.models.biomarker import Biomarker  # noqa: F401
from app.models.emergency_contact import EmergencyContact  # noqa: F401
from app.models.notification import PushSubscription  # noqa: F401
from app.models.user_schedule import PatientRoutineSchedule  # noqa: F401

__all__ = [
    "Base",
    "User",
    "PrivacySettings",
    "EmergencyScanLog",
    "MedicalRecord",
    "Medication",
    "MedicationDoseLog",
    "Allergy",
    "Biomarker",
    "EmergencyContact",
    "PushSubscription",
    "PatientRoutineSchedule",
]
