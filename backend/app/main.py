from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
from dotenv import load_dotenv

from app.routes import chat, health
from app.middleware.security import SecurityMiddleware

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AI Chatbot API",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None
)

# Rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(SecurityMiddleware)

# Mount static files
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

# Include routers
app.include_router(chat.router, prefix="/api")
app.include_router(health.router, prefix="/api")

@app.get("/")
async def root():
    """Serve the frontend"""
    return FileResponse("../frontend/index.html")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler"""
    return {"error": "An error occurred", "message": str(exc)}
