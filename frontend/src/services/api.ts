import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'

// Create axios instance with defaults
export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('orbit_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('orbit_token')
      window.location.href = '/auth'
    }
    
    // Extract error message
    const message = 
      (error.response?.data as { detail?: string })?.detail ||
      error.message ||
      'An unexpected error occurred'
    
    return Promise.reject(new Error(message))
  }
)

// API Helper functions
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  
  register: (email: string, password: string, name?: string) =>
    apiClient.post('/auth/register', { email, password, name }),
  
  // User
  getMe: () => apiClient.get('/users/me'),
  
  getCognitiveProfile: () => apiClient.get('/users/me/profile'),
  
  // Intents
  createIntent: (rawInput: string, source: 'voice' | 'text' = 'text') =>
    apiClient.post('/intent/', { raw_input: rawInput, source }),
  
  interpretIntent: (intentId: string) =>
    apiClient.post(`/intent/${intentId}/interpret`),
  
  getIntents: (limit = 20) =>
    apiClient.get(`/intent/?limit=${limit}`),
  
  // Tasks
  getTasks: () => apiClient.get('/tasks/'),
  
  createTask: (data: {
    title: string
    description?: string
    estimated_minutes?: number
    goal_id?: string
  }) => apiClient.post('/tasks/', data),
  
  updateTask: (taskId: string, data: Record<string, unknown>) =>
    apiClient.patch(`/tasks/${taskId}`, data),
  
  startTask: (taskId: string) =>
    apiClient.post(`/tasks/${taskId}/start`),
  
  completeTask: (taskId: string) =>
    apiClient.post(`/tasks/${taskId}/complete`),
  
  abandonTask: (taskId: string, reason?: string) =>
    apiClient.post(`/tasks/${taskId}/abandon`, { reason }),
  
  // Goals
  getGoals: () => apiClient.get('/goals/'),
  
  createGoal: (data: {
    title: string
    description?: string
    target_date?: string
  }) => apiClient.post('/goals/', data),
  
  // Planner
  generatePlan: (intentId: string) =>
    apiClient.post(`/planner/generate`, { intent_id: intentId }),
  
  // Memory
  getMemories: (type?: string) =>
    apiClient.get('/memory/', { params: { type } }),
  
  // Voice
  transcribeAudio: (audioData: string, format: string) =>
    apiClient.post('/voice/transcribe', { 
      audio_data: audioData, 
      format 
    }),
  
  generateSpeech: (text: string) =>
    apiClient.post('/voice/speak', { text }),

  // Generic HTTP methods for flexibility
  get: <T = unknown>(url: string, config?: Parameters<typeof apiClient.get>[1]) =>
    apiClient.get<T>(url, config),
  
  post: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof apiClient.post>[2]) =>
    apiClient.post<T>(url, data, config),
  
  put: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof apiClient.put>[2]) =>
    apiClient.put<T>(url, data, config),
  
  patch: <T = unknown>(url: string, data?: unknown, config?: Parameters<typeof apiClient.patch>[2]) =>
    apiClient.patch<T>(url, data, config),
  
  delete: <T = unknown>(url: string, config?: Parameters<typeof apiClient.delete>[1]) =>
    apiClient.delete<T>(url, config),
}

export default apiClient
