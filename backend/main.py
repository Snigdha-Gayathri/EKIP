"""
EKIP Backend Entrypoint — FastAPI Application setup with lifespans and middleware.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.qdrant import init_qdrant_collections
from app.db.neo4j import close_neo4j_driver
from app.middleware.cors import setup_cors_middleware
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.api_keys import APIKeysMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan hooks for startup initialization and graceful shutdown."""
    configure_logging()
    try:
        init_qdrant_collections()
    except Exception as e:
        # Avoid crashing startup if Qdrant isn't running in dev mode
        import logging
        logging.warning("Startup Qdrant init note: %s", e)
    yield
    await close_neo4j_driver()


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Enterprise Knowledge Intelligence Platform (Hierarchical Multi-Agent RAG + Graph Engine)",
    lifespan=lifespan,
)

app.add_middleware(APIKeysMiddleware)
app.add_middleware(RequestLoggingMiddleware)
setup_cors_middleware(app)

app.include_router(api_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "status": "ready",
    }
