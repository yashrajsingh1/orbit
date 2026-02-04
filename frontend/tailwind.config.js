/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ORBIT Design System
        orbit: {
          // Pure black foundation
          black: '#000000',
          void: '#000000',
          deep: '#0c0c0c',
          surface: '#1c1c1e',
          elevated: '#2c2c2e',
          card: '#1c1c1e',
          
          // Subtle borders
          border: 'rgba(255, 255, 255, 0.08)',
          'border-subtle': 'rgba(255, 255, 255, 0.04)',
          separator: 'rgba(255, 255, 255, 0.06)',
          
          // Text hierarchy
          text: '#f5f5f7',
          'text-secondary': '#a1a1a6',
          'text-tertiary': '#6e6e73',
          'text-quaternary': '#48484a',
          
          // Accent
          accent: '#0a84ff',
          'accent-hover': '#409cff',
          'accent-dim': 'rgba(10, 132, 255, 0.15)',
          'accent-glow': 'rgba(10, 132, 255, 0.08)',
          
          // Semantic colors
          green: '#30d158',
          orange: '#ff9f0a',
          red: '#ff453a',
          teal: '#64d2ff',
          purple: '#bf5af2',
          pink: '#ff375f',
          yellow: '#ffd60a',
          
          // Legacy support
          focus: '#0a84ff',
          calm: '#64d2ff',
          energy: '#bf5af2',
          warning: '#ff9f0a',
          success: '#30d158',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Helvetica Neue',
          'Segoe UI',
          'system-ui',
          'sans-serif'
        ],
        mono: ['SF Mono', 'Monaco', 'Menlo', 'monospace'],
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.36' }],     // 11px
        'sm': ['0.8125rem', { lineHeight: '1.38' }],     // 13px
        'base': ['0.9375rem', { lineHeight: '1.47' }],   // 15px
        'md': ['1.0625rem', { lineHeight: '1.47' }],     // 17px
        'lg': ['1.25rem', { lineHeight: '1.3' }],        // 20px
        'xl': ['1.5rem', { lineHeight: '1.2' }],         // 24px
        '2xl': ['2rem', { lineHeight: '1.125' }],        // 32px
        '3xl': ['2.5rem', { lineHeight: '1.1' }],        // 40px
        'display': ['3.5rem', { lineHeight: '1.05' }],   // 56px
      },
      letterSpacing: {
        'tighter': '-0.03em',
        'tight': '-0.024em',
        'normal': '-0.022em',
        'wide': '-0.008em',
      },
      animation: {
        'breathe': 'breathe 4s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.015)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'scale(0.98)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        fadeOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.98)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '64px',
      },
      boxShadow: {
        // Refined glow effects
        'core-idle': '0 0 60px rgba(10, 132, 255, 0.12), 0 0 120px rgba(10, 132, 255, 0.06)',
        'core-active': '0 0 80px rgba(10, 132, 255, 0.2), 0 0 160px rgba(10, 132, 255, 0.1)',
        'core-thinking': '0 0 100px rgba(191, 90, 242, 0.15), 0 0 200px rgba(191, 90, 242, 0.08)',
        'core-listening': '0 0 80px rgba(100, 210, 255, 0.18), 0 0 160px rgba(100, 210, 255, 0.08)',
        
        // Card shadows
        'card': '0 2px 8px rgba(0, 0, 0, 0.3), 0 8px 32px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 12px 40px rgba(0, 0, 0, 0.25)',
        
        // Task node glows
        'task-high': '0 0 24px rgba(255, 159, 10, 0.25), 0 0 48px rgba(255, 159, 10, 0.1)',
        'task-medium': '0 0 20px rgba(10, 132, 255, 0.2), 0 0 40px rgba(10, 132, 255, 0.08)',
        'task-low': '0 0 16px rgba(255, 255, 255, 0.04)',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'spring': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
}
