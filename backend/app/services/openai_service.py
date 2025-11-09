from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from openai import OpenAI

from app.config import settings
from app.models.database import ChatSession, Message
from app.services.pinecone_service import PineconeService


class OpenAIService:
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        # Pinecone optional; wenn nicht konfiguriert, fällt Retrieval weg
        self.pinecone: Optional[PineconeService]
        try:
            if settings.pinecone_api_key:
                self.pinecone = PineconeService()
            else:
                self.pinecone = None
        except Exception:
            self.pinecone = None

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

    def build_retrieval_context(
        self,
        audit_id: str,
        user_message: str,
    ) -> Dict[str, Any]:
        """
        Holt relevante Dokument-Chunks aus Pinecone und baut
        einen Kontext-String sowie eine Sources-Liste.
        """
        if not self.pinecone:
            return {"context_text": "", "sources": []}

        results = self.pinecone.query_for_audit(audit_id, user_message, top_k=5)
        if not results:
            return {"context_text": "", "sources": []}

        lines: List[str] = []
        sources: List[Dict[str, Any]] = []
        for idx, r in enumerate(results, start=1):
            label = f"[{idx}]"
            snippet = r.get("text") or ""
            filename = r.get("filename") or "Unbekanntes Dokument"
            lines.append(f"{label} Aus Dokument '{filename}':\n{snippet}\n")
            sources.append(
                {
                    "label": label,
                    "file_id": r.get("file_id"),
                    "filename": filename,
                    "chunk_index": r.get("chunk_index"),
                    "score": r.get("score"),
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
        """
        Bekommt die letzten N Nachrichten der Session + Kontext
        und baut eine Message-Liste für die OpenAI-Chat-API.
        """
        messages: List[Dict[str, str]] = []

        # System Prompt
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

        # Historie laden
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

        # Aktuelle User-Nachricht
        messages.append({"role": "user", "content": user_message})

        return messages

    def chat(
        self,
        db: Session,
        audit_id: str,
        session_id: Optional[str],
        user_message: str,
    ) -> Dict[str, Any]:
        """
        Führt einen Chat-Turn aus: Session sicherstellen, Kontext holen,
        OpenAI aufrufen, Messages speichern, Antwort + Quellen zurückgeben.
        """
        # Session bestimmen / erstellen
        if session_id:
            session = self.get_session(db, session_id)
            if session.audit_id != audit_id:
                raise ValueError("Session gehört nicht zur angegebenen Prüfung")
        else:
            session = self.create_session(db, audit_id)
            session_id = session.id

        # User-Message persistieren
        msg_user = Message(session_id=session.id, role="user", content=user_message)
        db.add(msg_user)
        db.commit()
        db.refresh(msg_user)

        # Kontext aufbauen
        retrieval = self.build_retrieval_context(audit_id=audit_id, user_message=user_message)
        context_text = retrieval["context_text"]
        sources = retrieval["sources"]

        # Message-History inkl. Kontext
        messages = self.build_message_history(
            db=db,
            session=session,
            context_text=context_text,
            user_message=user_message,
        )

        # OpenAI-Call
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
        )
        assistant_text = response.choices[0].message.content

        # Assistant-Message persistieren
        msg_assistant = Message(session_id=session.id, role="assistant", content=assistant_text)
        db.add(msg_assistant)
        db.commit()
        db.refresh(msg_assistant)

        return {
            "session_id": session_id,
            "message": assistant_text,
            "sources": sources,
        }
