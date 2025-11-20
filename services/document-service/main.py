from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import shutil
import os
import time
import logging
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from vector_store import get_weaviate_client, init_schema
import asyncio
from concurrent.futures import ThreadPoolExecutor

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
executor = ThreadPoolExecutor(max_workers=1)  # Limit to 1 worker to save RAM

def load_model():
    global model
    try:
        logger.info("Loading SentenceTransformer model...")
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise e

@app.on_event("startup")
async def startup_event():
    # Run model loading in thread to not block startup
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(executor, load_model)
    except Exception as e:
        logger.error(f"Startup warning: Failed to load model: {e}")

    # Try to connect to Weaviate
    try:
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
    except Exception as e:
        logger.error(f"Startup warning: Weaviate init failed: {e}")

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

def process_file_sync(file_path: str, filename: str, audit_id: int):
    """
    CPU-intensive task: Parse PDF, chunk text, embed, and upload to Weaviate.
    This runs in a separate thread.
    """
    try:
        logger.info(f"Processing file: {filename}")
        
        # 1. Extract Text
        text_content = ""
        if filename.lower().endswith(".pdf"):
            try:
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text_content += page.extract_text() + "\n"
            except Exception as e:
                logger.error(f"Error reading PDF {filename}: {e}")
                return
        else:
            try:
                with open(file_path, "r", encoding='utf-8', errors='ignore') as f:
                    text_content = f.read()
            except Exception as e:
                logger.error(f"Error reading text file {filename}: {e}")
                return

        if not text_content.strip():
            logger.warning(f"No text content in {filename}")
            return

        # 2. Chunk Text
        chunk_size = 1000
        chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]
        logger.info(f"Generated {len(chunks)} chunks for {filename}")

        # 3. Embed and Upload (Batching)
        client = get_weaviate_client()
        
        # Configure batch
        client.batch.configure(batch_size=100) 
        
        with client.batch as batch:
            for i, chunk in enumerate(chunks):
                # Embedding is CPU heavy!
                embedding = model.encode(chunk).tolist()
                
                properties = {
                    "content": chunk,
                    "filename": filename,
                    "audit_id": audit_id
                }
                
                batch.add_data_object(
                    data_object=properties,
                    class_name="Document",
                    vector=embedding
                )
                
        logger.info(f"Successfully processed and uploaded {filename}")

    except Exception as e:
        logger.error(f"Failed to process file {filename}: {e}")

@app.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    audit_id: int = Form(...),
    file: UploadFile = File(...)
):
    """
    Accepts the upload immediately and processes it in the background.
    This prevents Nginx timeouts.
    """
    if not model:
        raise HTTPException(status_code=503, detail="Model is still loading, please try again in a moment")

    try:
        # Save file first (IO bound, fast enough)
        file_location = f"{UPLOAD_DIR}/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        # Offload processing to background task
        background_tasks.add_task(process_file_sync, file_location, file.filename, audit_id)

        return {
            "filename": file.filename, 
            "status": "processing_started", 
            "message": "File uploaded and processing started in background"
        }

    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/documents/search")
async def search_documents(query: str, audit_id: int = None):
    if not model:
        raise HTTPException(status_code=503, detail="Model not loaded")
        
    # Run search in executor to avoid blocking
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(executor, _search_sync, query, audit_id)

def _search_sync(query: str, audit_id: int):
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
            "certainty": 0.6
        })
        
        if audit_id:
            query_builder = query_builder.with_where(where_filter)
            
        return query_builder.with_limit(5).do()
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise e
