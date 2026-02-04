"""
ORBIT - Orchestrator Agent
Coordinates the cognitive loop:

Intent → Plan → Execute → Evaluate → Learn → Update Profile

This is the core agent loop that makes ORBIT intelligent.
"""

import asyncio
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisClient
from app.models import Intent, CognitiveProfile
from app.schemas import PlanResponse, EvaluationResponse, CognitiveInsight
from app.services.intent_service import IntentService
from app.services.planner_service import PlannerService
from app.services.executor_service import ExecutorService
from app.services.evaluator_service import EvaluatorService
from app.agents.cognitive_profile_agent import CognitiveProfileAgent


class OrchestratorAgent:
    """
    The main orchestrator that runs the cognitive loop.
    
    Philosophy:
    - Seamless flow from intent to action
    - Learn from every interaction
    - Reduce cognitive load at every step
    """

    def __init__(self, db: AsyncSession, redis: RedisClient):
        self.db = db
        self.redis = redis
        
        # Initialize services
        self.intent_service = IntentService(db, redis)
        self.planner_service = PlannerService(db, redis)
        self.executor_service = ExecutorService(db, redis)
        self.evaluator_service = EvaluatorService(db, redis)
        self.profile_agent = CognitiveProfileAgent(db, redis)

    async def process_intent(
        self,
        user_id: UUID,
        raw_input: str,
        source: str = "text",
        auto_plan: bool = True,
    ) -> dict:
        """
        Process a new intent through the full pipeline.
        
        Steps:
        1. Create intent
        2. Interpret with AI
        3. Check for overwhelm
        4. Generate plan (optional)
        5. Broadcast updates
        """
        result = {
            "steps_completed": [],
            "intent": None,
            "interpretation": None,
            "overwhelm_check": None,
            "plan": None,
        }

        # Step 1: Create intent
        await self._broadcast_thought(user_id, "Processing intent...")
        intent = await self.intent_service.create_intent(
            user_id=user_id,
            raw_input=raw_input,
            source=source,
        )
        result["intent"] = intent
        result["steps_completed"].append("create_intent")

        # Step 2: Interpret
        await self._broadcast_thought(user_id, "Understanding...")
        interpretation = await self.intent_service.interpret_intent(
            intent_id=intent.id,
            user_id=user_id,
        )
        result["interpretation"] = interpretation
        result["steps_completed"].append("interpret")

        # Step 3: Check for overwhelm
        overwhelm = await self.profile_agent.detect_overwhelm(user_id)
        result["overwhelm_check"] = overwhelm
        
        if overwhelm and overwhelm.get("is_overwhelmed"):
            await self._broadcast_thought(
                user_id, 
                "I notice you have a lot going on. Would you like to focus on just one thing?"
            )
            result["suggestion"] = await self.profile_agent.suggest_scope_reduction(user_id)
            return result

        # Step 4: Generate plan (if auto_plan enabled)
        if auto_plan and not interpretation.is_ambiguous:
            await self._broadcast_thought(user_id, "Creating plan...")
            
            try:
                plan = await self.planner_service.create_plan(
                    user_id=user_id,
                    intent_id=intent.id,
                    max_tasks=5,
                )
                result["plan"] = plan
                result["steps_completed"].append("plan")
                
                await self._broadcast_thought(
                    user_id, 
                    f"Plan ready with {len(plan.steps)} steps"
                )
            except Exception as e:
                result["plan_error"] = str(e)
        
        elif interpretation.is_ambiguous:
            await self._broadcast_thought(
                user_id,
                interpretation.suggested_clarification or "Could you tell me more?"
            )

        return result

    async def complete_task_and_learn(
        self,
        user_id: UUID,
        task_id: UUID,
        completion_notes: Optional[str] = None,
        actual_minutes: Optional[int] = None,
    ) -> dict:
        """
        Complete a task and trigger learning.
        
        Steps:
        1. Mark task complete
        2. Evaluate performance
        3. Update cognitive profile
        4. Generate insights
        """
        result = {
            "completion": None,
            "evaluation": None,
            "insights": [],
        }

        # Step 1: Complete task
        completion = await self.executor_service.complete_task(
            user_id=user_id,
            task_id=task_id,
            completion_notes=completion_notes,
            actual_minutes=actual_minutes,
        )
        result["completion"] = completion

        # Step 2: Evaluate
        await self._broadcast_thought(user_id, "Learning from this...")
        
        evaluation = await self.evaluator_service.evaluate(
            user_id=user_id,
            task_id=task_id,
        )
        result["evaluation"] = evaluation

        # Step 3: Trigger profile learning (background)
        asyncio.create_task(
            self._learn_in_background(user_id)
        )

        # Step 4: Get insights
        insights = await self.profile_agent.generate_insights(user_id)
        result["insights"] = insights

        if insights:
            # Broadcast most relevant insight
            top_insight = insights[0]
            await self._broadcast_thought(user_id, top_insight.message)

        return result

    async def abandon_task_and_learn(
        self,
        user_id: UUID,
        task_id: UUID,
        reason: Optional[str] = None,
    ) -> dict:
        """
        Handle task abandonment gracefully.
        
        Philosophy:
        - Abandonment is valid data, not failure
        - Learn from what didn't work
        - Suggest alternatives without judgment
        """
        result = {
            "abandonment": None,
            "evaluation": None,
            "suggestion": None,
        }

        # Abandon task
        abandonment = await self.executor_service.abandon_task(
            user_id=user_id,
            task_id=task_id,
            reason=reason,
        )
        result["abandonment"] = abandonment

        # Evaluate
        await self._broadcast_thought(user_id, "That's okay. Learning from this...")
        
        evaluation = await self.evaluator_service.evaluate(
            user_id=user_id,
            task_id=task_id,
        )
        result["evaluation"] = evaluation

        # Trigger learning
        asyncio.create_task(
            self._learn_in_background(user_id)
        )

        # Suggest next action
        suggestion = await self.profile_agent.suggest_scope_reduction(user_id)
        result["suggestion"] = suggestion

        if suggestion.get("suggested_task"):
            await self._broadcast_thought(
                user_id,
                f"How about focusing on: {suggestion['suggested_task']['title']}"
            )
        else:
            await self._broadcast_thought(
                user_id,
                "Take a moment. No rush."
            )

        return result

    async def get_focus_suggestion(
        self,
        user_id: UUID,
    ) -> dict:
        """
        Get a suggestion for what to focus on.
        
        Uses cognitive profile to make intelligent suggestions.
        """
        # Get current context
        focus_task = await self.executor_service.get_focus_task(user_id)
        
        if focus_task:
            return {
                "suggestion_type": "continue",
                "message": "Continue with your current task",
                "task": focus_task,
            }

        # Check time of day against peak hours
        from sqlalchemy import select
        result = await self.db.execute(
            select(CognitiveProfile).where(CognitiveProfile.user_id == user_id)
        )
        profile = result.scalar_one_or_none()

        current_hour = datetime.utcnow().hour
        
        if profile and profile.peak_focus_hours:
            if current_hour in profile.peak_focus_hours:
                # Peak time - suggest most important task
                suggestion = await self.profile_agent.suggest_scope_reduction(user_id)
                return {
                    "suggestion_type": "peak_time",
                    "message": "This is your peak focus time. Consider tackling something important.",
                    **suggestion,
                }
            elif current_hour >= 21 or current_hour < 6:
                return {
                    "suggestion_type": "rest",
                    "message": "It's late. Consider winding down.",
                    "suggested_task": None,
                }

        # Default: suggest top task
        suggestion = await self.profile_agent.suggest_scope_reduction(user_id)
        return {
            "suggestion_type": "default",
            "message": "Here's what seems most important",
            **suggestion,
        }

    async def _learn_in_background(self, user_id: UUID):
        """Run learning process in background."""
        try:
            await self.profile_agent.learn_from_events(user_id, lookback_hours=1)
        except Exception as e:
            print(f"Background learning error: {e}")

    async def _broadcast_thought(self, user_id: UUID, message: str):
        """Broadcast an AI thought to the user."""
        await self.redis.publish_event(
            f"user:{user_id}:events",
            {
                "type": "thought_signal",
                "payload": {"message": message},
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
