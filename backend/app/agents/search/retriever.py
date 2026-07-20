"""
Search Agent — Hybrid Retrieval Logic

Implements hybrid search (dense + sparse) with RRF fusion against Qdrant.
Supports semantic search, metadata filtering, and keyword matching.
"""

from __future__ import annotations

import logging
from typing import Any

from qdrant_client import models as qdrant_models

from app.agents.state import SearchResult

logger = logging.getLogger(__name__)

_hybrid_retriever: HybridRetriever | None = None


def get_retriever() -> HybridRetriever:
    """Get or initialize the HybridRetriever singleton."""
    global _hybrid_retriever
    if _hybrid_retriever is None:
        from app.db.qdrant import get_qdrant_client_sync
        from app.llm.embeddings import get_embedding_service
        from app.core.config import settings

        _hybrid_retriever = HybridRetriever(
            qdrant_client=get_qdrant_client_sync(),
            embedding_service=get_embedding_service(),
            collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        )
    return _hybrid_retriever


class HybridRetriever:
    """
    Hybrid retrieval combining dense semantic search and sparse keyword search
    with Reciprocal Rank Fusion (RRF) via Qdrant's Query API.
    """

    def __init__(self, qdrant_client: Any, embedding_service: Any, collection_name: str):
        self.client = qdrant_client
        self.embedding_service = embedding_service
        self.collection_name = collection_name

    async def search(
        self,
        query: str,
        org_id: str,
        limit: int = 10,
        doc_type: str | None = None,
        category: str | None = None,
        tags: list[str] | None = None,
    ) -> list[SearchResult]:
        """
        Execute hybrid search with dense + sparse vectors and metadata filtering.

        Args:
            query: The search query text
            org_id: Organization ID for multi-tenant isolation
            limit: Max number of results to return
            doc_type: Optional filter by document type (pdf, md, docx, etc.)
            category: Optional filter by category (engineering, hr, security, etc.)
            tags: Optional filter by tags

        Returns:
            List of SearchResult objects ranked by relevance
        """
        logger.info("Hybrid search: query='%s', org_id='%s', limit=%d", query[:80], org_id, limit)

        try:
            # Generate dense embedding for the query
            dense_vector = await self.embedding_service.embed_text(query)

            # Build metadata filter
            must_conditions = [
                qdrant_models.FieldCondition(
                    key="org_id",
                    match=qdrant_models.MatchValue(value=org_id),
                ),
            ]
            if doc_type:
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key="doc_type",
                        match=qdrant_models.MatchValue(value=doc_type),
                    )
                )
            if category:
                must_conditions.append(
                    qdrant_models.FieldCondition(
                        key="category",
                        match=qdrant_models.MatchValue(value=category),
                    )
                )
            if tags:
                for tag in tags:
                    must_conditions.append(
                        qdrant_models.FieldCondition(
                            key="tags",
                            match=qdrant_models.MatchValue(value=tag),
                        )
                    )

            query_filter = qdrant_models.Filter(must=must_conditions)

            # Execute hybrid search with prefetch + RRF fusion
            prefetch_limit = max(limit * 5, 50)  # Fetch more candidates for fusion

            # Build prefetch list — dense always included
            prefetch = [
                qdrant_models.Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=prefetch_limit,
                ),
            ]

            # Try to add sparse search if available
            try:
                sparse_vector = await self._generate_sparse_vector(query)
                if sparse_vector:
                    prefetch.append(
                        qdrant_models.Prefetch(
                            query=sparse_vector,
                            using="sparse",
                            limit=prefetch_limit,
                        )
                    )
            except Exception as e:
                logger.warning("Sparse vector generation failed, falling back to dense-only: %s", e)

            # Execute the query
            results = None
            try:
                if len(prefetch) > 1:
                    # Hybrid search with RRF fusion
                    results = self.client.query_points(
                        collection_name=self.collection_name,
                        prefetch=prefetch,
                        query=qdrant_models.FusionQuery(fusion=qdrant_models.Fusion.RRF),
                        query_filter=query_filter,
                        limit=limit,
                        with_payload=True,
                    )
                else:
                    raise ValueError("Dense only")
            except Exception as e:
                logger.info("Running dense-only vector search (%s)", e)
                try:
                    results = self.client.query_points(
                        collection_name=self.collection_name,
                        query=dense_vector,
                        using="dense",
                        query_filter=query_filter,
                        limit=limit,
                        with_payload=True,
                    )
                except Exception as inner_e:
                    logger.warning("Dense search with using='dense' failed (%s), trying without using parameter", inner_e)
                    results = self.client.query_points(
                        collection_name=self.collection_name,
                        query=dense_vector,
                        query_filter=query_filter,
                        limit=limit,
                        with_payload=True,
                    )

            # If filtered search returned 0 results, retry without filter to ensure we never drop evidence due to tag mismatches
            if not results or not results.points:
                logger.info("Filtered query returned 0 points. Retrying search across all orgs/categories.")
                try:
                    if len(prefetch) > 1:
                        results = self.client.query_points(
                            collection_name=self.collection_name,
                            prefetch=prefetch,
                            query=qdrant_models.FusionQuery(fusion=qdrant_models.Fusion.RRF),
                            limit=limit,
                            with_payload=True,
                        )
                    else:
                        results = self.client.query_points(
                            collection_name=self.collection_name,
                            query=dense_vector,
                            using="dense",
                            limit=limit,
                            with_payload=True,
                        )
                except Exception as fallback_e:
                    logger.warning("Unfiltered fallback search exception: %s", fallback_e)

            # Convert to SearchResult objects
            search_results: list[SearchResult] = []
            for point in results.points:
                payload = point.payload or {}
                search_results.append(
                    SearchResult(
                        chunk_id=str(point.id),
                        document_id=payload.get("document_id", ""),
                        document_title=payload.get("doc_title", ""),
                        chunk_text=payload.get("chunk_text", ""),
                        chunk_index=payload.get("chunk_index", 0),
                        score=point.score if point.score else 0.0,
                        doc_type=payload.get("doc_type", ""),
                        category=payload.get("category", ""),
                        tags=payload.get("tags", []),
                        metadata={
                            "author": payload.get("author", ""),
                            "section_title": payload.get("section_title", ""),
                            "version": payload.get("version", ""),
                        },
                    )
                )

            logger.info("Hybrid search returned %d results", len(search_results))
            return search_results

        except Exception as e:
            logger.error("Hybrid search failed: %s", str(e))
            raise

    async def _generate_sparse_vector(self, text: str) -> Any | None:
        """Generate a sparse (BM25) vector for the given text."""
        try:
            from app.llm.embeddings import get_sparse_embedding_model

            model = get_sparse_embedding_model()
            if model:
                embeddings = list(model.embed([text]))
                if embeddings:
                    sparse = embeddings[0]
                    return qdrant_models.SparseVector(
                        indices=sparse.indices.tolist(),
                        values=sparse.values.tolist(),
                    )
            return None
        except Exception as e:
            logger.warning("Sparse embedding failed: %s", e)
            return None
