'use client';

import { useEffect, useState } from 'react';

export function PremiumCursor() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('mouseover', handleMouseOver);

    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      <div
        id="cursor-dot"
        className="fixed w-1.5 h-1.5 rounded-full bg-violet-primary pointer-events-none z-[99999] transition-transform duration-75"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div
        id="cursor-ring"
        className="fixed w-8 h-8 rounded-full border border-violet-border pointer-events-none z-[99998] transition-all duration-75"
        style={{
          left: mousePosition.x,
          top: mousePosition.y,
          transform: isHovering ? 'translate(-50%, -50%) scale(1.5)' : 'translate(-50%, -50%)',
          borderColor: isHovering ? 'rgba(124, 58, 237, 0.5)' : 'rgba(124, 58, 237, 0.22)',
        }}
      />
    </>
  );
}
