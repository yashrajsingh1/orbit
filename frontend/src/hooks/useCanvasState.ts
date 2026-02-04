/**
 * ORBIT Canvas State Hook
 * 
 * Manages the unified state of the Cognitive Canvas.
 * One screen that changes state, not pages.
 */

import { create } from 'zustand';
import { CoreState } from '@/canvas/FocusCore';
import { TaskNode } from '@/canvas/TaskOrbits';
import { api } from '@/services/api';

export type CanvasState = 
  | 'idle'           // Default calm state
  | 'inputting'      // Text input visible
  | 'listening'      // Voice recording
  | 'thinking'       // AI processing
  | 'responding'     // AI response visible
  | 'reflecting'     // Evening reflection
  | 'identity'       // Weekly identity view
  | 'silent';        // Silence mode

interface AIResponse {
  statement: string;
  actions: Array<{
    id: string;
    title: string;
    estimatedMinutes?: number;
  }>;
  confidence?: string;
  intentId?: string;
}

interface CanvasStore {
  // Core state
  state: CanvasState;
  coreState: CoreState;
  urgency: number;
  
  // Tasks
  tasks: TaskNode[];
  
  // Voice
  transcript: string;
  isTranscribing: boolean;
  
  // AI Response
  aiResponse: AIResponse | null;
  
  // Silence mode
  lastInteraction: number;
  silenceThreshold: number; // ms before entering silence
  
  // Error state
  error: string | null;
  
  // Actions
  setState: (state: CanvasState) => void;
  setUrgency: (urgency: number) => void;
  setError: (error: string | null) => void;
  
  // Input actions
  openInput: () => void;
  closeInput: () => void;
  submitInput: (text: string, source?: 'text' | 'voice') => Promise<void>;
  
  // Voice actions
  startListening: () => void;
  stopListening: () => void;
  setTranscript: (text: string) => void;
  
  // AI actions
  setAIResponse: (response: AIResponse | null) => void;
  selectAction: (actionId: string) => Promise<void>;
  
  // Task actions
  setTasks: (tasks: TaskNode[]) => void;
  addTask: (task: TaskNode) => void;
  completeTask: (taskId: string) => Promise<void>;
  fetchTasks: () => Promise<void>;
  
  // State views
  showReflection: (insight: string) => void;
  showIdentity: () => void;
  dismissOverlay: () => void;
  
  // Silence mode
  recordInteraction: () => void;
  checkSilence: () => void;
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  // Initial state
  state: 'idle',
  coreState: 'idle',
  urgency: 0.3,
  tasks: [],
  transcript: '',
  isTranscribing: false,
  aiResponse: null,
  lastInteraction: Date.now(),
  silenceThreshold: 5 * 60 * 1000, // 5 minutes
  error: null,
  
  setState: (state) => {
    const coreState = mapToCoreState(state);
    set({ state, coreState });
    get().recordInteraction();
  },
  
  setUrgency: (urgency) => set({ urgency }),
  
  setError: (error) => set({ error }),
  
  // Input
  openInput: () => {
    set({ state: 'inputting', coreState: 'idle', error: null });
    get().recordInteraction();
  },
  
  closeInput: () => {
    set({ state: 'idle', coreState: 'idle' });
  },
  
  submitInput: async (text, source = 'text') => {
    set({ state: 'thinking', coreState: 'thinking', error: null });
    get().recordInteraction();
    
    try {
      // Create intent in backend
      const intentResponse = await api.createIntent(text, source);
      const intentId = intentResponse.data.id;
      
      // Interpret the intent
      const interpretResponse = await api.interpretIntent(intentId);
      const interpretation = interpretResponse.data;
      
      // Transform to AI response format
      const aiResponse: AIResponse = {
        statement: interpretation.interpretation || "I understand. Here's what I suggest.",
        actions: interpretation.suggested_tasks?.map((task: { id: string; title: string; estimated_minutes?: number }, i: number) => ({
          id: task.id || `action-${i}`,
          title: task.title,
          estimatedMinutes: task.estimated_minutes,
        })) || [],
        confidence: interpretation.confidence 
          ? `${Math.round(interpretation.confidence * 100)}% confident`
          : 'Based on your patterns',
        intentId,
      };
      
      set({ 
        aiResponse, 
        state: 'responding',
        coreState: 'acting',
      });
      
    } catch (error) {
      console.error('Failed to process input:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to process your thought',
        state: 'idle',
        coreState: 'idle',
      });
    }
  },
  
  // Voice
  startListening: () => {
    set({ 
      state: 'listening', 
      coreState: 'listening',
      transcript: '',
      isTranscribing: true,
    });
    get().recordInteraction();
  },
  
  stopListening: () => {
    const { transcript, submitInput } = get();
    set({ isTranscribing: false });
    
    if (transcript.trim()) {
      submitInput(transcript);
    } else {
      set({ state: 'idle', coreState: 'idle' });
    }
  },
  
  setTranscript: (transcript) => set({ transcript }),
  
  // AI Response
  setAIResponse: (aiResponse) => set({ aiResponse }),
  
  selectAction: async (actionId) => {
    const { tasks, aiResponse } = get();
    const action = aiResponse?.actions.find(a => a.id === actionId);
    
    if (action) {
      try {
        // Create task in backend
        const taskResponse = await api.createTask({
          title: action.title,
          estimated_minutes: action.estimatedMinutes,
        });
        
        const newTask: TaskNode = {
          id: taskResponse.data.id || actionId,
          title: action.title,
          priority: 0.8,
          urgency: 0.5,
          age: 0,
          status: 'active',
        };
        
        set({ 
          tasks: [...tasks, newTask],
          aiResponse: null,
          state: 'idle',
          coreState: 'acting',
        });
        
        // Return to idle after pulse
        setTimeout(() => {
          set({ coreState: 'idle' });
        }, 2000);
        
      } catch (error) {
        console.error('Failed to create task:', error);
        // Still add locally even if backend fails
        const newTask: TaskNode = {
          id: actionId,
          title: action.title,
          priority: 0.8,
          urgency: 0.5,
          age: 0,
          status: 'active',
        };
        
        set({ 
          tasks: [...tasks, newTask],
          aiResponse: null,
          state: 'idle',
          coreState: 'acting',
        });
        
        setTimeout(() => {
          set({ coreState: 'idle' });
        }, 2000);
      }
    }
  },
  
  // Tasks
  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => {
    const { tasks } = get();
    set({ tasks: [...tasks, task] });
  },
  
  completeTask: async (taskId) => {
    const { tasks } = get();
    set({
      tasks: tasks.map(t => 
        t.id === taskId 
          ? { ...t, status: 'completing' as const }
          : t
      ),
    });
    
    try {
      await api.completeTask(taskId);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
    
    // Remove after animation
    setTimeout(() => {
      set({
        tasks: tasks.filter(t => t.id !== taskId),
        coreState: 'acting',
      });
      
      setTimeout(() => set({ coreState: 'idle' }), 1000);
    }, 800);
  },
  
  fetchTasks: async () => {
    try {
      const response = await api.getTasks();
      const backendTasks = response.data || [];
      
      const tasks: TaskNode[] = backendTasks.map((t: {
        id: string;
        title: string;
        priority?: number;
        status: string;
        created_at: string;
      }) => ({
        id: t.id,
        title: t.title,
        priority: t.priority || 0.5,
        urgency: calculateUrgency(t),
        age: calculateAge(t.created_at),
        status: t.status === 'completed' ? 'completing' : 'active',
      }));
      
      set({ tasks });
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  },
  
  // State views
  showReflection: (_insight: string) => {
    set({ state: 'reflecting', coreState: 'silent' });
  },
  
  showIdentity: () => {
    set({ state: 'identity', coreState: 'silent' });
    get().recordInteraction();
  },
  
  dismissOverlay: () => {
    set({ state: 'idle', coreState: 'idle' });
  },
  
  // Silence mode
  recordInteraction: () => {
    set({ lastInteraction: Date.now(), state: get().state === 'silent' ? 'idle' : get().state });
  },
  
  checkSilence: () => {
    const { lastInteraction, silenceThreshold, state } = get();
    const timeSinceInteraction = Date.now() - lastInteraction;
    
    if (timeSinceInteraction > silenceThreshold && state === 'idle') {
      set({ state: 'silent', coreState: 'silent' });
    }
  },
}));

// Map canvas state to core visual state
function mapToCoreState(state: CanvasState): CoreState {
  switch (state) {
    case 'listening':
      return 'listening';
    case 'thinking':
      return 'thinking';
    case 'responding':
      return 'acting';
    case 'silent':
    case 'reflecting':
    case 'identity':
      return 'silent';
    default:
      return 'idle';
  }
}

// Calculate urgency based on task properties
function calculateUrgency(task: { 
  priority?: number; 
  due_date?: string;
  created_at: string;
}): number {
  let urgency = task.priority || 0.5;
  
  // Increase urgency if due soon
  if (task.due_date) {
    const dueDate = new Date(task.due_date);
    const now = new Date();
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilDue < 1) urgency = Math.max(urgency, 0.9);
    else if (daysUntilDue < 3) urgency = Math.max(urgency, 0.7);
    else if (daysUntilDue < 7) urgency = Math.max(urgency, 0.5);
  }
  
  return Math.min(urgency, 1);
}

// Calculate age in days since creation
function calculateAge(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
}

export default useCanvasStore;
