export interface GraphNode {
  id: string;
  type: string;
  label: string;
  properties?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  properties?: Record<string, any>;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ArchitectureServiceBlock {
  id: string;
  name: string;
  tier: string;
  language?: string;
  description?: string;
  owner_team?: string;
  lead_contact?: string;
  apis: string[];
  dependencies: string[];
  downstream_services: string[];
  upstream_services: string[];
  related_repositories: string[];
  related_incidents: string[];
  documentation: string[];
  environment: string;
  criticality: string;
  recent_changes: string[];
}

export interface ArchitectureOverviewResponse {
  services: ArchitectureServiceBlock[];
  tiers: string[];
  departments: string[];
  total_services: number;
  total_dependencies: number;
}

export interface AffectedEntitySummary {
  id: string;
  name: string;
  type: string;
  impact_level: string;
  criticality: string;
}

export interface ImpactAnalysisResponse {
  target_entity: string;
  target_type: string;
  blast_radius_depth: number;
  criticality_score: number;
  overall_risk_level: 'HIGH' | 'MEDIUM' | 'LOW' | string;
  total_dependent_services: number;
  affected_teams_count: number;
  impacted_apis_count: number;
  incident_history_count: number;
  affected_services: AffectedEntitySummary[];
  affected_apis: AffectedEntitySummary[];
  affected_teams: AffectedEntitySummary[];
  related_repositories: AffectedEntitySummary[];
  recent_incidents: AffectedEntitySummary[];
  critical_documents: AffectedEntitySummary[];
  security_risks: string[];
  impact_graph: GraphData;
}

export interface ShortestPathResponse {
  source_id: string;
  target_id: string;
  path_found: boolean;
  path_nodes: GraphNode[];
  path_edges: GraphEdge[];
  total_hops: number;
  description: string;
}

export interface SearchResultItem {
  id: string;
  name: string;
  type: string;
  snippet?: string;
  properties?: Record<string, any>;
}

export interface GraphSearchResponse {
  query: string;
  total_results: number;
  results: SearchResultItem[];
}

export interface EdgeInspectionDetails {
  edge_id: string;
  source_id: string;
  source_name: string;
  target_id: string;
  target_name: string;
  relationship: string;
  confidence: number;
  description: string;
  supporting_document: string;
  extracted_evidence: string;
  similarity_score: number;
  cypher_query: string;
  date_discovered: string;
  last_verified: string;
}
