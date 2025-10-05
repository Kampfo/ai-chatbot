"""OpenAI service utilities"""
from typing import AsyncGenerator, Dict, List
import asyncio
import os

from openai import OpenAI


class OpenAIService:
    """Wrapper around the OpenAI Chat Completions API."""

    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        self.client = OpenAI(api_key=api_key)

    async def get_response(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        system_prompt: str = "You are a helpful assistant.",
    ) -> str:
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        if message:
            messages.append({"role": "user", "content": message})

        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=1000,
            )
            return response.choices[0].message.content
        except Exception as exc:  # pragma: no cover - external API
            raise Exception(f"OpenAI API error: {exc}") from exc

    async def get_stream_response(
        self,
        message: str,
        conversation_history: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        system_prompt: str = "You are a helpful assistant.",
    ) -> AsyncGenerator[str, None]:
        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        if message:
            messages.append({"role": "user", "content": message})

        try:
            stream = self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=1000,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    yield content
                    await asyncio.sleep(0.01)
        except Exception as exc:  # pragma: no cover - external API
            yield f"Error: {exc}"
