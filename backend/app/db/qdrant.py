"""Qdrant Cloud client integration and collection initialization."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from qdrant_client import QdrantClient, models
from app.core.config import settings

logger = logging.getLogger(__name__)

_qdrant_client: QdrantClient | None = None


def get_qdrant_client_sync() -> QdrantClient:
    """Get or initialize the Qdrant client."""
    global _qdrant_client
    if _qdrant_client is None:
        if settings.QDRANT_URL.startswith("http://") or settings.QDRANT_URL.startswith("https://"):
            kwargs = {"url": settings.QDRANT_URL}
            if settings.QDRANT_API_KEY:
                kwargs["api_key"] = settings.QDRANT_API_KEY
            try:
                client = QdrantClient(**kwargs)
                client.get_collections()
                _qdrant_client = client
                logger.info("Initialized Qdrant HTTP client (%s)", settings.QDRANT_URL)
            except Exception as e:
                backend_dir = Path(__file__).resolve().parent.parent.parent
                fallback_path = str(backend_dir / "data" / "qdrant")
                logger.warning("Could not connect to Qdrant HTTP at %s (%s). Falling back to local persistent Qdrant at '%s'", settings.QDRANT_URL, e, fallback_path)
                _qdrant_client = QdrantClient(path=fallback_path)
        elif settings.QDRANT_URL == ":memory:":
            _qdrant_client = QdrantClient(location=":memory:")
        else:
            path_str = settings.QDRANT_URL
            if not os.path.isabs(path_str):
                backend_dir = Path(__file__).resolve().parent.parent.parent
                if path_str.startswith("./"):
                    path_str = str(backend_dir / path_str[2:])
                else:
                    path_str = str(backend_dir / path_str)
            _qdrant_client = QdrantClient(path=path_str)
            logger.info("Initialized Qdrant path client (%s)", path_str)
    return _qdrant_client


async def get_qdrant_client() -> QdrantClient:
    """Dependency for FastAPI endpoints."""
    return get_qdrant_client_sync()


def init_qdrant_collections(vector_size: int = 768, force_recreate: bool = False) -> None:
    """Ensure Qdrant collections exist with proper hybrid configuration."""
    client = get_qdrant_client_sync()
    collections = [c.name for c in client.get_collections().collections]

    doc_col = settings.QDRANT_COLLECTION_DOCUMENTS
    if force_recreate and doc_col in collections:
        logger.info("Recreating Qdrant collection '%s'", doc_col)
        client.delete_collection(doc_col)
        collections.remove(doc_col)

    if doc_col not in collections:
        logger.info("Creating Qdrant collection '%s' with vector size %d and hybrid sparse support", doc_col, vector_size)
        try:
            client.create_collection(
                collection_name=doc_col,
                vectors_config={
                    "dense": models.VectorParams(size=vector_size, distance=models.Distance.COSINE)
                },
                sparse_vectors_config={
                    "sparse": models.SparseVectorParams(index=models.SparseIndexParams(on_disk=False))
                },
            )
        except Exception as e:
            logger.warning("Sparse collection init failed (%s), falling back to dense-only collection create", e)
            client.create_collection(
                collection_name=doc_col,
                vectors_config={
                    "dense": models.VectorParams(size=vector_size, distance=models.Distance.COSINE)
                },
            )
