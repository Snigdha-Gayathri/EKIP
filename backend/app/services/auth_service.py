"""Authentication Service."""

from __future__ import annotations

import uuid
from app.schemas.auth import LoginRequest, SignupRequest, AuthResponse, UserProfile


class AuthService:
    """Manages user authentication and tokens."""

    async def login(self, req: LoginRequest) -> AuthResponse:
        user = UserProfile(
            id=str(uuid.uuid4()),
            email=req.email,
            full_name="Enterprise User",
            role="Engineering Lead",
            org_id="acme_ai",
        )
        return AuthResponse(token="ekip_jwt_token_demo", user=user)

    async def signup(self, req: SignupRequest) -> AuthResponse:
        user = UserProfile(
            id=str(uuid.uuid4()),
            email=req.email,
            full_name=req.full_name,
            role=req.role,
            org_id="acme_ai",
        )
        return AuthResponse(token="ekip_jwt_token_demo", user=user)


auth_service = AuthService()
