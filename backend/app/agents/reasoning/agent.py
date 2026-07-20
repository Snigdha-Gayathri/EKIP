"""
Reasoning Agent — LangGraph Node

Combines retrieved evidence from Search and Knowledge Graph agents,
resolves conflicts, deducts duplicates, builds a reasoning chain,
and calculates an overall confidence score.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.agents.reasoning.prompts import REASONING_SYSTEM_PROMPT, REASONING_USER_PROMPT
from app.agents.state import (
    AgentStepTrace,
    EKIPState,
    ReasoningOutput,
    SourceCitation,
)

logger = logging.getLogger(__name__)


async def reasoning_node(state: EKIPState) -> dict[str, Any]:
    """
    Reasoning Agent node in the LangGraph StateGraph.

    Synthesizes search_results and graph_results into a coherent reasoning output
    with confidence score and grounded draft.
    """
    start_time = time.time()
    query = state.get("query", "")
    search_results = state.get("search_results") or []
    graph_results = state.get("graph_results") or []

    logger.info("Reasoning Agent synthesizing %d search results and %d graph results", len(search_results), len(graph_results))

    # Format search results for prompt
    formatted_search = []
    for idx, sr in enumerate(search_results):
        formatted_search.append(
            f"[{idx+1}] Title: {sr.get('document_title', 'Unknown')} (ID: {sr.get('document_id', '')}, Score: {sr.get('score', 0):.2f})\n"
            f"Content: {sr.get('chunk_text', '')}"
        )
    search_text = "\n\n".join(formatted_search) if formatted_search else "No document search results retrieved."

    # Format graph results for prompt
    formatted_graph = []
    for idx, gr in enumerate(graph_results):
        formatted_graph.append(
            f"[{idx+1}] Entity: {gr.get('entity_name', '')} (Type: {gr.get('entity_type', '')})\n"
            f"Properties: {json.dumps(gr.get('properties', {}))}\n"
            f"Relationships: {json.dumps(gr.get('relationships', []))}"
        )
    graph_text = "\n\n".join(formatted_graph) if formatted_graph else "No knowledge graph relationships retrieved."

    try:
        from app.llm.factory import LLMFactory

        llm = LLMFactory.create_default()
        prompt = REASONING_USER_PROMPT.format(
            query=query,
            search_results=search_text,
            graph_results=graph_text,
        )

        response = await llm.generate(
            prompt=prompt,
            system_prompt=REASONING_SYSTEM_PROMPT,
        )

        parsed = _parse_json_response(response)

        reasoning_output: ReasoningOutput = {
            "merged_evidence": [
                {"type": "search", "count": len(search_results)},
                {"type": "graph", "count": len(graph_results)},
            ],
            "reasoning_chain": parsed.get("reasoning_chain", ["Synthesized retrieved evidence."]),
            "conflicts_resolved": parsed.get("conflicts_resolved", []),
            "duplicates_removed": int(parsed.get("duplicates_removed", 0)),
            "confidence": float(parsed.get("confidence", 0.85)),
            "answer_draft": parsed.get("answer_draft", "Grounded synthesis of retrieved information."),
        }

        # Build citations list
        citations: list[SourceCitation] = []
        for sr in search_results:
            citations.append(
                {
                    "document_id": sr.get("document_id", ""),
                    "document_title": sr.get("document_title", ""),
                    "chunk_text": sr.get("chunk_text", "")[:300],
                    "relevance_score": sr.get("score", 0.0),
                }
            )

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("Reasoning Agent finished in %dms with confidence %.2f", duration_ms, reasoning_output["confidence"])

        trace = AgentStepTrace(
            agent_name="reasoning",
            action="evidence_synthesis",
            input_summary=f"Search items: {len(search_results)}, Graph items: {len(graph_results)}",
            output_summary=f"Confidence: {reasoning_output['confidence']:.2f}, Steps: {len(reasoning_output['reasoning_chain'])}",
            duration_ms=duration_ms,
            status="success",
        )

        return {
            "reasoning_output": reasoning_output,
            "confidence": reasoning_output["confidence"],
            "sources": citations,
            "agent_trace": state.get("agent_trace", []) + [trace],
        }

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error("Reasoning Agent failed: %s", str(e))

        # Fallback reasoning output
        fallback_output: ReasoningOutput = {
            "merged_evidence": [],
            "reasoning_chain": ["Synthesized available evidence directly."],
            "conflicts_resolved": [],
            "duplicates_removed": 0,
            "confidence": 0.70,
            "answer_draft": search_results[0].get("chunk_text", "") if search_results else "No evidence available.",
        }

        trace = AgentStepTrace(
            agent_name="reasoning",
            action="evidence_synthesis",
            input_summary=f"Query: {query[:80]}",
            output_summary="Reasoning failed, used fallback synthesis",
            duration_ms=duration_ms,
            status="error",
            error_message=str(e),
        )

        return {
            "reasoning_output": fallback_output,
            "confidence": 0.70,
            "agent_trace": state.get("agent_trace", []) + [trace],
        }


def _parse_json_response(response: str) -> dict[str, Any]:
    """Parse JSON output from LLM, cleaning markdown fences if necessary."""
    try:
        cleaned = response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)
    except Exception as e:
        logger.warning("Failed to parse reasoning JSON: %s", e)
        return {
            "reasoning_chain": [response[:200]],
            "confidence": 0.75,
            "answer_draft": response,
        }
