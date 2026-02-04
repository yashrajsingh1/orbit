"""
ORBIT - Planner Service
Converts intents into actionable plans
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.redis import RedisClient
from app.models import Intent, Task, Goal, CognitiveProfile, TaskStatus
from app.schemas import PlanResponse, PlanStep
from app.services.ai_service import AIService


class PlannerService:
    """Service for planning and task generation."""

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        self.ai_service = AIService()

    async def create_plan(
        self,
        user_id: UUID,
        intent_id: UUID,
        max_tasks: int = 5,
        consider_current_load: bool = True,
    ) -> PlanResponse:
        """
        Create a plan from an intent.
        
        Philosophy:
        - Break into minimal steps
        - Apply intent decay and priority gravity
        - Consider current cognitive load
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

        # Get cognitive profile
        profile_result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Get current pending tasks if considering load
        current_tasks = []
        if consider_current_load:
            tasks_result = await self.db.execute(
                select(Task).where(
                    Task.user_id == user_id,
                    Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
                )
            )
            current_tasks = tasks_result.scalars().all()

        # Adjust max_tasks based on cognitive profile
        if profile and profile.overcommitment_score > 0.7:
            max_tasks = min(max_tasks, 3)  # Reduce scope for overcommitters

        # Generate plan using AI
        intent_text = intent.interpreted_intent or intent.raw_input
        steps = await self.ai_service.generate_plan(
            intent=intent_text,
            max_tasks=max_tasks,
            cognitive_profile=profile,
            current_tasks=current_tasks,
        )

        # Calculate total estimated time
        total_minutes = sum(s.estimated_minutes or 0 for s in steps)

        # Generate warnings
        warnings = []
        if len(current_tasks) > 5:
            warnings.append("You have several pending tasks. Consider focusing on those first.")
        if total_minutes > 120:
            warnings.append("This plan may take over 2 hours. Consider breaking it into smaller sessions.")
        if profile and profile.task_abandonment_rate > 0.5:
            warnings.append("You often abandon longer tasks. Start with just the first step.")

        # Cache plan in Redis for later acceptance
        await self.redis.set_session_state(
            str(user_id),
            f"plan:{intent_id}",
            {
                "steps": [s.model_dump() for s in steps],
                "intent_text": intent_text,
                "created_at": datetime.utcnow().isoformat(),
            },
            ttl=3600,  # 1 hour
        )

        # Broadcast planning event
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "agent_thought",
                "payload": {
                    "agent": "planner",
                    "thought": f"Created plan with {len(steps)} steps",
                    "is_final": True,
                },
            },
        )

        return PlanResponse(
            intent_id=intent_id,
            goal_title=intent_text[:100],
            steps=steps,
            total_estimated_minutes=total_minutes if total_minutes > 0 else None,
            reasoning="Plan optimized for your current capacity",
            warnings=warnings,
        )

    async def accept_plan(
        self,
        user_id: UUID,
        intent_id: UUID,
    ) -> dict:
        """
        Accept a plan and create tasks from it.
        """
        # Get cached plan
        plan_data = await self.redis.get_session_state(
            str(user_id),
            f"plan:{intent_id}",
        )
        if not plan_data:
            raise ValueError("Plan not found or expired")

        # Create goal
        goal = Goal(
            user_id=user_id,
            intent_id=intent_id,
            title=plan_data["intent_text"][:255],
            description=f"Created from intent on {plan_data['created_at']}",
        )
        self.db.add(goal)
        await self.db.flush()

        # Create tasks from steps
        created_tasks = []
        for step in plan_data["steps"]:
            task = Task(
                user_id=user_id,
                intent_id=intent_id,
                goal_id=goal.id,
                title=step["task_title"],
                description=step.get("task_description"),
                estimated_minutes=step.get("estimated_minutes"),
                energy_required=step.get("energy_required", "medium"),
                priority=1.0 - (step["order"] * 0.1),  # Decreasing priority
                orbital_distance=step["order"] * 0.2,  # Increasing distance
            )
            self.db.add(task)
            created_tasks.append(task)

        await self.db.commit()

        # Clear cached plan
        await self.redis.delete_session_state(str(user_id), f"plan:{intent_id}")

        return {
            "goal_id": str(goal.id),
            "tasks_created": len(created_tasks),
            "message": "Plan accepted and tasks created",
        }

    async def modify_plan(
        self,
        user_id: UUID,
        intent_id: UUID,
        modifications: dict,
    ) -> PlanResponse:
        """
        Modify a plan before accepting.
        """
        # Get cached plan
        plan_data = await self.redis.get_session_state(
            str(user_id),
            f"plan:{intent_id}",
        )
        if not plan_data:
            raise ValueError("Plan not found or expired")

        # Apply modifications
        if "max_steps" in modifications:
            plan_data["steps"] = plan_data["steps"][:modifications["max_steps"]]

        if "remove_steps" in modifications:
            plan_data["steps"] = [
                s for i, s in enumerate(plan_data["steps"])
                if i not in modifications["remove_steps"]
            ]

        # Update cache
        await self.redis.set_session_state(
            str(user_id),
            f"plan:{intent_id}",
            plan_data,
            ttl=3600,
        )

        steps = [PlanStep(**s) for s in plan_data["steps"]]
        total_minutes = sum(s.estimated_minutes or 0 for s in steps)

        return PlanResponse(
            intent_id=intent_id,
            goal_title=plan_data["intent_text"][:100],
            steps=steps,
            total_estimated_minutes=total_minutes if total_minutes > 0 else None,
            reasoning="Plan modified as requested",
            warnings=[],
        )

    async def reduce_scope(
        self,
        user_id: UUID,
        intent_id: UUID,
    ) -> PlanResponse:
        """
        Reduce plan to just one small thing.
        
        ORBIT's philosophy: "Just one small thing" is valid.
        """
        plan_data = await self.redis.get_session_state(
            str(user_id),
            f"plan:{intent_id}",
        )
        if not plan_data:
            raise ValueError("Plan not found or expired")

        # Keep only the first, smallest step
        if plan_data["steps"]:
            smallest = min(
                plan_data["steps"],
                key=lambda s: s.get("estimated_minutes") or 25,
            )
            plan_data["steps"] = [smallest]

        # Update cache
        await self.redis.set_session_state(
            str(user_id),
            f"plan:{intent_id}",
            plan_data,
            ttl=3600,
        )

        steps = [PlanStep(**s) for s in plan_data["steps"]]

        # Broadcast scope reduction
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "agent_thought",
                "payload": {
                    "agent": "planner",
                    "thought": "Reducing scope to just one thing",
                    "is_final": True,
                },
            },
        )

        return PlanResponse(
            intent_id=intent_id,
            goal_title=plan_data["intent_text"][:100],
            steps=steps,
            total_estimated_minutes=steps[0].estimated_minutes if steps else None,
            reasoning="Reduced to one manageable step",
            warnings=[],
        )

    async def get_suggestions(
        self,
        user_id: UUID,
    ) -> list[dict]:
        """
        Get proactive planning suggestions.
        """
        # Get cognitive profile
        profile_result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = profile_result.scalar_one_or_none()

        # Get pending tasks
        tasks_result = await self.db.execute(
            select(Task).where(
                Task.user_id == user_id,
                Task.status == TaskStatus.PENDING,
            ).order_by(Task.priority.desc()).limit(5)
        )
        pending_tasks = tasks_result.scalars().all()

        suggestions = []

        # Time-based suggestions
        current_hour = datetime.utcnow().hour
        if profile:
            if current_hour in (profile.peak_focus_hours or []):
                if pending_tasks:
                    suggestions.append({
                        "type": "timing",
                        "message": "This is your peak focus time. Good time for deep work.",
                        "task_id": str(pending_tasks[0].id) if pending_tasks else None,
                    })

        # Load-based suggestions
        if len(pending_tasks) > 10:
            suggestions.append({
                "type": "load",
                "message": "You have many pending tasks. Consider reviewing and pruning.",
                "action": "review_tasks",
            })
        elif len(pending_tasks) == 0:
            suggestions.append({
                "type": "empty",
                "message": "No pending tasks. Enjoy the clarity.",
                "action": None,
            })

        return suggestions
