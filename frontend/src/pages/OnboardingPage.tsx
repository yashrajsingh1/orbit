import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Mic, Clock, Brain, Moon } from 'lucide-react'

/**
 * ONBOARDING PAGE
 * 
 * Learn about the user passively, not through interrogation.
 * 
 * Philosophy:
 * - ORBIT learns passively, asks minimally
 * - Only essential questions
 * - Calm, welcoming tone
 */

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to ORBIT',
    description: "Your personal cognitive operating system. Let's set up a few things.",
    icon: Brain,
  },
  {
    id: 'focus',
    title: 'Your focus window',
    description: 'How long can you typically focus on a single task?',
    icon: Clock,
    options: [
      { value: 15, label: '15 minutes' },
      { value: 25, label: '25 minutes' },
      { value: 45, label: '45 minutes' },
      { value: 60, label: '60+ minutes' },
    ],
  },
  {
    id: 'hours',
    title: 'Peak hours',
    description: 'When do you do your best thinking?',
    icon: Moon,
    options: [
      { value: 'morning', label: 'Morning (6am-12pm)' },
      { value: 'afternoon', label: 'Afternoon (12pm-6pm)' },
      { value: 'evening', label: 'Evening (6pm-10pm)' },
      { value: 'night', label: 'Night (10pm-2am)' },
    ],
  },
  {
    id: 'voice',
    title: 'Voice input',
    description: 'Would you like to use voice as your primary input?',
    icon: Mic,
    options: [
      { value: true, label: 'Yes, voice first' },
      { value: false, label: 'No, I prefer typing' },
    ],
  },
]

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const navigate = useNavigate()

  const step = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  const handleAnswer = (value: unknown) => {
    setAnswers({ ...answers, [step.id]: value })
  }

  const handleNext = () => {
    if (isLastStep) {
      // Save preferences and go to main app
      // In real app, would send to backend
      console.log('Onboarding complete:', answers)
      navigate('/')
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1)
    }
  }

  const canProceed = isFirstStep || answers[step.id] !== undefined

  return (
    <div className="min-h-screen bg-orbit-void flex items-center justify-center p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-orbit-surface/30 via-transparent to-transparent" />

      <div className="relative w-full max-w-md">
        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, index) => (
            <motion.div
              key={index}
              className={`h-1 rounded-full transition-all duration-300 ${
                index <= currentStep ? 'bg-orbit-focus w-8' : 'bg-orbit-border w-4'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass rounded-2xl p-8"
          >
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-orbit-focus/20 flex items-center justify-center mb-6">
              <step.icon className="w-6 h-6 text-orbit-focus" />
            </div>

            {/* Title & Description */}
            <h2 className="text-xl font-semibold text-orbit-bright mb-2">
              {step.title}
            </h2>
            <p className="text-orbit-muted mb-8">
              {step.description}
            </p>

            {/* Options */}
            {step.options && (
              <div className="space-y-3 mb-8">
                {step.options.map((option) => (
                  <button
                    key={String(option.value)}
                    onClick={() => handleAnswer(option.value)}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all duration-200
                      ${answers[step.id] === option.value
                        ? 'bg-orbit-focus/20 border-2 border-orbit-focus/50 text-orbit-text'
                        : 'bg-orbit-surface/30 border-2 border-transparent text-orbit-muted hover:bg-orbit-surface/50'}
                    `}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
              {!isFirstStep ? (
                <button
                  onClick={handleBack}
                  className="btn-orbit flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`
                  btn-orbit-primary flex items-center gap-2
                  ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {isLastStep ? 'Get started' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip option */}
        <button
          onClick={() => navigate('/')}
          className="block mx-auto mt-6 text-sm text-orbit-muted hover:text-orbit-text transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}
