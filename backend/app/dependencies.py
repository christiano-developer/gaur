"""
FastAPI dependencies for authentication, authorization, and database access
"""

from typing import Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from loguru import logger

from app.database import get_db
from app.models import Officer
from app.utils.security import verify_access_token, extract_token_from_header
from app.utils.exceptions import AuthenticationException, AuthorizationException


# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_officer(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Officer:
    """
    Dependency to get current authenticated officer from JWT token.

    Args:
        authorization: Authorization header with Bearer token
        db: Database session

    Returns:
        Officer object if authentication successful

    Raises:
        HTTPException: If authentication fails
    """
    if not authorization:
        logger.warning("Missing Authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract token from header
    token = extract_token_from_header(authorization)
    if not token:
        logger.warning("Invalid Authorization header format")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify token
    payload = verify_access_token(token)
    if not payload:
        logger.warning("Invalid or expired token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract officer ID from payload
    officer_id = payload.get("sub")
    if not officer_id:
        logger.error("Token payload missing 'sub' claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get officer from database
    officer = db.query(Officer).filter(Officer.officer_id == officer_id).first()
    if not officer:
        logger.warning(f"Officer not found: {officer_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Officer not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if officer is active
    if not officer.is_active:
        logger.warning(f"Inactive officer attempted access: {officer.badge_number}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer account is inactive",
        )

    # Check if account is locked
    if officer.is_locked:
        logger.warning(f"Locked officer attempted access: {officer.badge_number}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Officer account is locked",
        )

    return officer


async def get_current_active_officer(
    current_officer: Officer = Depends(get_current_officer)
) -> Officer:
    """
    Dependency to ensure officer is active.
    This is a more explicit version of get_current_officer.
    """
    return current_officer


def require_permission(resource: str, action: str):
    """
    Dependency factory to check if officer has specific permission.

    Args:
        resource: Resource name (e.g., "alerts", "evidence")
        action: Action name (e.g., "read", "create", "update")

    Returns:
        Dependency function that checks permission

    Example:
        @app.get("/alerts", dependencies=[Depends(require_permission("alerts", "read"))])
    """

    async def permission_checker(
        current_officer: Officer = Depends(get_current_officer)
    ) -> Officer:
        """Check if officer has required permission"""

        # SuperAdmin bypasses all permission checks
        if any(role.name == "super_admin" for role in current_officer.roles):
            return current_officer

        # Check if officer has the specific permission
        has_permission = False
        for role in current_officer.roles:
            for permission in role.permissions:
                if permission.resource == resource and permission.action == action:
                    has_permission = True
                    break
            if has_permission:
                break

        if not has_permission:
            logger.warning(
                f"Officer {current_officer.badge_number} lacks permission: {resource}:{action}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {resource}:{action}",
            )

        return current_officer

    return permission_checker


def require_role(role_name: str):
    """
    Dependency factory to check if officer has specific role.

    Args:
        role_name: Role name to check (e.g., "inspector", "super_admin")

    Returns:
        Dependency function that checks role

    Example:
        @app.get("/admin", dependencies=[Depends(require_role("super_admin"))])
    """

    async def role_checker(
        current_officer: Officer = Depends(get_current_officer)
    ) -> Officer:
        """Check if officer has required role"""

        if role_name not in current_officer.role_names:
            logger.warning(
                f"Officer {current_officer.badge_number} lacks role: {role_name}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {role_name}",
            )

        return current_officer

    return role_checker


def require_minimum_level(min_level: int):
    """
    Dependency factory to check if officer has minimum role level.

    Args:
        min_level: Minimum role level required (lower number = higher authority)

    Returns:
        Dependency function that checks role level

    Example:
        @app.get("/sensitive", dependencies=[Depends(require_minimum_level(2))])
    """

    async def level_checker(
        current_officer: Officer = Depends(get_current_officer)
    ) -> Officer:
        """Check if officer has sufficient role level"""

        if current_officer.minimum_role_level > min_level:
            logger.warning(
                f"Officer {current_officer.badge_number} lacks required level: {min_level} (has {current_officer.minimum_role_level})"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires minimum role level: {min_level}",
            )

        return current_officer

    return level_checker


# Optional authentication (doesn't fail if token is missing)
async def get_optional_officer(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[Officer]:
    """
    Dependency to get current officer if authenticated, None otherwise.
    Used for endpoints that work with or without authentication.

    Args:
        authorization: Authorization header with Bearer token
        db: Database session

    Returns:
        Officer object if authenticated, None otherwise
    """
    if not authorization:
        return None

    try:
        return await get_current_officer(authorization, db)
    except HTTPException:
        return None
