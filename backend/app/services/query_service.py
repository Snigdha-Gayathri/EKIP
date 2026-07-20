"""
Query Service — Orchestrates LangGraph multi-agent execution.
"""

from __future__ import annotations

import logging
from typing import Any
from app.agents.graph import get_ekip_graph
from app.schemas.query import QueryRequest, QueryResponse, SourceCitationModel, AgentStepModel

logger = logging.getLogger(__name__)


class QueryService:
    """Service layer executing the EKIP multi-agent graph."""

    def __init__(self):
        self._graph: Any = None

    @property
    def graph(self) -> Any:
        if self._graph is None:
            self._graph = get_ekip_graph()
        return self._graph

    async def execute_query(self, req: QueryRequest, org_id: str = "acme_ai") -> QueryResponse:
        logger.info("Executing multi-agent query: %s for org: %s", req.query, org_id)

        initial_state = {
            "query": req.query,
            "session_id": req.session_id or "default_session",
            "user_id": "current_user",
            "org_id": org_id,
            "agent_trace": [],
        }

        # Invoke StateGraph
        final_state = await self.graph.ainvoke(initial_state)

        report = final_state.get("final_report") or {}
        confidence = final_state.get("confidence", 0.85)

        # Build response sources
        sources: list[SourceCitationModel] = []
        for s in final_state.get("sources", []):
            sources.append(
                SourceCitationModel(
                    document_id=s.get("document_id", ""),
                    document_title=s.get("document_title", ""),
                    chunk_text=s.get("chunk_text", ""),
                    relevance_score=s.get("relevance_score", 0.0),
                )
            )

        # Build agent trace
        trace: list[AgentStepModel] = []
        for t in final_state.get("agent_trace", []):
            if isinstance(t, dict):
                trace.append(AgentStepModel(**t))
            else:
                trace.append(
                    AgentStepModel(
                        agent_name=getattr(t, "agent_name", "unknown"),
                        action=getattr(t, "action", ""),
                        input_summary=getattr(t, "input_summary", ""),
                        output_summary=getattr(t, "output_summary", ""),
                        duration_ms=getattr(t, "duration_ms", 0),
                        status=getattr(t, "status", "success"),
                        error_message=getattr(t, "error_message", None),
                    )
                )

        return QueryResponse(
            answer=report.get("answer", "No answer generated."),
            summary=report.get("executive_summary", ""),
            sources=sources,
            confidence=confidence,
            follow_ups=report.get("follow_up_questions", []),
            agent_trace=trace,
        )


query_service = QueryService()
