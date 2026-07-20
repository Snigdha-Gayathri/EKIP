"""Custom application exceptions."""

from __future__ import annotations


class EKIPException(Exception):
    """Base exception for all EKIP custom exceptions."""
    def __init__(self, message: str, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class DocumentNotFoundError(EKIPException):
    def __init__(self, document_id: str):
        super().__init__(f"Document not found: {document_id}", status_code=404)


class IngestionError(EKIPException):
    def __init__(self, message: str):
        super().__init__(f"Document ingestion failed: {message}", status_code=400)


class AgentExecutionError(EKIPException):
    def __init__(self, agent_name: str, message: str):
        super().__init__(f"Agent '{agent_name}' execution error: {message}", status_code=500)


class AuthenticationError(EKIPException):
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(EKIPException):
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, status_code=403)
