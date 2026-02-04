// ORBIT Type Definitions
// Matches backend schemas

export type IntentUrgency = 'low' | 'medium' | 'high' | 'critical'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned' | 'deferred'
export type GoalStatus = 'active' | 'achieved' | 'paused' | 'abandoned'
export type MemoryType = 'short_term' | 'long_term' | 'identity' | 'episodic' | 'semantic'

// User
export interface User {
  id: string
  email: string
  name?: string
  voice_enabled: boolean
  timezone: string
  language: string
  is_active: boolean
  created_at: string
  last_active_at?: string
}

// Cognitive Profile - What makes ORBIT unique
export interface CognitiveProfile {
  id: string
  user_id: string
  
  // Work Patterns
  preferred_work_hours_start: number
  preferred_work_hours_end: number
  peak_focus_hours: number[]
  
  // Focus
  average_focus_duration: number
  optimal_focus_duration: number
  
  // Behavioral Scores (0-1)
  task_abandonment_rate: number
  task_completion_rate: number
  overcommitment_score: number
  consistency_score: number
  
  // Intent Patterns
  average_intents_per_day: number
  intent_clarity_score: number
  intent_to_action_rate: number
  
  // Meta
  profile_confidence: number
  data_points_collected: number
  last_updated: string
}

// Intent - User's expressed intentions
export interface Intent {
  id: string
  raw_input: string
  interpreted_intent?: string
  urgency: IntentUrgency
  is_ambiguous: boolean
  ambiguity_reason?: string
  emotional_tone?: string
  context_tags: string[]
  is_processed: boolean
  current_priority: number
  created_at: string
  processed_at?: string
}

export interface IntentCreate {
  raw_input: string
  source?: 'voice' | 'text'
}

export interface IntentInterpretation {
  interpreted_intent: string
  urgency: IntentUrgency
  is_ambiguous: boolean
  ambiguity_reason?: string
  emotional_tone?: string
  suggested_clarification?: string
  context_tags: string[]
  confidence: number
}

// Goal - Higher-level goals from intents
export interface Goal {
  id: string
  title: string
  description?: string
  success_criteria?: string
  status: GoalStatus
  progress: number
  priority: number
  target_date?: string
  estimated_effort_hours?: number
  actual_effort_hours: number
  created_at: string
  completed_at?: string
}

export interface GoalCreate {
  title: string
  description?: string
  success_criteria?: string
  target_date?: string
  estimated_effort_hours?: number
  intent_id?: string
}

// Task - Atomic units of work
export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: number
  orbital_distance: number  // For UI positioning
  estimated_minutes?: number
  actual_minutes?: number
  energy_required: 'low' | 'medium' | 'high'
  focus_required: 'low' | 'medium' | 'high'
  context_tags: string[]
  scheduled_for?: string
  due_date?: string
  created_at: string
  started_at?: string
  completed_at?: string
  goal_id?: string
}

export interface TaskCreate {
  title: string
  description?: string
  estimated_minutes?: number
  energy_required?: string
  focus_required?: string
  scheduled_for?: string
  due_date?: string
  goal_id?: string
}

// Memory - Personal memory for RAG
export interface Memory {
  id: string
  content: string
  summary?: string
  memory_type: MemoryType
  importance_score: number
  retrieval_count: number
  context_tags: string[]
  created_at: string
}

// Cognitive Insight - system-generated observations
export interface CognitiveInsight {
  type: 'suggestion' | 'warning' | 'observation'
  message: string
  confidence: number
  related_metric?: string
  suggested_action?: string
}

// Plan - Generated from intent
export interface PlanStep {
  order: number
  title: string
  description?: string
  estimated_minutes: number
  energy_required: string
  can_be_skipped: boolean
}

// Voice
export interface VoiceInputResponse {
  transcript: string
  confidence: number
  intent_id?: string
  interpretation?: IntentInterpretation
}

// WebSocket Events
export interface WSEvent {
  type: 'intent_created' | 'intent_interpreted' | 'task_updated' | 'insight_generated' | 'thought_signal'
  payload: unknown
  timestamp: string
}

// AI Thought Signal - Shows ORBIT is "thinking"
export interface ThoughtSignal {
  id: string
  message: string  // e.g., "Reprioritizing...", "Reducing scope..."
  duration: number // ms
}

// API Response Wrapper
export interface APIResponse<T> {
  data: T
  message?: string
  error?: string
}

// Auth
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}
