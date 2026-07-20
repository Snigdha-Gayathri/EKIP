"""Gemini LLM provider implementation."""

from __future__ import annotations

import logging
from typing import AsyncIterator
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings
from app.llm.base import BaseLLMProvider

logger = logging.getLogger(__name__)


class GeminiProvider(BaseLLMProvider):
    """Google Gemini model provider."""

    def __init__(self, model: str | None = None, api_key: str | None = None):
        self.model_name = model or settings.GEMINI_MODEL
        self.api_key = api_key or settings.GEMINI_API_KEY
        self._client = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=self.api_key,
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
