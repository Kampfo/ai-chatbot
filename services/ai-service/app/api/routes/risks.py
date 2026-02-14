from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import Audit, Risk, get_db


class RiskCreate(BaseModel):
    title: str
    description: str | None = None
    impact: str | None = None  # HIGH, MEDIUM, LOW
    likelihood: str | None = None  # HIGH, MEDIUM, LOW


class RiskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    impact: str | None = None
    likelihood: str | None = None


class RiskRead(BaseModel):
    id: int
    audit_id: int
    title: str
    description: str | None
    impact: str | None
    likelihood: str | None
    created_at: str | None

    class Config:
        from_attributes = True


router = APIRouter(prefix="/risks", tags=["risks"])


@router.post(
    "/audits/{audit_id}",
    response_model=RiskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_risk(
    audit_id: int,
    payload: RiskCreate,
    db: Session = Depends(get_db),
) -> Risk:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    risk = Risk(
        audit_id=audit.id,
        title=payload.title,
        description=payload.description,
        impact=payload.impact,
        likelihood=payload.likelihood,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


@router.get("/audits/{audit_id}", response_model=List[RiskRead])
def list_risks_for_audit(
    audit_id: int,
    db: Session = Depends(get_db),
) -> List[Risk]:
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    risks = (
        db.query(Risk)
        .filter(Risk.audit_id == audit.id)
        .order_by(Risk.created_at.desc())
        .all()
    )
    return risks


@router.get("/{risk_id}", response_model=RiskRead)
def get_risk(
    risk_id: int,
    db: Session = Depends(get_db),
) -> Risk:
    risk = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    return risk


@router.patch("/{risk_id}", response_model=RiskRead)
def update_risk(
    risk_id: int,
    payload: RiskUpdate,
    db: Session = Depends(get_db),
) -> Risk:
    risk = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(risk, field, value)

    db.commit()
    db.refresh(risk)
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_risk(
    risk_id: int,
    db: Session = Depends(get_db),
) -> None:
    risk = db.query(Risk).filter(Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    db.delete(risk)
    db.commit()
