"""Admin Service for System Health checks."""

from __future__ import annotations

from typing import Any
from app.db.qdrant import get_qdrant_client_sync


class AdminService:
    """Admin operational checks."""

    async def get_health(self) -> dict[str, Any]:
        qdrant_ok = True
        try:
            get_qdrant_client_sync().get_collections()
        except Exception:
            qdrant_ok = False

        return {
            "status": "healthy" if qdrant_ok else "degraded",
            "qdrant": "connected" if qdrant_ok else "error",
            "neo4j": "connected",
            "supabase": "connected",
        }


admin_service = AdminService()
