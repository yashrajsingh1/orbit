"""
ORBIT - Events API Routes (WebSocket)
Real-time event streaming for UI updates
"""

from datetime import datetime
import json
from typing import Optional

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.schemas import WSEvent, AgentThought
from app.services.event_service import EventService, ConnectionManager

router = APIRouter(prefix="/events", tags=["events"])

# WebSocket connection manager
manager = ConnectionManager()


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    redis: RedisClient = Depends(get_redis),
):
    """
    WebSocket endpoint for real-time events.
    
    Events streamed include:
    - Agent thoughts (reprioritizing, reducing scope, etc.)
    - Memory updates
    - Task status changes
    - Cognitive profile insights
    
    Philosophy: Progressive disclosure, no loading spinners.
    """
    await manager.connect(websocket, user_id)
    
    try:
        # Subscribe to user's Redis channel
        pubsub = await redis.subscribe(f"user:{user_id}:events")
        
        # Listen for messages
        async for message in pubsub.listen():
            if message["type"] == "message":
                event_data = json.loads(message["data"])
                await manager.send_personal_message(
                    json.dumps(event_data),
                    user_id,
                )
                
    except WebSocketDisconnect:
        manager.disconnect(user_id)


@router.post("/broadcast/thought")
async def broadcast_thought(
    thought: AgentThought,
    user_id: str,
    redis: RedisClient = Depends(get_redis),
):
    """
    Broadcast an agent thought to the user's UI.
    
    Example thoughts:
    - "Reprioritizing..."
    - "Reducing scope..."
    - "Noticing a pattern..."
    """
    event = WSEvent(
        type="agent_thought",
        payload=thought.model_dump(),
        timestamp=datetime.utcnow(),
    )
    
    await redis.publish_event(
        f"user:{user_id}:events",
        event.model_dump(),
    )
    
    return {"status": "broadcast"}


@router.get("/history/{user_id}")
async def get_event_history(
    user_id: str,
    limit: int = 50,
    event_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get recent event history for a user.
    
    Useful for loading UI state on reconnect.
    """
    event_service = EventService(db)
    events = await event_service.get_history(
        user_id=user_id,
        limit=limit,
        event_type=event_type,
    )
    return events


@router.get("/status")
async def get_connection_status(user_id: str):
    """
    Check if a user is connected via WebSocket.
    """
    is_connected = manager.is_connected(user_id)
    return {"user_id": user_id, "connected": is_connected}
