import weaviate
import os
import json

WEAVIATE_URL = os.getenv("WEAVIATE_URL", "http://localhost:8080")

def get_weaviate_client():
    client = weaviate.Client(
        url=WEAVIATE_URL,
    )
    return client

def init_schema():
    client = get_weaviate_client()
    
    class_obj = {
        "class": "Document",
        "vectorizer": "none", # We will provide vectors manually
        "properties": [
            {
                "name": "content",
                "dataType": ["text"],
            },
            {
                "name": "filename",
                "dataType": ["string"],
            },
            {
                "name": "audit_id",
                "dataType": ["int"],
            }
        ]
    }

    if not client.schema.exists("Document"):
        client.schema.create_class(class_obj)
        print("Schema 'Document' created.")
    else:
        print("Schema 'Document' already exists.")


def delete_by_filename(filename: str) -> int:
    """Delete all document chunks with the given filename from Weaviate."""
    client = get_weaviate_client()
    deleted = 0

    try:
        result = (
            client.query
            .get("Document", ["filename"])
            .with_where({
                "path": ["filename"],
                "operator": "Equal",
                "valueString": filename,
            })
            .with_limit(1000)
            .with_additional(["id"])
            .do()
        )

        documents = result.get("data", {}).get("Get", {}).get("Document", [])

        for doc in documents:
            doc_id = doc.get("_additional", {}).get("id")
            if doc_id:
                client.data_object.delete(doc_id, class_name="Document")
                deleted += 1

    except Exception as e:
        print(f"Error deleting documents for {filename}: {e}")

    return deleted
