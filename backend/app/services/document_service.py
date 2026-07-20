"""Document Ingestion Service."""

from __future__ import annotations

import uuid
from datetime import datetime
from fastapi import UploadFile
from app.agents.ingestion.agent import get_ingestion_agent
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

        agent = get_ingestion_agent()

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
