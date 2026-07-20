"""
Search Agent — LangGraph Node

Performs hybrid semantic + keyword search across enterprise documents.
Retrieves, ranks, and returns the most relevant evidence chunks.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from app.agents.state import AgentStepTrace, EKIPState

logger = logging.getLogger(__name__)


async def search_agent_node(state: EKIPState) -> dict[str, Any]:
    """
    Search Agent node in the LangGraph StateGraph.

    Performs hybrid search in Qdrant using the user's query and any
    metadata filters inferred by the Supervisor.
    """
    start_time = time.time()
    query = state.get("query", "")
    org_id = state.get("org_id", "acme_ai")

    logger.info("Search Agent executing for query: %s", query[:100])

    try:
        from app.db.qdrant import get_qdrant_client_sync
        from app.llm.embeddings import get_embedding_service
        from app.agents.search.retriever import HybridRetriever
        from app.core.config import settings

        # Initialize retriever
        qdrant_client = get_qdrant_client_sync()
        embedding_service = get_embedding_service()
        retriever = HybridRetriever(
            qdrant_client=qdrant_client,
            embedding_service=embedding_service,
            collection_name=settings.QDRANT_COLLECTION_DOCUMENTS,
        )

        # Execute hybrid search
        search_results = await retriever.search(
            query=query,
            org_id=org_id,
            limit=10,
        )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("Search Agent found %d results in %dms", len(search_results), duration_ms)

        trace = AgentStepTrace(
            agent_name="search",
            action="hybrid_search",
            input_summary=f"Query: {query[:80]}",
            output_summary=f"Found {len(search_results)} results",
            duration_ms=duration_ms,
            status="success",
        )

        return {
            "search_results": search_results,
            "agent_trace": state.get("agent_trace", []) + [trace],
        }

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error("Search Agent failed: %s", str(e))

        trace = AgentStepTrace(
            agent_name="search",
            action="hybrid_search",
            input_summary=f"Query: {query[:80]}",
            output_summary="Search failed",
            duration_ms=duration_ms,
            status="error",
            error_message=str(e),
        )

        return {
            "search_results": [],
            "agent_trace": state.get("agent_trace", []) + [trace],
        }
