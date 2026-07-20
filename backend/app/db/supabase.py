"""Supabase client integration."""

from __future__ import annotations

import logging
from typing import Any
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


def get_supabase_client_sync() -> Client:
    """Get or initialize the Supabase client."""
    global _supabase_client
    if _supabase_client is None:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Initialized Supabase client")
        except Exception as e:
            logger.error("Failed to initialize Supabase client: %s", e)
            raise
    return _supabase_client


async def get_supabase_client() -> Client:
    """Dependency for FastAPI endpoints."""
    return get_supabase_client_sync()
