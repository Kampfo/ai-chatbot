"""Chat routes with database persistence"""
from datetime import datetime
import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.services.chat_service import ChatService
from app.services.openai_service import OpenAIService

router = APIRouter(prefix="/chats", tags=["chats"])


class ChatCreate(BaseModel):
    title: str = Field(default="New Chat", max_length=255)


class ChatUpdate(BaseModel):
    title: str = Field(..., max_length=255)


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class ChatResponse(BaseModel):
    id: str
    title: str
    model: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None


class ChatDetailResponse(ChatResponse):
    messages: List[MessageResponse]


@router.post("", response_model=ChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await ChatService.create_chat(db, current_user.id, chat_data.title)
    return ChatResponse(
        id=chat.id,
        title=chat.title,
        model=chat.model,
        created_at=chat.created_at,
        updated_at=chat.updated_at or chat.created_at,
        message_count=0,
    )


@router.get("", response_model=List[ChatResponse])
async def list_chats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chats = await ChatService.get_user_chats(db, current_user.id)
    responses: List[ChatResponse] = []

    for chat in chats:
        last_message = chat.messages[-1].content if chat.messages else None
        if last_message:
            last_message = (last_message[:50] + "...") if len(last_message) > 50 else last_message

        responses.append(
            ChatResponse(
                id=chat.id,
                title=chat.title,
                model=chat.model,
                created_at=chat.created_at,
                updated_at=chat.updated_at or chat.created_at,
                message_count=len(chat.messages),
                last_message=last_message,
            )
        )

    return responses


@router.get("/{chat_id}", response_model=ChatDetailResponse)
async def get_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await ChatService.get_chat_by_id(db, chat_id, current_user.id, include_messages=True)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    messages = [
        MessageResponse(
            id=msg.id,
            role=msg.role,
            content=msg.content,
            created_at=msg.created_at,
        )
        for msg in chat.messages
    ]

    return ChatDetailResponse(
        id=chat.id,
        title=chat.title,
        model=chat.model,
        created_at=chat.created_at,
        updated_at=chat.updated_at or chat.created_at,
        message_count=len(messages),
        last_message=messages[-1].content if messages else None,
        messages=messages,
    )


@router.put("/{chat_id}", response_model=ChatResponse)
async def update_chat(
    chat_id: str,
    chat_data: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await ChatService.update_chat_title(db, chat_id, current_user.id, chat_data.title)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    return ChatResponse(
        id=chat.id,
        title=chat.title,
        model=chat.model,
        created_at=chat.created_at,
        updated_at=chat.updated_at or chat.created_at,
        message_count=0,
    )


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await ChatService.delete_chat(db, chat_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")
    return None


@router.post("/{chat_id}/messages", response_model=MessageResponse)
async def send_message(
    chat_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await ChatService.get_chat_by_id(db, chat_id, current_user.id, include_messages=True)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    await ChatService.add_message(db, chat_id, "user", message_data.content)

    history = [
        {"role": msg.role, "content": msg.content}
        for msg in chat.messages
    ]

    ai_service = OpenAIService()
    try:
        response_text = await ai_service.get_response(
            message=message_data.content,
            conversation_history=history,
            model=chat.model,
            temperature=float(chat.temperature),
            system_prompt=chat.system_prompt or "You are a helpful assistant.",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"AI Service error: {exc}") from exc

    assistant_msg = await ChatService.add_message(db, chat_id, "assistant", response_text)
    return MessageResponse(
        id=assistant_msg.id,
        role=assistant_msg.role,
        content=assistant_msg.content,
        created_at=assistant_msg.created_at,
    )


@router.post("/{chat_id}/messages/stream")
async def send_message_stream(
    chat_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = await ChatService.get_chat_by_id(db, chat_id, current_user.id, include_messages=True)
    if chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat not found")

    await ChatService.add_message(db, chat_id, "user", message_data.content)

    history = [
        {"role": msg.role, "content": msg.content}
        for msg in chat.messages
    ]

    ai_service = OpenAIService()

    async def generate():
        full_response = ""
        try:
            async for chunk in ai_service.get_stream_response(
                message=message_data.content,
                conversation_history=history,
                model=chat.model,
                temperature=float(chat.temperature),
                system_prompt=chat.system_prompt or "You are a helpful assistant.",
            ):
                full_response += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"

            assistant_message = await ChatService.add_message(db, chat_id, "assistant", full_response)
            yield f"data: {json.dumps({'done': True, 'message_id': assistant_message.id})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
