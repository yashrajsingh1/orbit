import { motion } from 'framer-motion'
import { Task } from '@/types'
import { useTaskStore } from '@/stores/taskStore'

interface TaskOrbitProps {
  tasks: Task[]
}

/**
 * TASK ORBIT
 * 
 * Tasks float around the Focus Node based on:
 * - Priority (closer = higher priority)
 * - Energy required (visual indicator)
 * - Status (in-progress has special styling)
 * 
 * Philosophy:
 * - Tasks drift naturally
 * - Priority affects orbital distance
 * - Clicking pulls task into focus
 */
export function TaskOrbit({ tasks }: TaskOrbitProps) {
  if (tasks.length === 0) return null

  return (
    <div className="absolute inset-0 pointer-events-none">
      {tasks.slice(0, 8).map((task, index) => (
        <OrbitingTask
          key={task.id}
          task={task}
          index={index}
          total={Math.min(tasks.length, 8)}
        />
      ))}
    </div>
  )
}

interface OrbitingTaskProps {
  task: Task
  index: number
  total: number
}

function OrbitingTask({ task, index, total }: OrbitingTaskProps) {
  const setFocusedTask = useTaskStore((s) => s.setFocusedTask)
  const startTask = useTaskStore((s) => s.startTask)

  // Calculate position based on index and orbital distance
  const angle = (index / total) * 2 * Math.PI
  const baseRadius = 180 // Base distance from center
  const radius = baseRadius + (task.orbital_distance * 40) // Adjust by priority
  
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius

  // Energy-based styling
  const energyColors: Record<string, string> = {
    low: 'bg-orbit-calm/20 border-orbit-calm/30',
    medium: 'bg-orbit-focus/20 border-orbit-focus/30',
    high: 'bg-orbit-energy/20 border-orbit-energy/30',
  }

  const isInProgress = task.status === 'in_progress'

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 pointer-events-auto"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{
        opacity: 1,
        scale: 1,
        x: x - 60, // Center the 120px wide element
        y: y - 30, // Center the ~60px tall element
      }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
      }}
    >
      <motion.button
        className={`
          task-orbit
          w-[120px] px-3 py-2 rounded-xl
          glass-subtle
          border
          ${energyColors[task.energy_required] || energyColors.medium}
          ${isInProgress ? 'ring-2 ring-orbit-focus/50' : ''}
          transition-all duration-200
          cursor-pointer
          hover:scale-105
        `}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (task.status === 'pending') {
            startTask(task.id)
          }
          setFocusedTask(task)
        }}
        // Gentle floating animation
        animate={{
          y: [0, -5, 0],
        }}
        transition={{
          duration: 3 + index * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <p className="text-xs font-medium text-orbit-text truncate">
          {task.title}
        </p>
        
        <div className="flex items-center gap-1 mt-1">
          {/* Time estimate */}
          {task.estimated_minutes && (
            <span className="text-[10px] text-orbit-muted">
              {task.estimated_minutes}m
            </span>
          )}
          
          {/* Status indicator */}
          {isInProgress && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-orbit-focus"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          
          {/* Energy indicator */}
          <EnergyDots energy={task.energy_required} />
        </div>
      </motion.button>
    </motion.div>
  )
}

function EnergyDots({ energy }: { energy: string }) {
  const levels = { low: 1, medium: 2, high: 3 }
  const count = levels[energy as keyof typeof levels] || 2

  return (
    <div className="flex gap-0.5 ml-auto">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`
            w-1 h-1 rounded-full
            ${i < count ? 'bg-orbit-muted' : 'bg-orbit-border/30'}
          `}
        />
      ))}
    </div>
  )
}
