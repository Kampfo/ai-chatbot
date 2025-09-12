from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional
import json
import asyncio

from app.services.openai_service import OpenAIService
from app.services.event_bus import EventProducer, EventConsumer
from app.utils.validators import sanitize_input

router = APIRouter()
producer = EventProducer()
ai_service = OpenAIService(producer)

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    
    @validator('message')
    def clean_message(cls, v):
        return sanitize_input(v)

@router.post("/chat")
async def chat_endpoint(background_tasks: BackgroundTasks, chat_message: ChatMessage):
    """Queue chat message for processing"""
    try:
        session_id = chat_message.session_id or ai_service.create_session()
        background_tasks.add_task(ai_service.get_response, chat_message.message, session_id)
        return {"status": "processing", "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat/stream")
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


@router.get("/events/{session_id}")
async def events_endpoint(session_id: str):
    """Stream response events for a session"""
    consumer = EventConsumer()

    async def generate():
        async for event in consumer.consume("chat_responses"):
            data = event["data"]
            if data.get("session_id") == session_id:
                yield f"data: {json.dumps(data)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
