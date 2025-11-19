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
