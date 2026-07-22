'use client';

import { motion } from 'framer-motion';

interface TechnicalGridProps {
  className?: string;
  opacity?: number;
}

export function TechnicalGrid({ className = '', opacity = 0.08 }: TechnicalGridProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-black" />
      </svg>
    </div>
  );
}

interface DotsGridProps {
  className?: string;
  opacity?: number;
}

export function DotsGrid({ className = '', opacity = 0.1 }: DotsGridProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dots"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx="2"
              cy="2"
              r="1"
              fill="currentColor"
              opacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" className="text-black" />
      </svg>
    </div>
  );
}

interface HexGridProps {
  className?: string;
  opacity?: number;
}

export function HexGrid({ className = '', opacity = 0.05 }: HexGridProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hex"
            width="30"
            height="52"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(0.5)"
          >
            <path
              d="M15 0 L30 8.66 L30 25.98 L15 34.64 L0 25.98 L0 8.66 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity={opacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex)" className="text-black" />
      </svg>
    </div>
  );
}
