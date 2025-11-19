import httpx
import os
from typing import List, Dict, Any

DOCUMENT_SERVICE_URL = os.getenv("DOCUMENT_SERVICE_URL", "http://document-service:8000")

class DocumentClient:
    def __init__(self):
        self.base_url = DOCUMENT_SERVICE_URL

    async def search(self, query: str, audit_id: int = None) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            params = {"query": query}
            if audit_id:
                params["audit_id"] = audit_id
            
            try:
                response = await client.post(f"{self.base_url}/documents/search", params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error calling Document Service: {e}")
                return {"data": {"Get": {"Document": []}}}
