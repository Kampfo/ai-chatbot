from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from datetime import datetime

from app.db import get_db
from app.models.database import Session, UploadedFile
from app.utils.pdf_processor import PDFProcessor

router = APIRouter()

class UploadResponse(BaseModel):
    file_id: str
    filename: str
    file_size: int
    processed: bool
    message: str

class FileListResponse(BaseModel):
    files: List[dict]

@router.post("/upload", response_model=UploadResponse)
async def upload_file(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    """Upload a PDF file and extract text"""
    try:
        # Read file content
        file_content = await file.read()

        # Validate PDF
        is_valid, error_message = PDFProcessor.validate_pdf(file_content, file.filename)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_message)

        with get_db() as db:
            # Check if session exists, create if not
            session = db.query(Session).filter(Session.id == session_id).first()
            if not session:
                session = Session(id=session_id)
                db.add(session)
                db.commit()

            # Generate unique file ID and path
            file_id = str(uuid.uuid4())
            upload_dir = os.getenv("UPLOAD_DIR", "./data/uploads")
            os.makedirs(upload_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, f"{file_id}_{file.filename}")

            # Save file to disk
            with open(file_path, "wb") as f:
                f.write(file_content)

            # Extract text from PDF
            try:
                extracted_text = PDFProcessor.extract_text(file_content, file.filename)
                processed = True
                message = "File uploaded and processed successfully"
            except Exception as e:
                extracted_text = None
                processed = False
                message = f"File uploaded but text extraction failed: {str(e)}"

            # Save to database
            uploaded_file = UploadedFile(
                id=file_id,
                session_id=session_id,
                filename=file.filename,
                file_path=file_path,
                file_size=len(file_content),
                extracted_text=extracted_text,
                processed=processed
            )
            db.add(uploaded_file)
            db.commit()

            return UploadResponse(
                file_id=file_id,
                filename=file.filename,
                file_size=len(file_content),
                processed=processed,
                message=message
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/files/{session_id}", response_model=FileListResponse)
async def get_session_files(session_id: str):
    """Get all files for a session"""
    try:
        with get_db() as db:
            files = db.query(UploadedFile).filter(
                UploadedFile.session_id == session_id
            ).order_by(UploadedFile.uploaded_at.desc()).all()

            file_list = [
                {
                    "id": f.id,
                    "filename": f.filename,
                    "file_size": f.file_size,
                    "processed": f.processed,
                    "uploaded_at": f.uploaded_at.isoformat()
                }
                for f in files
            ]

            return FileListResponse(files=file_list)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve files: {str(e)}")

@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete an uploaded file"""
    try:
        with get_db() as db:
            file_record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()

            if not file_record:
                raise HTTPException(status_code=404, detail="File not found")

            # Delete file from disk
            if os.path.exists(file_record.file_path):
                os.remove(file_record.file_path)

            # Delete from database
            db.delete(file_record)
            db.commit()

            return {"message": "File deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
