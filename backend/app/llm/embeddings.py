"""Embedding model service using Google text-embedding-004."""

from __future__ import annotations

import logging
from typing import Any
from app.core.config import settings

logger = logging.getLogger(__name__)

_embedding_service: EmbeddingService | None = None


class EmbeddingService:
    """Service wrapper around embeddings with robust local 768-dim fallback."""

    def __init__(self):
        self._local_model: Any = None
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            self.model = GoogleGenerativeAIEmbeddings(
                model=f"models/{settings.GEMINI_EMBEDDING_MODEL}",
                google_api_key=settings.GEMINI_API_KEY,
            )
        except Exception as e:
            logger.warning("Could not initialize GoogleGenerativeAIEmbeddings: %s", e)
            self.model = None

    def _get_local_model(self):
        if self._local_model is None:
            from fastembed import TextEmbedding
            self._local_model = TextEmbedding("BAAI/bge-base-en-v1.5")
        return self._local_model

    async def embed_text(self, text: str) -> list[float]:
        if self.model:
            try:
                return await self.model.aembed_query(text)
            except Exception as e:
                logger.warning("Google embedding API failed (%s), falling back to fastembed", e)
        local = self._get_local_model()
        return list(local.embed([text]))[0].tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if self.model:
            try:
                return await self.model.aembed_documents(texts)
            except Exception as e:
                logger.warning("Google batch embedding API failed (%s), falling back to fastembed", e)
        local = self._get_local_model()
        return [vec.tolist() for vec in local.embed(texts)]


def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
