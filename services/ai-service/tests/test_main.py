from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from unittest.mock import MagicMock, AsyncMock

import sys
import os
sys.path.append(os.getcwd())
os.environ["OPENAI_API_KEY"] = "dummy"

from app.main import app
from app.models.database import Base, get_db
from app.api.routes import chat

# Setup in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# Mock AI Service
mock_ai_service = MagicMock()
# chat method is async
mock_ai_service.chat = AsyncMock(return_value={
    "session_id": "123",
    "message": "Hello from AI",
    "sources": []
})

# Patch the global instance in the route
chat.ai_service = mock_ai_service

def test_chat_endpoint():
    response = client.post(
        "/api/chat",
        json={"audit_id": "1", "message": "Hello", "session_id": "123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Hello from AI"
    assert data["session_id"] == "123"
    
    # Verify service called
    assert mock_ai_service.chat.called
