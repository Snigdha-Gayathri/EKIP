"""Health Check Endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from app.services.admin_service import admin_service

router = APIRouter(tags=["Health"])


@router.get("/health")
@router.get("/admin/health")
async def health_check():
    """Verify backend and database connections."""
    return await admin_service.get_health()
