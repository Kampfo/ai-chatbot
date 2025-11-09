import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Core
    app_name: str = "Audit AI Chatbot"
    environment: str = os.getenv("ENVIRONMENT", "local")

    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_embedding_model: str = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")

    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./data/chatbot.db")

    # Pinecone
    pinecone_api_key: str | None = os.getenv("PINECONE_API_KEY")
    pinecone_environment: str | None = os.getenv("PINECONE_ENVIRONMENT")
    pinecone_index_name: str = os.getenv("PINECONE_INDEX_NAME", "audit-doc-index")

    # Frontend / CORS
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:4173")

    # Files
    upload_dir: str = os.getenv("UPLOAD_DIR", "./data/uploads")

    class Config:
        env_file = ".env"


settings = Settings()
