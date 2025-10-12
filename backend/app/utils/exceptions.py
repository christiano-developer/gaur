"""
Custom exceptions for the application
"""


class GaurException(Exception):
    """Base exception for GAUR application"""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class AuthenticationException(GaurException):
    """Authentication related exceptions"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationException(GaurException):
    """Authorization/Permission related exceptions"""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)


class NotFoundException(GaurException):
    """Resource not found exceptions"""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class ValidationException(GaurException):
    """Validation related exceptions"""

    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=400)


class DatabaseException(GaurException):
    """Database related exceptions"""

    def __init__(self, message: str = "Database error"):
        super().__init__(message, status_code=500)


class ScrapingException(GaurException):
    """Web scraping related exceptions"""

    def __init__(self, message: str = "Scraping error"):
        super().__init__(message, status_code=500)


class AIException(GaurException):
    """AI/ML related exceptions"""

    def __init__(self, message: str = "AI processing error"):
        super().__init__(message, status_code=500)
