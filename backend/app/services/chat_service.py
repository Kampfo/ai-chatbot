"""Chat service for database operations"""
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chat import Chat
from app.models.message import Message
from app.models.user import User


class ChatService:
    """Service class encapsulating chat-related database operations."""

    @staticmethod
    async def create_chat(db: AsyncSession, user_id: str, title: str = "New Chat") -> Chat:
        cleaned_title = (title or "").strip() or "New Chat"
        chat = Chat(user_id=user_id, title=cleaned_title)
        db.add(chat)
        await db.commit()
        await db.refresh(chat)
        return chat

    @staticmethod
    async def get_user_chats(db: AsyncSession, user_id: str) -> List[Chat]:
        result = await db.execute(
            select(Chat)
            .options(selectinload(Chat.messages))
            .filter(Chat.user_id == user_id)
            .order_by(Chat.updated_at.desc(), Chat.created_at.desc())
        )
        return result.scalars().all()

    @staticmethod
    async def get_chat_by_id(
        db: AsyncSession,
        chat_id: str,
        user_id: str,
        include_messages: bool = True,
    ) -> Optional[Chat]:
        query = select(Chat).filter(Chat.id == chat_id, Chat.user_id == user_id)
        if include_messages:
            query = query.options(selectinload(Chat.messages))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_chat_title(db: AsyncSession, chat_id: str, user_id: str, new_title: str) -> Optional[Chat]:
        chat = await ChatService.get_chat_by_id(db, chat_id, user_id, include_messages=False)
        if chat is None:
            return None

        chat.title = (new_title or "").strip() or chat.title
        await db.commit()
        await db.refresh(chat)
        return chat

    @staticmethod
    async def delete_chat(db: AsyncSession, chat_id: str, user_id: str) -> bool:
        chat = await ChatService.get_chat_by_id(db, chat_id, user_id, include_messages=False)
        if chat is None:
            return False

        await db.delete(chat)
        await db.commit()
        return True

    @staticmethod
    async def add_message(
        db: AsyncSession,
        chat_id: str,
        role: str,
        content: str,
        tokens: Optional[int] = None,
    ) -> Message:
        message = Message(chat_id=chat_id, role=role, content=content, tokens=tokens)
        db.add(message)

        chat = await db.get(Chat, chat_id)
        if chat is not None:
            chat.updated_at = datetime.now(timezone.utc)
            user = await db.get(User, chat.user_id)
            if user is not None:
                user.total_messages = (user.total_messages or 0) + 1
                if tokens is not None:
                    user.total_tokens = (user.total_tokens or 0) + tokens

        await db.commit()
        await db.refresh(message)
        return message

    @staticmethod
    async def get_chat_messages(
        db: AsyncSession,
        chat_id: str,
        user_id: str,
        limit: Optional[int] = None,
    ) -> List[Message]:
        chat = await ChatService.get_chat_by_id(db, chat_id, user_id, include_messages=False)
        if chat is None:
            return []

        order_by_clause = Message.created_at.asc()
        query = select(Message).filter(Message.chat_id == chat_id)

        if limit:
            query = query.order_by(Message.created_at.desc()).limit(limit)
        else:
            query = query.order_by(order_by_clause)

        result = await db.execute(query)
        messages = result.scalars().all()

        if limit:
            messages.reverse()
        return messages
