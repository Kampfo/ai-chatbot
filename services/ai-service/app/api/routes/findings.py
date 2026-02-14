from typing import List
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Audit, AuditFinding, get_db


class FindingBase(BaseModel):
    title: str
    description: str | None = None
    severity: str | None = None  # LOW, MEDIUM, HIGH


class FindingCreate(FindingBase):
    pass


class FindingUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    action_description: str | None = None
    action_due_date: date | None = None
    action_status: str | None = None


class FindingRead(BaseModel):
    id: str
    audit_id: int
    title: str
    description: str | None
    severity: str | None
    status: str
    action_description: str | None
    action_due_date: date | None
    action_status: str | None
    created_at: str | None
    updated_at: str | None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/findings", tags=["findings"])


@router.post(
    "/audits/{audit_id}",
    response_model=FindingRead,
    status_code=status.HTTP_201_CREATED,
)
def create_finding(
    audit_id: int,
    payload: FindingCreate,
    db: Session = Depends(get_db),
) -> AuditFinding:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    finding = AuditFinding(
        audit_id=audit.id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity,
        status="OPEN",
    )
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


@router.get("/audits/{audit_id}", response_model=List[FindingRead])
def list_findings_for_audit(
    audit_id: int,
    db: Session = Depends(get_db),
) -> List[AuditFinding]:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    findings = (
        db.query(AuditFinding)
        .filter(AuditFinding.audit_id == audit.id)
        .order_by(AuditFinding.created_at.desc())
        .all()
    )
    return findings


@router.get("/{finding_id}", response_model=FindingRead)
def get_finding(
    finding_id: str,
    db: Session = Depends(get_db),
) -> AuditFinding:
    finding = db.query(AuditFinding).filter(AuditFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


@router.patch("/{finding_id}", response_model=FindingRead)
def update_finding(
    finding_id: str,
    payload: FindingUpdate,
    db: Session = Depends(get_db),
) -> AuditFinding:
    finding = db.query(AuditFinding).filter(AuditFinding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(finding, field, value)

    db.commit()
    db.refresh(finding)
    return finding
