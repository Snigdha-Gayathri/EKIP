/* ─── Query Types ─── */

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'uncertain';

export interface SourceCitation {
  id: string;
  documentId: string;
  documentTitle: string;
  excerpt: string;
  pageNumber?: number;
  chunkIndex?: number;
  relevanceScore: number;
  highlightRanges?: Array<{ start: number; end: number }>;
}

export interface AgentStep {
  id: string;
  agentName: string;
  action: string;
  input: string;
  output: string;
  duration: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Query {
  id: string;
  text: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  createdAt: string;
  completedAt?: string;
  organizationId?: string;
}

export interface QueryResponse {
  id: string;
  queryId: string;
  answer: string;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  citations: SourceCitation[];
  agentSteps: AgentStep[];
  processingTime: number;
  modelUsed: string;
  tokensUsed: number;
  createdAt: string;
}

export interface StreamChunk {
  type: 'token' | 'citation' | 'agent_step' | 'metadata' | 'done' | 'error';
  content: string;
  data?: unknown;
}
