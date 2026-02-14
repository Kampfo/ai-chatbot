from typing import List
from datetime import date, datetime
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Audit
from app.models.database import get_db


class AuditStatus(str, Enum):
    PLANUNG = "PLANUNG"
    DURCHFUEHRUNG = "DURCHFUEHRUNG"
    BERICHTERSTATTUNG = "BERICHTERSTATTUNG"
    MASSNAHMENVERFOLGUNG = "MASSNAHMENVERFOLGUNG"


class AuditCreate(BaseModel):
    title: str
    description: str | None = None
    audit_type: str | None = None
    scope: str | None = None
    objectives: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    responsible_person: str | None = None


class AuditUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    audit_type: str | None = None
    scope: str | None = None
    objectives: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    responsible_person: str | None = None


class AuditStatusUpdate(BaseModel):
    status: AuditStatus


class AuditRead(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    audit_type: str | None = None
    scope: str | None = None
    objectives: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    responsible_person: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("", response_model=AuditRead, status_code=status.HTTP_201_CREATED)
def create_audit(payload: AuditCreate, db: Session = Depends(get_db)) -> Audit:
    audit = Audit(
        title=payload.title,
        description=payload.description,
        status=AuditStatus.PLANUNG.value,
        audit_type=payload.audit_type,
        scope=payload.scope,
        objectives=payload.objectives,
        start_date=payload.start_date,
        end_date=payload.end_date,
        responsible_person=payload.responsible_person,
    )
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit


@router.get("", response_model=List[AuditRead])
def list_audits(db: Session = Depends(get_db)) -> List[Audit]:
    audits = db.query(Audit).order_by(Audit.created_at.desc()).all()
    return audits


@router.get("/{audit_id}", response_model=AuditRead)
def get_audit(audit_id: int, db: Session = Depends(get_db)) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.patch("/{audit_id}", response_model=AuditRead)
def update_audit(
    audit_id: int,
    payload: AuditUpdate,
    db: Session = Depends(get_db),
) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(audit, field, value)

    db.commit()
    db.refresh(audit)
    return audit


@router.patch("/{audit_id}/status", response_model=AuditRead)
def update_audit_status(
    audit_id: int,
    payload: AuditStatusUpdate,
    db: Session = Depends(get_db),
) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    audit.status = payload.status.value
    db.commit()
    db.refresh(audit)
    return audit
