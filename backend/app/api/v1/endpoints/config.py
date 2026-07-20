"""Configuration Validation Endpoint — validates user-provided API keys and service connections."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["Configuration"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ConfigValidateRequest(BaseModel):
    """Incoming API keys and connection details to validate."""

    gemini_api_key: str = ""
    groq_api_key: str = ""
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    neo4j_uri: str = ""
    neo4j_username: str = ""
    neo4j_password: str = ""
    supabase_url: str = ""
    supabase_anon_key: str = ""


class ServiceValidationResult(BaseModel):
    """Result of validating a single service connection."""

    connected: bool
    message: str


class ConfigValidateResponse(BaseModel):
    """Aggregated validation response for all services."""

    valid: bool
    results: dict[str, ServiceValidationResult]


# ---------------------------------------------------------------------------
# Individual validation helpers
# ---------------------------------------------------------------------------

_NOT_PROVIDED = ServiceValidationResult(connected=False, message="Not provided")


async def _validate_gemini(api_key: str) -> ServiceValidationResult:
    """Validate a Gemini API key by invoking a trivial chat request."""
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI

        llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=api_key,
        )
        await llm.ainvoke("Say 'ok'")
        return ServiceValidationResult(connected=True, message="Connected successfully")
    except Exception as exc:
        logger.warning("Gemini validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_groq(api_key: str) -> ServiceValidationResult:
    """Validate a Groq API key by invoking a trivial chat request."""
    try:
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model_name="llama-3.3-70b-versatile",
            groq_api_key=api_key,
        )
        await llm.ainvoke("Say 'ok'")
        return ServiceValidationResult(connected=True, message="Connected successfully")
    except Exception as exc:
        logger.warning("Groq validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_qdrant(url: str, api_key: str) -> ServiceValidationResult:
    """Validate Qdrant connectivity by listing collections."""
    try:
        from qdrant_client import QdrantClient

        kwargs: dict[str, Any] = {"url": url}
        if api_key:
            kwargs["api_key"] = api_key
        client = QdrantClient(**kwargs)
        client.get_collections()
        return ServiceValidationResult(connected=True, message="Connected successfully")
    except Exception as exc:
        logger.warning("Qdrant validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_neo4j(uri: str, username: str, password: str) -> ServiceValidationResult:
    """Validate Neo4j connectivity by verifying the driver connection."""
    try:
        from neo4j import AsyncGraphDatabase

        driver = AsyncGraphDatabase.driver(uri, auth=(username, password))
        try:
            await driver.verify_connectivity()
            return ServiceValidationResult(connected=True, message="Connected successfully")
        finally:
            await driver.close()
    except Exception as exc:
        logger.warning("Neo4j validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_supabase(url: str, anon_key: str) -> ServiceValidationResult:
    """Validate Supabase connectivity by creating a client."""
    try:
        from supabase import create_client

        create_client(url, anon_key)
        return ServiceValidationResult(connected=True, message="Connected successfully")
    except Exception as exc:
        logger.warning("Supabase validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=ConfigValidateResponse)
async def validate_config(body: ConfigValidateRequest) -> ConfigValidateResponse:
    """Validate provided API keys and service connections.

    Only non-empty values are tested.  The overall ``valid`` flag is ``True``
    when at least the Gemini key validates successfully.
    """
    results: dict[str, ServiceValidationResult] = {}

    # Gemini
    if body.gemini_api_key:
        results["gemini"] = await _validate_gemini(body.gemini_api_key)
    else:
        results["gemini"] = _NOT_PROVIDED

    # Groq
    if body.groq_api_key:
        results["groq"] = await _validate_groq(body.groq_api_key)
    else:
        results["groq"] = _NOT_PROVIDED

    # Qdrant
    if body.qdrant_url:
        results["qdrant"] = await _validate_qdrant(body.qdrant_url, body.qdrant_api_key)
    else:
        results["qdrant"] = _NOT_PROVIDED

    # Neo4j
    if body.neo4j_uri:
        results["neo4j"] = await _validate_neo4j(
            body.neo4j_uri, body.neo4j_username, body.neo4j_password,
        )
    else:
        results["neo4j"] = _NOT_PROVIDED

    # Supabase
    if body.supabase_url and body.supabase_anon_key:
        results["supabase"] = await _validate_supabase(body.supabase_url, body.supabase_anon_key)
    else:
        results["supabase"] = _NOT_PROVIDED

    overall_valid = results.get("gemini", _NOT_PROVIDED).connected

    return ConfigValidateResponse(valid=overall_valid, results=results)
