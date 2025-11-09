from typing import List, Dict, Any, Optional

from pinecone import Pinecone

from app.config import settings
from app.services.embedding_service import EmbeddingService


class PineconeService:
    def __init__(self) -> None:
        if not settings.pinecone_api_key:
            raise RuntimeError("PINECONE_API_KEY is not configured")

        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index = self.pc.Index(settings.pinecone_index_name)
        self.embedding_service = EmbeddingService()

    def upsert_document_chunks(
        self,
        audit_id: str,
        file_id: str,
        filename: str,
        text: str,
    ) -> None:
        chunks = self.embedding_service.chunk_text(text)
        vectors = []

        for i, chunk in enumerate(chunks):
            embedding = self.embedding_service.get_embedding(chunk)
            if not embedding:
                continue

            vector_id = f"{file_id}:{i}"
            metadata = {
                "audit_id": audit_id,
                "file_id": file_id,
                "filename": filename,
                "chunk_index": i,
                "text": chunk,
            }
            vectors.append(
                {
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata,
                }
            )

        if not vectors:
            return

        self.index.upsert(vectors=vectors)

    def query_for_audit(
        self,
        audit_id: str,
        query_text: str,
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        embedding = self.embedding_service.get_embedding(query_text)
        if not embedding:
            return []

        res = self.index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            filter={"audit_id": {"$eq": audit_id}},
        )
        matches = res.matches or []
        results: List[Dict[str, Any]] = []
        for m in matches:
            md = m.metadata or {}
            results.append(
                {
                    "id": m.id,
                    "score": m.score,
                    "file_id": md.get("file_id"),
                    "filename": md.get("filename"),
                    "chunk_index": md.get("chunk_index"),
                    "text": md.get("text"),
                }
            )
        return results
