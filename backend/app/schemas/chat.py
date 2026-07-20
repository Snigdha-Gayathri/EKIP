"""Chat Session & Memory Schemas."""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel


class ChatMessage(BaseModel):
    id: str
    role: str  # user | assistant
    content: str
    created_at: datetime
    confidence: float | None = None
    sources: list[dict] | None = None


class ChatSession(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSession]
