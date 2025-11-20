from fastapi import APIRouter
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import os
import json
import httpx

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    audit_id: str | int | None = None
    message: str
    session_id: str | None = None

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify service is running"""
    openai_key = os.getenv("OPENAI_API_KEY", "")
    return {
        "status": "ok",
        "service": "chat",
        "openai_configured": bool(openai_key and len(openai_key) > 10)
    }

@router.post("")
async def chat(payload: ChatRequest):
    """
    Ultra-simple chat using direct OpenAI API calls with httpx
    """
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
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
                "session_id": str(payload.session_id or "new"),
                "sources": []
            }) + "\n"

            # Direct OpenAI API call
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                        "messages": [
                            {
                                "role": "system",
                                "content": "Du bist ein hilfreicher Assistent für interne Revision und Audit-Management."
                            },
                            {
                                "role": "user",
                                "content": payload.message
                            }
                        ],
                        "stream": True
                    },
                    timeout=60.0
                )
                
                # Stream the response
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]  # Remove "data: " prefix
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                content = delta.get("content")
                                if content:
                                    yield json.dumps({
                                        "type": "content",
                                        "chunk": content
                                    }) + "\n"
                        except json.JSONDecodeError:
                            pass

        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Chat error: {error_details}")
            yield json.dumps({
                "type": "content",
                "chunk": f"\n\n[Fehler: {str(e)}]"
            }) + "\n"

    return StreamingResponse(
        generate_response(),
        media_type="application/x-ndjson"
    )
