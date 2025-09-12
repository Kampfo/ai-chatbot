import os
import json
import asyncio
from typing import Any, Dict, AsyncGenerator
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

class EventProducer:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)

    async def produce(self, stream: str, data: Dict[str, Any]) -> str:
        """Add event to Redis stream and return event id"""
        event_id = await self.redis.xadd(stream, {"data": json.dumps(data)})
        return event_id

class EventConsumer:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)

    async def consume(self, stream: str, last_id: str = "0-0") -> AsyncGenerator[Dict[str, Any], None]:
        """Yield events from a Redis stream starting after last_id"""
        while True:
            events = await self.redis.xread({stream: last_id}, block=0, count=1)
            for _, messages in events:
                for message_id, message_data in messages:
                    last_id = message_id
                    payload = json.loads(message_data["data"])
                    yield {"id": message_id, "data": payload}
            await asyncio.sleep(0)
