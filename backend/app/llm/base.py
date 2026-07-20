"""Abstract LLM Provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import AsyncIterator


class BaseLLMProvider(ABC):
    """Abstract base class for all LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str | None = None, **kwargs) -> str:
        """Generate text synchronously."""

    @abstractmethod
    async def stream(self, prompt: str, system_prompt: str | None = None, **kwargs) -> AsyncIterator[str]:
        """Stream text tokens."""
