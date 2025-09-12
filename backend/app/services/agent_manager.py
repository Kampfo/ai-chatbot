from typing import Dict, Optional, AsyncGenerator

from .agent import Agent


class AgentManager:
    """Registry and router for different conversational agents."""

    def __init__(self):
        self._agents: Dict[str, Agent] = {}
        self._default: Optional[str] = None

    def register(self, name: str, agent: Agent, *, default: bool = False) -> None:
        """Register a new agent under the given name."""
        self._agents[name] = agent
        if default or self._default is None:
            self._default = name

    def get(self, name: Optional[str] = None) -> Agent:
        """Retrieve an agent by name or return the default agent."""
        key = name or self._default
        if key is None or key not in self._agents:
            raise ValueError(f"Agent '{name}' not found")
        return self._agents[key]

    async def handle_message(self, name: Optional[str], message: str, session_id: str) -> str:
        agent = self.get(name)
        return await agent.handle_message(message, session_id)

    async def handle_stream(self, name: Optional[str], message: str, session_id: str) -> AsyncGenerator[str, None]:
        agent = self.get(name)
        if not hasattr(agent, "get_stream_response"):
            raise ValueError(f"Agent '{name}' does not support streaming responses")
        async for chunk in agent.get_stream_response(message=message, session_id=session_id):
            yield chunk
