from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

from app.routes import chat, health, upload
from app.middleware.security import SecurityMiddleware
from app.db import init_db

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="AI Chatbot API",
    version="1.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PUT"],
    allow_headers=["*"],
)

# Security middleware
app.add_middleware(SecurityMiddleware)

# Mount static files (CSS, JS, and other assets)
app.mount("/css", StaticFiles(directory="/frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="/frontend/js"), name="js")

# Include routers
app.include_router(chat.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

@app.get("/")
async def root():
    """Serve the frontend"""
    return FileResponse("/frontend/index.html")

@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    """Global error handler"""
    return {"error": "An error occurred", "message": str(exc)}
