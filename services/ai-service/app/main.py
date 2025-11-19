import os
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.models.database import init_db
from app.api.routes import health, chat

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    logger.info("Starting application initialization...")

    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise

    app = FastAPI(title=settings.app_name)

    # CORS - Allow all origins in production (kann später eingeschränkt werden)
    # Für Dokploy: Die App wird hinter einem Reverse Proxy laufen
    allowed_origins = ["*"]  # In Production sollte dies auf spezifische Domains eingeschränkt werden

    if settings.environment != "production":
        allowed_origins = [
            settings.frontend_url,
            "http://localhost",
            "http://localhost:8000",
            "http://localhost:4173",
            "http://localhost:5173"
        ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS configured for origins: {allowed_origins}")

    # API-Router
    app.include_router(health.router, prefix="/api")
    app.include_router(chat.router, prefix="/api")
    logger.info("API routes registered")

    # Static frontend
    frontend_dir = "/frontend"
    if os.path.isdir(frontend_dir):
        app.mount(
            "/",
            StaticFiles(directory=frontend_dir, html=True),
            name="frontend",
        )
        logger.info(f"Frontend mounted from {frontend_dir}")
    else:
        logger.warning(f"Frontend directory not found: {frontend_dir}")

    logger.info("Application initialization completed successfully")
    return app


app = create_app()
