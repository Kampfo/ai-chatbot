import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models.database import init_db
from app.api.routes import health, audits, findings, upload, chat


def create_app() -> FastAPI:
    init_db()

    app = FastAPI(title=settings.app_name)

    # CORS
    origins = [settings.frontend_url]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins + ["http://localhost", "http://localhost:8000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # API-Router
    app.include_router(health.router, prefix="/api")
    app.include_router(audits.router, prefix="/api")
    app.include_router(findings.router, prefix="/api")
    app.include_router(upload.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")

    # Static frontend
    frontend_dir = "/frontend"
    if os.path.isdir(frontend_dir):
        app.mount(
            "/",
            StaticFiles(directory=frontend_dir, html=True),
            name="frontend",
        )

    return app


app = create_app()
