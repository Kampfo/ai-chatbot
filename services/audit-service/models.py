from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from database import Base

class AuditStatus(str, enum.Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    status = Column(String, default=AuditStatus.PLANNED)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    risks = relationship("Risk", back_populates="audit")
    findings = relationship("Finding", back_populates="audit")

class Risk(Base):
    __tablename__ = "risks"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    title = Column(String, index=True)
    description = Column(Text)
    impact = Column(String) # e.g., High, Medium, Low
    likelihood = Column(String) # e.g., High, Medium, Low

    audit = relationship("Audit", back_populates="risks")

class Finding(Base):
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    title = Column(String, index=True)
    description = Column(Text)
    recommendation = Column(Text)
    severity = Column(String)

    audit = relationship("Audit", back_populates="findings")
