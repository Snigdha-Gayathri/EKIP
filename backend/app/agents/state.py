"""
EKIP Shared Agent State

Defines the TypedDict state that flows through the entire LangGraph
multi-agent workflow. Every agent reads from and writes to this shared state.
"""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langgraph.graph.message import add_messages


class SourceCitation(TypedDict, total=False):
    """A single source citation for grounding."""

    document_id: str
    document_title: str
    chunk_text: str
    relevance_score: float
    page_number: int | None
    section: str | None


class AgentStepTrace(TypedDict, total=False):
    """Trace of a single agent execution step for observability."""

    agent_name: str
    action: str
    input_summary: str
    output_summary: str
    duration_ms: int
    status: str  # "running" | "success" | "error"
    error_message: str | None


class SearchResult(TypedDict, total=False):
    """A single search result from Qdrant."""

    chunk_id: str
    document_id: str
    document_title: str
    chunk_text: str
    chunk_index: int
    score: float
    doc_type: str
    category: str
    tags: list[str]
    metadata: dict[str, Any]


class GraphResult(TypedDict, total=False):
    """A single result from Neo4j knowledge graph traversal."""

    entity_id: str
    entity_type: str  # Employee, Team, Service, Document, API, etc.
    entity_name: str
    properties: dict[str, Any]
    relationships: list[dict[str, Any]]
    traversal_path: list[str]


class ReasoningOutput(TypedDict, total=False):
    """Output from the Reasoning Agent."""

    merged_evidence: list[dict[str, Any]]
    reasoning_chain: list[str]
    conflicts_resolved: list[str]
    duplicates_removed: int
    confidence: float
    answer_draft: str


class FinalReport(TypedDict, total=False):
    """The final structured response from the Report Agent."""

    answer: str
    executive_summary: str
    bullet_points: list[str]
    sources: list[SourceCitation]
    related_documents: list[dict[str, str]]
    confidence: float
    follow_up_questions: list[str]
    agent_trace: list[AgentStepTrace]
    problem_resolution_plan: list[dict[str, Any]]
    feasibility_assessment: dict[str, Any]


class EKIPState(TypedDict, total=False):
    """
    Shared state flowing through the entire EKIP multi-agent LangGraph workflow.

    This is the single source of truth for all agent communication.
    Agents never communicate directly — they read from and write to this state.

    Flow: Supervisor → Search/KG → Reasoning → Report → END
    """

    # ---- Input (set by the API layer) ----
    query: str
    user_id: str
    org_id: str
    session_id: str

    # ---- Message History (appended via LangGraph reducer) ----
    messages: Annotated[list, add_messages]

    # ---- Supervisor Decisions ----
    intent: str  # document_search | relationship_query | factual_lookup | complex_analysis | summarization | troubleshooting
    plan: list[str]  # Ordered list of agents to invoke: ["search", "kg", "reasoning", "report"]
    current_step: int  # Index into the plan
    iteration_count: int  # Safety counter to prevent infinite loops

    # ---- Agent Outputs ----
    search_results: list[SearchResult] | None
    graph_results: list[GraphResult] | None
    reasoning_output: ReasoningOutput | None
    final_report: FinalReport | None

    # ---- Metadata ----
    confidence: float
    sources: list[SourceCitation]
    agent_trace: list[AgentStepTrace]

    # ---- Control Flow ----
    error: str | None
    max_iterations: int  # Hard stop to prevent runaway loops (default: 10)
