from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import json
import asyncio

app = FastAPI(title="AI Service - Minimal")

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
    return {"status": "healthy", "service": "ai-service-minimal"}

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
    """Minimal working chat"""
    async def generate():
        # Metadata
        yield json.dumps({
            "type": "metadata",
            "session_id": "test123",
            "sources": []
        }) + "\n"
        
        # Simple response
        response_text = f"Echo: {payload.message}"
        for char in response_text:
            yield json.dumps({
                "type": "content",
                "chunk": char
            }) + "\n"
            await asyncio.sleep(0.01)
    
    return StreamingResponse(generate(), media_type="application/x-ndjson")
