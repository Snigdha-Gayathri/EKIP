"""Chat & Memory Service."""

from __future__ import annotations

import uuid
from datetime import datetime
from app.schemas.chat import ChatSession, ChatMessage


class ChatService:
    """Manages chat sessions and conversation history."""

    def __init__(self):
        self._sessions: dict[str, ChatSession] = {}
        self._messages: dict[str, list[ChatMessage]] = {}

    async def create_session(self, title: str = "New Knowledge Session") -> ChatSession:
        sid = str(uuid.uuid4())
        session = ChatSession(
            id=sid,
            title=title,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self._sessions[sid] = session
        self._messages[sid] = []
        return session

    async def list_sessions() -> list[ChatSession]:
        return list(self._sessions.values())


chat_service = ChatService()
