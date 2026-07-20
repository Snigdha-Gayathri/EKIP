export interface DocumentMetadata {
  id: string;
  title: string;
  category: string;
  doc_type: string;
  version: string;
  created_at: string;
  updated_at: string;
  chunk_count: number;
  status: string;
}

export interface DocumentUploadResponse {
  id: string;
  title: string;
  status: string;
  chunk_count: number;
  entities_found: number;
}
