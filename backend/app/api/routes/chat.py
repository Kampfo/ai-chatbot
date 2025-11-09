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
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    audit = db.query(Audit).filter(Audit.id == payload.audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    try:
        result = ai_service.chat(
            db=db,
            audit_id=audit.id,
            session_id=payload.session_id,
            user_message=payload.message,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return result
