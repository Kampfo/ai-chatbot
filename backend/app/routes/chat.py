from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional, List
import json
import asyncio
from slowapi import limiter

from app.services.openai_service import OpenAIService
from app.utils.validators import sanitize_input

router = APIRouter()
ai_service = OpenAIService()

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    
    @validator('message')
    def clean_message(cls, v):
        return sanitize_input(v)

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/chat")
@limiter.limit("20/minute")
async def chat_endpoint(request: Request, chat_message: ChatMessage):
    """Main chat endpoint"""
    try:
        # Get or create session
        session_id = chat_message.session_id or ai_service.create_session()
        
        # Get AI response
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
@limiter.limit("20/minute")
async def chat_stream_endpoint(request: Request, chat_message: ChatMessage):
    """Streaming chat endpoint"""
    try:
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
