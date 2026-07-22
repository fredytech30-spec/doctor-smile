'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  liftAmount?: number;
  scaleAmount?: number;
  glowColor?: string;
  borderColor?: string;
}

export function HoverCard({
  children,
  className = '',
  liftAmount = -8,
  scaleAmount = 1.02,
  glowColor = 'rgba(124, 58, 237, 0.3)',
  borderColor = 'rgba(124, 58, 237, 0.5)',
}: HoverCardProps) {
  return (
    <motion.div
      className={`relative ${className}`}
      whileHover={{
        y: liftAmount,
        scale: scaleAmount,
        boxShadow: `0 20px 40px -10px ${glowColor}`,
        borderColor,
        transition: {
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1],
        },
      }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5 }}
      style={{
        boxShadow: `0 0 0 0 ${glowColor}`,
      }}
    >
      {children}
    </motion.div>
  );
}
