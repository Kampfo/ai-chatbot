from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
import time
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from vector_store import get_weaviate_client, init_schema
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Document Service")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model variable
model = None

def load_model():
    global model
    try:
        logger.info("Loading SentenceTransformer model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

# Initialize Weaviate Schema on startup with retries
@app.on_event("startup")
async def startup_event():
    try:
        # Load model
        load_model()
    except Exception as e:
        logger.error(f"Startup warning: Failed to load model: {e}")
        # Don't raise, allow app to start in degraded state

    try:
        # Try to connect to Weaviate
        max_retries = 5
        for i in range(max_retries):
            try:
                logger.info(f"Attempting to connect to Weaviate (Attempt {i+1}/{max_retries})...")
                init_schema()
                logger.info("Weaviate schema initialized successfully.")
                break
            except Exception as e:
                logger.warning(f"Weaviate not ready yet: {e}")
                if i < max_retries - 1:
                    time.sleep(2)
                else:
                    logger.error("Could not connect to Weaviate after multiple retries. Service will run in degraded mode.")
    except Exception as e:
        logger.error(f"Startup warning: Weaviate init failed: {e}")

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
async def health():
    try:
        client = get_weaviate_client()
        is_ready = client.is_ready()
        return {
            "status": "healthy" if is_ready else "degraded",
            "weaviate_ready": is_ready,
            "model_loaded": model is not None
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "model_loaded": model is not None
        }

@app.post("/documents/upload")
async def upload_document(
    audit_id: int = Form(...),
    file: UploadFile = File(...)
):
    if not model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")

    try:
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)

        # Extract text
        text_content = ""
        if file.filename.lower().endswith(".pdf"):
            try:
                reader = PdfReader(file_location)
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
            except Exception as e:
                logger.error(f"Error reading PDF: {e}")
                raise HTTPException(status_code=400, detail=f"Invalid PDF file: {str(e)}")
        else:
            # Fallback for text files
            try:
                with open(file_location, "r", encoding='utf-8', errors='ignore') as f:
                    text_content = f.read()
            except Exception as e:
                logger.error(f"Error reading text file: {e}")
                text_content = "Could not extract text."

        if not text_content.strip():
             raise HTTPException(status_code=400, detail="No text content extracted from file")

        # Chunk text (simple chunking)
        chunk_size = 1000
        chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]

        client = get_weaviate_client()
        if not client.is_ready():
             raise HTTPException(status_code=503, detail="Weaviate is not ready")

        logger.info(f"Processing {len(chunks)} chunks for file {file.filename}")

        for chunk in chunks:
            embedding = model.encode(chunk).tolist()
            
            client.data_object.create(
                data_object={
                    "content": chunk,
                    "filename": file.filename,
                    "audit_id": audit_id
                },
                class_name="Document",
                vector=embedding
            )

        return {"filename": file.filename, "chunks_processed": len(chunks), "status": "success"}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/documents/search")
async def search_documents(query: str, audit_id: int = None):
    if not model:
        raise HTTPException(status_code=503, detail="Embedding model not loaded")
        
    try:
        client = get_weaviate_client()
        query_vector = model.encode(query).tolist()

        where_filter = {}
        if audit_id:
            where_filter = {
                "path": ["audit_id"],
                "operator": "Equal",
                "valueInt": audit_id
            }

        query_builder = client.query.get("Document", ["content", "filename", "audit_id"])
        query_builder = query_builder.with_near_vector({
            "vector": query_vector,
            "certainty": 0.6  # Slightly lowered certainty
        })
        
        if audit_id:
            query_builder = query_builder.with_where(where_filter)
            
        response = query_builder.with_limit(5).do()

        return response
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
