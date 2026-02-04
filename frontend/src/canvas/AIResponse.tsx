/**
 * ORBIT AI Response
 * 
 * Not chat. Not text walls.
 * Decision statements + action visualization + confidence signals.
 * Clean, minimal design.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ActionNode {
  id: string;
  title: string;
  estimatedMinutes?: number;
}

interface AIResponseProps {
  isVisible: boolean;
  statement?: string; // "Let's reduce this to one small step."
  actions?: ActionNode[];
  confidence?: string; // "Based on your past patterns"
  onActionSelect?: (actionId: string) => void;
  onDismiss?: () => void;
}

export function AIResponse({
  isVisible,
  statement,
  actions = [],
  confidence,
  onActionSelect,
  onDismiss,
}: AIResponseProps) {
  const [showConfidence, setShowConfidence] = useState(false);

  // Delayed confidence reveal
  useEffect(() => {
    if (isVisible && confidence) {
      const timer = setTimeout(() => setShowConfidence(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowConfidence(false);
    }
  }, [isVisible, confidence]);

  // Auto-dismiss after inactivity
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => onDismiss?.(), 12000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onDismiss]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-center pb-36 px-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Decision Statement */}
          {statement && (
            <motion.div
              className="mb-10"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <p className="text-2xl text-[#f5f5f7] font-light text-center max-w-md tracking-[-0.024em] leading-[1.2]">
                {statement}
              </p>
            </motion.div>
          )}

          {/* Action Nodes */}
          {actions.length > 0 && (
            <motion.div
              className="flex items-center justify-center gap-5 flex-wrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
            >
              {actions.map((action, index) => (
                <ActionNodeComponent
                  key={action.id}
                  action={action}
                  index={index}
                  onSelect={() => onActionSelect?.(action.id)}
                />
              ))}
            </motion.div>
          )}

          {/* Confidence Signal */}
          <AnimatePresence>
            {showConfidence && confidence && (
              <motion.p
                className="mt-10 text-[13px] text-[#6e6e73] font-light tracking-[-0.01em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {confidence}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ActionNodeComponentProps {
  action: ActionNode;
  index: number;
  onSelect: () => void;
}

function ActionNodeComponent({ action, index, onSelect }: ActionNodeComponentProps) {
  return (
    <motion.button
      className="group relative"
      initial={{ opacity: 0, scale: 0.9, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        delay: 0.45 + index * 0.12,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onClick={onSelect}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Glow */}
      <motion.div
        className="absolute inset-0 -m-2 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(10, 132, 255, 0.15)' }}
      />
      
      {/* Node */}
      <div className="
        relative px-6 py-4 
        bg-[rgba(28,28,30,0.8)] backdrop-blur-xl 
        border border-[rgba(255,255,255,0.08)] 
        rounded-2xl
        group-hover:border-[rgba(10,132,255,0.3)]
        transition-all duration-300
      "
      style={{ backdropFilter: 'saturate(180%) blur(20px)' }}
      >
        {/* Connection dot */}
        <div 
          className="absolute -left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: 'rgba(10, 132, 255, 0.6)' }}
        />
        
        <p className="text-[#f5f5f7] font-light text-[15px] tracking-[-0.01em]">
          {action.title}
        </p>
        
        {action.estimatedMinutes && (
          <p className="text-[#6e6e73] text-[11px] mt-1.5 tracking-[-0.01em]">
            ~{action.estimatedMinutes} min
          </p>
        )}
      </div>
      
      {/* Connection line to next */}
      {index < 2 && (
        <motion.div
          className="absolute -right-5 top-1/2 w-5 h-px"
          style={{ 
            background: 'linear-gradient(to right, rgba(10, 132, 255, 0.25), transparent)' 
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.6 + index * 0.12, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        />
      )}
    </motion.button>
  );
}

export default AIResponse;
