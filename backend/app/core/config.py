"""
App Configuration Settings
"""

from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application Configuration Settings loaded from environment variables."""

    APP_NAME: str = "EKIP"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_LOG_LEVEL: str = "INFO"
    APP_SECRET_KEY: str = "ekip-super-secret-key-change-in-production"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string into a list."""
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Supabase
    SUPABASE_URL: str = "https://example.supabase.co"
    SUPABASE_ANON_KEY: str = "mock-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-role-key"
    SUPABASE_JWT_SECRET: str = "mock-jwt-secret"
    DATABASE_URL: str = "sqlite+aiosqlite:///./ekip.db"

    # Qdrant Cloud
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    QDRANT_COLLECTION_DOCUMENTS: str = "ekip_documents"
    QDRANT_COLLECTION_MEMORY: str = "ekip_memory"

    # Neo4j Aura
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str = "password"
    NEO4J_DATABASE: str = "neo4j"

    # LLM Providers
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    DEFAULT_LLM_PROVIDER: str = "gemini"

    # Rate limiting & Uploads
    RATE_LIMIT_QUERIES_PER_MINUTE: int = 30
    RATE_LIMIT_UPLOADS_PER_HOUR: int = 50
    MAX_UPLOAD_SIZE_MB: int = 50

    model_config = SettingsConfigDict(
        env_file=[".env", str(Path(__file__).resolve().parent.parent.parent / ".env")],
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
