from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.database import get_db, UploadedFile, DocumentAnalysis
from app.services.openai_service import OpenAIService

router = APIRouter(prefix="/analysis", tags=["analysis"])


class AnalysisRequest(BaseModel):
    analysis_type: str  # RISK, SUMMARY, COMPLIANCE, CUSTOM
    custom_prompt: Optional[str] = None


class AnalysisRead(BaseModel):
    id: str
    file_id: str
    analysis_type: str
    prompt: Optional[str]
    result: Optional[str]
    created_at: Optional[str]


@router.post("/document/{file_id}", status_code=status.HTTP_201_CREATED)
async def analyze_document(
    file_id: str,
    request: AnalysisRequest,
    db: Session = Depends(get_db),
):
    uploaded_file = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not uploaded_file:
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")

    if not uploaded_file.extracted_text:
        raise HTTPException(status_code=400, detail="Kein extrahierter Text vorhanden")

    valid_types = ("RISK", "SUMMARY", "COMPLIANCE", "CUSTOM")
    if request.analysis_type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Ungültiger Analysetyp. Erlaubt: {valid_types}")

    try:
        service = OpenAIService()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="OpenAI-Service nicht verfügbar")

    result = await service.analyze_document(
        extracted_text=uploaded_file.extracted_text,
        analysis_type=request.analysis_type,
        custom_prompt=request.custom_prompt or "",
    )

    analysis = DocumentAnalysis(
        file_id=file_id,
        analysis_type=request.analysis_type,
        prompt=request.custom_prompt,
        result=result,
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "file_id": analysis.file_id,
        "analysis_type": analysis.analysis_type,
        "prompt": analysis.prompt,
        "result": analysis.result,
        "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
    }


@router.get("/document/{file_id}")
def get_analyses(
    file_id: str,
    db: Session = Depends(get_db),
):
    analyses = (
        db.query(DocumentAnalysis)
        .filter(DocumentAnalysis.file_id == file_id)
        .order_by(DocumentAnalysis.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "file_id": a.file_id,
            "analysis_type": a.analysis_type,
            "prompt": a.prompt,
            "result": a.result,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in analyses
    ]
