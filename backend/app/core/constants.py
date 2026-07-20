"""Application constants."""

from __future__ import annotations

SUPPORTED_FILE_TYPES = {"pdf", "docx", "txt", "md", "csv", "html", "json"}
DOCUMENT_CATEGORIES = {
    "engineering", "devops", "hr", "security", "product",
    "support", "meeting_notes", "wiki", "architecture"
}
AGENT_NAMES = {"supervisor", "search", "kg", "reasoning", "report", "ingestion"}
