"""
Supervisor Agent — Core Logic

The Supervisor Agent is the central orchestrator. It classifies user intent,
creates an execution plan, and routes to specialized agents via LangGraph
conditional edges. It NEVER answers questions directly.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from app.agents.state import AgentStepTrace, EKIPState
from app.agents.supervisor.prompts import (
    INTENT_CLASSIFICATION_PROMPT,
    SUPERVISOR_SYSTEM_PROMPT,
)

logger = logging.getLogger(__name__)

# ---- Intent → Plan mapping ----
INTENT_PLAN_MAP: dict[str, list[str]] = {
    "document_search": ["search", "kg", "reasoning", "report"],
    "relationship_query": ["search", "kg", "reasoning", "report"],
    "factual_lookup": ["kg", "search", "reasoning", "report"],
    "complex_analysis": ["search", "kg", "reasoning", "report"],
    "summarization": ["search", "kg", "reasoning", "report"],
    "troubleshooting": ["search", "kg", "reasoning", "report"],
}


async def supervisor_node(state: EKIPState) -> dict[str, Any]:
    """
    Supervisor agent node in the LangGraph StateGraph.

    On first invocation: Classifies intent and creates execution plan.
    On subsequent invocations: Advances to the next step in the plan.
    """
    start_time = time.time()

    # Safety check: prevent infinite loops
    iteration_count = state.get("iteration_count", 0) + 1
    max_iterations = state.get("max_iterations", 10)

    if iteration_count > max_iterations:
        logger.warning("Supervisor hit max iterations (%d), forcing completion", max_iterations)
        return {
            "error": f"Max iterations ({max_iterations}) exceeded",
            "iteration_count": iteration_count,
            "agent_trace": state.get("agent_trace", []) + [
                AgentStepTrace(
                    agent_name="supervisor",
                    action="max_iterations_exceeded",
                    input_summary=state.get("query", ""),
                    output_summary="Forced termination due to iteration limit",
                    duration_ms=int((time.time() - start_time) * 1000),
                    status="error",
                    error_message=f"Exceeded {max_iterations} iterations",
                )
            ],
        }

    # First invocation: classify intent and create plan
    if not state.get("intent"):
        return await _classify_and_plan(state, start_time, iteration_count)

    # Subsequent invocations: advance to next step
    return _advance_plan(state, start_time, iteration_count)


async def _classify_and_plan(
    state: EKIPState, start_time: float, iteration_count: int
) -> dict[str, Any]:
    """Classify user intent and create the execution plan."""
    query = state.get("query", "")
    logger.info("Supervisor classifying intent for query: %s", query[:100])

    try:
        # Use LLM to classify intent
        from app.llm.factory import LLMFactory

        llm = LLMFactory.create_default()

        classification_prompt = INTENT_CLASSIFICATION_PROMPT.format(query=query)
        response = await llm.generate(
            prompt=classification_prompt,
            system_prompt=SUPERVISOR_SYSTEM_PROMPT,
        )

        # Parse the LLM response
        parsed = _parse_classification(response, query)
        intent = parsed.get("intent", "complex_analysis")
        plan = INTENT_PLAN_MAP.get(intent, INTENT_PLAN_MAP["complex_analysis"])
        entities = parsed.get("entities", [])
        search_query = parsed.get("search_query", query)

        logger.info("Classified intent: %s, plan: %s, entities: %s", intent, plan, entities)

        trace = AgentStepTrace(
            agent_name="supervisor",
            action="classify_and_plan",
            input_summary=f"Query: {query[:100]}",
            output_summary=f"Intent: {intent}, Plan: {plan}",
            duration_ms=int((time.time() - start_time) * 1000),
            status="success",
        )

        return {
            "intent": intent,
            "plan": plan,
            "current_step": 0,
            "iteration_count": iteration_count,
            "messages": [
                SystemMessage(content=SUPERVISOR_SYSTEM_PROMPT),
                HumanMessage(content=query),
                AIMessage(
                    content=f"Intent classified as '{intent}'. "
                    f"Executing plan: {' → '.join(plan)}. "
                    f"Entities detected: {entities}. "
                    f"Optimized search query: '{search_query}'"
                ),
            ],
            "agent_trace": state.get("agent_trace", []) + [trace],
        }

    except Exception as e:
        logger.error("Supervisor classification failed: %s", str(e))
        # Fallback to complex_analysis plan
        fallback_plan = INTENT_PLAN_MAP["complex_analysis"]
        return {
            "intent": "complex_analysis",
            "plan": fallback_plan,
            "current_step": 0,
            "iteration_count": iteration_count,
            "error": None,
            "agent_trace": state.get("agent_trace", []) + [
                AgentStepTrace(
                    agent_name="supervisor",
                    action="classify_and_plan",
                    input_summary=f"Query: {query[:100]}",
                    output_summary=f"Classification failed, fallback to complex_analysis: {fallback_plan}",
                    duration_ms=int((time.time() - start_time) * 1000),
                    status="error",
                    error_message=str(e),
                )
            ],
        }


def _advance_plan(
    state: EKIPState, start_time: float, iteration_count: int
) -> dict[str, Any]:
    """Advance to the next step in the execution plan."""
    plan = state.get("plan", [])
    current_step = state.get("current_step", 0) + 1

    logger.info("Supervisor advancing to step %d/%d in plan", current_step, len(plan))

    trace = AgentStepTrace(
        agent_name="supervisor",
        action="advance_plan",
        input_summary=f"Step {current_step}/{len(plan)}",
        output_summary=f"Next: {plan[current_step] if current_step < len(plan) else 'done'}",
        duration_ms=int((time.time() - start_time) * 1000),
        status="success",
    )

    return {
        "current_step": current_step,
        "iteration_count": iteration_count,
        "agent_trace": state.get("agent_trace", []) + [trace],
    }


def route_from_supervisor(state: EKIPState) -> str:
    """
    Conditional edge function: determines which agent node to route to next.

    Called by LangGraph after the supervisor node executes.
    Returns the name of the next node or "done" to end.
    """
    plan = state.get("plan", [])
    current_step = state.get("current_step", 0)
    error = state.get("error")

    # If there's an error, go directly to report for error handling
    if error:
        return "report"

    # If we've completed all steps, we're done
    if current_step >= len(plan):
        return "done"

    next_agent = plan[current_step]
    logger.info("Routing to agent: %s (step %d/%d)", next_agent, current_step + 1, len(plan))

    # Map plan step names to graph node names
    node_map = {
        "search": "search_agent",
        "kg": "kg_agent",
        "reasoning": "reasoning",
        "report": "report",
    }

    return node_map.get(next_agent, "done")


def _parse_classification(response: str, original_query: str) -> dict[str, Any]:
    """Parse the LLM classification response, handling malformed JSON gracefully."""
    try:
        # Try to extract JSON from the response
        # Handle cases where LLM wraps JSON in markdown code blocks
        cleaned = response.strip()
        if "```json" in cleaned:
            cleaned = cleaned.split("```json")[1].split("```")[0].strip()
        elif "```" in cleaned:
            cleaned = cleaned.split("```")[1].split("```")[0].strip()

        parsed = json.loads(cleaned)

        # Validate required fields
        valid_intents = set(INTENT_PLAN_MAP.keys())
        if parsed.get("intent") not in valid_intents:
            parsed["intent"] = "complex_analysis"

        return parsed

    except (json.JSONDecodeError, IndexError, KeyError) as e:
        logger.warning("Failed to parse classification response: %s", str(e))
        # Return sensible defaults
        return {
            "intent": "complex_analysis",
            "entities": [],
            "search_query": original_query,
            "information_type": "general",
        }
