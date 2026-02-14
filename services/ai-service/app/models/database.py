import os
from datetime import datetime, date
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Integer,
    Date,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker, Session
from sqlalchemy.sql import func

from app.config import settings

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid4())


# --- Core models ---


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        String(32),
        nullable=False,
        default="PLANUNG",  # PLANUNG, DURCHFUEHRUNG, BERICHTERSTATTUNG, MASSNAHMENVERFOLGUNG
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Erweiterte Felder für Prüfungsplanung
    audit_type = Column(String(64), nullable=True)  # COMPLIANCE, OPERATIONAL, FINANCIAL, IT
    scope = Column(Text, nullable=True)  # Prüfungsumfang
    objectives = Column(Text, nullable=True)  # Prüfungsziele
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    responsible_person = Column(String(255), nullable=True)  # Prüfungsleiter

    sessions = relationship("ChatSession", back_populates="audit", cascade="all, delete-orphan")
    documents = relationship("UploadedFile", back_populates="audit", cascade="all, delete-orphan")
    findings = relationship("AuditFinding", back_populates="audit", cascade="all, delete-orphan")
    risks = relationship("Risk", back_populates="audit", cascade="all, delete-orphan")
    plan_items = relationship("AuditPlanItem", back_populates="audit", cascade="all, delete-orphan")


class ChatSession(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    audit = relationship("Audit", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False)
    role = Column(String(32), nullable=False)  # "user" | "assistant" | "system"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("ChatSession", back_populates="messages")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"

    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    filename = Column(String(512), nullable=False)
    content_type = Column(String(128), nullable=True)
    stored_path = Column(String(1024), nullable=False)
    extracted_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit", back_populates="documents")
    session = relationship("ChatSession")


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(String(32), nullable=True)  # LOW, MEDIUM, HIGH
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, IN_PROGRESS, CLOSED

    action_description = Column(Text, nullable=True)
    action_due_date = Column(Date, nullable=True)
    action_status = Column(String(32), nullable=True)  # OPEN, IN_PROGRESS, DONE

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    audit = relationship("Audit", back_populates="findings")


class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    impact = Column(String(32), nullable=True)  # HIGH, MEDIUM, LOW
    likelihood = Column(String(32), nullable=True)  # HIGH, MEDIUM, LOW
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit", back_populates="risks")


class AuditPlanItem(Base):
    __tablename__ = "audit_plan_items"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(64), nullable=True)  # VORBEREITUNG, PRUEFFELD, RISIKO
    is_completed = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit", back_populates="plan_items")


class DocumentAnalysis(Base):
    __tablename__ = "document_analyses"

    id = Column(String, primary_key=True, default=generate_uuid)
    file_id = Column(String, ForeignKey("uploaded_files.id"), nullable=False)
    analysis_type = Column(String(64), nullable=False)  # RISK, SUMMARY, COMPLIANCE, CUSTOM
    prompt = Column(Text, nullable=True)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    file = relationship("UploadedFile")


class AuditReport(Base):
    __tablename__ = "audit_reports"

    id = Column(String, primary_key=True, default=generate_uuid)
    audit_id = Column(Integer, ForeignKey("audits.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    content_markdown = Column(Text, nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    audit = relationship("Audit")


# --- Engine / Session ---

os.makedirs(
    os.path.dirname(settings.database_url.replace("sqlite:///", "")), exist_ok=True
) if settings.database_url.startswith("sqlite") else None

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
