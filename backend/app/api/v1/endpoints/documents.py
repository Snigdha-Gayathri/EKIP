"""Documents Upload & Management Endpoint."""

from __future__ import annotations

from fastapi import APIRouter, UploadFile, File, Form
from app.schemas.document import DocumentUploadResponse
from app.services.document_service import document_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("engineering"),
):
    """Upload enterprise document and trigger hybrid indexing & graph extraction."""
    return await document_service.upload_document(file, category=category)
