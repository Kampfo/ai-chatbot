from fastapi import APIRouter, Depends
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import os

from app.models.database import get_db, Audit
from app.services.openai_service import OpenAIService

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    audit_id: str | int | None = None
    message: str
    session_id: str | None = None


@router.get("/test")
async def test_endpoint():
    openai_key = os.getenv("OPENAI_API_KEY", "")
    return {
        "status": "ok",
        "service": "chat",
        "openai_configured": bool(openai_key and len(openai_key) > 10),
    }


@router.post("")
async def chat(payload: ChatRequest, db: Session = Depends(get_db)):
    """
    RAG-enhanced chat: retrieves relevant document chunks from Weaviate,
    includes chat history, and streams the OpenAI response.
    """
    import json

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        async def error_stream():
            yield json.dumps({
                "type": "metadata",
                "session_id": "error",
                "sources": [],
            }) + "\n"
            yield json.dumps({
                "type": "content",
                "chunk": "Fehler: OPENAI_API_KEY nicht konfiguriert.",
            }) + "\n"
        return StreamingResponse(error_stream(), media_type="application/x-ndjson")

    # Build audit context for the system prompt
    audit_context = ""
    audit_id_str = str(payload.audit_id) if payload.audit_id else "0"

    if payload.audit_id:
        try:
            audit_id_int = int(payload.audit_id)
            audit = db.query(Audit).filter(Audit.id == audit_id_int).first()
            if audit:
                parts = [f"Prüfung: {audit.title}"]
                if audit.audit_type:
                    parts.append(f"Typ: {audit.audit_type}")
                if audit.scope:
                    parts.append(f"Umfang: {audit.scope}")
                if audit.objectives:
                    parts.append(f"Ziele: {audit.objectives}")
                if audit.status:
                    parts.append(f"Status: {audit.status}")
                audit_context = "\n".join(parts)
        except (ValueError, TypeError):
            pass

    try:
        service = OpenAIService(audit_context=audit_context)
    except RuntimeError:
        async def error_stream():
            yield json.dumps({
                "type": "metadata",
                "session_id": "error",
                "sources": [],
            }) + "\n"
            yield json.dumps({
                "type": "content",
                "chunk": "Fehler: OpenAI-Service konnte nicht initialisiert werden.",
            }) + "\n"
        return StreamingResponse(error_stream(), media_type="application/x-ndjson")

    async def generate():
        async for chunk in service.chat_stream(
            db=db,
            audit_id=audit_id_str,
            session_id=payload.session_id,
            user_message=payload.message,
        ):
            yield chunk

    return StreamingResponse(generate(), media_type="application/x-ndjson")
