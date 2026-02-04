import { create } from 'zustand'
import { Task, TaskCreate, TaskStatus } from '@/types'
import { apiClient } from '@/services/api'

interface TaskState {
  tasks: Task[]
  focusedTask: Task | null
  isLoading: boolean
  error: string | null
  
  // Actions
  fetchTasks: () => Promise<void>
  createTask: (data: TaskCreate) => Promise<Task | null>
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>
  setFocusedTask: (task: Task | null) => void
  startTask: (taskId: string) => Promise<void>
  completeTask: (taskId: string) => Promise<void>
  abandonTask: (taskId: string, reason?: string) => Promise<void>
  
  // Computed
  getPendingTasks: () => Task[]
  getTasksByOrbitalDistance: () => Task[]
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  focusedTask: null,
  isLoading: false,
  error: null,

  fetchTasks: async () => {
    set({ isLoading: true })
    try {
      const response = await apiClient.get<Task[]>('/tasks/')
      set({ tasks: response.data, isLoading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks'
      set({ error: message, isLoading: false })
    }
  },

  createTask: async (data) => {
    try {
      const response = await apiClient.post<Task>('/tasks/', data)
      const task = response.data
      set((state) => ({ tasks: [...state.tasks, task] }))
      return task
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create task'
      set({ error: message })
      return null
    }
  },

  updateTaskStatus: async (taskId, status) => {
    try {
      const response = await apiClient.patch<Task>(`/tasks/${taskId}`, { status })
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? response.data : t
        ),
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update task'
      set({ error: message })
    }
  },

  setFocusedTask: (task) => {
    set({ focusedTask: task })
  },

  startTask: async (taskId) => {
    try {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/start`)
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? response.data : t
        ),
        focusedTask: response.data,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start task'
      set({ error: message })
    }
  },

  completeTask: async (taskId) => {
    try {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/complete`)
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? response.data : t
        ),
        focusedTask: state.focusedTask?.id === taskId ? null : state.focusedTask,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to complete task'
      set({ error: message })
    }
  },

  abandonTask: async (taskId, reason) => {
    try {
      const response = await apiClient.post<Task>(`/tasks/${taskId}/abandon`, { reason })
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? response.data : t
        ),
        focusedTask: state.focusedTask?.id === taskId ? null : state.focusedTask,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to abandon task'
      set({ error: message })
    }
  },

  getPendingTasks: () => {
    return get().tasks.filter(
      (t) => t.status === 'pending' || t.status === 'in_progress'
    )
  },

  getTasksByOrbitalDistance: () => {
    return [...get().tasks]
      .filter((t) => t.status === 'pending' || t.status === 'in_progress')
      .sort((a, b) => a.orbital_distance - b.orbital_distance)
  },
}))
