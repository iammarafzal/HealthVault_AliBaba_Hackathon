# HealthVault AI — API v1 Router Aggregation
# Registers all v1 sub-routers under the /api/v1 prefix

from fastapi import APIRouter

api_router = APIRouter()

# Health check within v1
@api_router.get("/health", tags=["Health"])
async def v1_health_check():
    return {"status": "healthy", "version": "v1"}
