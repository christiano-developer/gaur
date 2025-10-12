# -*- coding: utf-8 -*-
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
    logger.info("Starting GAUR Backend...")

    # Initialize database
    if init_db():
        logger.info("Database connection established")
    else:
        logger.error("Failed to establish database connection")
        raise RuntimeError("Database connection failed")

    # TODO: Load AI models (Phase 2)
    # TODO: Start background scheduler (Phase 3)

    logger.info("GAUR Backend started successfully")

    yield  # Application runs

    # Shutdown
    logger.info("Shutting down GAUR Backend...")
    close_db()
    logger.info("GAUR Backend shutdown complete")


# ==================== FastAPI App ====================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="GAUR - Goa Anti-fraud Unified Radar Police System",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    debug=settings.DEBUG
)


# ==================== CORS Middleware ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)


# ==================== Request Logging Middleware ====================

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests with timing information"""
    start_time = time.time()

    # Process request
    response = await call_next(request)

    # Calculate duration
    duration = time.time() - start_time

    # Log request
    logger.info(
        f"{request.method} {request.url.path} "
        f"- Status: {response.status_code} "
        f"- Duration: {duration:.3f}s"
    )

    return response


# ==================== Exception Handlers ====================

@app.exception_handler(GaurException)
async def gaur_exception_handler(request: Request, exc: GaurException):
    """Handle custom GAUR exceptions"""
    logger.error(f"GAUR Exception: {exc.message}")

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "timestamp": time.time()
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors"""
    logger.warning(f"Validation error: {exc.errors()}")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": "Validation error",
            "detail": exc.errors(),
            "timestamp": time.time()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "Internal server error",
            "detail": str(exc) if settings.DEBUG else "An unexpected error occurred",
            "timestamp": time.time()
        }
    )


# ==================== Routes ====================

@app.get("/", response_model=ApiResponse[dict])
async def root():
    """Root endpoint"""
    return ApiResponse(
        success=True,
        data={
            "message": "GAUR Police System API",
            "version": settings.APP_VERSION,
            "docs": "/docs",
            "redoc": "/redoc"
        }
    )


@app.get("/health", response_model=ApiResponse[HealthResponse])
async def health_check():
    """
    Health check endpoint.

    Returns system health status including database connectivity.
    """
    try:
        db_health = check_db_health()

        health_data = HealthResponse(
            status="healthy" if db_health.get("status") == "healthy" else "unhealthy",
            database=db_health.get("status", "unknown"),
            services={
                "api": "running",
                "database": db_health.get("status", "unknown"),
                # AI and scrapers will be added in later phases
            }
        )

        return ApiResponse(
            success=True,
            data=health_data
        )

    except Exception as e:
        logger.error(f"Health check error: {e}")
        return ApiResponse(
            success=False,
            error="Health check failed",
            data=HealthResponse(
                status="unhealthy",
                database="error",
                services={"api": "running", "database": "error"}
            )
        )


# Include API v1 router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ==================== Additional Info ====================

@app.get("/api/v1/info")
async def api_info():
    """Get API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": "development" if settings.DEBUG else "production",
        "endpoints": {
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "api": settings.API_V1_PREFIX
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
