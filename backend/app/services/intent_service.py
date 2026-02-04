"""
ORBIT - Intent Service
Handles intent creation and interpretation
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.redis import RedisClient
from app.models import Intent, User, CognitiveProfile, IntentUrgency, EventType
from app.schemas import IntentInterpretation
from app.services.ai_service import AIService
from app.services.event_service import EventService


class IntentService:
    """Service for managing intents."""

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        self.ai_service = AIService()
        self.event_service = EventService(db)

    async def create_intent(
        self,
        user_id: UUID,
        raw_input: str,
        source: str = "text",
    ) -> Intent:
        """
        Create a new intent from user input.
        """
        # Create intent record
        intent = Intent(
            user_id=user_id,
            raw_input=raw_input,
        )
        self.db.add(intent)
        await self.db.flush()

        # Store as current intent in Redis
        await self.redis.set_current_intent(
            str(user_id),
            {
                "id": str(intent.id),
                "raw_input": raw_input,
                "created_at": datetime.utcnow().isoformat(),
            },
        )

        # Log behavioral event
        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.INTENT_EXPRESSED,
            entity_type="intent",
            entity_id=intent.id,
            event_data={"source": source, "length": len(raw_input)},
        )

        await self.db.commit()
        await self.db.refresh(intent)

        return intent

    async def interpret_intent(
        self,
        intent_id: UUID,
        user_id: UUID,
    ) -> IntentInterpretation:
        """
        Use AI to interpret an intent.
        """
        # Get intent
        result = await self.db.execute(
            select(Intent).where(
                Intent.id == intent_id,
                Intent.user_id == user_id,
            )
        )
        intent = result.scalar_one_or_none()
        if not intent:
            raise ValueError("Intent not found")

        # Get cognitive profile for context
        profile_result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Use AI to interpret
        interpretation = await self.ai_service.interpret_intent(
            raw_input=intent.raw_input,
            cognitive_profile=profile,
        )

        # Update intent with interpretation
        intent.interpreted_intent = interpretation.interpreted_intent
        intent.urgency = interpretation.urgency
        intent.is_ambiguous = interpretation.is_ambiguous
        intent.ambiguity_reason = interpretation.ambiguity_reason
        intent.emotional_tone = interpretation.emotional_tone
        intent.context_tags = interpretation.context_tags
        intent.is_processed = True
        intent.processed_at = datetime.utcnow()

        await self.db.commit()

        # Broadcast interpretation event
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "intent_interpreted",
                "payload": {
                    "intent_id": str(intent_id),
                    "interpretation": interpretation.model_dump(),
                },
            },
        )

        return interpretation

    async def process_intent(
        self,
        intent_id: UUID,
        user_id: UUID,
    ) -> dict:
        """
        Process intent through the full agent pipeline.
        Intent → Plan → Execute → Evaluate
        """
        # This will be expanded in Phase 3
        # For now, just interpret
        interpretation = await self.interpret_intent(intent_id, user_id)

        return {
            "status": "processed",
            "intent_id": str(intent_id),
            "interpretation": interpretation.model_dump(),
            "next_step": "planning",
        }
