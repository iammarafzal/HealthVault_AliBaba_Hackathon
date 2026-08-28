# HealthVault AI — API v1 Router Aggregation
# Registers all v1 sub-routers under the /api/v1 prefix

from fastapi import APIRouter

from app.api.v1.biomarkers import router as biomarkers_router
from app.api.v1.emergency import router as emergency_router
from app.api.v1.interactions import router as interactions_router
from app.api.v1.summary import router as summary_router
from app.api.v1.user import router as user_router
from app.api.v1.vault import router as vault_router
from app.api.v1.voice import router as voice_router

api_router = APIRouter()

# Register v1 feature routers
api_router.include_router(vault_router)
api_router.include_router(summary_router)
api_router.include_router(interactions_router)
api_router.include_router(emergency_router)
api_router.include_router(user_router)
api_router.include_router(biomarkers_router)
api_router.include_router(voice_router)


# Health check within v1
@api_router.get("/health", tags=["Health"])
async def v1_health_check():
    return {"status": "healthy", "version": "v1"}
