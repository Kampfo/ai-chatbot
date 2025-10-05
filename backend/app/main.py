"""FastAPI application entry point"""
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine
from app.middleware.security import SecurityMiddleware
from app.routes import auth, chat, health

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):  # pragma: no cover - startup/shutdown hooks
    async with engine.begin() as _conn:
        # Tables are managed via Alembic migrations in production environments.
        pass
    yield
    await engine.dispose()


app = FastAPI(
    title="AI Chatbot API",
    version="2.0.0",
    docs_url="/api/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(SecurityMiddleware)

app.mount("/css", StaticFiles(directory="/frontend/css"), name="css")
app.mount("/js", StaticFiles(directory="/frontend/js"), name="js")
app.mount("/auth", StaticFiles(directory="/frontend/auth"), name="auth")

app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(health.router, prefix="/api")


@app.get("/")
async def root():
    """Serve the frontend"""
    return FileResponse("/frontend/index.html")


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception):
    """Global error handler"""
    return {"error": "An error occurred", "message": str(exc)}
