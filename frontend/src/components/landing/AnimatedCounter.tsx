'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 2,
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hasAnimated, setHasAnimated] = useState(false);
  const [currentValue, setCurrentValue] = useState(0);

  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration, bounce: 0 });

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      setCurrentValue(Math.round(latest));
    });
    return unsubscribe;
  }, [spring]);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      motionValue.set(value);
      setHasAnimated(true);
    }
  }, [isInView, motionValue, value, hasAnimated]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {currentValue.toLocaleString()}
      {suffix}
    </motion.span>
  );
}
