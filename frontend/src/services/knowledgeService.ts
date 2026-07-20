import { apiClient } from './api';
import {
  GraphData,
  ArchitectureOverviewResponse,
  ImpactAnalysisResponse,
  ShortestPathResponse,
  GraphSearchResponse,
  EdgeInspectionDetails,
} from '../types/knowledge';

export const knowledgeService = {
  getGraphOverview: async (limit: number = 100): Promise<GraphData> => {
    const response = await apiClient.get<GraphData>(`/knowledge/graph?limit=${limit}`);
    return response.data;
  },
  traverseEntity: async (nodeId: string): Promise<GraphData> => {
    const response = await apiClient.get<GraphData>(`/knowledge/traverse?node_id=${encodeURIComponent(nodeId)}`);
    return response.data;
  },
  getArchitecture: async (): Promise<ArchitectureOverviewResponse> => {
    const response = await apiClient.get<ArchitectureOverviewResponse>('/knowledge/architecture');
    return response.data;
  },
  getImpactAnalysis: async (entity: string, hops: number = 2): Promise<ImpactAnalysisResponse> => {
    const response = await apiClient.get<ImpactAnalysisResponse>(`/knowledge/impact?entity=${encodeURIComponent(entity)}&hops=${hops}`);
    return response.data;
  },
  getShortestPath: async (source: string, target: string): Promise<ShortestPathResponse> => {
    const response = await apiClient.get<ShortestPathResponse>(`/knowledge/shortest-path?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`);
    return response.data;
  },
  searchGraph: async (query: string): Promise<GraphSearchResponse> => {
    const response = await apiClient.get<GraphSearchResponse>(`/knowledge/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },
  getEdgeDetails: async (sourceId: string, targetId: string, relType: string): Promise<EdgeInspectionDetails> => {
    const response = await apiClient.get<EdgeInspectionDetails>(`/knowledge/edge-details?source_id=${encodeURIComponent(sourceId)}&target_id=${encodeURIComponent(targetId)}&rel_type=${encodeURIComponent(relType)}`);
    return response.data;
  },
};

