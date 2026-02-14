import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import init_db
from app.api.routes import audits, findings, chat, upload, health, risks

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audit AI Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router registrieren
app.include_router(health.router, prefix="/api")
app.include_router(audits.router, prefix="/api")
app.include_router(findings.router, prefix="/api")
app.include_router(risks.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(upload.router, prefix="/api")


@app.on_event("startup")
def startup_event():
    logger.info("Initialisiere Datenbank...")
    try:
        init_db()
        logger.info("Datenbank erfolgreich initialisiert.")
    except Exception as e:
        logger.warning(f"Datenbank-Initialisierung fehlgeschlagen: {e}")
        logger.warning("Service wird ohne Datenbank fortgesetzt.")
