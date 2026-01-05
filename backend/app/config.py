"""
GAUR Backend Configuration
Uses Pydantic Settings for environment variable management
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional
import os
from pathlib import Path


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # ==================== APPLICATION SETTINGS ====================
    APP_NAME: str = "GAUR Police System"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"

    # ==================== DATABASE SETTINGS ====================
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "gaur_police_db"
    DB_USER: str = "christianofernandes"
    DB_PASSWORD: str = ""

    @property
    def DATABASE_URL(self) -> str:
        """Construct PostgreSQL database URL"""
        if self.DB_PASSWORD:
            return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        return f"postgresql://{self.DB_USER}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Construct async PostgreSQL database URL"""
        if self.DB_PASSWORD:
            return f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        return f"postgresql+asyncpg://{self.DB_USER}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    # ==================== SECURITY SETTINGS ====================
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ==================== CORS SETTINGS ====================
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: List[str] = ["*"]
    CORS_ALLOW_HEADERS: List[str] = ["*"]

    # ==================== TELEGRAM SCRAPER SETTINGS ====================
    TELEGRAM_API_ID: Optional[int] = None
    TELEGRAM_API_HASH: Optional[str] = None
    TELEGRAM_PHONE: Optional[str] = None
    TELEGRAM_SESSION_NAME: str = "gaur_patrol_session"
    TELEGRAM_DEBUG: bool = False
    TELEGRAM_REQUEST_DELAY_MIN: float = 1.0
    TELEGRAM_REQUEST_DELAY_MAX: float = 2.5
    TELEGRAM_MAX_MESSAGES: int = 100

    # ==================== FACEBOOK SCRAPER SETTINGS ====================
    FB_EMAIL: Optional[str] = None
    FB_PASSWORD: Optional[str] = None
    FB_HEADLESS: bool = True
    FB_DEBUG: bool = False
    FB_POSTS_PER_KEYWORD: int = 20
    FB_MAX_IMAGES_PER_POST: int = 5
    FB_MANUAL_2FA: bool = True
    FB_USE_PROXY: bool = False
    FB_PROXY_URL: Optional[str] = None
    FB_MEDIA_STORAGE: str = "local"
    FB_S3_BUCKET: Optional[str] = None

    # ==================== AI/ML SETTINGS ====================
    MODEL_PATH: Path = Path(__file__).parent.parent / "models"
    USE_GPU: bool = False  # Set to True if CUDA is available
    CONFIDENCE_THRESHOLD: float = 0.75
    SIMILARITY_THRESHOLD: float = 0.8
    BATCH_SIZE: int = 16
    MAX_TEXT_LENGTH: int = 512

    # Fraud detection keywords (comprehensive list)
    FRAUD_KEYWORDS: List[str] = [
        # Payment/Financial - English
        "advance", "payment", "upi", "paytm", "phonepe", "gpay", "send money",
        "transfer", "deposit", "booking amount", "token amount", "registration fee",
        "processing fee", "refundable", "50% advance", "bank account", "account number",

        # Tourism/Hotel - English
        "cheap hotel", "free trip", "book now", "limited offer", "discount",
        "special offer", "today only", "hurry", "last chance", "guaranteed",
        "five star", "luxury hotel", "beach view", "ocean view", "goa hotel",

        # Investment/Jobs - English
        "work from home", "part time job", "earn money", "quick money", "easy money",
        "investment opportunity", "guaranteed returns", "double your money", "crypto",
        "bitcoin", "forex", "trading", "profit guaranteed", "risk free",

        # Urgency/Pressure - English
        "urgent", "immediately", "today only", "limited time", "act now",
        "don't miss", "last chance", "expires soon", "while stocks last",

        # Hindi Keywords (Devanagari)
        "*H8G", "-GK", ".>", "M0?.", ",A?", "9K2", "88M$>", ".A+M$",
        "+0", ">0@", ".>", "(L0@", "(?5G6", "2>-",

        # Marathi Keywords (Devanagari)
        "*H8G", "*> 5>", ",A?", "9IG2", "8M58M$", ".K+$", "+0",

        # Konkani/Romanized
        "paiso", "bhej", "hotel", "sasto", "muft", "offer"
    ]

    # ==================== SCRAPING SETTINGS ====================
    SCRAPE_INTERVAL_MINUTES: int = 5
    MAX_MESSAGES_PER_SCRAPE: int = 100
    SCRAPING_DELAY_SECONDS: int = 10
    ENABLE_FACEBOOK_SCRAPING: bool = True
    ENABLE_TELEGRAM_SCRAPING: bool = True

    # ==================== FILE STORAGE SETTINGS ====================
    DATA_FOLDER: Path = Path(__file__).parent.parent / "data"
    REPORT_FOLDER: Path = Path(__file__).parent.parent / "reports"
    LOG_FOLDER: Path = Path(__file__).parent.parent / "logs"

    @property
    def TELEGRAM_IMAGES_FOLDER(self) -> Path:
        return self.DATA_FOLDER / "images" / "telegram"

    @property
    def FACEBOOK_IMAGES_FOLDER(self) -> Path:
        return self.DATA_FOLDER / "images" / "facebook"

    @property
    def VIDEOS_FOLDER(self) -> Path:
        return self.DATA_FOLDER / "videos"

    # ==================== LOGGING SETTINGS ====================
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/gaur.log"
    LOG_ROTATION: str = "500 MB"
    LOG_RETENTION: str = "10 days"
    LOG_COMPRESSION: str = "zip"

    # ==================== CLEANUP SETTINGS ====================
    CLEANUP_OLD_LOGS_DAYS: int = 30
    CLEANUP_OLD_MEDIA_DAYS: int = 90

    # ==================== AI SERVICE SETTINGS ====================
    AI_SERVICE_ENABLED: bool = True
    AI_BATCH_PROCESSING: bool = True
    AI_REALTIME_ANALYSIS: bool = True

    # Model Configuration
    DISTILBERT_MODEL: str = "models--distilbert-base-uncased"
    SENTENCE_TRANSFORMER_MODEL: str = "models--sentence-transformers--all-MiniLM-L6-v2"
    XLM_ROBERTA_MODEL: str = "models--xlm-roberta-base"

    # ==================== PYDANTIC SETTINGS CONFIG ====================
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Create necessary directories
        self.DATA_FOLDER.mkdir(parents=True, exist_ok=True)
        self.TELEGRAM_IMAGES_FOLDER.mkdir(parents=True, exist_ok=True)
        self.FACEBOOK_IMAGES_FOLDER.mkdir(parents=True, exist_ok=True)
        self.VIDEOS_FOLDER.mkdir(parents=True, exist_ok=True)
        self.REPORT_FOLDER.mkdir(parents=True, exist_ok=True)
        self.LOG_FOLDER.mkdir(parents=True, exist_ok=True)


# Global settings instance
settings = Settings()
