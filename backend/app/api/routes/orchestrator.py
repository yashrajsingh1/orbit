"""
ORBIT - Orchestrator API Routes
High-level cognitive loop endpoints
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User
from app.api.deps import get_current_user
from app.agents import OrchestratorAgent


router = APIRouter(prefix="/orbit", tags=["orchestrator"])


class ProcessIntentRequest(BaseModel):
    """Request to process a new intent."""
    raw_input: str
    source: str = "text"
    auto_plan: bool = True


class CompleteTaskRequest(BaseModel):
    """Request to complete a task."""
    task_id: UUID
    completion_notes: Optional[str] = None
    actual_minutes: Optional[int] = None


class AbandonTaskRequest(BaseModel):
    """Request to abandon a task."""
    task_id: UUID
    reason: Optional[str] = None


@router.post("/process")
async def process_intent(
    request: ProcessIntentRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Process a new intent through the cognitive loop.
    
    This is the primary entry point for user input.
    
    Steps:
    1. Create and interpret intent
    2. Check for overwhelm
    3. Generate plan
    4. Return actionable response
    
    Philosophy:
    - One endpoint for the full flow
    - Intelligent defaults
    - Graceful handling of edge cases
    """
    orchestrator = OrchestratorAgent(db, redis)
    
    result = await orchestrator.process_intent(
        user_id=current_user.id,
        raw_input=request.raw_input,
        source=request.source,
        auto_plan=request.auto_plan,
    )
    
    return result


@router.post("/complete")
async def complete_task(
    request: CompleteTaskRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Complete a task and trigger learning.
    
    Returns evaluation and insights.
    """
    orchestrator = OrchestratorAgent(db, redis)
    
    result = await orchestrator.complete_task_and_learn(
        user_id=current_user.id,
        task_id=request.task_id,
        completion_notes=request.completion_notes,
        actual_minutes=request.actual_minutes,
    )
    
    return result


@router.post("/abandon")
async def abandon_task(
    request: AbandonTaskRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Abandon a task gracefully.
    
    Abandonment is valid - it's data, not failure.
    """
    orchestrator = OrchestratorAgent(db, redis)
    
    result = await orchestrator.abandon_task_and_learn(
        user_id=current_user.id,
        task_id=request.task_id,
        reason=request.reason,
    )
    
    return result


@router.get("/focus")
async def get_focus_suggestion(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get a suggestion for what to focus on.
    
    Uses cognitive profile and current context.
    """
    orchestrator = OrchestratorAgent(db, redis)
    
    suggestion = await orchestrator.get_focus_suggestion(
        user_id=current_user.id,
    )
    
    return suggestion


@router.get("/insights")
async def get_insights(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get cognitive insights for the user.
    
    Philosophy:
    - Suggestions over commands
    - Observations without judgment
    """
    from app.agents import CognitiveProfileAgent
    
    profile_agent = CognitiveProfileAgent(db, redis)
    insights = await profile_agent.generate_insights(current_user.id)
    
    return {
        "insights": [i.model_dump() for i in insights],
        "count": len(insights),
    }


@router.get("/overwhelm-check")
async def check_overwhelm(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Check if user might be overwhelmed.
    
    Returns suggestions for scope reduction if needed.
    """
    from app.agents import CognitiveProfileAgent
    
    profile_agent = CognitiveProfileAgent(db, redis)
    overwhelm = await profile_agent.detect_overwhelm(current_user.id)
    
    if overwhelm and overwhelm.get("is_overwhelmed"):
        suggestion = await profile_agent.suggest_scope_reduction(current_user.id)
        return {
            **overwhelm,
            **suggestion,
        }
    
    return {
        "is_overwhelmed": False,
        "message": "You're doing fine.",
    }


@router.post("/learn")
async def trigger_learning(
    lookback_hours: int = 24,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Manually trigger profile learning.
    
    Usually this runs automatically, but can be triggered manually.
    """
    from app.agents import CognitiveProfileAgent
    
    profile_agent = CognitiveProfileAgent(db, redis)
    result = await profile_agent.learn_from_events(
        user_id=current_user.id,
        lookback_hours=lookback_hours,
    )
    
    return result
