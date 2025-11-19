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


@router.post("", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    # Audit check removed for microservice decoupling (or should call Audit Service)
    
    try:
        result = await ai_service.chat(
            db=db,
            audit_id=payload.audit_id,
            session_id=payload.session_id,
            user_message=payload.message,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
