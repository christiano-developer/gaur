"""
Authentication schemas
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


# ==================== Permission Schemas ====================

class PermissionBase(BaseModel):
    """Base permission schema"""
    name: str
    resource: str
    action: str
    description: Optional[str] = None


class PermissionResponse(PermissionBase):
    """Permission response schema"""
    id: int

    model_config = {"from_attributes": True}


# ==================== Role Schemas ====================

class RoleBase(BaseModel):
    """Base role schema"""
    name: str
    display_name: str
    description: Optional[str] = None
    level: int


class RoleResponse(RoleBase):
    """Role response schema"""
    id: int
    created_at: datetime
    permissions: List[PermissionResponse] = []

    model_config = {"from_attributes": True}


class RoleSimple(BaseModel):
    """Simple role schema without permissions"""
    id: int
    name: str
    display_name: str
    description: Optional[str] = None
    level: int

    model_config = {"from_attributes": True}


# ==================== Officer Schemas ====================

class OfficerBase(BaseModel):
    """Base officer schema"""
    badge_number: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=2, max_length=200)
    rank: str = Field(..., max_length=100)
    department: str = Field(default="Cyber Crime", max_length=200)


class OfficerCreate(OfficerBase):
    """Schema for creating officer"""
    password: str = Field(..., min_length=8, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    station: Optional[str] = None
    roles: List[int] = Field(default=[])  # Role IDs


class OfficerUpdate(BaseModel):
    """Schema for updating officer"""
    name: Optional[str] = None
    rank: Optional[str] = None
    department: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    station: Optional[str] = None
    active: Optional[bool] = None


class OfficerResponse(OfficerBase):
    """Officer response schema (without sensitive data)"""
    officer_id: str
    active: bool
    two_factor_enabled: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    station: Optional[str] = None
    roles: List[RoleSimple] = []
    permissions: List[PermissionResponse] = []
    role_names: List[str] = []
    minimum_role_level: int

    model_config = {"from_attributes": True}


# ==================== Authentication Schemas ====================

class LoginRequest(BaseModel):
    """Login request schema"""
    badge_number: str = Field(..., description="Officer badge number")
    password: str = Field(..., description="Officer password")
    two_factor_code: Optional[str] = Field(None, description="2FA code if enabled")

    model_config = {
        "json_schema_extra": {
            "example": {
                "badge_number": "TEST001",
                "password": "testpass123",
                "two_factor_code": None
            }
        }
    }


class TokenPair(BaseModel):
    """Token pair (access + refresh)"""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int = Field(..., description="Access token expiration in seconds")


class LoginResponse(TokenPair):
    """Login response with tokens and officer data"""
    officer: OfficerResponse

    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
                "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbG...",
                "token_type": "Bearer",
                "expires_in": 1800,
                "officer": {
                    "officer_id": "uuid",
                    "badge_number": "TEST001",
                    "name": "Officer Name",
                    "rank": "Inspector",
                    "department": "Cyber Crime",
                    "active": True,
                    "two_factor_enabled": False,
                    "roles": [],
                    "permissions": [],
                    "role_names": ["inspector"],
                    "minimum_role_level": 2
                }
            }
        }
    }


class RefreshRequest(BaseModel):
    """Token refresh request"""
    refresh_token: str = Field(..., description="Refresh token")


class PasswordChangeRequest(BaseModel):
    """Password change request"""
    current_password: str
    new_password: str = Field(..., min_length=8)


class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: str  # Subject (officer_id)
    badge_number: str
    type: str  # "access" or "refresh"
    exp: int  # Expiration timestamp
    iat: int  # Issued at timestamp
