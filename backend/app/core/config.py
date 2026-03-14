from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/workspace_db"
    # Set REQUIRE_SSL=true when using Railway / managed PostgreSQL (adds sslmode=require)
    REQUIRE_SSL: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200

    GEMINI_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = ""
    ADMIN_EMAIL: str = ""

    APP_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"
    UPLOAD_DIR: str = "/app/uploads"
    MAX_FILE_SIZE: int = 52428800

    # Comma-separated list of allowed CORS origins.
    # Example: https://myapp.railway.app,https://myapp.com
    # Defaults to localhost for local development.
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    # Path to Google service-account JSON for Calendar integration.
    # In Docker: the file is copied to /app/google-credentials.json by default.
    GOOGLE_CREDENTIALS_PATH: str = "/app/google-credentials.json"
    GOOGLE_CALENDAR_ID: str = ""

    class Config:
        # env_file is optional — if absent Docker still passes env vars directly
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
