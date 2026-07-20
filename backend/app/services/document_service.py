"""Document Ingestion Service."""

from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import UploadFile
from app.agents.ingestion.agent import IngestionAgent
from app.db.qdrant import get_qdrant_client_sync
from app.db.neo4j import get_neo4j_driver_sync
from app.llm.embeddings import get_embedding_service
from app.llm.factory import LLMFactory
from app.schemas.document import DocumentUploadResponse


class DocumentService:
    """Handles file uploads and triggers ingestion pipeline."""

    async def upload_document(
        self, file: UploadFile, category: str = "engineering", org_id: str = "acme_ai"
    ) -> DocumentUploadResponse:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        file_name = file.filename or "untitled.txt"
        file_type = file_name.split(".")[-1] if "." in file_name else "txt"

        agent = IngestionAgent(
            qdrant_client=get_qdrant_client_sync(),
            neo4j_driver=get_neo4j_driver_sync(),
            embedding_service=get_embedding_service(),
            llm_provider=LLMFactory.create_default(),
        )

        res = await agent.ingest_document(
            document_id=doc_id,
            org_id=org_id,
            title=file_name,
            file_name=file_name,
            file_type=file_type,
            content_bytes=content,
            category=category,
        )

        return DocumentUploadResponse(
            id=doc_id,
            title=file_name,
            status="processed" if res.get("success") else "error",
            chunk_count=res.get("chunk_count", 0),
            entities_found=res.get("entities_found", 0),
        )


document_service = DocumentService()
