from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.models.database import (
    get_db, Audit, AuditFinding, Risk, UploadedFile, DocumentAnalysis, AuditReport,
)
from app.services.openai_service import OpenAIService

router = APIRouter(prefix="/reports", tags=["reports"])


class ReportGenerateRequest(BaseModel):
    use_ai: bool = True


@router.post("/audits/{audit_id}/generate", status_code=status.HTTP_201_CREATED)
async def generate_report(
    audit_id: int,
    request: ReportGenerateRequest,
    db: Session = Depends(get_db),
):
    audit = db.query(Audit).filter(Audit.id == audit_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit nicht gefunden")

    findings = db.query(AuditFinding).filter(AuditFinding.audit_id == audit_id).all()
    risks = db.query(Risk).filter(Risk.audit_id == audit_id).all()
    documents = db.query(UploadedFile).filter(UploadedFile.audit_id == audit_id).all()

    # Build report data
    report_data = {
        "title": audit.title,
        "description": audit.description,
        "status": audit.status,
        "audit_type": audit.audit_type,
        "scope": audit.scope,
        "objectives": audit.objectives,
        "start_date": str(audit.start_date) if audit.start_date else None,
        "end_date": str(audit.end_date) if audit.end_date else None,
        "responsible_person": audit.responsible_person,
        "findings": [
            {
                "title": f.title,
                "description": f.description,
                "severity": f.severity,
                "status": f.status,
                "action_description": f.action_description,
                "action_status": f.action_status,
                "action_due_date": str(f.action_due_date) if f.action_due_date else None,
            }
            for f in findings
        ],
        "risks": [
            {
                "title": r.title,
                "description": r.description,
                "impact": r.impact,
                "likelihood": r.likelihood,
            }
            for r in risks
        ],
        "documents_count": len(documents),
        "document_names": [d.filename for d in documents],
    }

    # Generate report content
    if request.use_ai:
        try:
            service = OpenAIService()
            content_markdown = await service.generate_report(report_data)
        except Exception as e:
            content_markdown = _build_manual_report(report_data)
    else:
        content_markdown = _build_manual_report(report_data)

    # Determine version
    existing_count = (
        db.query(AuditReport)
        .filter(AuditReport.audit_id == audit_id)
        .count()
    )

    report = AuditReport(
        audit_id=audit_id,
        version=existing_count + 1,
        content_markdown=content_markdown,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return {
        "id": report.id,
        "audit_id": report.audit_id,
        "version": report.version,
        "content_markdown": report.content_markdown,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
    }


@router.get("/audits/{audit_id}")
def get_reports(
    audit_id: int,
    db: Session = Depends(get_db),
):
    reports = (
        db.query(AuditReport)
        .filter(AuditReport.audit_id == audit_id)
        .order_by(AuditReport.version.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "audit_id": r.audit_id,
            "version": r.version,
            "content_markdown": r.content_markdown,
            "generated_at": r.generated_at.isoformat() if r.generated_at else None,
        }
        for r in reports
    ]


@router.get("/{report_id}")
def get_report(
    report_id: str,
    db: Session = Depends(get_db),
):
    report = db.query(AuditReport).filter(AuditReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden")

    return {
        "id": report.id,
        "audit_id": report.audit_id,
        "version": report.version,
        "content_markdown": report.content_markdown,
        "generated_at": report.generated_at.isoformat() if report.generated_at else None,
    }


def _build_manual_report(data: dict) -> str:
    """Build a structured report without AI."""
    lines = [
        f"# Prüfungsbericht: {data['title']}",
        "",
        "## 1. Allgemeine Informationen",
        "",
        f"- **Prüfungstyp:** {data.get('audit_type') or 'Nicht angegeben'}",
        f"- **Verantwortlich:** {data.get('responsible_person') or 'Nicht angegeben'}",
        f"- **Zeitraum:** {data.get('start_date') or '?'} bis {data.get('end_date') or '?'}",
        f"- **Status:** {data.get('status') or 'Nicht angegeben'}",
        "",
        "## 2. Prüfungsumfang und -ziele",
        "",
        f"**Umfang:** {data.get('scope') or 'Nicht definiert'}",
        "",
        f"**Ziele:** {data.get('objectives') or 'Nicht definiert'}",
        "",
        f"**Beschreibung:** {data.get('description') or 'Keine Beschreibung'}",
        "",
        "## 3. Feststellungen",
        "",
    ]

    findings = data.get("findings", [])
    if findings:
        for i, f in enumerate(findings, 1):
            severity_label = {"HIGH": "Hoch", "MEDIUM": "Mittel", "LOW": "Niedrig"}.get(
                f.get("severity", ""), f.get("severity", "")
            )
            lines.append(f"### 3.{i} {f['title']}")
            lines.append("")
            lines.append(f"- **Schweregrad:** {severity_label}")
            lines.append(f"- **Status:** {f.get('status', 'OPEN')}")
            if f.get("description"):
                lines.append(f"- **Beschreibung:** {f['description']}")
            if f.get("action_description"):
                lines.append(f"- **Maßnahme:** {f['action_description']}")
                lines.append(f"- **Maßnahmen-Status:** {f.get('action_status', 'OPEN')}")
                if f.get("action_due_date"):
                    lines.append(f"- **Fällig:** {f['action_due_date']}")
            lines.append("")
    else:
        lines.append("Keine Feststellungen dokumentiert.")
        lines.append("")

    lines.append("## 4. Risikobewertung")
    lines.append("")

    risks = data.get("risks", [])
    if risks:
        lines.append("| Risiko | Auswirkung | Wahrscheinlichkeit |")
        lines.append("|--------|------------|-------------------|")
        for r in risks:
            lines.append(f"| {r['title']} | {r.get('impact', '-')} | {r.get('likelihood', '-')} |")
        lines.append("")
    else:
        lines.append("Keine Risiken identifiziert.")
        lines.append("")

    lines.append("## 5. Geprüfte Dokumente")
    lines.append("")
    lines.append(f"Anzahl geprüfter Dokumente: {data.get('documents_count', 0)}")
    lines.append("")
    for name in data.get("document_names", []):
        lines.append(f"- {name}")

    return "\n".join(lines)
