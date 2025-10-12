"""
Common schemas and response models
"""

from pydantic import BaseModel, Field
from typing import Generic, TypeVar, Optional, Any, List
from datetime import datetime


DataT = TypeVar('DataT')


class ApiResponse(BaseModel, Generic[DataT]):
    """Standard API response wrapper"""
    success: bool = True
    data: Optional[DataT] = None
    message: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": {},
                "message": "Operation successful",
                "timestamp": "2025-10-10T12:00:00.000Z"
            }
        }
    }


class PaginationMeta(BaseModel):
    """Pagination metadata"""
    total: int = Field(description="Total number of items")
    page: int = Field(description="Current page number")
    size: int = Field(description="Items per page")
    pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")


class PaginatedResponse(BaseModel, Generic[DataT]):
    """Paginated response wrapper"""
    items: List[DataT]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool

    model_config = {
        "json_schema_extra": {
            "example": {
                "items": [],
                "total": 100,
                "page": 1,
                "size": 20,
                "pages": 5,
                "has_next": True,
                "has_prev": False
            }
        }
    }


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    database: str
    services: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)
