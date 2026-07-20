"""Configuration Validation Endpoint — validates user-provided API keys and service connections."""

from __future__ import annotations

import asyncio
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
    """Validate a Gemini API key via lightweight REST endpoint check."""
    try:
        import httpx

        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}&pageSize=1"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return ServiceValidationResult(connected=True, message="Connected successfully")
            elif resp.status_code in (400, 401, 403):
                try:
                    data = resp.json()
                    err_msg = data.get("error", {}).get("message", "Invalid API key")
                except Exception:
                    err_msg = f"Invalid API key (Status {resp.status_code})"
                return ServiceValidationResult(connected=False, message=err_msg)
            else:
                return ServiceValidationResult(connected=False, message=f"Validation failed (Status {resp.status_code})")
    except Exception as exc:
        logger.warning("Gemini validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_groq(api_key: str) -> ServiceValidationResult:
    """Validate a Groq API key via lightweight REST endpoint check."""
    try:
        import httpx

        url = "https://api.groq.com/openai/v1/models"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
            if resp.status_code == 200:
                return ServiceValidationResult(connected=True, message="Connected successfully")
            elif resp.status_code in (401, 403):
                try:
                    data = resp.json()
                    err_msg = data.get("error", {}).get("message", "Invalid API key")
                except Exception:
                    err_msg = f"Invalid API key (Status {resp.status_code})"
                return ServiceValidationResult(connected=False, message=err_msg)
            else:
                return ServiceValidationResult(connected=False, message=f"Validation failed (Status {resp.status_code})")
    except Exception as exc:
        logger.warning("Groq validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_qdrant(url: str, api_key: str) -> ServiceValidationResult:
    """Validate Qdrant connectivity asynchronously by listing collections."""
    try:
        from qdrant_client import AsyncQdrantClient

        kwargs: dict[str, Any] = {"url": url, "timeout": 3.0}
        if api_key:
            kwargs["api_key"] = api_key
        client = AsyncQdrantClient(**kwargs)
        try:
            await client.get_collections()
            return ServiceValidationResult(connected=True, message="Connected successfully")
        finally:
            await client.close()
    except Exception as exc:
        logger.warning("Qdrant validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_neo4j(uri: str, username: str, password: str) -> ServiceValidationResult:
    """Validate Neo4j connectivity with connection timeouts."""
    try:
        from neo4j import AsyncGraphDatabase

        driver = AsyncGraphDatabase.driver(
            uri,
            auth=(username, password),
            connection_timeout=3.0,
            max_connection_lifetime=3.0,
        )
        try:
            await driver.verify_connectivity()
            return ServiceValidationResult(connected=True, message="Connected successfully")
        finally:
            await driver.close()
    except Exception as exc:
        logger.warning("Neo4j validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _validate_supabase(url: str, anon_key: str) -> ServiceValidationResult:
    """Validate Supabase connectivity via lightweight PostgREST check."""
    try:
        import httpx

        check_url = f"{url.rstrip('/')}/rest/v1/"
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(
                check_url,
                headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
            )
            if resp.status_code in (200, 400, 404):
                return ServiceValidationResult(connected=True, message="Connected successfully")
            elif resp.status_code in (401, 403):
                return ServiceValidationResult(connected=False, message="Invalid Supabase API key / unauthorized")
            else:
                return ServiceValidationResult(connected=False, message=f"Validation failed (Status {resp.status_code})")
    except Exception as exc:
        logger.warning("Supabase validation failed: %s", exc)
        return ServiceValidationResult(connected=False, message=str(exc))


async def _run_with_timeout(name: str, coro) -> ServiceValidationResult:
    """Run a single validation coroutine with a strict timeout."""
    try:
        return await asyncio.wait_for(coro, timeout=3.5)
    except asyncio.TimeoutError:
        logger.warning("%s validation timed out (3.5s)", name)
        return ServiceValidationResult(connected=False, message="Connection timed out (3.5s)")
    except Exception as exc:
        logger.warning("%s validation failed: %s", name, exc)
        return ServiceValidationResult(connected=False, message=str(exc))


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post("/validate", response_model=ConfigValidateResponse)
async def validate_config(body: ConfigValidateRequest) -> ConfigValidateResponse:
    """Validate provided API keys and service connections.

    Only non-empty values are tested. Validations run concurrently with strict
    timeouts so requests never hang or cause a network error.
    The overall ``valid`` flag is ``True`` when at least the Gemini key validates successfully.
    """
    results: dict[str, ServiceValidationResult] = {}
    tasks: dict[str, Any] = {}

    # Gemini
    if body.gemini_api_key:
        tasks["gemini"] = _run_with_timeout("Gemini", _validate_gemini(body.gemini_api_key))
    else:
        results["gemini"] = _NOT_PROVIDED

    # Groq
    if body.groq_api_key:
        tasks["groq"] = _run_with_timeout("Groq", _validate_groq(body.groq_api_key))
    else:
        results["groq"] = _NOT_PROVIDED

    # Qdrant
    if body.qdrant_url:
        tasks["qdrant"] = _run_with_timeout("Qdrant", _validate_qdrant(body.qdrant_url, body.qdrant_api_key))
    else:
        results["qdrant"] = _NOT_PROVIDED

    # Neo4j
    if body.neo4j_uri:
        tasks["neo4j"] = _run_with_timeout("Neo4j", _validate_neo4j(
            body.neo4j_uri, body.neo4j_username, body.neo4j_password,
        ))
    else:
        results["neo4j"] = _NOT_PROVIDED

    # Supabase
    if body.supabase_url and body.supabase_anon_key:
        tasks["supabase"] = _run_with_timeout("Supabase", _validate_supabase(body.supabase_url, body.supabase_anon_key))
    else:
        results["supabase"] = _NOT_PROVIDED

    if tasks:
        task_keys = list(tasks.keys())
        task_coros = list(tasks.values())
        completed = await asyncio.gather(*task_coros, return_exceptions=True)
        for key, res in zip(task_keys, completed):
            if isinstance(res, Exception):
                results[key] = ServiceValidationResult(connected=False, message=str(res))
            else:
                results[key] = res

    overall_valid = results.get("gemini", _NOT_PROVIDED).connected

    return ConfigValidateResponse(valid=overall_valid, results=results)
