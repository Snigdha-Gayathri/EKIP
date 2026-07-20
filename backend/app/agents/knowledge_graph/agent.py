"""
Knowledge Graph Agent — LangGraph Node

Queries Neo4j Aura to discover entity relationships, traverse the knowledge
graph, and return structured graph results to the Supervisor.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.agents.state import AgentStepTrace, EKIPState, GraphResult
from app.agents.knowledge_graph.prompts import KG_QUERY_SELECTION_PROMPT, KG_SYSTEM_PROMPT
from app.agents.knowledge_graph.queries import QUERY_TEMPLATES

logger = logging.getLogger(__name__)


async def kg_agent_node(state: EKIPState) -> dict[str, Any]:
    """
    Knowledge Graph Agent node in the LangGraph StateGraph.

    Uses LLM to select the best Cypher query template, executes it against
    Neo4j, and returns structured graph results.
    """
    start_time = time.time()
    query = state.get("query", "")

    logger.info("KG Agent executing for query: %s", query[:100])

    try:
        from app.llm.factory import LLMFactory
        from app.db.neo4j import get_neo4j_driver_sync

        llm = LLMFactory.create_default()
        driver = get_neo4j_driver_sync()

        # Step 1: Use LLM to select query template and extract entities
        template_names = list(QUERY_TEMPLATES.keys())
        selection_prompt = KG_QUERY_SELECTION_PROMPT.format(
            query=query,
            templates=", ".join(template_names),
        )

        selection_response = await llm.generate(
            prompt=selection_prompt,
            system_prompt=KG_SYSTEM_PROMPT,
        )

        # Parse template selection
        selection = _parse_selection(selection_response)
        selected_templates = selection.get("templates", ["search_entities"])
        entity_name = selection.get("entity_name")
        if not entity_name or entity_name.strip() == "":
            entity_name = query.strip()

        logger.info(
            "KG Agent selected templates: %s, entity: %s",
            selected_templates, entity_name
        )

        # Step 2: Execute selected Cypher queries
        all_results: list[GraphResult] = []
        node_types_list = ["Service", "Team", "Employee", "Document", "API", "SupportTicket", "Deployment", "Policy", "Customer"]

        async with driver.session() as session:
            for template_name in selected_templates:
                cypher = QUERY_TEMPLATES.get(template_name)
                if not cypher:
                    continue

                try:
                    result = await session.run(
                        cypher,
                        entity_name=entity_name,
                        entity_id=entity_name,
                        search_term=entity_name,
                        node_types=node_types_list,
                    )
                    records = await result.data()

                    for record in records:
                        graph_result = GraphResult(
                            entity_id=str(record.get("id", "")),
                            entity_type=template_name,
                            entity_name=entity_name,
                            properties=record,
                            relationships=[],
                            traversal_path=[template_name],
                        )
                        all_results.append(graph_result)

                    logger.info(
                        "Template '%s' returned %d records",
                        template_name, len(records)
                    )

                except Exception as e:
                    logger.warning("Template '%s' failed: %s", template_name, str(e))

        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("KG Agent found %d results in %dms", len(all_results), duration_ms)

        trace = AgentStepTrace(
            agent_name="kg",
            action="graph_query",
            input_summary=f"Query: {query[:80]}, Templates: {selected_templates}",
            output_summary=f"Found {len(all_results)} graph results",
            duration_ms=duration_ms,
            status="success",
        )

        return {
            "graph_results": all_results,
            "agent_trace": state.get("agent_trace", []) + [trace],
        }

    except Exception as e:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.error("KG Agent failed: %s", str(e))

        trace = AgentStepTrace(
            agent_name="kg",
            action="graph_query",
            input_summary=f"Query: {query[:80]}",
            output_summary="Graph query failed",
            duration_ms=duration_ms,
            status="error",
            error_message=str(e),
        )

        return {
            "graph_results": [],
            "agent_trace": state.get("agent_trace", []) + [trace],
        }


def _parse_selection(response: str) -> dict[str, Any]:
    """Parse the LLM template selection response."""
    try:
        cleaned = response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()
        return json.loads(cleaned)
    except (json.JSONDecodeError, IndexError):
        logger.warning("Failed to parse KG template selection, using defaults")
        return {"templates": ["search_entities"], "entity_name": ""}
