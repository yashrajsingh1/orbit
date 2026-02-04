/**
 * ORBIT Motion Presets
 * 
 * Consistent animation configurations across the app.
 * Rules: Easing > speed. No bounce, no gimmicks.
 */

import { Variants, Transition } from 'framer-motion';

// ============================================================================
// TIMING CONSTANTS
// ============================================================================

export const TIMING = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  slowest: 1.2,
  breathing: 4,
} as const;

// ============================================================================
// EASING CURVES
// ============================================================================

// Smooth, organic easing - never bouncy
export const EASING = {
  // Standard ease - most common
  smooth: [0.25, 0.46, 0.45, 0.94],
  
  // Gentle entry
  easeOut: [0.22, 1, 0.36, 1],
  
  // Gentle exit
  easeIn: [0.55, 0, 1, 0.45],
  
  // Symmetrical
  easeInOut: [0.65, 0, 0.35, 1],
  
  // Breathing motion (slow, rhythmic)
  breathing: [0.4, 0, 0.6, 1],
  
  // Anticipation (slight pullback)
  anticipate: [0.68, -0.1, 0.32, 1.1],
} as const;

// ============================================================================
// SPRING CONFIGS
// ============================================================================

export const SPRING = {
  // Soft, gentle spring
  gentle: {
    type: 'spring' as const,
    damping: 25,
    stiffness: 200,
  },
  
  // Responsive but not bouncy
  responsive: {
    type: 'spring' as const,
    damping: 30,
    stiffness: 300,
  },
  
  // Quick snap
  snappy: {
    type: 'spring' as const,
    damping: 35,
    stiffness: 400,
  },
  
  // Slow, floaty
  floaty: {
    type: 'spring' as const,
    damping: 20,
    stiffness: 100,
  },
} as const;

// ============================================================================
// COMMON TRANSITIONS
// ============================================================================

export const TRANSITIONS: Record<string, Transition> = {
  // Default transition
  default: {
    duration: TIMING.normal,
    ease: EASING.smooth,
  },
  
  // For appearing elements
  appear: {
    duration: TIMING.slow,
    ease: EASING.easeOut,
  },
  
  // For disappearing elements
  disappear: {
    duration: TIMING.fast,
    ease: EASING.easeIn,
  },
  
  // For breathing animations
  breathing: {
    duration: TIMING.breathing,
    ease: EASING.breathing,
    repeat: Infinity,
  },
  
  // For hover effects
  hover: {
    duration: TIMING.fast,
    ease: EASING.smooth,
  },
  
  // For tap/click feedback
  tap: {
    duration: TIMING.instant,
    ease: EASING.smooth,
  },
};

// ============================================================================
// VARIANT PRESETS
// ============================================================================

// Fade in/out
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: TRANSITIONS.appear,
  },
  exit: { 
    opacity: 0,
    transition: TRANSITIONS.disappear,
  },
};

// Scale in/out
export const scaleVariants: Variants = {
  hidden: { 
    opacity: 0, 
    scale: 0.9,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: TRANSITIONS.appear,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: TRANSITIONS.disappear,
  },
};

// Slide up
export const slideUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: TRANSITIONS.appear,
  },
  exit: { 
    opacity: 0, 
    y: 10,
    transition: TRANSITIONS.disappear,
  },
};

// Slide down (for dropdowns, menus)
export const slideDownVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -10,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: TRANSITIONS.appear,
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: TRANSITIONS.disappear,
  },
};

// Stagger children
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// ============================================================================
// BREATHING ANIMATIONS
// ============================================================================

export const breathingScale = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: TIMING.breathing,
      ease: EASING.breathing,
      repeat: Infinity,
    },
  },
};

export const breathingOpacity = {
  initial: { opacity: 0.6 },
  animate: {
    opacity: [0.6, 0.9, 0.6],
    transition: {
      duration: TIMING.breathing,
      ease: EASING.breathing,
      repeat: Infinity,
    },
  },
};

export const breathingGlow = {
  initial: { 
    boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)' 
  },
  animate: {
    boxShadow: [
      '0 0 20px rgba(99, 102, 241, 0.3)',
      '0 0 40px rgba(99, 102, 241, 0.5)',
      '0 0 20px rgba(99, 102, 241, 0.3)',
    ],
    transition: {
      duration: TIMING.breathing,
      ease: EASING.breathing,
      repeat: Infinity,
    },
  },
};

// ============================================================================
// INTERACTION FEEDBACK
// ============================================================================

export const hoverScale = {
  whileHover: { 
    scale: 1.02,
    transition: TRANSITIONS.hover,
  },
};

export const tapScale = {
  whileTap: { 
    scale: 0.98,
    transition: TRANSITIONS.tap,
  },
};

export const hoverGlow = {
  whileHover: {
    boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)',
    transition: TRANSITIONS.hover,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a delayed variant
 */
export function withDelay(variants: Variants, delay: number): Variants {
  return {
    ...variants,
    visible: {
      ...variants.visible,
      transition: {
        ...(variants.visible as any)?.transition,
        delay,
      },
    },
  };
}

/**
 * Create staggered children transition
 */
export function stagger(staggerTime: number = 0.1): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerTime,
      },
    },
  };
}
