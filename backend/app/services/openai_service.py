from openai import OpenAI
import os
import uuid
from typing import AsyncGenerator, List, Optional
import asyncio

from app.database import SessionLocal
from app.models import ChatMessage, ChatSession


class OpenAIService:
    def __init__(self) -> None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-3.5-turbo"  # Start with 3.5 for cost efficiency
        self.max_context_messages = 10

    def create_session(self, user_id: Optional[str] = None) -> str:
        session_id = str(uuid.uuid4())
        db = SessionLocal()
        db.add(ChatSession(id=session_id, user_id=user_id))
        db.commit()
        db.close()
        return session_id

    def get_session_messages(self, session_id: str) -> List[ChatMessage]:
        db = SessionLocal()
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp.asc())
            .all()
        )
        db.close()
        return messages[-self.max_context_messages * 2 :]

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        user_id: Optional[str],
    ) -> None:
        db = SessionLocal()
        if not db.query(ChatSession).filter(ChatSession.id == session_id).first():
            db.add(ChatSession(id=session_id, user_id=user_id))
            db.commit()
        db.add(
            ChatMessage(
                session_id=session_id,
                role=role,
                content=content,
                user_id=user_id,
            )
        )
        db.commit()
        db.close()

    async def get_response(
        self, message: str, session_id: str, user_id: Optional[str]
    ) -> str:
        try:
            self.add_message(session_id, "user", message, user_id)

            messages = [
                {"role": "system", "content": "You are a helpful assistant."}
            ]
            for msg in self.get_session_messages(session_id):
                messages.append({"role": msg.role, "content": msg.content})

            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )

            response_text = response.choices[0].message.content
            self.add_message(session_id, "assistant", response_text, None)
            return response_text
        except Exception as e:  # pragma: no cover - propagate error
            raise Exception(f"OpenAI API error: {str(e)}")

    async def get_stream_response(
        self, message: str, session_id: str, user_id: Optional[str]
    ) -> AsyncGenerator[str, None]:
        try:
            self.add_message(session_id, "user", message, user_id)

            messages = [
                {"role": "system", "content": "You are a helpful assistant."}
            ]
            for msg in self.get_session_messages(session_id):
                messages.append({"role": msg.role, "content": msg.content})

            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True,
            )

            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content
                    await asyncio.sleep(0.01)

            self.add_message(session_id, "assistant", full_response, None)
        except Exception as e:  # pragma: no cover - stream errors
            yield f"Error: {str(e)}"
