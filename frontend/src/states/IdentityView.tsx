/**
 * ORBIT Identity View
 * 
 * Weekly self-awareness view.
 * Visualized as lines, fields, gradients — not numbers.
 * Feels like self-awareness, not analytics.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface IdentityMetric {
  label: string;
  trend: 'rising' | 'stable' | 'falling';
  strength: number; // 0-1
}

interface IdentityViewProps {
  isVisible: boolean;
  metrics?: IdentityMetric[];
  onClose?: () => void;
}

export function IdentityView({ 
  isVisible, 
  metrics = [],
  onClose 
}: IdentityViewProps) {
  const defaultMetrics: IdentityMetric[] = metrics.length > 0 ? metrics : [
    { label: 'Consistency', trend: 'rising', strength: 0.7 },
    { label: 'Focus Duration', trend: 'stable', strength: 0.6 },
    { label: 'Planning Accuracy', trend: 'rising', strength: 0.5 },
    { label: 'Completion Rate', trend: 'falling', strength: 0.4 },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-50"
          style={{ backgroundColor: '#000000' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Close button */}
          <motion.button
            className="absolute top-6 right-6 z-10 p-3 rounded-full transition-colors"
            style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: '#6e6e73' }}>
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </motion.button>

          {/* Background gradient waves */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 50% at 50% 120%, rgba(10, 132, 255, 0.08) 0%, transparent 50%),
                  radial-gradient(ellipse 60% 40% at 30% 80%, rgba(100, 210, 255, 0.05) 0%, transparent 40%),
                  radial-gradient(ellipse 50% 30% at 70% 90%, rgba(10, 132, 255, 0.06) 0%, transparent 30%)
                `,
              }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            />
          </div>

          {/* Content */}
          <div className="relative h-full flex flex-col items-center justify-center px-10">
            {/* Title */}
            <motion.div
              className="mb-16 text-center"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <h1 
                className="text-[28px] font-light mb-3"
                style={{ color: '#f5f5f7', letterSpacing: '-0.024em' }}
              >
                Who You're Becoming
              </h1>
              <p 
                className="text-[13px]"
                style={{ color: '#6e6e73', letterSpacing: '-0.01em' }}
              >
                This week's cognitive patterns
              </p>
            </motion.div>

            {/* Metrics as abstract visualization */}
            <div className="w-full max-w-2xl space-y-12">
              {defaultMetrics.map((metric, index) => (
                <MetricWave
                  key={metric.label}
                  metric={metric}
                  index={index}
                />
              ))}
            </div>

            {/* Insight */}
            <motion.p
              className="mt-16 text-center max-w-md font-light text-[15px]"
              style={{ color: '#a1a1a6', letterSpacing: '-0.01em' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6 }}
            >
              You're finding a rhythm. The consistency shows.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface MetricWaveProps {
  metric: IdentityMetric;
  index: number;
}

function MetricWave({ metric, index }: MetricWaveProps) {
  const trendColors = {
    rising: 'rgba(48, 209, 88, 0.35)',
    stable: 'rgba(10, 132, 255, 0.35)',
    falling: 'rgba(255, 159, 10, 0.35)',
  };

  const trendEndColors = {
    rising: 'rgba(48, 209, 88, 0.08)',
    stable: 'rgba(10, 132, 255, 0.08)',
    falling: 'rgba(255, 159, 10, 0.08)',
  };

  const trendTextColors = {
    rising: '#30d158',
    stable: '#0a84ff',
    falling: '#ff9f0a',
  };

  const trendIcons = {
    rising: '↗',
    stable: '→',
    falling: '↘',
  };

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.55 + index * 0.12, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <span 
          className="text-[13px] font-light"
          style={{ color: '#a1a1a6', letterSpacing: '-0.01em' }}
        >
          {metric.label}
        </span>
        <span 
          className="text-[13px]"
          style={{ color: trendTextColors[metric.trend], opacity: 0.7 }}
        >
          {trendIcons[metric.trend]}
        </span>
      </div>

      {/* Wave visualization */}
      <div 
        className="relative h-14 rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)' }}
      >
        {/* Gradient fill based on strength */}
        <motion.div
          className="absolute inset-y-0 left-0"
          style={{
            background: `linear-gradient(to right, ${trendColors[metric.trend]}, ${trendEndColors[metric.trend]})`
          }}
          initial={{ width: 0 }}
          animate={{ width: `${metric.strength * 100}%` }}
          transition={{ 
            delay: 0.85 + index * 0.12, 
            duration: 1.4,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />

        {/* Wave pattern overlay */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-25"
          preserveAspectRatio="none"
          viewBox="0 0 200 50"
        >
          <motion.path
            d="M0 25 Q 25 10, 50 25 T 100 25 T 150 25 T 200 25"
            fill="none"
            stroke="white"
            strokeWidth="0.8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 1.1 + index * 0.12, duration: 1.6 }}
          />
        </svg>

        {/* Animated particles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 rounded-full"
            style={{
              left: `${metric.strength * 100 - 8 + i * 4}%`,
              top: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.25)',
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: 1.6 + i * 0.18,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default IdentityView;
