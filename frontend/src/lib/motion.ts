// Motion Design System
// Consistent animation values for the entire application

export const motion = {
  // Easing functions
  ease: {
    // Premium, smooth easing
    smooth: [0.25, 0.1, 0.25, 1] as const,
    // Snappy, energetic
    snappy: [0.4, 0, 0.2, 1] as const,
    // Bouncy, playful
    bouncy: [0.34, 1.56, 0.64, 1] as const,
    // Linear, constant
    linear: [0, 0, 1, 1] as const,
    // Ease in
    in: [0.4, 0, 1, 1] as const,
    // Ease out
    out: [0, 0, 0.2, 1] as const,
    // Ease in-out
    inOut: [0.4, 0, 0.2, 1] as const,
  },

  // Durations (in seconds)
  duration: {
    instant: 0.15,
    fast: 0.3,
    normal: 0.5,
    slow: 0.8,
    verySlow: 1.2,
  },

  // Delays (in seconds)
  delay: {
    none: 0,
    short: 0.1,
    normal: 0.2,
    long: 0.3,
    veryLong: 0.5,
  },

  // Stagger delays for children
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
    verySlow: 0.2,
  },

  // Spring configurations
  spring: {
    gentle: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
    snappy: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
    bouncy: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },

  // Common animation presets
  presets: {
    // Fade in
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },

    // Fade in up
    fadeInUp: {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    },

    // Fade in down
    fadeInDown: {
      initial: { opacity: 0, y: -20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },

    // Fade in left
    fadeInLeft: {
      initial: { opacity: 0, x: -20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: 20 },
    },

    // Fade in right
    fadeInRight: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
    },

    // Scale in
    scaleIn: {
      initial: { opacity: 0, scale: 0.9 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.9 },
    },

    // Slide up
    slideUp: {
      initial: { y: 100 },
      animate: { y: 0 },
      exit: { y: 100 },
    },

    // Slide down
    slideDown: {
      initial: { y: -100 },
      animate: { y: 0 },
      exit: { y: -100 },
    },
  },

  // Transition configurations
  transition: {
    default: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    },
    fast: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
    slow: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1],
    },
    bouncy: {
      type: 'spring',
      stiffness: 400,
      damping: 10,
    },
  },

  // Viewport configurations
  viewport: {
    once: true,
    margin: '-100px',
    amount: 0.3,
  },
} as const;

export type MotionEase = keyof typeof motion.ease;
export type MotionDuration = keyof typeof motion.duration;
export type MotionDelay = keyof typeof motion.delay;
export type MotionStagger = keyof typeof motion.stagger;
export type MotionPreset = keyof typeof motion.presets;
