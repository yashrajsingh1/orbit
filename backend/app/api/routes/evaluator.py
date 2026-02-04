"""
ORBIT - Evaluator API Routes
Evaluates completed work and updates cognitive profile
"""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User
from app.schemas import EvaluationRequest, EvaluationResponse
from app.services.evaluator_service import EvaluatorService
from app.api.deps import get_current_user

router = APIRouter(prefix="/evaluator", tags=["evaluator"])


@router.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(
    request: EvaluationRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate completed work.
    
    The evaluator asks: "Did this help?"
    
    Returns:
    - Effectiveness score
    - Insights learned
    - Profile updates applied
    - Suggestions for improvement
    """
    evaluator_service = EvaluatorService(db, redis)
    evaluation = await evaluator_service.evaluate(
        user_id=current_user.id,
        task_id=request.task_id,
        goal_id=request.goal_id,
        session_id=request.session_id,
    )
    return evaluation


@router.post("/evaluate/session")
async def evaluate_session(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate the current work session.
    
    This provides:
    - Session summary
    - Productivity insights
    - Pattern observations
    - Gentle suggestions for next time
    """
    evaluator_service = EvaluatorService(db, redis)
    evaluation = await evaluator_service.evaluate_session(user_id=current_user.id)
    return evaluation


@router.post("/evaluate/day")
async def evaluate_day(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    End-of-day evaluation.
    
    This provides a calm reflection on:
    - What was accomplished
    - What was learned
    - What can wait until tomorrow
    
    Philosophy: End the day with closure, not anxiety.
    """
    evaluator_service = EvaluatorService(db, redis)
    evaluation = await evaluator_service.evaluate_day(user_id=current_user.id)
    return evaluation


@router.get("/insights")
async def get_insights(
    limit: int = 5,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get recent insights from evaluations.
    
    These are observations ORBIT has made about:
    - Patterns in your work
    - What strategies work for you
    - Potential improvements
    """
    evaluator_service = EvaluatorService(db, redis)
    insights = await evaluator_service.get_insights(
        user_id=current_user.id,
        limit=limit,
    )
    return insights


@router.post("/feedback")
async def submit_feedback(
    entity_type: str,
    entity_id: UUID,
    was_helpful: bool,
    feedback_text: str = None,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Submit explicit feedback on ORBIT's suggestions.
    
    This helps ORBIT learn what works for you.
    """
    evaluator_service = EvaluatorService(db, redis)
    result = await evaluator_service.record_feedback(
        user_id=current_user.id,
        entity_type=entity_type,
        entity_id=entity_id,
        was_helpful=was_helpful,
        feedback_text=feedback_text,
    )
    return result
