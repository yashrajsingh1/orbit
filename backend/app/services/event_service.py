"""
ORBIT - Event Service
Handles behavioral event logging and WebSocket management
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import BehavioralEvent, EventType


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and store a WebSocket connection."""
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        """Remove a WebSocket connection."""
        self.active_connections.pop(user_id, None)

    def is_connected(self, user_id: str) -> bool:
        """Check if a user is connected."""
        return user_id in self.active_connections

    async def send_personal_message(self, message: str, user_id: str):
        """Send a message to a specific user."""
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        """Broadcast message to all connections."""
        for connection in self.active_connections.values():
            await connection.send_text(message)


class EventService:
    """Service for behavioral event management."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_event(
        self,
        user_id: UUID,
        event_type: EventType,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        event_data: dict = None,
    ) -> BehavioralEvent:
        """
        Log a behavioral event.
        
        These events feed the cognitive profile learning system.
        """
        now = datetime.utcnow()

        event = BehavioralEvent(
            user_id=user_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            event_data=event_data or {},
            time_of_day=now.hour,
            day_of_week=now.weekday(),
        )
        self.db.add(event)
        await self.db.flush()

        return event

    async def get_history(
        self,
        user_id: str,
        limit: int = 50,
        event_type: Optional[str] = None,
    ) -> list[BehavioralEvent]:
        """Get recent events for a user."""
        query = select(BehavioralEvent).where(
            BehavioralEvent.user_id == UUID(user_id)
        )

        if event_type:
            query = query.where(BehavioralEvent.event_type == event_type)

        query = query.order_by(BehavioralEvent.created_at.desc()).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_events_for_analysis(
        self,
        user_id: UUID,
        hours: int = 24,
    ) -> list[BehavioralEvent]:
        """Get recent unanalyzed events for profile learning."""
        cutoff = datetime.utcnow() - timedelta(hours=hours)

        result = await self.db.execute(
            select(BehavioralEvent).where(
                BehavioralEvent.user_id == user_id,
                BehavioralEvent.is_analyzed == False,
                BehavioralEvent.created_at >= cutoff,
            ).order_by(BehavioralEvent.created_at.asc())
        )
        return result.scalars().all()

    async def mark_events_analyzed(
        self,
        event_ids: list[UUID],
    ):
        """Mark events as analyzed."""
        for event_id in event_ids:
            result = await self.db.execute(
                select(BehavioralEvent).where(BehavioralEvent.id == event_id)
            )
            event = result.scalar_one_or_none()
            if event:
                event.is_analyzed = True
                event.contributed_to_profile = True

        await self.db.commit()


from datetime import timedelta
