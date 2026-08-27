# HealthVault AI — Drug Interaction Pydantic Schemas
# InteractionCheckRequest, DrugInteractionAlert, InteractionCheckResponse

from typing import List
from uuid import UUID

from pydantic import BaseModel


class InteractionCheckRequest(BaseModel):
    user_id: UUID
    new_medications: List[str]


class DrugInteractionAlert(BaseModel):
    severity: str  # "low" | "medium" | "critical"
    interacting_drugs: List[str]
    clinical_risk: str
    recommendation_en: str
    recommendation_ur: str


class InteractionCheckResponse(BaseModel):
    has_conflicts: bool
    alerts: List[DrugInteractionAlert]
