from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from openai import AsyncOpenAI
from app.config import settings
from app.models.database import ChatSession, Message
from app.services.document_client import DocumentClient

class OpenAIService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.document_client = DocumentClient()

    # --- Session Management ---

    def create_session(self, db: Session, audit_id: str) -> ChatSession:
        session = ChatSession(audit_id=audit_id)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(self, db: Session, session_id: str) -> ChatSession:
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if not session:
            raise ValueError("Session not found")
        return session

    # --- Retrieval-Kontext ---

    async def build_retrieval_context(
        self,
        audit_id: str,
        user_message: str,
    ) -> Dict[str, Any]:
        """
        Holt relevante Dokument-Chunks vom Document Service.
        """
        # Convert audit_id to int if possible, as Document Service expects int
        try:
            audit_id_int = int(audit_id)
        except ValueError:
            audit_id_int = None # Or handle error

        results = await self.document_client.search(query=user_message, audit_id=audit_id_int)
        
        # Parse Weaviate response structure
        # Expected: {"data": {"Get": {"Document": [{"content": "...", "filename": "..."}]}}}
        documents = results.get("data", {}).get("Get", {}).get("Document", [])

        if not documents:
            return {"context_text": "", "sources": []}

        lines: List[str] = []
        sources: List[Dict[str, Any]] = []
        for idx, doc in enumerate(documents, start=1):
            label = f"[{idx}]"
            snippet = doc.get("content") or ""
            filename = doc.get("filename") or "Unbekanntes Dokument"
            lines.append(f"{label} Aus Dokument '{filename}':\n{snippet}\n")
            sources.append(
                {
                    "label": label,
                    "filename": filename,
                    "snippet": snippet[:100] + "..."
                }
            )

        context_text = "\n".join(lines)
        return {"context_text": context_text, "sources": sources}

    # --- Chat-Abwicklung ---

    def build_message_history(
        self,
        db: Session,
        session: ChatSession,
        context_text: str,
        user_message: str,
        max_history_messages: int = 10,
    ) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = []

        system_prompt = (
            "Du bist ein Assistent für interne Revision. "
            "Nutze die bereitgestellten Dokumentauszüge, um präzise, nachvollziehbare Antworten zu geben. "
            "Wenn du Informationen aus den Auszügen verwendest, referenziere sie mit [1], [2], etc. "
            "Wenn du etwas nicht weißt, spekuliere nicht, sondern sage klar, dass dir die Informationen fehlen."
        )
        messages.append({"role": "system", "content": system_prompt})

        if context_text:
            messages.append(
                {
                    "role": "system",
                    "content": f"Relevante Dokumentauszüge:\n\n{context_text}",
                }
            )

        history = (
            db.query(Message)
            .filter(Message.session_id == session.id)
            .order_by(Message.created_at.desc())
            .limit(max_history_messages)
            .all()
        )
        for m in reversed(history):
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})

        messages.append({"role": "user", "content": user_message})

        return messages

    async def chat_stream(
        self,
        db: Session,
        audit_id: str,
        session_id: Optional[str],
        user_message: str,
    ):
        if session_id:
            session = self.get_session(db, session_id)
        else:
            session = self.create_session(db, audit_id)
            session_id = session.id

        msg_user = Message(session_id=session.id, role="user", content=user_message)
        db.add(msg_user)
        db.commit()

        # Retrieval (Optional - if fails, we continue)
        try:
            retrieval = await self.build_retrieval_context(audit_id=audit_id, user_message=user_message)
            context_text = retrieval["context_text"]
            sources = retrieval["sources"]
        except Exception as e:
            print(f"Retrieval failed: {e}")
            context_text = ""
            sources = []

        # Update System Prompt for General Chat
        system_prompt = (
            "Du bist ein hilfreicher Assistent für interne Revision. "
            "Nutze die bereitgestellten Dokumentauszüge, um präzise Antworten zu geben. "
            "Wenn die Auszüge nicht ausreichen oder die Frage allgemein ist, nutze dein allgemeines Wissen. "
            "Referenziere Quellen mit [1], [2], wenn du sie nutzt."
        )

        messages = []
        messages.append({"role": "system", "content": system_prompt})
        
        if context_text:
            messages.append({"role": "system", "content": f"Relevante Dokumentauszüge:\n\n{context_text}"})

        # History
        history = (
            db.query(Message)
            .filter(Message.session_id == session.id)
            .order_by(Message.created_at.desc())
            .limit(10)
            .all()
        )
        for m in reversed(history):
            if m.role in ("user", "assistant"):
                messages.append({"role": m.role, "content": m.content})

        messages.append({"role": "user", "content": user_message})

        # Yield Metadata first
        import json
        yield json.dumps({
            "type": "metadata",
            "session_id": str(session_id),
            "sources": sources
        }) + "\n"

        # Stream Response
        full_response = ""
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True,
        )

        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_response += content
                yield json.dumps({"type": "content", "chunk": content}) + "\n"

        # Save Assistant Message
        msg_assistant = Message(session_id=session.id, role="assistant", content=full_response)
        db.add(msg_assistant)
        db.commit()
