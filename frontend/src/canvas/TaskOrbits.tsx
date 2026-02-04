/**
 * ORBIT Task Orbit
 * 
 * Tasks as floating nodes with "Priority Gravity"
 * - Important ones drift closer to center
 * - Ignored ones slowly fade and sink
 * - Completed ones dissolve gracefully
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

export interface TaskNode {
  id: string;
  title: string;
  priority: number; // 0-1, affects distance from center
  urgency: number; // 0-1, affects glow
  age: number; // hours since created, affects opacity
  status: 'active' | 'completing' | 'fading';
}

interface TaskOrbitsProps {
  tasks: TaskNode[];
  onTaskTap?: (taskId: string) => void;
  canvasSize: { width: number; height: number };
}

export function TaskOrbits({ tasks, onTaskTap, canvasSize }: TaskOrbitsProps) {
  // Calculate positions based on priority (closer = higher priority)
  const positionedTasks = useMemo(() => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    // Minimum and maximum orbit radius
    const minRadius = 120;
    const maxRadius = Math.min(canvasSize.width, canvasSize.height) * 0.4;
    
    return tasks.map((task, index) => {
      // Distance from center based on inverse priority
      const radius = minRadius + (1 - task.priority) * (maxRadius - minRadius);
      
      // Distribute tasks around the center
      // Use golden angle for natural distribution
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const angle = index * goldenAngle + (task.id.charCodeAt(0) * 0.1);
      
      // Add slight randomness for organic feel
      const jitterX = Math.sin(index * 7.3) * 20;
      const jitterY = Math.cos(index * 11.7) * 20;
      
      const x = centerX + Math.cos(angle) * radius + jitterX;
      const y = centerY + Math.sin(angle) * radius + jitterY;
      
      // Opacity based on age (older = more faded)
      const ageOpacity = Math.max(0.3, 1 - (task.age / 168)); // Fade over a week
      
      return {
        ...task,
        x,
        y,
        opacity: task.status === 'fading' ? 0.2 : ageOpacity,
      };
    });
  }, [tasks, canvasSize]);

  return (
    <div className="absolute inset-0 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {positionedTasks.map((task) => (
          <TaskNodeComponent
            key={task.id}
            task={task}
            onTap={() => onTaskTap?.(task.id)}
          />
        ))}
      </AnimatePresence>
      
      {/* Connection lines (subtle) */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(10, 132, 255, 0)" />
            <stop offset="50%" stopColor="rgba(10, 132, 255, 0.08)" />
            <stop offset="100%" stopColor="rgba(10, 132, 255, 0)" />
          </linearGradient>
        </defs>
        
        {positionedTasks.slice(0, 5).map((task, i) => {
          const nextTask = positionedTasks[(i + 1) % positionedTasks.length];
          if (!nextTask || positionedTasks.length < 2) return null;
          
          return (
            <motion.line
              key={`line-${task.id}`}
              x1={task.x}
              y1={task.y}
              x2={nextTask.x}
              y2={nextTask.y}
              stroke="url(#lineGradient)"
              strokeWidth="1"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.25 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
            />
          );
        })}
      </svg>
    </div>
  );
}

interface TaskNodeComponentProps {
  task: TaskNode & { x: number; y: number; opacity: number };
  onTap: () => void;
}

function TaskNodeComponent({ task, onTap }: TaskNodeComponentProps) {
  const nodeSize = 12 + task.priority * 8; // 12-20px based on priority
  
  return (
    <motion.div
      className="absolute pointer-events-auto cursor-pointer group"
      style={{
        left: task.x,
        top: task.y,
        transform: 'translate(-50%, -50%)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: task.status === 'completing' ? [1, 1.5, 0] : 1,
        opacity: task.status === 'completing' ? [task.opacity, 1, 0] : task.opacity,
        x: [0, Math.random() * 4 - 2, 0],
        y: [0, Math.random() * 4 - 2, 0],
      }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        scale: { duration: task.status === 'completing' ? 0.8 : 0.5 },
        opacity: { duration: task.status === 'completing' ? 0.8 : 0.3 },
        x: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
        y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
      }}
      onClick={onTap}
      whileHover={{ scale: 1.2 }}
      whileTap={{ scale: 0.9 }}
    >
      {/* Glow based on urgency */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: nodeSize * 3,
          height: nodeSize * 3,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          background: `radial-gradient(circle, rgba(10, 132, 255, ${task.urgency * 0.25}) 0%, transparent 70%)`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2.5 + task.urgency,
          repeat: Infinity,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      />
      
      {/* Node core */}
      <motion.div
        className="relative rounded-full"
        style={{
          width: nodeSize,
          height: nodeSize,
          background: `linear-gradient(135deg, 
            rgba(100, 210, 255, ${0.5 + task.urgency * 0.4}) 0%, 
            rgba(10, 132, 255, ${0.3 + task.urgency * 0.4}) 100%
          )`,
          boxShadow: `
            0 0 ${8 * task.urgency}px rgba(10, 132, 255, ${task.urgency * 0.4}),
            inset 0 0 ${nodeSize / 3}px rgba(255, 255, 255, 0.15)
          `,
        }}
      />
      
      {/* Label on hover */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
        style={{ top: nodeSize + 8 }}
        initial={{ opacity: 0, y: -4 }}
        whileHover={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div 
          className="px-3 py-1.5 rounded-xl border"
          style={{ 
            backgroundColor: 'rgba(28, 28, 30, 0.85)',
            backdropFilter: 'saturate(180%) blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <span className="text-[11px] text-[#f5f5f7] font-light tracking-[-0.01em]">
            {task.title}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default TaskOrbits;
