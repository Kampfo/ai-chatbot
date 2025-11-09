from typing import List

from openai import OpenAI

from app.config import settings


class EmbeddingService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_embedding_model

    def get_embedding(self, text: str) -> List[float]:
        # Basic safety guard
        text = text.strip()
        if not text:
            return []

        response = self.client.embeddings.create(
            model=self.model,
            input=text,
        )
        return response.data[0].embedding

    def chunk_text(self, text: str, max_chars: int = 1500) -> List[str]:
        """
        Sehr einfache Chunk-Logik: splittet nach max_chars.
        Für MVP ausreichend; später optimierbar nach Absätzen / Tokens.
        """
        text = text.replace("\r\n", "\n")
        chunks: List[str] = []
        start = 0
        length = len(text)
        while start < length:
            end = min(start + max_chars, length)
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            start = end
        return chunks
