"""
ORBIT - Cognitive Profile Agent
Learns and updates user cognitive patterns

This is what makes ORBIT unique - structured behavioral intelligence,
not embeddings spam.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.redis import RedisClient
from app.models import (
    User, CognitiveProfile, BehavioralEvent, Task, Intent,
    TaskStatus, EventType,
)
from app.schemas import CognitiveInsight
from app.services.ai_service import AIService


class CognitiveProfileAgent:
    """
    Agent that learns user cognitive patterns over time.
    
    Philosophy:
    - Learn passively, ask minimally
    - Observation over interrogation
    - Structured intelligence, not raw data
    """

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        self.ai_service = AIService()

    async def learn_from_events(
        self,
        user_id: UUID,
        lookback_hours: int = 24,
    ) -> dict:
        """
        Analyze recent events and update cognitive profile.
        
        This runs periodically (e.g., every few hours) to learn patterns.
        """
        # Get cognitive profile
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile:
            # Create new profile
            profile = CognitiveProfile(user_id=user_id)
            self.db.add(profile)
            await self.db.flush()

        # Get recent events
        cutoff = datetime.utcnow() - timedelta(hours=lookback_hours)
        events_result = await self.db.execute(
            select(BehavioralEvent).where(
                BehavioralEvent.user_id == user_id,
                BehavioralEvent.created_at >= cutoff,
                BehavioralEvent.is_analyzed == False,
            )
        )
        events = events_result.scalars().all()

        if not events:
            return {"message": "No new events to analyze"}

        updates = await self._analyze_patterns(profile, events)

        # Mark events as analyzed
        for event in events:
            event.is_analyzed = True
            event.contributed_to_profile = True

        # Update profile timestamp
        profile.last_updated = datetime.utcnow()
        profile.data_points_collected += len(events)
        profile.profile_confidence = min(1.0, profile.data_points_collected / 100)

        await self.db.commit()

        return {
            "events_analyzed": len(events),
            "updates": updates,
        }

    async def _analyze_patterns(
        self,
        profile: CognitiveProfile,
        events: list[BehavioralEvent],
    ) -> dict:
        """Analyze events and update profile patterns."""
        updates = {}

        # Analyze work hours
        work_hours = [e.time_of_day for e in events if e.time_of_day is not None]
        if work_hours:
            avg_hour = sum(work_hours) / len(work_hours)
            updates["avg_active_hour"] = avg_hour

            # Update peak focus hours (weighted average with existing)
            active_hours = list(set(work_hours))
            if len(active_hours) >= 3:
                # Find top 4 most common hours
                hour_counts = {}
                for h in work_hours:
                    hour_counts[h] = hour_counts.get(h, 0) + 1
                top_hours = sorted(hour_counts.keys(), key=lambda x: -hour_counts[x])[:4]
                profile.peak_focus_hours = top_hours

        # Analyze task patterns
        task_events = [e for e in events if e.entity_type == "task"]
        
        starts = len([e for e in task_events if e.event_type == EventType.TASK_STARTED])
        completes = len([e for e in task_events if e.event_type == EventType.TASK_COMPLETED])
        abandons = len([e for e in task_events if e.event_type == EventType.TASK_ABANDONED])

        if starts > 0:
            # Update completion rate (smoothed)
            session_completion_rate = completes / starts
            profile.task_completion_rate = (
                0.8 * profile.task_completion_rate + 0.2 * session_completion_rate
            )
            updates["session_completion_rate"] = session_completion_rate

        if starts + completes + abandons > 0:
            session_abandonment_rate = abandons / (starts + completes + abandons)
            profile.task_abandonment_rate = (
                0.8 * profile.task_abandonment_rate + 0.2 * session_abandonment_rate
            )
            updates["session_abandonment_rate"] = session_abandonment_rate

        # Analyze focus sessions
        focus_starts = [e for e in events if e.event_type == EventType.FOCUS_SESSION_START]
        focus_ends = [e for e in events if e.event_type == EventType.FOCUS_SESSION_END]

        if focus_starts and focus_ends:
            # Calculate average focus duration
            durations = []
            for start_event in focus_starts:
                for end_event in focus_ends:
                    if (end_event.entity_id == start_event.entity_id and
                        end_event.created_at > start_event.created_at):
                        duration = (end_event.created_at - start_event.created_at).seconds / 60
                        if 5 < duration < 180:  # Reasonable bounds
                            durations.append(duration)
                        break

            if durations:
                avg_duration = sum(durations) / len(durations)
                profile.average_focus_duration = int(
                    0.8 * profile.average_focus_duration + 0.2 * avg_duration
                )
                updates["avg_focus_duration"] = avg_duration

        # Analyze intent patterns
        intent_events = [e for e in events if e.event_type == EventType.INTENT_EXPRESSED]
        if intent_events:
            profile.average_intents_per_day = len(intent_events) / max(1, len(set(
                e.created_at.date() for e in intent_events
            )))

        # Detect overcommitment
        await self._detect_overcommitment(profile)

        return updates

    async def _detect_overcommitment(self, profile: CognitiveProfile):
        """Detect if user tends to overcommit."""
        # Get pending tasks count
        pending_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == profile.user_id,
                Task.status == TaskStatus.PENDING,
            )
        )
        pending_count = pending_result.scalar() or 0

        # High pending + high abandonment = overcommitment
        if pending_count > 10 and profile.task_abandonment_rate > 0.3:
            profile.overcommitment_score = min(1.0, profile.overcommitment_score + 0.1)
        elif pending_count < 5 and profile.task_abandonment_rate < 0.2:
            profile.overcommitment_score = max(0.0, profile.overcommitment_score - 0.05)

    async def generate_insights(
        self,
        user_id: UUID,
    ) -> list[CognitiveInsight]:
        """
        Generate insights from the cognitive profile.
        
        Philosophy:
        - Suggestions over commands
        - Observations over judgments
        - Calm, helpful tone
        """
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        
        if not profile or profile.profile_confidence < 0.2:
            return []

        insights = []

        # Overcommitment insight
        if profile.overcommitment_score > 0.6:
            insights.append(CognitiveInsight(
                type="suggestion",
                message="You might be taking on more than you can complete. Consider focusing on fewer tasks.",
                confidence=profile.overcommitment_score,
                related_metric="overcommitment_score",
                suggested_action="Review pending tasks and defer some",
            ))

        # Abandonment pattern
        if profile.task_abandonment_rate > 0.4:
            insights.append(CognitiveInsight(
                type="observation",
                message="Many tasks are started but not finished. Smaller, more specific tasks might help.",
                confidence=0.7,
                related_metric="task_abandonment_rate",
                suggested_action="Break tasks into 15-minute chunks",
            ))

        # Peak hours suggestion
        if profile.peak_focus_hours:
            peak = profile.peak_focus_hours[0]
            insights.append(CognitiveInsight(
                type="observation",
                message=f"You seem most active around {peak}:00. Consider scheduling important work then.",
                confidence=profile.profile_confidence,
                related_metric="peak_focus_hours",
            ))

        # Focus duration optimization
        if profile.average_focus_duration < 20:
            insights.append(CognitiveInsight(
                type="suggestion",
                message="Your focus sessions are quite short. Try committing to 25 minutes without interruption.",
                confidence=0.6,
                related_metric="average_focus_duration",
                suggested_action="Use the Pomodoro technique",
            ))
        elif profile.average_focus_duration > 60:
            insights.append(CognitiveInsight(
                type="observation",
                message="You can focus for long periods. Make sure to take breaks to maintain quality.",
                confidence=0.7,
                related_metric="average_focus_duration",
            ))

        # Consistency check
        if profile.consistency_score > 0.7:
            insights.append(CognitiveInsight(
                type="observation",
                message="You have good follow-through on tasks. Keep it up.",
                confidence=profile.consistency_score,
                related_metric="consistency_score",
            ))

        return insights

    async def detect_overwhelm(
        self,
        user_id: UUID,
    ) -> Optional[dict]:
        """
        Detect if user might be feeling overwhelmed.
        
        Signs of overwhelm:
        - Many pending tasks
        - Recent abandonments
        - Short focus sessions
        - High intent frequency
        """
        # Get profile
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            return None

        # Get recent data
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)

        # Recent abandonments
        abandon_result = await self.db.execute(
            select(func.count(BehavioralEvent.id)).where(
                BehavioralEvent.user_id == user_id,
                BehavioralEvent.event_type == EventType.TASK_ABANDONED,
                BehavioralEvent.created_at >= hour_ago,
            )
        )
        recent_abandons = abandon_result.scalar() or 0

        # Pending tasks
        pending_result = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
            )
        )
        pending_count = pending_result.scalar() or 0

        # Recent intents
        intent_result = await self.db.execute(
            select(func.count(Intent.id)).where(
                Intent.user_id == user_id,
                Intent.created_at >= hour_ago,
            )
        )
        recent_intents = intent_result.scalar() or 0

        # Calculate overwhelm score
        overwhelm_score = 0.0
        reasons = []

        if pending_count > 15:
            overwhelm_score += 0.3
            reasons.append(f"{pending_count} pending tasks")
        
        if recent_abandons >= 2:
            overwhelm_score += 0.3
            reasons.append(f"{recent_abandons} tasks abandoned recently")
        
        if recent_intents >= 5:
            overwhelm_score += 0.2
            reasons.append("Many new intents without action")
        
        if profile.overcommitment_score > 0.7:
            overwhelm_score += 0.2
            reasons.append("Pattern of overcommitment")

        if overwhelm_score >= 0.5:
            return {
                "is_overwhelmed": True,
                "score": min(1.0, overwhelm_score),
                "reasons": reasons,
                "suggestion": "Consider reducing scope. Would you like to focus on just one thing?",
            }

        return None

    async def suggest_scope_reduction(
        self,
        user_id: UUID,
    ) -> dict:
        """
        When overwhelm is detected, suggest scope reduction.
        
        ORBIT philosophy: It's okay to do less.
        """
        # Get the single most important pending task
        result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
            ).order_by(
                Task.priority.desc(),
                Task.created_at.asc(),
            ).limit(1)
        )
        top_task = result.scalar_one_or_none()

        if not top_task:
            return {
                "message": "No pending tasks. Take a break.",
                "suggested_task": None,
            }

        # Defer all other tasks
        await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
                Task.id != top_task.id,
            )
        )
        # Note: Not actually deferring here, just suggesting

        return {
            "message": "Focus on just this one thing",
            "suggested_task": {
                "id": str(top_task.id),
                "title": top_task.title,
                "estimated_minutes": top_task.estimated_minutes,
            },
            "other_tasks_to_defer": True,
        }
