from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models, schemas, database
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Audit Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    try:
        models.Base.metadata.create_all(bind=database.engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        # Don't crash, allow service to start

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health():
    return {"status": "healthy", "service": "audit-service"}

@app.post("/audits", response_model=schemas.Audit)
def create_audit(audit: schemas.AuditCreate, db: Session = Depends(get_db)):
    db_audit = models.Audit(**audit.dict())
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit

@app.get("/audits", response_model=List[schemas.Audit])
def read_audits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    audits = db.query(models.Audit).offset(skip).limit(limit).all()
    return audits

@app.get("/audits/{audit_id}", response_model=schemas.Audit)
def read_audit(audit_id: int, db: Session = Depends(get_db)):
    audit = db.query(models.Audit).filter(models.Audit.id == audit_id).first()
    if audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit

@app.put("/audits/{audit_id}", response_model=schemas.Audit)
def update_audit(audit_id: int, audit_update: schemas.AuditUpdate, db: Session = Depends(get_db)):
    db_audit = db.query(models.Audit).filter(models.Audit.id == audit_id).first()
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    
    update_data = audit_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_audit, key, value)
    
    db.add(db_audit)
    db.commit()
    db.refresh(db_audit)
    return db_audit

@app.post("/audits/{audit_id}/risks", response_model=schemas.Risk)
def create_risk(audit_id: int, risk: schemas.RiskCreate, db: Session = Depends(get_db)):
    db_risk = models.Risk(**risk.dict(), audit_id=audit_id)
    db.add(db_risk)
    db.commit()
    db.refresh(db_risk)
    return db_risk
