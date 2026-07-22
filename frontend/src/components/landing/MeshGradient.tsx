'use client';

import { motion } from 'framer-motion';

interface MeshGradientProps {
  className?: string;
  variant?: 'violet' | 'blue' | 'sunset' | 'aurora';
  intensity?: 'low' | 'medium' | 'high';
}

const gradientConfigs = {
  violet: {
    colors: [
      'rgba(124, 58, 237, 0.4)',
      'rgba(139, 92, 246, 0.3)',
      'rgba(167, 139, 250, 0.2)',
      'rgba(192, 132, 252, 0.15)',
    ],
    positions: [
      { x: '0%', y: '0%' },
      { x: '100%', y: '0%' },
      { x: '0%', y: '100%' },
      { x: '100%', y: '100%' },
    ],
  },
  blue: {
    colors: [
      'rgba(59, 130, 246, 0.4)',
      'rgba(99, 102, 241, 0.3)',
      'rgba(129, 140, 248, 0.2)',
      'rgba(147, 197, 253, 0.15)',
    ],
    positions: [
      { x: '0%', y: '0%' },
      { x: '100%', y: '0%' },
      { x: '0%', y: '100%' },
      { x: '100%', y: '100%' },
    ],
  },
  sunset: {
    colors: [
      'rgba(249, 115, 22, 0.4)',
      'rgba(234, 88, 12, 0.3)',
      'rgba(251, 146, 60, 0.2)',
      'rgba(253, 186, 116, 0.15)',
    ],
    positions: [
      { x: '0%', y: '0%' },
      { x: '100%', y: '0%' },
      { x: '0%', y: '100%' },
      { x: '100%', y: '100%' },
    ],
  },
  aurora: {
    colors: [
      'rgba(16, 185, 129, 0.4)',
      'rgba(34, 197, 94, 0.3)',
      'rgba(52, 211, 153, 0.2)',
      'rgba(110, 231, 183, 0.15)',
    ],
    positions: [
      { x: '0%', y: '0%' },
      { x: '100%', y: '0%' },
      { x: '0%', y: '100%' },
      { x: '100%', y: '100%' },
    ],
  },
};

const intensityMultipliers = {
  low: 0.5,
  medium: 1,
  high: 1.5,
};

export function MeshGradient({ 
  className = '', 
  variant = 'violet',
  intensity = 'medium'
}: MeshGradientProps) {
  const config = gradientConfigs[variant];
  const multiplier = intensityMultipliers[intensity];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`noise-${variant}`} x="0" y="0">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          {config.colors.map((color, index) => (
            <radialGradient
              key={index}
              id={`gradient-${variant}-${index}`}
              cx={config.positions[index].x}
              cy={config.positions[index].y}
              r="60%"
            >
              <stop offset="0%" stopColor={color} stopOpacity={multiplier} />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>
        
        {config.colors.map((_, index) => (
          <motion.circle
            key={index}
            r="50"
            fill={`url(#gradient-${variant}-${index})`}
            animate={{
              cx: [
                config.positions[index].x,
                `${parseFloat(config.positions[index].x) + (Math.random() - 0.5) * 30}%`,
                config.positions[index].x,
              ],
              cy: [
                config.positions[index].y,
                `${parseFloat(config.positions[index].y) + (Math.random() - 0.5) * 30}%`,
                config.positions[index].y,
              ],
            }}
            transition={{
              duration: 8 + index * 2,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
            }}
          />
        ))}
        
        <rect
          width="100%"
          height="100%"
          fill="transparent"
          filter={`url(#noise-${variant})`}
          opacity="0.03"
        />
      </svg>
    </div>
  );
}
