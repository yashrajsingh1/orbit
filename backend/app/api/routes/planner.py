"""
ORBIT - Planner API Routes
Converts intents into actionable plans
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User
from app.schemas import PlanRequest, PlanResponse
from app.services.planner_service import PlannerService
from app.api.deps import get_current_user

router = APIRouter(prefix="/planner", tags=["planner"])


@router.post("/plan", response_model=PlanResponse)
async def create_plan(
    request: PlanRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Create a plan from an intent.
    
    The planner agent will:
    1. Break the intent into minimal steps
    2. Apply intent decay and priority gravity
    3. Consider current cognitive load
    4. Generate optimized task sequence
    
    Returns a plan with steps that can be executed.
    """
    planner_service = PlannerService(db, redis)
    plan = await planner_service.create_plan(
        user_id=current_user.id,
        intent_id=request.intent_id,
        max_tasks=request.max_tasks,
        consider_current_load=request.consider_current_load,
    )
    return plan


@router.post("/plan/{intent_id}/accept")
async def accept_plan(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a plan and create tasks from it.
    
    This converts plan steps into actual tasks in the system.
    """
    planner_service = PlannerService(db, redis)
    result = await planner_service.accept_plan(
        user_id=current_user.id,
        intent_id=intent_id,
    )
    return result


@router.post("/plan/{intent_id}/modify")
async def modify_plan(
    intent_id: UUID,
    modifications: dict,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Modify a plan before accepting.
    
    User can request:
    - Fewer steps
    - Different scope
    - Adjusted timeline
    """
    planner_service = PlannerService(db, redis)
    plan = await planner_service.modify_plan(
        user_id=current_user.id,
        intent_id=intent_id,
        modifications=modifications,
    )
    return plan


@router.get("/suggestions")
async def get_planning_suggestions(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get proactive planning suggestions based on:
    - Current cognitive profile
    - Time of day
    - Pending tasks and goals
    - Patterns from memory
    
    This is the "ORBIT suggesting before you ask" feature.
    """
    planner_service = PlannerService(db, redis)
    suggestions = await planner_service.get_suggestions(user_id=current_user.id)
    return suggestions


@router.post("/reduce-scope/{intent_id}")
async def reduce_scope(
    intent_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Reduce the scope of a plan when user is overwhelmed.
    
    ORBIT's philosophy: "Just one small thing" is valid.
    """
    planner_service = PlannerService(db, redis)
    reduced_plan = await planner_service.reduce_scope(
        user_id=current_user.id,
        intent_id=intent_id,
    )
    return reduced_plan
