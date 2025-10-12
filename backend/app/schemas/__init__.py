"""
Pydantic schemas for API validation and serialization
"""

from app.schemas.common import (
    ApiResponse,
    PaginatedResponse,
    PaginationMeta,
    ErrorResponse,
    HealthResponse,
)

from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    TokenPair,
    TokenPayload,
    PasswordChangeRequest,
    OfficerResponse,
    OfficerCreate,
    OfficerUpdate,
    RoleResponse,
    RoleSimple,
    PermissionResponse,
)

__all__ = [
    # Common
    "ApiResponse",
    "PaginatedResponse",
    "PaginationMeta",
    "ErrorResponse",
    "HealthResponse",

    # Auth
    "LoginRequest",
    "LoginResponse",
    "RefreshRequest",
    "TokenPair",
    "TokenPayload",
    "PasswordChangeRequest",
    "OfficerResponse",
    "OfficerCreate",
    "OfficerUpdate",
    "RoleResponse",
    "RoleSimple",
    "PermissionResponse",
]
