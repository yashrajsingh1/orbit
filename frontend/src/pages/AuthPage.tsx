import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'

/**
 * AUTH PAGE
 * 
 * Clean, minimal design.
 * Clean, calm authentication. No friction, no clutter.
 */
export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    if (isLogin) {
      await login({ email, password })
      navigate('/')
    } else {
      // Register flow would go here
      // For now, just switch to login
      setIsLogin(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#000000' }}>
      {/* Background gradient */}
      <div 
        className="absolute inset-0" 
        style={{
          background: 'radial-gradient(ellipse at center, rgba(10, 132, 255, 0.04) 0%, transparent 70%)'
        }}
      />
      
      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(10, 132, 255, 0.12)' }}
            animate={{ 
              boxShadow: [
                '0 0 20px rgba(10, 132, 255, 0.2)', 
                '0 0 35px rgba(10, 132, 255, 0.25)', 
                '0 0 20px rgba(10, 132, 255, 0.2)'
              ] 
            }}
            transition={{ duration: 4, repeat: Infinity, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span className="text-2xl font-semibold" style={{ color: '#0a84ff' }}>O</span>
          </motion.div>
          <h1 className="text-[22px] font-semibold" style={{ color: '#f5f5f7', letterSpacing: '-0.022em' }}>ORBIT</h1>
          <p className="text-[13px] mt-2" style={{ color: '#6e6e73', letterSpacing: '-0.01em' }}>Think less. Act better.</p>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit} 
          className="rounded-2xl p-7"
          style={{ 
            backgroundColor: 'rgba(28, 28, 30, 0.8)',
            backdropFilter: 'saturate(180%) blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}
        >
          <h2 
            className="text-[17px] font-medium mb-7"
            style={{ color: '#f5f5f7', letterSpacing: '-0.02em' }}
          >
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>

          {!isLogin && (
            <div className="mb-5">
              <label className="block text-[11px] uppercase mb-2" style={{ color: '#6e6e73', letterSpacing: '0.02em' }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-[15px] transition-all duration-300 outline-none"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#f5f5f7',
                }}
                placeholder="Your name"
              />
            </div>
          )}

          <div className="mb-5">
            <label className="block text-[11px] uppercase mb-2" style={{ color: '#6e6e73', letterSpacing: '0.02em' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[15px] transition-all duration-300 outline-none"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#f5f5f7',
              }}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-[11px] uppercase mb-2" style={{ color: '#6e6e73', letterSpacing: '0.02em' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-[15px] transition-all duration-300 outline-none"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                color: '#f5f5f7',
              }}
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {error && (
            <motion.div
              className="mb-5 p-3 rounded-xl text-[13px]"
              style={{ 
                backgroundColor: 'rgba(255, 69, 58, 0.1)',
                color: '#ff453a'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl text-[15px] font-medium transition-all duration-300"
            style={{
              backgroundColor: '#0a84ff',
              color: '#ffffff',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {isLogin ? 'Signing in...' : 'Creating account...'}
              </motion.span>
            ) : (
              isLogin ? 'Sign in' : 'Create account'
            )}
          </button>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin)
                clearError()
              }}
              className="text-[13px] transition-colors"
              style={{ color: '#6e6e73' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#a1a1a6'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6e6e73'}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>

        {/* Philosophy note */}
        <p className="text-[11px] text-center mt-8" style={{ color: '#48484a', letterSpacing: '-0.01em' }}>
          ORBIT never spams. ORBIT never overwhelms.
        </p>
      </motion.div>
    </div>
  )
}
