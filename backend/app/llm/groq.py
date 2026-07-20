"""Groq LLM provider implementation."""

from __future__ import annotations

import logging
from typing import AsyncIterator
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from app.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class GroqProvider(BaseLLMProvider):
    """Groq ultra-fast model provider."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model_name = model or settings.GROQ_MODEL
        self.api_key = api_key or settings.GROQ_API_KEY
        self._client = ChatGroq(
            model_name=self.model_name,
            groq_api_key=self.api_key,
            temperature=0.2,
        )

    async def generate(self, prompt: str, system_prompt: str | None = None, **kwargs) -> str:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        res = await self._client.ainvoke(messages)
        return str(res.content)

    async def stream(self, prompt: str, system_prompt: str | None = None, **kwargs) -> AsyncIterator[str]:
        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))
        async for chunk in self._client.astream(messages):
            if chunk.content:
                yield str(chunk.content)
