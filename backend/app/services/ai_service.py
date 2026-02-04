"""
ORBIT - AI Service
LLM integration for reasoning
"""

from typing import Optional

from anthropic import AsyncAnthropic

from app.core.config import settings
from app.models import CognitiveProfile, IntentUrgency
from app.schemas import IntentInterpretation, PlanStep


class AIService:
    """
    AI service for reasoning.
    
    Philosophy:
    - Use AI selectively, not gratuitously
    - Keep prompts focused and minimal
    - Inject only relevant context
    """

    def __init__(self):
        self.client = AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model

    async def interpret_intent(
        self,
        raw_input: str,
        cognitive_profile: Optional[CognitiveProfile] = None,
    ) -> IntentInterpretation:
        """
        Interpret user intent.
        
        Detects:
        - What the user actually wants
        - Urgency level
        - Ambiguity
        - Emotional tone
        """
        # Build context from cognitive profile
        profile_context = ""
        if cognitive_profile:
            profile_context = f"""
User Context:
- Overcommitment tendency: {cognitive_profile.overcommitment_score:.1%}
- Consistency score: {cognitive_profile.consistency_score:.1%}
- Average focus duration: {cognitive_profile.average_focus_duration} minutes
- Task abandonment rate: {cognitive_profile.task_abandonment_rate:.1%}
"""

        system_prompt = """You are ORBIT's Intent Interpreter. Your role is to understand what the user truly wants.

Core principles:
1. Detect underlying intent, not just surface request
2. Identify urgency without assuming everything is urgent
3. Notice emotional tone (stressed, calm, excited, overwhelmed)
4. Flag ambiguity when the intent is unclear
5. Prefer minimal, focused interpretation

Respond in JSON format only."""

        user_prompt = f"""Interpret this intent:
"{raw_input}"
{profile_context}

Respond with JSON:
{{
    "interpreted_intent": "Clear statement of what user wants",
    "urgency": "low|medium|high|critical",
    "is_ambiguous": true|false,
    "ambiguity_reason": "Why it's ambiguous (if applicable)",
    "emotional_tone": "calm|stressed|excited|overwhelmed|neutral",
    "suggested_clarification": "Question to ask if ambiguous",
    "context_tags": ["relevant", "tags"],
    "confidence": 0.0-1.0
}}"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system=system_prompt,
            )

            # Parse response
            import json
            content = response.content[0].text
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            data = json.loads(content.strip())

            return IntentInterpretation(
                interpreted_intent=data.get("interpreted_intent", raw_input),
                urgency=IntentUrgency(data.get("urgency", "medium")),
                is_ambiguous=data.get("is_ambiguous", False),
                ambiguity_reason=data.get("ambiguity_reason"),
                emotional_tone=data.get("emotional_tone"),
                suggested_clarification=data.get("suggested_clarification"),
                context_tags=data.get("context_tags", []),
                confidence=data.get("confidence", 0.7),
            )

        except Exception as e:
            # Fallback interpretation
            return IntentInterpretation(
                interpreted_intent=raw_input,
                urgency=IntentUrgency.MEDIUM,
                is_ambiguous=True,
                ambiguity_reason=f"AI interpretation failed: {str(e)}",
                emotional_tone="neutral",
                context_tags=[],
                confidence=0.3,
            )

    async def generate_plan(
        self,
        intent: str,
        max_tasks: int,
        cognitive_profile: Optional[CognitiveProfile] = None,
        current_tasks: list = None,
    ) -> list[PlanStep]:
        """
        Generate a plan from an interpreted intent.
        
        Philosophy:
        - Break into minimal steps
        - Consider user's capacity
        - Apply intent decay
        """
        profile_context = ""
        if cognitive_profile:
            profile_context = f"""
User capacity:
- Optimal focus: {cognitive_profile.optimal_focus_duration} minutes
- Overcommitment tendency: {cognitive_profile.overcommitment_score:.1%}
- Current tasks: {len(current_tasks or [])} pending
"""

        system_prompt = """You are ORBIT's Planner Agent. Create minimal, achievable plans.

Core principles:
1. Less is more - prefer fewer, clearer steps
2. Each step should be completable in one focus session
3. Consider user's actual capacity, not ideal capacity
4. It's okay to suggest "just one thing"
5. Front-load the most important step

Respond in JSON format only."""

        user_prompt = f"""Create a plan for this intent:
"{intent}"

Maximum steps: {max_tasks}
{profile_context}

Respond with JSON:
{{
    "steps": [
        {{
            "order": 1,
            "task_title": "Clear, actionable title",
            "task_description": "Brief description",
            "estimated_minutes": 25,
            "energy_required": "low|medium|high",
            "depends_on": []
        }}
    ],
    "reasoning": "Why this plan",
    "warnings": ["Any concerns about capacity"]
}}"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system=system_prompt,
            )

            import json
            content = response.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            data = json.loads(content.strip())

            steps = []
            for step_data in data.get("steps", []):
                steps.append(PlanStep(
                    order=step_data.get("order", len(steps) + 1),
                    task_title=step_data.get("task_title", ""),
                    task_description=step_data.get("task_description"),
                    estimated_minutes=step_data.get("estimated_minutes"),
                    energy_required=step_data.get("energy_required", "medium"),
                    depends_on=step_data.get("depends_on", []),
                ))

            return steps

        except Exception as e:
            # Fallback: single simple task
            return [PlanStep(
                order=1,
                task_title=f"Work on: {intent[:50]}",
                task_description=intent,
                estimated_minutes=25,
                energy_required="medium",
                depends_on=[],
            )]

    async def evaluate_completion(
        self,
        task_title: str,
        actual_minutes: Optional[int],
        estimated_minutes: Optional[int],
        was_completed: bool,
        abandonment_reason: Optional[str] = None,
    ) -> dict:
        """
        Evaluate a completed (or abandoned) task.
        
        Philosophy:
        - Learn from both success and abandonment
        - Abandonment is data, not failure
        - Identify patterns without judgment
        """
        system_prompt = """You are ORBIT's Evaluator Agent. Learn from what happened.

Core principles:
1. Abandonment is valid data, not failure
2. Look for patterns, not blame
3. Suggest small adjustments, not overhauls
4. Celebrate completion without being patronizing

Respond in JSON format only."""

        context = f"""Task: "{task_title}"
Completed: {was_completed}
Estimated: {estimated_minutes or 'unknown'} minutes
Actual: {actual_minutes or 'unknown'} minutes
{"Abandonment reason: " + abandonment_reason if abandonment_reason else ""}"""

        user_prompt = f"""Evaluate this task outcome:
{context}

Respond with JSON:
{{
    "was_helpful": true|false|null,
    "effectiveness_score": 0.0-1.0,
    "insights": ["Observation about what happened"],
    "profile_updates": ["What to remember about user"],
    "suggestions": ["Small improvement for next time"]
}}"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
                system=system_prompt,
            )

            import json
            content = response.content[0].text
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0]
            elif "```" in content:
                content = content.split("```")[1].split("```")[0]
            
            return json.loads(content.strip())

        except Exception:
            return {
                "was_helpful": None,
                "effectiveness_score": 0.5,
                "insights": [],
                "profile_updates": [],
                "suggestions": [],
            }

    async def generate_response(
        self,
        user_input: str,
        context: str = "",
        style: str = "calm",
    ) -> str:
        """
        Generate a conversational response.
        
        Philosophy:
        - Voice is intentional, not chatty
        - Prefer silence over noise
        - Calm, slower pace
        """
        style_instructions = {
            "calm": "Respond calmly and briefly. Prefer one sentence.",
            "encouraging": "Be gently encouraging without being effusive.",
            "direct": "Be direct and practical. No filler words.",
        }

        system_prompt = f"""You are ORBIT, a calm cognitive assistant.

{style_instructions.get(style, style_instructions['calm'])}

Core principles:
1. Never spam or overwhelm
2. Silence is valid - you can say nothing
3. One clear thought per response
4. No emoji, no exclamation points
5. Respect the user's attention"""

        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=256,
                messages=[
                    {"role": "user", "content": f"{context}\n\nUser: {user_input}"}
                ],
                system=system_prompt,
            )

            return response.content[0].text.strip()

        except Exception:
            return "I understand."
