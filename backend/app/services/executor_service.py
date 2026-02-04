"""
ORBIT - Executor Service
Executes tasks and tracks progress
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.redis import RedisClient
from app.models import Task, TaskStatus, EventType
from app.schemas import TaskCreate, TaskUpdate, TaskResponse
from app.services.event_service import EventService


class ExecutorService:
    """Service for task execution and tracking."""

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        self.event_service = EventService(db)

    async def create_task(
        self,
        user_id: UUID,
        task_data: TaskCreate,
    ) -> Task:
        """
        Create a new task directly.
        """
        task = Task(
            user_id=user_id,
            title=task_data.title,
            description=task_data.description,
            estimated_minutes=task_data.estimated_minutes,
            energy_required=task_data.energy_required,
            focus_required=task_data.focus_required,
            scheduled_for=task_data.scheduled_for,
            due_date=task_data.due_date,
            goal_id=task_data.goal_id,
            intent_id=task_data.intent_id,
            context_tags=task_data.context_tags,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)

        return task

    async def update_task(
        self,
        user_id: UUID,
        task_id: UUID,
        task_update: TaskUpdate,
    ) -> Task:
        """
        Update a task.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id,
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found")

        update_data = task_update.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)

        await self.db.commit()
        await self.db.refresh(task)

        return task

    async def get_focus_task(
        self,
        user_id: UUID,
    ) -> Optional[Task]:
        """
        Get the single task to focus on right now.
        
        ORBIT's philosophy: One thing at a time.
        """
        # First, check for in-progress tasks
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.IN_PROGRESS,
            ).order_by(Task.started_at.desc()).limit(1)
        )
        in_progress = result.scalar_one_or_none()
        if in_progress:
            return in_progress

        # Otherwise, get highest priority pending task
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
            ).order_by(
                Task.priority.desc(),
                Task.created_at.asc(),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def start_task(
        self,
        user_id: UUID,
        task_id: UUID,
    ) -> dict:
        """
        Start working on a task.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id,
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found")

        task.status = TaskStatus.IN_PROGRESS
        task.started_at = datetime.utcnow()

        # Log event
        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.TASK_STARTED,
            entity_type="task",
            entity_id=task_id,
            event_data={
                "task_title": task.title,
                "estimated_minutes": task.estimated_minutes,
            },
        )

        # Start focus session event
        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.FOCUS_SESSION_START,
            entity_type="task",
            entity_id=task_id,
        )

        await self.db.commit()

        # Broadcast start event
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "task_started",
                "payload": {
                    "task_id": str(task_id),
                    "task_title": task.title,
                },
            },
        )

        return {
            "task_id": str(task_id),
            "status": "started",
            "started_at": task.started_at.isoformat(),
        }

    async def complete_task(
        self,
        user_id: UUID,
        task_id: UUID,
        completion_notes: Optional[str] = None,
        actual_minutes: Optional[int] = None,
    ) -> dict:
        """
        Mark a task as complete.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id,
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found")

        task.status = TaskStatus.COMPLETED
        task.completed_at = datetime.utcnow()
        task.completion_notes = completion_notes

        # Calculate actual time if not provided
        if actual_minutes:
            task.actual_minutes = actual_minutes
        elif task.started_at:
            delta = datetime.utcnow() - task.started_at
            task.actual_minutes = int(delta.total_seconds() / 60)

        # Log events
        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.TASK_COMPLETED,
            entity_type="task",
            entity_id=task_id,
            event_data={
                "task_title": task.title,
                "estimated_minutes": task.estimated_minutes,
                "actual_minutes": task.actual_minutes,
            },
        )

        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.FOCUS_SESSION_END,
            entity_type="task",
            entity_id=task_id,
            event_data={
                "duration_minutes": task.actual_minutes,
            },
        )

        await self.db.commit()

        # Broadcast completion
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "task_completed",
                "payload": {
                    "task_id": str(task_id),
                    "task_title": task.title,
                },
            },
        )

        return {
            "task_id": str(task_id),
            "status": "completed",
            "actual_minutes": task.actual_minutes,
        }

    async def abandon_task(
        self,
        user_id: UUID,
        task_id: UUID,
        reason: Optional[str] = None,
    ) -> dict:
        """
        Abandon a task.
        
        This is not failure - it's a valid outcome.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id,
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found")

        task.status = TaskStatus.ABANDONED
        task.abandonment_reason = reason

        # Log event
        await self.event_service.log_event(
            user_id=user_id,
            event_type=EventType.TASK_ABANDONED,
            entity_type="task",
            entity_id=task_id,
            event_data={
                "task_title": task.title,
                "reason": reason,
            },
        )

        await self.db.commit()

        # Broadcast abandonment (learning opportunity)
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "agent_thought",
                "payload": {
                    "agent": "evaluator",
                    "thought": "Noted. Learning from this.",
                    "is_final": True,
                },
            },
        )

        return {
            "task_id": str(task_id),
            "status": "abandoned",
            "message": "Task abandoned. This is data, not failure.",
        }

    async def defer_task(
        self,
        user_id: UUID,
        task_id: UUID,
        defer_until: Optional[str] = None,
    ) -> dict:
        """
        Defer a task to later.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.id == task_id,
                Task.user_id == user_id,
            )
        )
        task = result.scalar_one_or_none()
        if not task:
            raise ValueError("Task not found")

        task.status = TaskStatus.DEFERRED
        if defer_until:
            task.scheduled_for = datetime.fromisoformat(defer_until)

        # Lower priority slightly
        task.priority = max(0.1, task.priority - 0.1)
        task.orbital_distance = min(2.0, task.orbital_distance + 0.2)

        await self.db.commit()

        return {
            "task_id": str(task_id),
            "status": "deferred",
            "message": "Task deferred. It will resurface when appropriate.",
        }
