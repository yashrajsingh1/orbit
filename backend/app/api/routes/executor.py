"""
ORBIT - Executor API Routes
Executes tasks and tracks progress
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.redis import RedisClient, get_redis
from app.models import User, Task, TaskStatus
from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.services.executor_service import ExecutorService
from app.api.deps import get_current_user

router = APIRouter(prefix="/executor", tags=["executor"])


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new task directly (bypassing planner).
    
    Use this for quick tasks that don't need planning.
    """
    executor_service = ExecutorService(db, redis)
    task = await executor_service.create_task(
        user_id=current_user.id,
        task_data=task_data,
    )
    return task


@router.get("/tasks", response_model=list[TaskResponse])
async def list_tasks(
    status: Optional[TaskStatus] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List user's tasks with optional status filter.
    """
    query = select(Task).where(Task.user_id == current_user.id)
    
    if status:
        query = query.where(Task.status == status)
    
    query = query.order_by(Task.priority.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/tasks/focus", response_model=Optional[TaskResponse])
async def get_focus_task(
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Get the single task to focus on right now.
    
    ORBIT's philosophy: One thing at a time.
    This returns the highest priority pending task.
    """
    executor_service = ExecutorService(db, redis)
    task = await executor_service.get_focus_task(user_id=current_user.id)
    return task


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific task by ID.
    """
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    return task


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_update: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Update a task.
    """
    executor_service = ExecutorService(db, redis)
    task = await executor_service.update_task(
        user_id=current_user.id,
        task_id=task_id,
        task_update=task_update,
    )
    return task


@router.post("/tasks/{task_id}/start")
async def start_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Start working on a task.
    
    This begins a focus session and logs the event.
    """
    executor_service = ExecutorService(db, redis)
    result = await executor_service.start_task(
        user_id=current_user.id,
        task_id=task_id,
    )
    return result


@router.post("/tasks/{task_id}/complete")
async def complete_task(
    task_id: UUID,
    completion_notes: Optional[str] = None,
    actual_minutes: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a task as complete.
    
    This logs the event and triggers evaluation.
    """
    executor_service = ExecutorService(db, redis)
    result = await executor_service.complete_task(
        user_id=current_user.id,
        task_id=task_id,
        completion_notes=completion_notes,
        actual_minutes=actual_minutes,
    )
    return result


@router.post("/tasks/{task_id}/abandon")
async def abandon_task(
    task_id: UUID,
    reason: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Abandon a task.
    
    This is not failure - it's a valid outcome that ORBIT learns from.
    """
    executor_service = ExecutorService(db, redis)
    result = await executor_service.abandon_task(
        user_id=current_user.id,
        task_id=task_id,
        reason=reason,
    )
    return result


@router.post("/tasks/{task_id}/defer")
async def defer_task(
    task_id: UUID,
    defer_until: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = Depends(get_redis),
    current_user: User = Depends(get_current_user),
):
    """
    Defer a task to later.
    
    ORBIT learns deferral patterns to predict future behavior.
    """
    executor_service = ExecutorService(db, redis)
    result = await executor_service.defer_task(
        user_id=current_user.id,
        task_id=task_id,
        defer_until=defer_until,
    )
    return result


@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a task permanently.
    """
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.user_id == current_user.id,
        )
    )
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )
    
    await db.delete(task)
    await db.commit()
