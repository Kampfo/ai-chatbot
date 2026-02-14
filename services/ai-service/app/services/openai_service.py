import json
from typing import List, Dict, Any, Optional, AsyncGenerator

from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.config import settings
from app.models.database import ChatSession, Message
from app.services.document_client import DocumentClient


class OpenAIService:
    def __init__(self, audit_context: str = "") -> None:
        if not settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY is not configured")
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.document_client = DocumentClient()
        self.audit_context = audit_context

    def create_session(self, db: Session, audit_id: str) -> ChatSession:
        try:
            aid = int(audit_id)
        except (ValueError, TypeError):
            aid = 0
        session = ChatSession(audit_id=aid)
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    def get_session(self, db: Session, session_id: str) -> Optional[ChatSession]:
        return db.query(ChatSession).filter(ChatSession.id == session_id).first()

    async def build_retrieval_context(
        self,
        audit_id: str,
        user_message: str,
    ) -> Dict[str, Any]:
        try:
            audit_id_int = int(audit_id)
        except (ValueError, TypeError):
            audit_id_int = None

        results = await self.document_client.search(query=user_message, audit_id=audit_id_int)

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
            sources.append({
                "label": label,
                "filename": filename,
                "snippet": snippet[:200] + "..." if len(snippet) > 200 else snippet,
            })

        return {"context_text": "\n".join(lines), "sources": sources}

    async def analyze_document(self, extracted_text: str, analysis_type: str, custom_prompt: str = "") -> str:
        """Analyze a document's extracted text with a specific analysis type."""
        prompts = {
            "RISK": (
                "Analysiere den folgenden Dokumenttext und identifiziere alle Risiken, "
                "Schwachstellen und potenzielle Problembereiche. Kategorisiere die Risiken "
                "nach Schweregrad (HOCH, MITTEL, NIEDRIG) und gib Empfehlungen."
            ),
            "SUMMARY": (
                "Erstelle eine strukturierte Zusammenfassung des folgenden Dokuments. "
                "Gliedere die Zusammenfassung in Hauptpunkte und hebe wichtige Details hervor."
            ),
            "COMPLIANCE": (
                "Prüfe den folgenden Dokumenttext auf Compliance-Aspekte. "
                "Identifiziere relevante regulatorische Anforderungen, potenzielle Verstöße "
                "und Bereiche, die einer genaueren Prüfung bedürfen."
            ),
            "CUSTOM": custom_prompt or "Analysiere den folgenden Dokumenttext.",
        }

        prompt = prompts.get(analysis_type, prompts["SUMMARY"])

        messages = [
            {"role": "system", "content": "Du bist ein Experte für interne Revision und Dokumentenanalyse. Antworte auf Deutsch."},
            {"role": "user", "content": f"{prompt}\n\n---\n\nDokumenttext:\n{extracted_text[:15000]}"},
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
        )

        return response.choices[0].message.content or ""

    async def generate_report(self, report_data: Dict[str, Any]) -> str:
        """Generate an audit report from structured data."""
        prompt = (
            "Erstelle einen professionellen Prüfungsbericht basierend auf den folgenden Daten. "
            "Strukturiere den Bericht mit: "
            "1. Zusammenfassung, 2. Prüfungsumfang und -ziele, 3. Feststellungen, "
            "4. Risikobewertung, 5. Empfehlungen und Maßnahmen, 6. Fazit. "
            "Verwende Markdown-Formatierung."
        )

        messages = [
            {"role": "system", "content": "Du bist ein Experte für interne Revision und Berichtserstellung. Antworte auf Deutsch."},
            {"role": "user", "content": f"{prompt}\n\n---\n\nPrüfungsdaten:\n{json.dumps(report_data, ensure_ascii=False, indent=2)}"},
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=4000,
        )

        return response.choices[0].message.content or ""

    async def chat_stream(
        self,
        db: Session,
        audit_id: str,
        session_id: Optional[str],
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        # Session management
        if session_id:
            session = self.get_session(db, session_id)
            if not session:
                session = self.create_session(db, audit_id)
        else:
            session = self.create_session(db, audit_id)

        current_session_id = str(session.id)

        # Save user message
        msg_user = Message(session_id=session.id, role="user", content=user_message)
        db.add(msg_user)
        db.commit()

        # Retrieval (graceful fallback)
        try:
            retrieval = await self.build_retrieval_context(
                audit_id=audit_id, user_message=user_message
            )
            context_text = retrieval["context_text"]
            sources = retrieval["sources"]
        except Exception as e:
            print(f"Retrieval failed (continuing without context): {e}")
            context_text = ""
            sources = []

        # Build system prompt with audit context
        system_parts = [
            "Du bist ein hilfreicher Assistent für interne Revision und Audit-Management.",
            "Nutze die bereitgestellten Dokumentauszüge, um präzise Antworten zu geben.",
            "Wenn du Informationen aus den Auszügen verwendest, referenziere sie mit [1], [2], etc.",
            "Wenn die Auszüge nicht ausreichen, nutze dein allgemeines Wissen.",
            "Antworte auf Deutsch.",
        ]

        if self.audit_context:
            system_parts.append(f"\nAktueller Prüfungskontext:\n{self.audit_context}")

        system_prompt = " ".join(system_parts)

        messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]

        if context_text:
            messages.append({
                "role": "system",
                "content": f"Relevante Dokumentauszüge:\n\n{context_text}",
            })

        # Chat history
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

        # Yield metadata first
        yield json.dumps({
            "type": "metadata",
            "session_id": current_session_id,
            "sources": sources,
        }) + "\n"

        # Stream OpenAI response
        full_response = ""
        try:
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
        except Exception as e:
            error_msg = f"\n\n[Fehler bei der KI-Antwort: {str(e)}]"
            full_response += error_msg
            yield json.dumps({"type": "content", "chunk": error_msg}) + "\n"

        # Save assistant message
        if full_response:
            msg_assistant = Message(
                session_id=session.id, role="assistant", content=full_response
            )
            db.add(msg_assistant)
            db.commit()
