"""LLM Factory for pluggable providers."""

from __future__ import annotations

from app.core.config import settings
from app.llm.base import BaseLLMProvider
from app.llm.gemini import GeminiProvider
from app.llm.groq import GroqProvider


class LLMFactory:
    """Factory to instantiate LLM providers on demand."""

    _providers: dict[str, type[BaseLLMProvider]] = {
        "gemini": GeminiProvider,
        "groq": GroqProvider,
    }

    @classmethod
    def register(cls, name: str, provider_cls: type[BaseLLMProvider]) -> None:
        cls._providers[name.lower()] = provider_cls

    @classmethod
    def create(cls, provider_name: str, **kwargs) -> BaseLLMProvider:
        provider_cls = cls._providers.get(provider_name.lower())
        if not provider_cls:
            raise ValueError(f"Unknown LLM provider: {provider_name}")
        return provider_cls(**kwargs)

    @classmethod
    def create_default(cls) -> BaseLLMProvider:
        return cls.create(settings.DEFAULT_LLM_PROVIDER)


async def get_llm_provider() -> BaseLLMProvider:
    """Dependency for FastAPI endpoints."""
    return LLMFactory.create_default()
