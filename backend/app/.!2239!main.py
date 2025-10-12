"""
GAUR Backend Main Application
FastAPI application with authentication, CORS, and middleware
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import time
from loguru import logger

from app.config import settings
from app.database import init_db, close_db, check_db_health
from app.api.v1 import api_router
from app.utils.exceptions import GaurException
from app.schemas import ApiResponse, HealthResponse


# ==================== Lifespan Events ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager - handles startup and shutdown events.
    """
    # Startup
