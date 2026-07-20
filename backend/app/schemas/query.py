"""Query and Agent Execution Schemas."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, description="User question")
    session_id: str | None = None
    filters: dict[str, Any] | None = None


class SourceCitationModel(BaseModel):
    document_id: str
    document_title: str
    chunk_text: str
    relevance_score: float


class AgentStepModel(BaseModel):
    agent_name: str
    action: str
    input_summary: str
    output_summary: str
    duration_ms: int
    status: str
    error_message: str | None = None


class ProblemStepModel(BaseModel):
    step_number: int
    action_title: str
    target_system: str
    command_or_config: str
    runbook_reference: str
    estimated_time_mins: int
    owner_team: str


class FeasibilityAssessmentModel(BaseModel):
    overall_feasibility_score: int  # e.g. 92 out of 100
    feasibility_rating: str  # e.g. "HIGH - Fully Viable with Existing Resources"
    required_resources: list[str]
    risk_analysis: str
    estimated_recovery_time: str
    grounding_notes: str


class QueryResponse(BaseModel):
    answer: str
    summary: str
    sources: list[SourceCitationModel]
    confidence: float
    follow_ups: list[str]
    agent_trace: list[AgentStepModel]
    problem_resolution_plan: list[ProblemStepModel] | None = None
    feasibility_assessment: FeasibilityAssessmentModel | None = None
