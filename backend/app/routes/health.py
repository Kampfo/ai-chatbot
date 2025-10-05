from fastapi import APIRouter
from datetime import datetime
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@router.get("/ready")
async def readiness_check():
    """Readiness check endpoint"""
    # Check if OpenAI API key is configured
    if not os.getenv("OPENAI_API_KEY"):
        return {"status": "not_ready", "reason": "OpenAI API key not configured"}
    
    return {"status": "ready"}
