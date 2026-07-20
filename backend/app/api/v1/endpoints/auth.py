"""Chat & Auth & Admin Endpoints."""

from __future__ import annotations

from fastapi import APIRouter
from app.schemas.auth import LoginRequest, AuthResponse
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    return await auth_service.login(req)
