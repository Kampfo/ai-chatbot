from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Audit, get_db
from app.services.openai_service import OpenAIService

router = APIRouter(prefix="/chat", tags=["chat"])

ai_service = OpenAIService()


class ChatRequest(BaseModel):
    audit_id: str
    message: str
    session_id: str | None = None


class ChatSource(BaseModel):
    label: str
    file_id: str | None = None
    filename: str | None = None
    chunk_index: int | None = None
    score: float | None = None


class ChatResponse(BaseModel):
    session_id: str
    message: str
    sources: list[ChatSource] = []


from fastapi.responses import StreamingResponse

@router.post("")
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
):
    return StreamingResponse(
        ai_service.chat_stream(
            db=db,
            audit_id=payload.audit_id,
            session_id=payload.session_id,
            user_message=payload.message,
        ),
        media_type="application/x-ndjson"
    )
