"""Query Endpoint — Multi-Agent Query execution and SSE streaming."""

from __future__ import annotations

import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.schemas.query import QueryRequest, QueryResponse
from app.services.query_service import query_service

router = APIRouter(prefix="/query", tags=["Query"])


@router.post("", response_model=QueryResponse)
async def submit_query(req: QueryRequest) -> QueryResponse:
    """Execute query against the LangGraph multi-agent system."""
    return await query_service.execute_query(req)


@router.post("/stream")
async def submit_query_stream(req: QueryRequest):
    """Stream multi-agent step events via Server-Sent Events (SSE)."""
    async def sse_generator():
        # Yield initial SSE event
        yield f"data: {json.dumps({'type': 'start', 'query': req.query})}\n\n"
        res = await query_service.execute_query(req)
        for trace in res.agent_trace:
            event_data = {
                "type": "agent_trace",
                "agent": trace.agent_name,
                "action": trace.action,
                "output": trace.output_summary,
            }
            yield f"data: {json.dumps(event_data)}\n\n"
        final_data = {
            "type": "result",
            "answer": res.answer,
            "confidence": res.confidence,
            "sources": [s.model_dump() for s in res.sources],
        }
        yield f"data: {json.dumps(final_data)}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
