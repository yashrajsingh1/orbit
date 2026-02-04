/**
 * ORBIT Cognitive Canvas
 * 
 * The main and ONLY screen.
 * Not a dashboard. Not pages. A living cognitive space.
 * 
 * First impression: Dark, calm, almost empty.
 * "Something intelligent is present, but not noisy."
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusCore } from './FocusCore';
import { TaskOrbits } from './TaskOrbits';
import { ThoughtInput } from './ThoughtInput';
import { AIResponse } from './AIResponse';
import { VoiceTranscript } from './VoiceTranscript';
import { useCanvasStore } from '@/hooks/useCanvasState';
import { ReflectionState } from '@/states/ReflectionState';
import { IdentityView } from '@/states/IdentityView';
import { SilenceMode } from '@/states/SilenceMode';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';

export function CognitiveCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Canvas state
  const {
    state,
    coreState,
    urgency,
    tasks,
    transcript,
    isTranscribing,
    aiResponse,
    error,
    openInput,
    closeInput,
    submitInput,
    startListening,
    stopListening,
    setTranscript,
    selectAction,
    completeTask,
    fetchTasks,
    dismissOverlay,
    checkSilence,
    recordInteraction,
    setError,
  } = useCanvasStore();

  // Voice recognition
  const { 
    start: startVoice, 
    stop: stopVoice, 
  } = useVoiceRecognition({
    onResult: (text) => setTranscript(text),
    onEnd: () => stopListening(),
  });

  // Fetch tasks on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Handle canvas resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setCanvasSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when in input
      if (state === 'inputting') return;
      
      // Space or Enter to open input
      if ((e.key === ' ' || e.key === 'Enter') && state === 'idle') {
        e.preventDefault();
        openInput();
      }
      
      // Escape to dismiss any overlay
      if (e.key === 'Escape') {
        dismissOverlay();
        setError(null);
      }
      
      // V key to start voice
      if (e.key === 'v' && state === 'idle') {
        e.preventDefault();
        startListening();
        startVoice();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, openInput, dismissOverlay, startListening, startVoice, setError]);

  // Silence mode checker
  useEffect(() => {
    const interval = setInterval(checkSilence, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkSilence]);

  // Track user activity
  useEffect(() => {
    const handleActivity = () => recordInteraction();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('keydown', handleActivity);
    
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [recordInteraction]);

  // Focus core handlers
  const handleCoreTap = useCallback(() => {
    if (state === 'idle' || state === 'silent') {
      openInput();
    }
  }, [state, openInput]);

  const handleCoreLongPress = useCallback(() => {
    if (state === 'idle' || state === 'silent') {
      startListening();
      startVoice();
    }
  }, [state, startListening, startVoice]);

  const handleCoreLongPressEnd = useCallback(() => {
    if (state === 'listening') {
      stopVoice();
    }
  }, [state, stopVoice]);

  // Task handlers
  const handleTaskTap = useCallback((taskId: string) => {
    completeTask(taskId);
  }, [completeTask]);

  // Use real tasks, no demo data
  const displayTasks = tasks;

  const isSilent = state === 'silent';

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{
        background: '#000000',
      }}
    >
      {/* Subtle ambient gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 50% 40%, 
              rgba(10, 132, 255, 0.03) 0%, 
              transparent 50%
            )
          `,
        }}
      />

      {/* Ambient background particles */}
      <AmbientParticles />
      
      {/* Main canvas content */}
      <SilenceMode isActive={isSilent}>
        <div className="relative w-full h-full">
          {/* Task orbits */}
          <TaskOrbits
            tasks={displayTasks}
            canvasSize={canvasSize}
            onTaskTap={handleTaskTap}
          />
          
          {/* Center: Focus Core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <FocusCore
              state={coreState}
              urgency={urgency}
              onTap={handleCoreTap}
              onLongPress={handleCoreLongPress}
              onLongPressEnd={handleCoreLongPressEnd}
            />
          </div>
        </div>
      </SilenceMode>

      {/* Thought Input Overlay */}
      <ThoughtInput
        isVisible={state === 'inputting'}
        onSubmit={submitInput}
        onClose={closeInput}
      />

      {/* Voice Transcript */}
      <VoiceTranscript
        text={transcript}
        isListening={isTranscribing}
      />

      {/* AI Response */}
      <AIResponse
        isVisible={state === 'responding'}
        statement={aiResponse?.statement}
        actions={aiResponse?.actions}
        confidence={aiResponse?.confidence}
        onActionSelect={selectAction}
        onDismiss={() => useCanvasStore.getState().setState('idle')}
      />

      {/* Reflection State (Evening) */}
      <ReflectionState
        isVisible={state === 'reflecting'}
        insight="Today felt heavy because the scope was too large."
        onDismiss={dismissOverlay}
      />

      {/* Identity View (Weekly) */}
      <IdentityView
        isVisible={state === 'identity'}
        onClose={dismissOverlay}
      />

      {/* Error Toast */}
      <ErrorToast error={error} onDismiss={() => setError(null)} />

      {/* Minimal navigation hint */}
      <NavigationHint state={state} />
    </div>
  );
}

/**
 * Subtle ambient particles for depth — refined and minimal
 */
function AmbientParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 h-0.5 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: 'rgba(255, 255, 255, 0.15)',
          }}
          animate={{
            opacity: [0, 0.2, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 6,
            repeat: Infinity,
            delay: Math.random() * 10,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      ))}
    </div>
  );
}

/**
 * Minimal navigation hint
 */
function NavigationHint({ state }: { state: string }) {
  const showHint = state === 'idle';
  
  return (
    <AnimatePresence>
      {showHint && (
        <motion.div
          className="fixed bottom-10 inset-x-0 flex justify-center pointer-events-none"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ delay: 3, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className="flex items-center gap-8 text-[#6e6e73] text-[13px] font-normal tracking-[-0.008em]">
            <span>Tap to think</span>
            <span className="w-[3px] h-[3px] rounded-full bg-[#48484a]" />
            <span>Hold to speak</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Error toast notification — refined
 */
function ErrorToast({ 
  error, 
  onDismiss 
}: { 
  error: string | null; 
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onDismiss, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onDismiss]);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className="fixed top-10 inset-x-0 flex justify-center z-50"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <button
            onClick={onDismiss}
            className="px-5 py-3 rounded-full text-[15px] font-normal
                       bg-[rgba(255,69,58,0.12)] text-[#ff453a]
                       border border-[rgba(255,69,58,0.2)]
                       backdrop-blur-xl transition-all duration-200
                       hover:bg-[rgba(255,69,58,0.18)]"
          >
            {error}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default CognitiveCanvas;
