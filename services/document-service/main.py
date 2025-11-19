from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
import shutil
import os
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from vector_store import get_weaviate_client, init_schema

app = FastAPI(title="Document Service")

# Initialize Weaviate Schema on startup
@app.on_event("startup")
def startup_event():
    try:
        init_schema()
    except Exception as e:
        print(f"Failed to init Weaviate schema: {e}")

# Load embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/documents/upload")
async def upload_document(
    audit_id: int = Form(...),
    file: UploadFile = File(...)
):
    file_location = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    # Extract text
    text_content = ""
    if file.filename.endswith(".pdf"):
        reader = PdfReader(file_location)
        for page in reader.pages:
            text_content += page.extract_text() + "\n"
    else:
        # Fallback for text files
        try:
            with open(file_location, "r") as f:
                text_content = f.read()
        except:
            text_content = "Could not extract text."

    # Chunk text (simple chunking)
    chunk_size = 1000
    chunks = [text_content[i:i+chunk_size] for i in range(0, len(text_content), chunk_size)]

    client = get_weaviate_client()

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

    return {"filename": file.filename, "chunks_processed": len(chunks)}

@app.post("/documents/search")
async def search_documents(query: str, audit_id: int = None):
    client = get_weaviate_client()
    query_vector = model.encode(query).tolist()

    where_filter = {}
    if audit_id:
        where_filter = {
            "path": ["audit_id"],
            "operator": "Equal",
            "valueInt": audit_id
        }

    response = (
        client.query
        .get("Document", ["content", "filename", "audit_id"])
        .with_near_vector({
            "vector": query_vector,
            "certainty": 0.7
        })
        .with_where(where_filter) if audit_id else 
        client.query
        .get("Document", ["content", "filename", "audit_id"])
        .with_near_vector({
            "vector": query_vector,
            "certainty": 0.7
        })
    ).do()

    return response
