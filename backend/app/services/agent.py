from abc import ABC, abstractmethod


class Agent(ABC):
    """Base interface for conversational agents."""

    @abstractmethod
    def create_session(self) -> str:
        """Create a new session identifier."""
        raise NotImplementedError

    @abstractmethod
    async def handle_message(self, message: str, session_id: str) -> str:
        """Process a message within a session and return a response."""
        raise NotImplementedError
