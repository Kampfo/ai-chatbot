from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from enum import Enum

class AuditStatus(str, Enum):
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"

class RiskBase(BaseModel):
    title: str
    description: str
    impact: str
    likelihood: str

class RiskCreate(RiskBase):
    pass

class Risk(RiskBase):
    id: int
    audit_id: int

    class Config:
        orm_mode = True

class FindingBase(BaseModel):
    title: str
    description: str
    recommendation: str
    severity: str

class FindingCreate(FindingBase):
    pass

class Finding(FindingBase):
    id: int
    audit_id: int

    class Config:
        orm_mode = True

class AuditBase(BaseModel):
    title: str
    description: Optional[str] = None
    status: AuditStatus = AuditStatus.PLANNED

class AuditCreate(AuditBase):
    pass

class AuditUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[AuditStatus] = None

class Audit(AuditBase):
    id: int
    created_at: datetime
    updated_at: datetime
    risks: List[Risk] = []
    findings: List[Finding] = []

    class Config:
        orm_mode = True
