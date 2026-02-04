"""
ORBIT - SQLAlchemy Database Models
Core data structures for the cognitive operating system
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.core.database import Base


# ============================================================================
# ENUMS
# ============================================================================

import enum


class IntentUrgency(str, enum.Enum):
    """Urgency level of an intent."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, enum.Enum):
    """Status of a task."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    DEFERRED = "deferred"


class GoalStatus(str, enum.Enum):
    """Status of a goal."""
    ACTIVE = "active"
    ACHIEVED = "achieved"
    PAUSED = "paused"
    ABANDONED = "abandoned"


class MemoryType(str, enum.Enum):
    """Type of memory entry."""
    SHORT_TERM = "short_term"      # Current session context
    LONG_TERM = "long_term"        # Repeated behaviors, patterns
    IDENTITY = "identity"          # Who the user is becoming
    EPISODIC = "episodic"          # Specific events
    SEMANTIC = "semantic"          # Facts and knowledge


class EventType(str, enum.Enum):
    """Type of behavioral event."""
    TASK_STARTED = "task_started"
    TASK_COMPLETED = "task_completed"
    TASK_ABANDONED = "task_abandoned"
    FOCUS_SESSION_START = "focus_session_start"
    FOCUS_SESSION_END = "focus_session_end"
    INTENT_EXPRESSED = "intent_expressed"
    GOAL_SET = "goal_set"
    OVERWHELM_DETECTED = "overwhelm_detected"
    PATTERN_RECOGNIZED = "pattern_recognized"


class NotificationPriority(str, enum.Enum):
    """Priority level for notifications."""
    LOW = "low"           # Can wait, batch with others
    NORMAL = "normal"     # Standard delivery
    HIGH = "high"         # Important, but respects focus
    URGENT = "urgent"     # Breaks through focus mode


# ============================================================================
# USER MODEL
# ============================================================================

class User(Base):
    """User account and authentication."""
    
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    
    # Settings
    voice_enabled = Column(Boolean, default=True)
    timezone = Column(String(50), default="UTC")
    language = Column(String(10), default="en")
    
    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_active_at = Column(DateTime, nullable=True)

    # Relationships
    cognitive_profile = relationship("CognitiveProfile", back_populates="user", uselist=False)
    intents = relationship("Intent", back_populates="user")
    goals = relationship("Goal", back_populates="user")
    tasks = relationship("Task", back_populates="user")
    memories = relationship("Memory", back_populates="user")
    events = relationship("BehavioralEvent", back_populates="user")


# ============================================================================
# COGNITIVE PROFILE MODEL (CORE INNOVATION)
# ============================================================================

class CognitiveProfile(Base):
    """
    The user's cognitive profile - what makes ORBIT unique.
    This is structured behavioral intelligence, not embeddings spam.
    """
    
    __tablename__ = "cognitive_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)

    # Work Patterns
    preferred_work_hours_start = Column(Integer, default=9)  # 24h format
    preferred_work_hours_end = Column(Integer, default=17)
    peak_focus_hours = Column(ARRAY(Integer), default=[10, 11, 14, 15])  # Best hours
    
    # Focus Characteristics
    average_focus_duration = Column(Integer, default=25)  # minutes
    optimal_focus_duration = Column(Integer, default=45)  # learned over time
    focus_decay_rate = Column(Float, default=0.1)  # how fast focus drops
    
    # Behavioral Patterns
    task_abandonment_rate = Column(Float, default=0.0)  # 0-1 scale
    task_completion_rate = Column(Float, default=0.0)
    overcommitment_score = Column(Float, default=0.0)  # tendency to take on too much
    consistency_score = Column(Float, default=0.5)  # follow-through rate
    
    # Intent Patterns
    average_intents_per_day = Column(Float, default=5.0)
    intent_clarity_score = Column(Float, default=0.5)  # how clear their intents are
    intent_to_action_rate = Column(Float, default=0.5)  # intents that become tasks
    
    # Emotional Patterns (detected through voice/text)
    stress_indicators = Column(JSON, default=dict)  # patterns that indicate stress
    calm_indicators = Column(JSON, default=dict)  # patterns that indicate calm
    overwhelm_triggers = Column(JSON, default=list)  # what causes overwhelm
    
    # Learning Data
    successful_strategies = Column(JSON, default=list)  # what has worked
    unsuccessful_strategies = Column(JSON, default=list)  # what hasn't worked
    preferred_task_types = Column(JSON, default=list)
    avoided_task_types = Column(JSON, default=list)
    
    # Meta
    profile_confidence = Column(Float, default=0.0)  # how confident we are in the profile
    last_updated = Column(DateTime, default=datetime.utcnow)
    data_points_collected = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="cognitive_profile")


# ============================================================================
# INTENT MODEL
# ============================================================================

class Intent(Base):
    """
    User's expressed intentions - the raw input before planning.
    Voice or text, these are what the user wants to accomplish.
    """
    
    __tablename__ = "intents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Content
    raw_input = Column(Text, nullable=False)  # Original voice/text
    interpreted_intent = Column(Text, nullable=True)  # AI interpretation
    
    # Classification
    urgency = Column(Enum(IntentUrgency), default=IntentUrgency.MEDIUM)
    is_ambiguous = Column(Boolean, default=False)
    ambiguity_reason = Column(String(255), nullable=True)
    
    # Context
    emotional_tone = Column(String(50), nullable=True)  # calm, stressed, excited
    context_tags = Column(ARRAY(String), default=list)
    
    # Processing
    is_processed = Column(Boolean, default=False)
    processing_notes = Column(Text, nullable=True)
    
    # Decay (intents lose urgency over time)
    initial_priority = Column(Float, default=1.0)
    current_priority = Column(Float, default=1.0)
    decay_rate = Column(Float, default=0.1)  # per hour
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="intents")
    goals = relationship("Goal", back_populates="intent")
    tasks = relationship("Task", back_populates="intent")


# ============================================================================
# GOAL MODEL
# ============================================================================

class Goal(Base):
    """
    Higher-level goals derived from intents.
    Goals are achieved through multiple tasks.
    """
    
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    intent_id = Column(UUID(as_uuid=True), ForeignKey("intents.id"), nullable=True)

    # Content
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    success_criteria = Column(Text, nullable=True)  # What does "done" look like?
    
    # Status
    status = Column(Enum(GoalStatus), default=GoalStatus.ACTIVE)
    progress = Column(Float, default=0.0)  # 0-1
    
    # Priority (affected by gravity)
    priority = Column(Float, default=1.0)
    priority_gravity = Column(Float, default=0.0)  # pulls priority up/down
    
    # Timeframe
    target_date = Column(DateTime, nullable=True)
    estimated_effort_hours = Column(Float, nullable=True)
    actual_effort_hours = Column(Float, default=0.0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="goals")
    intent = relationship("Intent", back_populates="goals")
    tasks = relationship("Task", back_populates="goal")


# ============================================================================
# TASK MODEL
# ============================================================================

class Task(Base):
    """
    Atomic units of work. Tasks are the smallest executable items.
    """
    
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    intent_id = Column(UUID(as_uuid=True), ForeignKey("intents.id"), nullable=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("goals.id"), nullable=True)

    # Content
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(TaskStatus), default=TaskStatus.PENDING)
    
    # Priority & Scheduling
    priority = Column(Float, default=1.0)
    orbital_distance = Column(Float, default=1.0)  # Distance from focus (UI)
    
    # Time Estimates
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)
    
    # Context
    energy_required = Column(String(20), default="medium")  # low, medium, high
    focus_required = Column(String(20), default="medium")
    context_tags = Column(ARRAY(String), default=list)
    
    # Scheduling
    scheduled_for = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    
    # Completion
    completion_notes = Column(Text, nullable=True)
    abandonment_reason = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="tasks")
    intent = relationship("Intent", back_populates="tasks")
    goal = relationship("Goal", back_populates="tasks")


# ============================================================================
# MEMORY MODEL
# ============================================================================

class Memory(Base):
    """
    Personal memory system for RAG and context.
    Only stores relevant, retrievable memories.
    """
    
    __tablename__ = "memories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Content
    content = Column(Text, nullable=False)
    summary = Column(String(500), nullable=True)
    
    # Classification
    memory_type = Column(Enum(MemoryType), default=MemoryType.EPISODIC)
    
    # Relevance
    importance_score = Column(Float, default=0.5)  # 0-1
    retrieval_count = Column(Integer, default=0)
    last_retrieved_at = Column(DateTime, nullable=True)
    
    # Vector Embedding
    embedding_id = Column(String(255), nullable=True)  # Reference to vector store
    embedding_model = Column(String(100), nullable=True)
    
    # Context
    source_type = Column(String(50), nullable=True)  # intent, task, event
    source_id = Column(UUID(as_uuid=True), nullable=True)
    context_tags = Column(ARRAY(String), default=list)
    
    # Lifecycle
    expires_at = Column(DateTime, nullable=True)  # For short-term memories
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="memories")


# ============================================================================
# BEHAVIORAL EVENT MODEL
# ============================================================================

class BehavioralEvent(Base):
    """
    Track user behavior for cognitive profile learning.
    These events feed the learning system.
    """
    
    __tablename__ = "behavioral_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Event Details
    event_type = Column(Enum(EventType), nullable=False)
    
    # Related Entity
    entity_type = Column(String(50), nullable=True)  # task, goal, intent
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Event Data
    event_data = Column(JSON, default=dict)
    
    # Context at time of event
    time_of_day = Column(Integer, nullable=True)  # Hour 0-23
    day_of_week = Column(Integer, nullable=True)  # 0=Monday
    session_duration_minutes = Column(Integer, nullable=True)
    
    # Analysis
    is_analyzed = Column(Boolean, default=False)
    analysis_notes = Column(Text, nullable=True)
    contributed_to_profile = Column(Boolean, default=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="events")
