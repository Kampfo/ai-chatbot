from typing import List
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


class AuditUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class AuditStatusUpdate(BaseModel):
    status: AuditStatus


class AuditRead(BaseModel):
    id: str
    title: str
    description: str | None
    status: AuditStatus
    created_at: str
    updated_at: str | None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("", response_model=AuditRead, status_code=status.HTTP_201_CREATED)
def create_audit(payload: AuditCreate, db: Session = Depends(get_db)) -> Audit:
    audit = Audit(
        title=payload.title,
        description=payload.description,
        status=AuditStatus.PLANUNG.value,
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
def get_audit(audit_id: str, db: Session = Depends(get_db)) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit


@router.patch("/{audit_id}", response_model=AuditRead)
def update_audit(
    audit_id: str,
    payload: AuditUpdate,
    db: Session = Depends(get_db),
) -> Audit:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    if payload.title is not None:
        audit.title = payload.title
    if payload.description is not None:
        audit.description = payload.description

    db.commit()
    db.refresh(audit)
    return audit


@router.patch("/{audit_id}/status", response_model=AuditRead)
def update_audit_status(
    audit_id: str,
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
