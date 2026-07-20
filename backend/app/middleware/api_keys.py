"""API Keys override middleware — injects per-request keys from the X-API-Keys header."""

from __future__ import annotations

import json
import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# Mapping from JSON payload keys to Settings attribute names.
_KEY_MAP: dict[str, str] = {
    "gemini_api_key": "GEMINI_API_KEY",
    "groq_api_key": "GROQ_API_KEY",
    "qdrant_url": "QDRANT_URL",
    "qdrant_api_key": "QDRANT_API_KEY",
    "neo4j_uri": "NEO4J_URI",
    "neo4j_username": "NEO4J_USERNAME",
    "neo4j_password": "NEO4J_PASSWORD",
    "supabase_url": "SUPABASE_URL",
    "supabase_anon_key": "SUPABASE_SERVICE_ROLE_KEY",
}


class APIKeysMiddleware(BaseHTTPMiddleware):
    """Override global settings and reset cached singletons based on X-API-Keys header."""

    async def dispatch(self, request: Request, call_next) -> Response:
        header_value = request.headers.get("X-API-Keys")
        if header_value:
            try:
                keys: dict = json.loads(header_value)
            except (json.JSONDecodeError, TypeError):
                logger.warning("Invalid JSON in X-API-Keys header — ignoring")
                return await call_next(request)

            # Apply overrides to the global settings object.
            for json_key, settings_attr in _KEY_MAP.items():
                value = keys.get(json_key)
                if value is not None:
                    setattr(settings, settings_attr, value)

            # Reset cached singletons so they reinitialize with the new keys.
            import app.db.qdrant as _qdrant_mod
            import app.db.neo4j as _neo4j_mod
            import app.db.supabase as _supabase_mod
            import app.llm.embeddings as _embeddings_mod

            _qdrant_mod._qdrant_client = None
            _neo4j_mod._neo4j_driver = None
            _supabase_mod._supabase_client = None
            _embeddings_mod._embedding_service = None

        return await call_next(request)
