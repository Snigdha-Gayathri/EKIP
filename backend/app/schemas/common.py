"""Common API Response Schemas."""

from __future__ import annotations

from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    message: str = "OK"


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    code: int = 500


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    items: list[T]
    total: int
    page: int
    page_size: int
