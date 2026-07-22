'use client';

import { motion } from 'framer-motion';

interface AnimatedBlobsProps {
  className?: string;
  variant?: 'hero' | 'section' | 'subtle';
}

const blobVariants = {
  hero: [
    {
      x: [0, 100, 0, -100, 0],
      y: [0, -50, 50, -30, 0],
      scale: [1, 1.2, 0.9, 1.1, 1],
      rotate: [0, 90, 180, 270, 360],
    },
  ],
  section: [
    {
      x: [0, 50, 0, -50, 0],
      y: [0, 30, -30, 20, 0],
      scale: [1, 1.1, 0.95, 1.05, 1],
    },
  ],
  subtle: [
    {
      x: [0, 20, 0, -20, 0],
      y: [0, 15, -15, 10, 0],
      scale: [1, 1.05, 0.98, 1.02, 1],
    },
  ],
};

const blobColors = {
  hero: [
    'from-violet-primary/30 to-violet-secondary/30',
    'from-violet-primary/20 to-violet-secondary/20',
    'from-violet-primary/25 to-violet-secondary/25',
  ],
  section: [
    'from-violet-primary/15 to-violet-secondary/15',
    'from-violet-primary/10 to-violet-secondary/10',
  ],
  subtle: [
    'from-violet-primary/8 to-violet-secondary/8',
    'from-violet-primary/5 to-violet-secondary/5',
  ],
};

export function AnimatedBlobs({ className = '', variant = 'hero' }: AnimatedBlobsProps) {
  const colors = blobColors[variant];
  const animation = blobVariants[variant][0]; // Take the first element
  const duration = variant === 'hero' ? 20 : variant === 'section' ? 15 : 25;

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <motion.div
        animate={animation}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-gradient-to-br blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(124, 58, 237, 0.3) 0%, rgba(139, 92, 246, 0.1) 70%, transparent 100%)`,
        }}
      />
      <motion.div
        animate={animation}
        transition={{
          duration: duration * 1.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-gradient-to-br blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, rgba(124, 58, 237, 0.08) 70%, transparent 100%)`,
        }}
      />
      <motion.div
        animate={animation}
        transition={{
          duration: duration * 0.8,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 4,
        }}
        className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full bg-gradient-to-br blur-3xl"
        style={{
          background: `radial-gradient(circle, rgba(167, 139, 250, 0.2) 0%, rgba(124, 58, 237, 0.05) 70%, transparent 100%)`,
        }}
      />
    </div>
  );
}
