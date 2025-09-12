from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, validator
from typing import Optional
import json
import asyncio

from app.services.openai_service import OpenAIService
from app.services.agent_manager import AgentManager
from app.utils.validators import sanitize_input

router = APIRouter()
ai_service = OpenAIService()
agent_manager = AgentManager()
agent_manager.register("openai", ai_service, default=True)

class ChatMessage(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[str] = None
    agent: Optional[str] = Field(None, description="Target agent name")
    
    @validator('message')
    def clean_message(cls, v):
        return sanitize_input(v)

class ChatResponse(BaseModel):
    response: str
    session_id: str

@router.post("/chat")
async def chat_endpoint(request: Request, chat_message: ChatMessage):
    """Main chat endpoint"""
    try:
        # Resolve agent and session
        agent = agent_manager.get(chat_message.agent)
        session_id = chat_message.session_id or agent.create_session()

        # Get AI response
        response = await agent_manager.handle_message(
            chat_message.agent,
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
async def chat_stream_endpoint(request: Request, chat_message: ChatMessage):
    """Streaming chat endpoint"""
    try:
        agent = agent_manager.get(chat_message.agent)
        session_id = chat_message.session_id or agent.create_session()

        async def generate():
            async for chunk in agent_manager.handle_stream(
                chat_message.agent,
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
