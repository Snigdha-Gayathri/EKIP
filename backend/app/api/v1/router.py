"""Main API v1 Router Aggregator."""

from __future__ import annotations

from fastapi import APIRouter
from app.api.v1.endpoints import health, query, documents, knowledge, auth

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(query.router)
api_router.include_router(documents.router)
api_router.include_router(knowledge.router)
api_router.include_router(auth.router)
