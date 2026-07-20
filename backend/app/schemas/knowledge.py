"""Knowledge Graph Visualization & Traversal Schemas."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str
    label: str
    properties: dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relationship: str
    properties: dict[str, Any] = {}


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class EntityDetail(BaseModel):
    id: str
    name: str
    type: str
    properties: dict[str, Any]
    neighbors: GraphData


class TraversalRequest(BaseModel):
    entity_id: str
    max_depth: int = 2


class TraversalResponse(BaseModel):
    graph: GraphData


class ArchitectureServiceBlock(BaseModel):
    id: str
    name: str
    tier: str
    language: str | None = "Go"
    description: str | None = "Enterprise microservice component"
    owner_team: str | None = "Platform Team"
    lead_contact: str | None = "james.liu@acmeai.com"
    apis: list[str] = []
    dependencies: list[str] = []
    downstream_services: list[str] = []
    upstream_services: list[str] = []
    related_repositories: list[str] = []
    related_incidents: list[str] = []
    documentation: list[str] = []
    environment: str = "Production"
    criticality: str = "High"
    recent_changes: list[str] = []


class ArchitectureOverviewResponse(BaseModel):
    services: list[ArchitectureServiceBlock]
    tiers: list[str]
    departments: list[str]
    total_services: int
    total_dependencies: int


class AffectedEntitySummary(BaseModel):
    id: str
    name: str
    type: str  # Service, API, Team, Repository, Incident, Document
    impact_level: str  # Direct, Downstream, Systemic
    criticality: str  # High, Medium, Low


class ImpactAnalysisResponse(BaseModel):
    target_entity: str
    target_type: str
    blast_radius_depth: int
    criticality_score: float  # e.g. 9.4 out of 10
    overall_risk_level: str  # HIGH, MEDIUM, LOW
    total_dependent_services: int
    affected_teams_count: int
    impacted_apis_count: int
    incident_history_count: int
    affected_services: list[AffectedEntitySummary]
    affected_apis: list[AffectedEntitySummary]
    affected_teams: list[AffectedEntitySummary]
    related_repositories: list[AffectedEntitySummary]
    recent_incidents: list[AffectedEntitySummary]
    critical_documents: list[AffectedEntitySummary]
    security_risks: list[str]
    impact_graph: GraphData


class ShortestPathResponse(BaseModel):
    source_id: str
    target_id: str
    path_found: bool
    path_nodes: list[GraphNode]
    path_edges: list[GraphEdge]
    total_hops: int
    description: str


class SearchResultItem(BaseModel):
    id: str
    name: str
    type: str
    snippet: str | None = None
    properties: dict[str, Any] = {}


class GraphSearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]


class EdgeInspectionDetails(BaseModel):
    edge_id: str
    source_id: str
    source_name: str
    target_id: str
    target_name: str
    relationship: str
    confidence: float = 0.98
    description: str
    supporting_document: str = "acme-architecture-overview.md"
    extracted_evidence: str
    similarity_score: float = 0.96
    cypher_query: str
    date_discovered: str = "2025-06-15"
    last_verified: str = "Today"
