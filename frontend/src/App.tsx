import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { CognitiveCanvas } from '@/canvas/CognitiveCanvas'
import { AuthPage } from '@/pages/AuthPage'
import { OnboardingPage } from '@/pages/OnboardingPage'
import { InsightsPage } from '@/pages/InsightsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { useWebSocket } from '@/hooks/useWebSocket'
import { OfflineIndicator } from '@/hooks/useOffline'

function App() {
  const { isAuthenticated, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <MainApp />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/insights"
          element={
            isAuthenticated ? (
              <InsightsPage />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? (
              <SettingsPage />
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Global offline indicator */}
      <OfflineIndicator />
    </BrowserRouter>
  )
}

/**
 * Main Application - The Cognitive Canvas
 * Philosophy: This is not a dashboard. It's a calm, focused space.
 */
function MainApp() {
  // Connect to WebSocket for real-time updates
  useWebSocket()

  return (
    <div className="min-h-screen bg-orbit-void">
      <CognitiveCanvas />
    </div>
  )
}

export default App
