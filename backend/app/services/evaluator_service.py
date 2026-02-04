"""
ORBIT - Evaluator Service
Evaluates completed work and updates cognitive profile
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.redis import RedisClient
from app.models import (
    Task, Goal, CognitiveProfile, BehavioralEvent,
    TaskStatus, GoalStatus, EventType,
)
from app.schemas import EvaluationResponse, CognitiveInsight
from app.services.ai_service import AIService


class EvaluatorService:
    """Service for evaluation and learning."""

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        self.ai_service = AIService()

    async def evaluate(
        self,
        user_id: UUID,
        task_id: Optional[UUID] = None,
        goal_id: Optional[UUID] = None,
        session_id: Optional[str] = None,
    ) -> EvaluationResponse:
        """
        Evaluate completed work.
        """
        entity_id = task_id or goal_id
        entity_type = "task" if task_id else "goal"

        if task_id:
            result = await self.db.execute(
                select(Task).where(
                    Task.id == task_id,
                    Task.user_id == user_id,
                )
            )
            entity = result.scalar_one_or_none()
            if not entity:
                raise ValueError("Task not found")

            # Use AI to evaluate
            evaluation = await self.ai_service.evaluate_completion(
                task_title=entity.title,
                actual_minutes=entity.actual_minutes,
                estimated_minutes=entity.estimated_minutes,
                was_completed=entity.status == TaskStatus.COMPLETED,
                abandonment_reason=entity.abandonment_reason,
            )

        elif goal_id:
            result = await self.db.execute(
                select(Goal).where(
                    Goal.id == goal_id,
                    Goal.user_id == user_id,
                )
            )
            entity = result.scalar_one_or_none()
            if not entity:
                raise ValueError("Goal not found")

            evaluation = {
                "was_helpful": entity.status == GoalStatus.ACHIEVED,
                "effectiveness_score": entity.progress,
                "insights": [],
                "profile_updates": [],
                "suggestions": [],
            }

        else:
            raise ValueError("Must provide task_id or goal_id")

        # Update cognitive profile based on evaluation
        await self._update_cognitive_profile(
            user_id=user_id,
            entity_type=entity_type,
            entity=entity,
            evaluation=evaluation,
        )

        return EvaluationResponse(
            entity_id=entity_id,
            entity_type=entity_type,
            was_helpful=evaluation.get("was_helpful"),
            effectiveness_score=evaluation.get("effectiveness_score", 0.5),
            insights=evaluation.get("insights", []),
            profile_updates=evaluation.get("profile_updates", []),
            suggestions=evaluation.get("suggestions", []),
        )

    async def _update_cognitive_profile(
        self,
        user_id: UUID,
        entity_type: str,
        entity,
        evaluation: dict,
    ):
        """
        Update cognitive profile based on evaluation.
        """
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return

        if entity_type == "task":
            # Update task completion/abandonment rates
            total_tasks = await self._count_user_tasks(user_id)
            completed_tasks = await self._count_user_tasks(
                user_id, status=TaskStatus.COMPLETED
            )
            abandoned_tasks = await self._count_user_tasks(
                user_id, status=TaskStatus.ABANDONED
            )

            if total_tasks > 0:
                profile.task_completion_rate = completed_tasks / total_tasks
                profile.task_abandonment_rate = abandoned_tasks / total_tasks

            # Update focus duration based on actual vs estimated
            if entity.actual_minutes and entity.estimated_minutes:
                # Running average
                profile.average_focus_duration = int(
                    0.9 * profile.average_focus_duration + 0.1 * entity.actual_minutes
                )

        profile.data_points_collected += 1
        profile.last_updated = datetime.utcnow()

        # Increase profile confidence with more data
        profile.profile_confidence = min(1.0, profile.data_points_collected / 100)

        await self.db.commit()

        # Update cached profile
        await self.redis.cache_cognitive_profile(
            str(user_id),
            {
                "task_completion_rate": profile.task_completion_rate,
                "task_abandonment_rate": profile.task_abandonment_rate,
                "average_focus_duration": profile.average_focus_duration,
                "profile_confidence": profile.profile_confidence,
            },
        )

    async def _count_user_tasks(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
    ) -> int:
        """Count user's tasks, optionally filtered by status."""
        query = select(func.count(Task.id)).where(Task.user_id == user_id)
        if status:
            query = query.where(Task.status == status)
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def evaluate_session(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Evaluate the current work session.
        """
        # Get recent events (last 4 hours)
        cutoff = datetime.utcnow() - timedelta(hours=4)
        result = await self.db.execute(
            select(BehavioralEvent).where(
                BehavioralEvent.user_id == user_id,
                BehavioralEvent.created_at >= cutoff,
            ).order_by(BehavioralEvent.created_at.asc())
        )
        events = result.scalars().all()

        # Analyze events
        tasks_started = sum(1 for e in events if e.event_type == EventType.TASK_STARTED)
        tasks_completed = sum(1 for e in events if e.event_type == EventType.TASK_COMPLETED)
        tasks_abandoned = sum(1 for e in events if e.event_type == EventType.TASK_ABANDONED)

        insights = []
        if tasks_completed > tasks_started // 2:
            insights.append("Good session - completed more than half of started tasks")
        if tasks_abandoned > tasks_completed:
            insights.append("Many tasks abandoned. Consider smaller scope next time.")

        return {
            "session_duration_hours": 4,
            "tasks_started": tasks_started,
            "tasks_completed": tasks_completed,
            "tasks_abandoned": tasks_abandoned,
            "insights": insights,
            "recommendation": "Take a break" if tasks_started > 5 else "Continue if you'd like",
        }

    async def evaluate_day(
        self,
        user_id: UUID,
    ) -> dict:
        """
        End-of-day evaluation.
        
        Philosophy: End the day with closure, not anxiety.
        """
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0)

        # Get today's completed tasks
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.completed_at >= today_start,
            )
        )
        completed = result.scalars().all()

        # Get remaining pending tasks
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
            )
        )
        pending = result.scalars().all()

        return {
            "completed_count": len(completed),
            "completed_tasks": [t.title for t in completed[:5]],
            "pending_count": len(pending),
            "message": self._generate_day_end_message(len(completed), len(pending)),
            "can_wait_until_tomorrow": [t.title for t in pending if t.priority < 0.7][:3],
        }

    def _generate_day_end_message(self, completed: int, pending: int) -> str:
        """Generate a calm end-of-day message."""
        if completed == 0 and pending == 0:
            return "A quiet day. Sometimes that's exactly right."
        elif completed == 0:
            return "Nothing completed today. That's okay. Tomorrow is another day."
        elif pending == 0:
            return "Everything complete. Well done. Rest well."
        elif completed > pending:
            return "More done than left. A good day's work."
        else:
            return "Progress made. The rest can wait."

    async def get_insights(
        self,
        user_id: UUID,
        limit: int = 5,
    ) -> list[CognitiveInsight]:
        """
        Get recent insights from evaluations.
        """
        # Get cognitive profile
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return []

        insights = []

        # Generate insights from profile
        if profile.task_abandonment_rate > 0.4:
            insights.append(CognitiveInsight(
                type="warning",
                message="You abandon tasks frequently. Consider starting smaller.",
                confidence=profile.profile_confidence,
                related_metric="task_abandonment_rate",
                suggested_action="Try the 'reduce scope' feature",
            ))

        if profile.overcommitment_score > 0.6:
            insights.append(CognitiveInsight(
                type="warning",
                message="You tend to take on too much. ORBIT will suggest fewer tasks.",
                confidence=profile.profile_confidence,
                related_metric="overcommitment_score",
                suggested_action="Focus on one thing at a time",
            ))

        if profile.consistency_score > 0.7:
            insights.append(CognitiveInsight(
                type="observation",
                message="You're consistent with follow-through. Keep it up.",
                confidence=profile.profile_confidence,
                related_metric="consistency_score",
            ))

        return insights[:limit]

    async def record_feedback(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        was_helpful: bool,
        feedback_text: Optional[str] = None,
    ) -> dict:
        """
        Record explicit user feedback.
        """
        # Store feedback event
        from app.services.event_service import EventService
        event_service = EventService(self.db)

        await event_service.log_event(
            user_id=user_id,
            event_type=EventType.PATTERN_RECOGNIZED,
            entity_type=entity_type,
            entity_id=entity_id,
            event_data={
                "feedback_type": "explicit",
                "was_helpful": was_helpful,
                "feedback_text": feedback_text,
            },
        )

        await self.db.commit()

        return {
            "message": "Feedback recorded. Thank you.",
            "impact": "This helps ORBIT learn what works for you.",
        }
