'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

interface AnimatedChartProps {
  data: number[];
  labels?: string[];
  className?: string;
  color?: string;
  height?: number;
  type?: 'bar' | 'line' | 'area';
}

export function AnimatedChart({
  data,
  labels = [],
  className = '',
  color = '#7c3aed',
  height = 200,
  type = 'bar',
}: AnimatedChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const maxValue = Math.max(...data);
  const normalizedData = data.map(value => (value / maxValue) * 100);

  if (type === 'bar') {
    return (
      <div ref={ref} className={className} style={{ height }}>
        <div className="flex items-end justify-between h-full gap-2">
          {normalizedData.map((value, index) => (
            <motion.div
              key={index}
              className="flex-1 rounded-t-lg relative group"
              initial={{ height: 0 }}
              animate={isInView ? { height: `${value}%` } : { height: 0 }}
              transition={{
                duration: 0.8,
                delay: index * 0.1,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              style={{ backgroundColor: color }}
            >
              <motion.div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-surface-bg border border-border-subtle rounded px-2 py-1 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                initial={{ opacity: 0, y: 10 }}
                whileHover={{ opacity: 1, y: 0 }}
              >
                {data[index]}
              </motion.div>
              {labels[index] && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-text-secondary whitespace-nowrap">
                  {labels[index]}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'line') {
    const points = normalizedData.map((value, index) => {
      const denom = data.length > 1 ? data.length - 1 : 1;
      const x = (index / denom) * 100;
      const y = 100 - value;
      return `${isFinite(x) ? x : 0},${isFinite(y) ? y : 0}`;
    }).join(' ');

    return (
      <div ref={ref} className={className} style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <motion.path
            d={`M ${points}`}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          />
          {normalizedData.map((value, index) => {
            const denom = data.length > 1 ? data.length - 1 : 1;
            const cx = (index / denom) * 100;
            const cy = 100 - value;
            const safeCx = isFinite(cx) ? cx : 0;
            const safeCy = isFinite(cy) ? cy : 0;
            return (
              <motion.circle
                key={index}
                cx={safeCx}
                cy={safeCy}
                r="2"
                fill={color}
                initial={{ scale: 0 }}
                animate={isInView ? { scale: 1 } : { scale: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 1 + index * 0.1,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (type === 'area') {
    const points = normalizedData.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - value;
      return `${x},${y}`;
    }).join(' ');

    const areaPoints = `0,100 ${points} 100,100`;

    return (
      <div ref={ref} className={className} style={{ height }}>
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            d={`M ${areaPoints}`}
            fill={`url(#gradient-${color})`}
            initial={{ opacity: 0, pathLength: 0 }}
            animate={isInView ? { opacity: 1, pathLength: 1 } : { opacity: 0, pathLength: 0 }}
            transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          />
          <motion.path
            d={`M ${points}`}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={isInView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 1.5, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </svg>
      </div>
    );
  }

  return null;
}
