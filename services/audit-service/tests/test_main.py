from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app, get_db
from database import Base

# Setup in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

# Patch the engine in main.database to use our test engine
# This ensures startup event uses the test DB
import main
import database
main.database.engine = engine
database.engine = engine

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_create_audit():
    response = client.post(
        "/audits/",
        json={"title": "Test Audit", "description": "Testing description", "status": "PLANNED"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Audit"
    assert "id" in data
    assert data["status"] == "PLANNED"

def test_read_audits():
    # Create another audit
    client.post(
        "/audits/",
        json={"title": "Audit 2", "description": "Desc 2", "status": "IN_PROGRESS"},
    )
    response = client.get("/audits/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1

def test_create_risk():
    # Create audit first
    audit_res = client.post(
        "/audits/",
        json={"title": "Risk Audit", "description": "For Risk", "status": "PLANNED"},
    )
    audit_id = audit_res.json()["id"]

    response = client.post(
        f"/audits/{audit_id}/risks/",
        json={"title": "High Risk", "description": "Dangerous", "impact": "High", "likelihood": "Likely"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "High Risk"
    assert data["audit_id"] == audit_id
