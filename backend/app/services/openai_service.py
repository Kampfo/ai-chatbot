from openai import OpenAI
import os
from typing import List, AsyncGenerator, Optional
from datetime import datetime
import asyncio
from sqlalchemy.orm import Session as DBSession

from app.db import get_db
from app.models.database import Session, Message, UploadedFile

class OpenAIService:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")

        self.client = OpenAI(api_key=api_key)
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self.max_context_messages = int(os.getenv("MAX_CONTEXT_MESSAGES", "10"))

    def create_session(self) -> str:
        """Create a new chat session in database"""
        with get_db() as db:
            session = Session()
            db.add(session)
            db.commit()
            db.refresh(session)
            return session.id

    def get_session_messages(self, session_id: str, db: DBSession) -> List[Message]:
        """Get messages for a session from database"""
        messages = db.query(Message).filter(
            Message.session_id == session_id
        ).order_by(Message.created_at.asc()).all()

        # Limit context size
        if len(messages) > self.max_context_messages * 2:
            messages = messages[-self.max_context_messages * 2:]

        return messages

    def add_message(self, session_id: str, role: str, content: str, db: DBSession):
        """Add message to session history in database"""
        message = Message(
            session_id=session_id,
            role=role,
            content=content
        )
        db.add(message)
        db.commit()

    def get_session_pdf_context(self, session_id: str, db: DBSession) -> Optional[str]:
        """Get extracted text from PDFs uploaded in this session"""
        files = db.query(UploadedFile).filter(
            UploadedFile.session_id == session_id,
            UploadedFile.processed == True
        ).all()

        if not files:
            return None

        # Combine all PDF texts
        pdf_texts = []
        for file in files:
            if file.extracted_text:
                pdf_texts.append(f"--- Content from {file.filename} ---\n{file.extracted_text}\n")

        return "\n".join(pdf_texts) if pdf_texts else None
    
    async def get_response(self, message: str, session_id: str) -> str:
        """Get response from OpenAI"""
        try:
            with get_db() as db:
                # Add user message to history
                self.add_message(session_id, "user", message, db)

                # Prepare system message
                system_content = "You are a helpful assistant."

                # Add PDF context if available
                pdf_context = self.get_session_pdf_context(session_id, db)
                if pdf_context:
                    system_content += f"\n\nYou have access to the following documents:\n{pdf_context}\n\nUse this information to answer questions when relevant."

                # Prepare messages for API
                messages = [
                    {"role": "system", "content": system_content}
                ]

                # Add conversation history
                for msg in self.get_session_messages(session_id, db):
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

                # Get response from OpenAI
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=1000
                )

                # Extract response text
                response_text = response.choices[0].message.content

                # Add assistant message to history
                self.add_message(session_id, "assistant", response_text, db)

                return response_text

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def get_stream_response(self, message: str, session_id: str) -> AsyncGenerator[str, None]:
        """Get streaming response from OpenAI"""
        try:
            with get_db() as db:
                # Add user message to history
                self.add_message(session_id, "user", message, db)

                # Prepare system message
                system_content = "You are a helpful assistant."

                # Add PDF context if available
                pdf_context = self.get_session_pdf_context(session_id, db)
                if pdf_context:
                    system_content += f"\n\nYou have access to the following documents:\n{pdf_context}\n\nUse this information to answer questions when relevant."

                # Prepare messages
                messages = [
                    {"role": "system", "content": system_content}
                ]

                for msg in self.get_session_messages(session_id, db):
                    messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Get streaming response (outside the db context to avoid blocking)
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
                stream=True
            )

            full_response = ""
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    content = chunk.choices[0].delta.content
                    full_response += content
                    yield content
                    await asyncio.sleep(0.01)  # Small delay for smoother streaming

            # Add complete response to history
            with get_db() as db:
                self.add_message(session_id, "assistant", full_response, db)

        except Exception as e:
            yield f"Error: {str(e)}"
