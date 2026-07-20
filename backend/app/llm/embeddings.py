"""Embedding model service using Google text-embedding-004."""

from __future__ import annotations

import logging
from typing import Any
from app.core.config import settings

logger = logging.getLogger(__name__)

_embedding_service: EmbeddingService | None = None
_sparse_embedding_model: Any = None


class EmbeddingService:
    """Service wrapper around embeddings with robust local 768-dim fallback."""

    def __init__(self):
        self._local_model: Any = None
        self._remote_model: Any = None
        self._remote_checked: bool = False

    def _get_remote_model(self):
        if not self._remote_checked:
            self._remote_checked = True
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                self._remote_model = GoogleGenerativeAIEmbeddings(
                    model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
                    google_api_key=settings.GEMINI_API_KEY,
                )
            except Exception as e:
                logger.warning("Could not initialize GoogleGenerativeAIEmbeddings: %s", e)
                self._remote_model = None
        return self._remote_model

    def _get_local_model(self):
        if self._local_model is None:
            from fastembed import TextEmbedding
            self._local_model = TextEmbedding("BAAI/bge-base-en-v1.5")
        return self._local_model

    async def embed_text(self, text: str) -> list[float]:
        remote = self._get_remote_model()
        if remote:
            try:
                return await remote.aembed_query(text)
            except Exception as e:
                logger.warning("Google embedding API failed (%s), falling back to fastembed", e)
        local = self._get_local_model()
        return list(local.embed([text]))[0].tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        remote = self._get_remote_model()
        if remote:
            try:
                return await remote.aembed_documents(texts)
            except Exception as e:
                logger.warning("Google batch embedding API failed (%s), falling back to fastembed", e)
        local = self._get_local_model()
        return [vec.tolist() for vec in local.embed(texts)]


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service


def get_sparse_embedding_model() -> Any:
    global _sparse_embedding_model
    if _sparse_embedding_model is None:
        try:
            from fastembed import SparseTextEmbedding
            _sparse_embedding_model = SparseTextEmbedding(model_name="Qdrant/bm25")
        except Exception as e:
            logger.warning("SparseTextEmbedding initialization failed: %s", e)
            _sparse_embedding_model = False
    return None if _sparse_embedding_model is False else _sparse_embedding_model
