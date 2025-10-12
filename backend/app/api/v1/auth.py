"""
Authentication API endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from loguru import logger

from app.database import get_db
from app.dependencies import get_current_officer
from app.models import Officer, ActivityLog
from app.schemas import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    OfficerResponse,
    ApiResponse,
)
from app.utils import (
    verify_password,
    create_token_pair,
    verify_refresh_token,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=ApiResponse[LoginResponse])
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Authenticate officer and return JWT tokens.

    - **badge_number**: Officer's badge number
    - **password**: Officer's password
    - **two_factor_code**: Optional 2FA code if enabled

    Returns access token, refresh token, and officer profile.
    """
    try:
        # Find officer by badge number
        officer = db.query(Officer).filter(
            Officer.badge_number == credentials.badge_number
        ).first()

        if not officer:
            logger.warning(f"Login attempt with invalid badge: {credentials.badge_number}")

            # Log failed attempt
            activity_log = ActivityLog(
                officer_id=None,
                action="login_failed",
                details={
                    "badge_number": credentials.badge_number,
                    "description": "Invalid badge number",
                    "success": False
                }
            )
            db.add(activity_log)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid badge number or password"
            )

        # Check if account is locked
        if officer.is_locked:
            logger.warning(f"Login attempt for locked account: {officer.badge_number}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is locked. Please contact administrator."
            )

        # Verify password
        if not verify_password(credentials.password, officer.password_hash):
            logger.warning(f"Invalid password for badge: {credentials.badge_number}")

            # Increment failed login attempts
            officer.failed_login_attempts += 1

            # Lock account after 5 failed attempts
            if officer.failed_login_attempts >= 5:
                from datetime import timedelta
                officer.locked_until = datetime.utcnow() + timedelta(hours=1)
                logger.warning(f"Account locked due to failed attempts: {officer.badge_number}")

            # Log failed attempt
            activity_log = ActivityLog(
                officer_id=officer.officer_id,
                action="login_failed",
                details={
                    "badge_number": officer.badge_number,
                    "description": "Invalid password",
                    "success": False
                }
            )
            db.add(activity_log)
            db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid badge number or password"
            )

        # Check if officer is active
        if not officer.is_active:
            logger.warning(f"Login attempt for inactive account: {officer.badge_number}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive. Please contact administrator."
            )

        # Handle 2FA if enabled
        if officer.two_factor_enabled:
            if not credentials.two_factor_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Two-factor authentication code required"
                )
            # TODO: Verify 2FA code (implement later)
            # For now, we'll skip 2FA verification

        # Authentication successful - reset failed attempts
        officer.failed_login_attempts = 0
        officer.locked_until = None
        officer.last_login = datetime.utcnow()

        # Create JWT tokens
        tokens = create_token_pair(officer.officer_id, officer.badge_number)

        # Log successful login
        activity_log = ActivityLog(
            officer_id=officer.officer_id,
            action="login_success",
            details={
                "badge_number": officer.badge_number,
                "description": "Officer logged in successfully",
                "success": True
            }
        )
        db.add(activity_log)
        db.commit()

        # Refresh officer to get updated relationships
        db.refresh(officer)

        # Build response
        officer_response = OfficerResponse.model_validate(officer)

        login_response = LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            officer=officer_response
        )

        logger.info(f"Officer logged in: {officer.badge_number}")

        return ApiResponse(
            success=True,
            data=login_response,
            message="Login successful"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during login"
        )


@router.post("/logout", response_model=ApiResponse[dict])
async def logout(
    current_officer: Officer = Depends(get_current_officer),
    db: Session = Depends(get_db)
):
    """
    Logout current officer.

    Note: Since we're using JWT, actual token invalidation happens client-side.
    This endpoint mainly logs the logout activity.
    """
    try:
        # Log logout activity
        activity_log = ActivityLog(
            officer_id=current_officer.officer_id,
            action="logout",
            details={
                "badge_number": current_officer.badge_number,
                "description": "Officer logged out",
                "success": True
            }
        )
        db.add(activity_log)
        db.commit()

        logger.info(f"Officer logged out: {current_officer.badge_number}")

        return ApiResponse(
            success=True,
            data={"message": "Logged out successfully"},
            message="Logout successful"
        )

    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during logout"
        )


@router.post("/refresh", response_model=ApiResponse[LoginResponse])
async def refresh_token(
    refresh_request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    - **refresh_token**: Valid refresh token

    Returns new access token and refresh token.
    """
    try:
        # Verify refresh token
        payload = verify_refresh_token(refresh_request.refresh_token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        # Get officer ID from payload
        officer_id = payload.get("sub")
        if not officer_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )

        # Get officer from database
        officer = db.query(Officer).filter(Officer.officer_id == officer_id).first()
        if not officer:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Officer not found"
            )

        # Check if officer is active
        if not officer.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive"
            )

        # Create new token pair
        tokens = create_token_pair(officer.officer_id, officer.badge_number)

        # Refresh officer to get relationships
        db.refresh(officer)

        # Build response
        officer_response = OfficerResponse.model_validate(officer)

        login_response = LoginResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_type=tokens["token_type"],
            expires_in=tokens["expires_in"],
            officer=officer_response
        )

        logger.info(f"Token refreshed for: {officer.badge_number}")

        return ApiResponse(
            success=True,
            data=login_response,
            message="Token refreshed successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred during token refresh"
        )


@router.get("/profile", response_model=ApiResponse[OfficerResponse])
async def get_profile(
    current_officer: Officer = Depends(get_current_officer),
    db: Session = Depends(get_db)
):
    """
    Get current officer's profile.

    Returns officer details including roles and permissions.
    """
    try:
        # Refresh to ensure relationships are loaded
        db.refresh(current_officer)

        officer_response = OfficerResponse.model_validate(current_officer)

        return ApiResponse(
            success=True,
            data=officer_response
        )

    except Exception as e:
        logger.error(f"Get profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching profile"
        )
