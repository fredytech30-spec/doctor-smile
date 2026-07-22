'use client';

import { motion, useScroll, useTransform, useMotionValue, MotionValue } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface ParallaxContainerProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  offset?: number;
}

export function ParallaxContainer({
  children,
  className = '',
  speed = 0.5,
  offset = 0,
}: ParallaxContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [offset, offset * -1 * speed]);

  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

interface MouseFollowerProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  smoothing?: number;
}

export function MouseFollower({
  children,
  className = '',
  intensity = 20,
  smoothing = 0.1,
}: MouseFollowerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    mouseX.set((e.clientX - centerX) / rect.width * intensity);
    mouseY.set((e.clientY - centerY) / rect.height * intensity);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const rotateX = useTransform(mouseY, [-intensity, intensity], [intensity, -intensity]);
  const rotateY = useTransform(mouseX, [-intensity, intensity], [-intensity, intensity]);

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      transition={{
        type: 'spring',
        stiffness: 1 / smoothing,
        damping: 20,
      }}
    >
      {children}
    </motion.div>
  );
}
