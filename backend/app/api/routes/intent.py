"""
ORBIT - Intent API Routes
Handles voice/text input interpretation
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import Intent, User, IntentUrgency
from app.schemas import (
    IntentCreate,
    IntentResponse,
    IntentInterpretation,
)
from app.services.intent_service import IntentService
from app.api.deps import get_current_user

router = APIRouter(prefix="/intent", tags=["intent"])


@router.post("/", response_model=IntentResponse, status_code=status.HTTP_201_CREATED)
async def create_intent(
    intent_data: IntentCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new intent from voice or text input.
    
    This is the primary entry point for user input. The intent will be:
    1. Stored in the database
    2. Interpreted by the AI
    3. Published to the event stream
    """
    intent_service = IntentService(db, redis)
    intent = await intent_service.create_intent(
        user_id=current_user.id,
        raw_input=intent_data.raw_input,
        source=intent_data.source,
    )
    return intent


@router.get("/", response_model=list[IntentResponse])
async def list_intents(
    limit: int = 20,
    offset: int = 0,
    is_processed: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List user's intents, optionally filtered by processing status.
    """
    query = select(Intent).where(Intent.user_id == current_user.id)
    
    if is_processed is not None:
        query = query.where(Intent.is_processed == is_processed)
    
    query = query.order_by(Intent.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/current", response_model=Optional[IntentResponse])
async def get_current_intent(
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get the user's current active intent from session state.
    """
    intent_data = await redis.get_current_intent(str(current_user.id))
    if not intent_data:
        return None
    return IntentResponse(**intent_data)


@router.get("/{intent_id}", response_model=IntentResponse)
async def get_intent(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific intent by ID.
    """
    result = await db.execute(
        select(Intent).where(
            Intent.id == intent_id,
            Intent.user_id == current_user.id,
        )
    )
    intent = result.scalar_one_or_none()
    
    if not intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intent not found",
        )
    
    return intent


@router.post("/{intent_id}/interpret", response_model=IntentInterpretation)
async def interpret_intent(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Trigger AI interpretation of an intent.
    
    Returns the interpretation including:
    - Interpreted intent (what the user actually wants)
    - Urgency level
    - Ambiguity detection
    - Emotional tone
    - Suggested clarification if needed
    """
    intent_service = IntentService(db, redis)
    interpretation = await intent_service.interpret_intent(
        intent_id=intent_id,
        user_id=current_user.id,
    )
    return interpretation


@router.post("/{intent_id}/process")
async def process_intent(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Process an intent through the full agent pipeline:
    Intent → Plan → Execute → Evaluate
    
    This triggers the complete ORBIT workflow.
    """
    intent_service = IntentService(db, redis)
    result = await intent_service.process_intent(
        intent_id=intent_id,
        user_id=current_user.id,
    )
    return result


@router.delete("/{intent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_intent(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an intent (soft delete - marks as expired).
    """
    result = await db.execute(
        select(Intent).where(
            Intent.id == intent_id,
            Intent.user_id == current_user.id,
        )
    )
    intent = result.scalar_one_or_none()
    
    if not intent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Intent not found",
        )
    
    intent.expires_at = datetime.utcnow()
    await db.commit()
