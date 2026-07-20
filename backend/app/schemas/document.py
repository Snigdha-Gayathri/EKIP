"""Document Management Schemas."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class DocumentMetadata(BaseModel):
    id: str
    title: str
    category: str
    doc_type: str
    version: str = "1.0"
    created_at: datetime
    updated_at: datetime
    chunk_count: int = 0
    status: str = "processed"


class DocumentUploadResponse(BaseModel):
    id: str
    title: str
    status: str
    chunk_count: int
    entities_found: int


class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    version: str
    created_at: datetime
