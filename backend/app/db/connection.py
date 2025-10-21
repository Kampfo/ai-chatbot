from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session as DBSession
from sqlalchemy.pool import StaticPool
from contextlib import contextmanager
import os

from app.models.database import Base

# Database URL - defaults to SQLite, can be overridden with DATABASE_URL env var
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./data/chatbot.db"
)

# Create engine
# For SQLite, use StaticPool and check_same_thread=False for async compatibility
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=os.getenv("SQL_DEBUG", "false").lower() == "true"
    )
else:
    # For PostgreSQL or other databases
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        echo=os.getenv("SQL_DEBUG", "false").lower() == "true"
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialize database - create all tables"""
    # Ensure data directory exists for SQLite
    if DATABASE_URL.startswith("sqlite"):
        os.makedirs("./data", exist_ok=True)

    # Create all tables
    Base.metadata.create_all(bind=engine)

@contextmanager
def get_db() -> DBSession:
    """Get database session context manager"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_db_session() -> DBSession:
    """Get database session (for dependency injection)"""
    return SessionLocal()
