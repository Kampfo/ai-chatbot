from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import httpx

app = FastAPI(title="AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    audit_id: str | int | None = None
    message: str
    session_id: str | None = None

@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "ai-service"}

@app.get("/api/chat/test")
async def chat_test():
    openai_key = os.getenv("OPENAI_API_KEY", "")
    return {
        "status": "ok",
        "service": "chat",
        "openai_configured": bool(openai_key and len(openai_key) > 10)
    }

@app.post("/api/chat")
async def chat(payload: ChatRequest):
    """Chat with OpenAI streaming"""
    openai_api_key = os.getenv("OPENAI_API_KEY")
    
    if not openai_api_key:
        async def error_stream():
            yield json.dumps({"type": "metadata", "session_id": "error", "sources": []}) + "\n"
            yield json.dumps({"type": "content", "chunk": "Fehler: OPENAI_API_KEY nicht konfiguriert."}) + "\n"
        return StreamingResponse(error_stream(), media_type="application/x-ndjson")

    async def generate():
        try:
            # Send metadata first
            yield json.dumps({
                "type": "metadata",
                "session_id": str(payload.session_id or "new"),
                "sources": []
            }) + "\n"

            # Call OpenAI API
            async with httpx.AsyncClient(timeout=60.0) as client:
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
                                "content": "Du bist ein hilfreicher Assistent für interne Revision und Audit-Management. Beantworte Fragen präzise und professionell."
                            },
                            {
                                "role": "user",
                                "content": payload.message
                            }
                        ],
                        "stream": True
                    }
                )
                
                # Stream the response
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
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
            yield json.dumps({
                "type": "content",
                "chunk": f"\n\n[Fehler: {str(e)}]"
            }) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")
