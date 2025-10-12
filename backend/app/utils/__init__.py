"""
Utility functions and helpers
"""

from app.utils.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_token,
    verify_access_token,
    verify_refresh_token,
    extract_token_from_header,
)

from app.utils.exceptions import (
    GaurException,
    AuthenticationException,
    AuthorizationException,
    NotFoundException,
    ValidationException,
    DatabaseException,
    ScrapingException,
    AIException,
)

from app.utils.logger import setup_logger

__all__ = [
    # Security
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "create_token_pair",
    "decode_token",
    "verify_access_token",
    "verify_refresh_token",
    "extract_token_from_header",

    # Exceptions
    "GaurException",
    "AuthenticationException",
    "AuthorizationException",
    "NotFoundException",
    "ValidationException",
    "DatabaseException",
    "ScrapingException",
    "AIException",

    # Logger
    "setup_logger",
]
