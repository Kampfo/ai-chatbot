from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import os
import tempfile

# Patch imports before importing main
with patch('vector_store.init_schema'), \
     patch('vector_store.get_weaviate_client'):
    import main

# Override UPLOAD_DIR for testing
main.UPLOAD_DIR = tempfile.mkdtemp()

client = TestClient(main.app)

# Mock the model to avoid downloading/running heavy ML model
mock_model = MagicMock()
mock_model.encode.return_value.tolist.return_value = [0.1, 0.2, 0.3]
main.model = mock_model

# Mock Weaviate client
mock_weaviate_client = MagicMock()
main.get_weaviate_client = MagicMock(return_value=mock_weaviate_client)

def test_upload_document():
    # Create a dummy file
    file_content = b"This is a test document content."
    files = {"file": ("test.txt", file_content, "text/plain")}
    
    # Mock data_object.create
    mock_weaviate_client.data_object.create.return_value = "uuid-123"

    response = client.post(
        "/documents/upload",
        data={"audit_id": 1},
        files=files
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test.txt"
    assert data["chunks_processed"] > 0
    
    # Verify Weaviate was called
    assert mock_weaviate_client.data_object.create.called

def test_search_documents():
    # Mock query response
    mock_response = {"data": {"Get": {"Document": [{"content": "found", "filename": "test.txt"}]}}}
    
    # Mock the chain: client.query.get(...).with_near_vector(...).with_where(...).do()
    # This is complex to mock perfectly, so we mock the end result of the chain
    mock_query = MagicMock()
    mock_weaviate_client.query = mock_query
    
    # Mock the chain
    mock_get = mock_query.get.return_value
    mock_near = mock_get.with_near_vector.return_value
    mock_where = mock_near.with_where.return_value
    mock_where.do.return_value = mock_response
    # Also handle case without where (if logic differs, but here we test with audit_id)
    
    response = client.post("/documents/search", params={"query": "test", "audit_id": 1})
    
    assert response.status_code == 200
    assert response.json() == mock_response
