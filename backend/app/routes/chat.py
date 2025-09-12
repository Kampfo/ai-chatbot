import os
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.services.openai_service import OpenAIService
from app.utils.validators import sanitize_input

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()
ai_service = OpenAIService()
ADMIN_ONLY_AGENTS = {"admin"}

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    agent: Optional[str] = "default"
    
    @validator('message')
    def clean_message(cls, v):
        return sanitize_input(v)

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/chat")
@limiter.limit(os.getenv("RATE_LIMIT", "5/minute"))
async def chat_endpoint(request: Request, chat_message: ChatMessage, user: dict = Depends(get_current_user)):
    """Main chat endpoint"""
    try:
        if chat_message.agent in ADMIN_ONLY_AGENTS and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Not enough privileges")

        session_id = chat_message.session_id or ai_service.create_session()

        response = await ai_service.get_response(
            message=chat_message.message,
            session_id=session_id
        )

        return ChatResponse(
            response=response,
            session_id=session_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat/stream")
@limiter.limit(os.getenv("RATE_LIMIT", "5/minute"))
async def chat_stream_endpoint(request: Request, chat_message: ChatMessage, user: dict = Depends(get_current_user)):
    """Streaming chat endpoint"""
    try:
        if chat_message.agent in ADMIN_ONLY_AGENTS and not user.get("is_admin"):
            raise HTTPException(status_code=403, detail="Not enough privileges")

        session_id = chat_message.session_id or ai_service.create_session()

        async def generate():
            async for chunk in ai_service.get_stream_response(
                message=chat_message.message,
                session_id=session_id
            ):
                yield f"data: {json.dumps({'content': chunk, 'session_id': session_id})}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
