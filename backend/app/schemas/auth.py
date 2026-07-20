"""Authentication & User Schemas."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "Employee"


class UserProfile(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    org_id: str = "default"


class AuthResponse(BaseModel):
    token: str
    user: UserProfile
