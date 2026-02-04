"""
ORBIT - Pydantic Schemas for API Validation
Request and Response models
"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.models import (
    IntentUrgency,
    TaskStatus,
    GoalStatus,
    MemoryType,
    EventType,
)


# ============================================================================
# BASE SCHEMAS
# ============================================================================

class ORBITBase(BaseModel):
    """Base schema with common configuration."""
    
    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# USER SCHEMAS
# ============================================================================

class UserCreate(BaseModel):
    """Schema for creating a new user."""
    email: EmailStr
    password: str = Field(min_length=8)
    name: Optional[str] = None


class UserUpdate(BaseModel):
    """Schema for updating user details."""
    name: Optional[str] = None
    voice_enabled: Optional[bool] = None
    timezone: Optional[str] = None
    language: Optional[str] = None


class UserResponse(ORBITBase):
    """Schema for user response."""
    id: UUID
    email: str
    name: Optional[str]
    voice_enabled: bool
    timezone: str
    language: str
    is_active: bool
    created_at: datetime
    last_active_at: Optional[datetime]


# ============================================================================
# COGNITIVE PROFILE SCHEMAS
# ============================================================================

class CognitiveProfileResponse(ORBITBase):
    """Schema for cognitive profile response."""
    id: UUID
    user_id: UUID
    
    # Work Patterns
    preferred_work_hours_start: int
    preferred_work_hours_end: int
    peak_focus_hours: list[int]
    
    # Focus
    average_focus_duration: int
    optimal_focus_duration: int
    
    # Behavioral Scores
    task_abandonment_rate: float
    task_completion_rate: float
    overcommitment_score: float
    consistency_score: float
    
    # Intent Patterns
    average_intents_per_day: float
    intent_clarity_score: float
    intent_to_action_rate: float
    
    # Meta
    profile_confidence: float
    data_points_collected: int
    last_updated: datetime


class CognitiveInsight(BaseModel):
    """An insight derived from the cognitive profile."""
    type: str  # suggestion, warning, observation
    message: str
    confidence: float
    related_metric: Optional[str] = None
    suggested_action: Optional[str] = None


# ============================================================================
# INTENT SCHEMAS
# ============================================================================

class IntentCreate(BaseModel):
    """Schema for creating a new intent (voice or text input)."""
    raw_input: str = Field(min_length=1, max_length=5000)
    source: str = Field(default="text")  # voice, text


class IntentResponse(ORBITBase):
    """Schema for intent response."""
    id: UUID
    raw_input: str
    interpreted_intent: Optional[str]
    urgency: IntentUrgency
    is_ambiguous: bool
    ambiguity_reason: Optional[str]
    emotional_tone: Optional[str]
    context_tags: list[str]
    is_processed: bool
    current_priority: float
    created_at: datetime
    processed_at: Optional[datetime]


class IntentInterpretation(BaseModel):
    """Result of AI interpretation of an intent."""
    interpreted_intent: str
    urgency: IntentUrgency
    is_ambiguous: bool
    ambiguity_reason: Optional[str] = None
    emotional_tone: Optional[str] = None
    suggested_clarification: Optional[str] = None
    context_tags: list[str] = []
    confidence: float


# ============================================================================
# GOAL SCHEMAS
# ============================================================================

class GoalCreate(BaseModel):
    """Schema for creating a goal."""
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    success_criteria: Optional[str] = None
    target_date: Optional[datetime] = None
    estimated_effort_hours: Optional[float] = None
    intent_id: Optional[UUID] = None


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""
    title: Optional[str] = None
    description: Optional[str] = None
    success_criteria: Optional[str] = None
    status: Optional[GoalStatus] = None
    progress: Optional[float] = Field(default=None, ge=0, le=1)
    target_date: Optional[datetime] = None


class GoalResponse(ORBITBase):
    """Schema for goal response."""
    id: UUID
    title: str
    description: Optional[str]
    success_criteria: Optional[str]
    status: GoalStatus
    progress: float
    priority: float
    target_date: Optional[datetime]
    estimated_effort_hours: Optional[float]
    actual_effort_hours: float
    created_at: datetime
    completed_at: Optional[datetime]


# ============================================================================
# TASK SCHEMAS
# ============================================================================

class TaskCreate(BaseModel):
    """Schema for creating a task."""
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    estimated_minutes: Optional[int] = Field(default=None, ge=1, le=480)
    energy_required: str = Field(default="medium")
    focus_required: str = Field(default="medium")
    scheduled_for: Optional[datetime] = None
    due_date: Optional[datetime] = None
    goal_id: Optional[UUID] = None
    intent_id: Optional[UUID] = None
    context_tags: list[str] = []


class TaskUpdate(BaseModel):
    """Schema for updating a task."""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    completion_notes: Optional[str] = None
    abandonment_reason: Optional[str] = None
    scheduled_for: Optional[datetime] = None


class TaskResponse(ORBITBase):
    """Schema for task response."""
    id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: float
    orbital_distance: float
    estimated_minutes: Optional[int]
    actual_minutes: Optional[int]
    energy_required: str
    focus_required: str
    context_tags: list[str]
    scheduled_for: Optional[datetime]
    due_date: Optional[datetime]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


# ============================================================================
# MEMORY SCHEMAS
# ============================================================================

class MemoryCreate(BaseModel):
    """Schema for creating a memory."""
    content: str = Field(min_length=1)
    memory_type: MemoryType = MemoryType.EPISODIC
    importance_score: float = Field(default=0.5, ge=0, le=1)
    context_tags: list[str] = []


class MemoryResponse(ORBITBase):
    """Schema for memory response."""
    id: UUID
    content: str
    summary: Optional[str]
    memory_type: MemoryType
    importance_score: float
    retrieval_count: int
    is_active: bool
    created_at: datetime


class MemorySearchResult(BaseModel):
    """Result from semantic memory search."""
    memory: MemoryResponse
    relevance_score: float
    context_match: float


# ============================================================================
# BEHAVIORAL EVENT SCHEMAS
# ============================================================================

class BehavioralEventCreate(BaseModel):
    """Schema for creating a behavioral event."""
    event_type: EventType
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    event_data: dict = {}


class BehavioralEventResponse(ORBITBase):
    """Schema for behavioral event response."""
    id: UUID
    event_type: EventType
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    event_data: dict
    time_of_day: Optional[int]
    day_of_week: Optional[int]
    created_at: datetime


# ============================================================================
# PLANNER SCHEMAS
# ============================================================================

class PlanRequest(BaseModel):
    """Request for the planner to create a plan from an intent."""
    intent_id: UUID
    max_tasks: int = Field(default=5, ge=1, le=10)
    consider_current_load: bool = True


class PlanStep(BaseModel):
    """A single step in a plan."""
    order: int
    task_title: str
    task_description: Optional[str] = None
    estimated_minutes: Optional[int] = None
    energy_required: str = "medium"
    depends_on: list[int] = []  # Order numbers of dependencies


class PlanResponse(BaseModel):
    """Response from the planner."""
    intent_id: UUID
    goal_title: Optional[str] = None
    steps: list[PlanStep]
    total_estimated_minutes: Optional[int] = None
    reasoning: str
    warnings: list[str] = []


# ============================================================================
# EVALUATOR SCHEMAS
# ============================================================================

class EvaluationRequest(BaseModel):
    """Request for evaluating completed work."""
    task_id: Optional[UUID] = None
    goal_id: Optional[UUID] = None
    session_id: Optional[str] = None


class EvaluationResponse(BaseModel):
    """Response from the evaluator."""
    entity_id: UUID
    entity_type: str
    was_helpful: Optional[bool] = None
    effectiveness_score: float
    insights: list[str]
    profile_updates: list[str]
    suggestions: list[str]


# ============================================================================
# VOICE SCHEMAS
# ============================================================================

class VoiceInputRequest(BaseModel):
    """Request for processing voice input."""
    audio_data: str  # Base64 encoded audio
    format: str = "webm"  # Audio format
    sample_rate: int = 16000


class VoiceInputResponse(BaseModel):
    """Response from voice processing."""
    transcription: str
    confidence: float
    intent: Optional[IntentResponse] = None
    language_detected: str = "en"


class VoiceOutputRequest(BaseModel):
    """Request for generating voice output."""
    text: str
    voice_style: str = "calm"  # calm, neutral, encouraging


# ============================================================================
# WEBSOCKET EVENT SCHEMAS
# ============================================================================

class WSEvent(BaseModel):
    """WebSocket event structure."""
    type: str
    payload: dict
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class AgentThought(BaseModel):
    """Real-time agent thought for UI display."""
    agent: str  # intent, planner, executor, evaluator
    thought: str
    confidence: Optional[float] = None
    is_final: bool = False


# ============================================================================
# AUTHENTICATION SCHEMAS
# ============================================================================

class Token(BaseModel):
    """OAuth2 token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Data encoded in JWT token."""
    user_id: UUID
    email: str


class LoginRequest(BaseModel):
    """Login request."""
    email: EmailStr
    password: str
