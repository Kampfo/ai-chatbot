from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

from app.routes import chat, health
from app.routes.chat import limiter
from app.middleware.security import SecurityMiddleware
from app.auth import router as auth_router
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AI Chatbot API",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None
)

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

# Mount static files (CSS, JS, and other assets)
app.mount("/css", StaticFiles(directory="/frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="/frontend/js"), name="js")

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Include routers
app.include_router(chat.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/")
async def root():
    """Serve the frontend"""
    return FileResponse("/frontend/index.html")

@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    """Global error handler"""
    return {"error": "An error occurred", "message": str(exc)}
