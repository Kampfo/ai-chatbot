from fastapi import APIRouter, Depends
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import os
import json
from openai import AsyncOpenAI

router = APIRouter(prefix="/chat", tags=["chat"])

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY")
openai_client = AsyncOpenAI(api_key=openai_api_key) if openai_api_key else None

class ChatRequest(BaseModel):
    audit_id: str
    message: str
    session_id: str | None = None

@router.post("")
async def chat(payload: ChatRequest):
    """
    Simplified chat endpoint that streams directly from OpenAI.
    No database dependencies, no document retrieval - just pure chat.
    """
    if not openai_client:
        async def error_stream():
            yield json.dumps({
                "type": "metadata",
                "session_id": "error",
                "sources": []
            }) + "\n"
            yield json.dumps({
                "type": "content",
                "chunk": "Fehler: OPENAI_API_KEY nicht konfiguriert."
            }) + "\n"
        return StreamingResponse(error_stream(), media_type="application/x-ndjson")

    async def generate_response():
        try:
            # Send metadata first
            yield json.dumps({
                "type": "metadata",
                "session_id": payload.session_id or "new",
                "sources": []
            }) + "\n"

            # Simple system prompt
            messages = [
                {
                    "role": "system",
                    "content": "Du bist ein hilfreicher Assistent für interne Revision und Audit-Management. Beantworte Fragen präzise und professionell."
                },
                {
                    "role": "user",
                    "content": payload.message
                }
            ]

            # Stream from OpenAI
            stream = await openai_client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                messages=messages,
                stream=True,
            )

            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content:
                    yield json.dumps({
                        "type": "content",
                        "chunk": content
                    }) + "\n"

        except Exception as e:
            # Error handling
            yield json.dumps({
                "type": "content",
                "chunk": f"\n\n[Fehler: {str(e)}]"
            }) + "\n"

    return StreamingResponse(
        generate_response(),
        media_type="application/x-ndjson"
    )
