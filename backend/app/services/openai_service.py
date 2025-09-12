from openai import OpenAI
import os
import uuid
from typing import Dict, List, AsyncGenerator
from datetime import datetime
import asyncio

from .agent import Agent

class OpenAIService(Agent):
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key not configured")
        
        self.client = OpenAI(api_key=api_key)
        self.sessions: Dict[str, List] = {}
        self.model = "gpt-3.5-turbo"  # Start with 3.5 for cost efficiency
        self.max_context_messages = 10
    
    def create_session(self) -> str:
        """Create a new chat session"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = []
        return session_id
    
    def get_session_messages(self, session_id: str) -> List:
        """Get messages for a session"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        return self.sessions[session_id]
    
    def add_message(self, session_id: str, role: str, content: str):
        """Add message to session history"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        self.sessions[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        
        # Limit context size
        if len(self.sessions[session_id]) > self.max_context_messages * 2:
            self.sessions[session_id] = self.sessions[session_id][-self.max_context_messages:]
    
    async def get_response(self, message: str, session_id: str) -> str:
        """Get response from OpenAI"""
        try:
            # Add user message to history
            self.add_message(session_id, "user", message)

            # Prepare messages for API
            messages = [
                {"role": "system", "content": "You are a helpful assistant."}
            ]

            # Add conversation history
            for msg in self.get_session_messages(session_id):
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
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
            self.add_message(session_id, "assistant", response_text)

            return response_text

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    async def handle_message(self, message: str, session_id: str) -> str:
        """Implementation of Agent interface"""
        return await self.get_response(message, session_id)
    
    async def get_stream_response(self, message: str, session_id: str) -> AsyncGenerator[str, None]:
        """Get streaming response from OpenAI"""
        try:
            # Add user message to history
            self.add_message(session_id, "user", message)
            
            # Prepare messages
            messages = [
                {"role": "system", "content": "You are a helpful assistant."}
            ]
            
            for msg in self.get_session_messages(session_id):
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
            
            # Get streaming response
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
            self.add_message(session_id, "assistant", full_response)
            
        except Exception as e:
            yield f"Error: {str(e)}"
