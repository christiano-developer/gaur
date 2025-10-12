"""
API v1 router initialization
"""

from fastapi import APIRouter
from app.api.v1 import auth, admin, ai_hub, threats


# Create API v1 router
api_router = APIRouter()

# Include sub-routers
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(ai_hub.router)
api_router.include_router(threats.router)

# Health check at root level (will be added later)
# api_router.include_router(health.router)

__all__ = ["api_router"]
