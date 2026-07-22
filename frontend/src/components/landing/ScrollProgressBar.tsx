'use client';

import { useEffect, useState } from 'react';

export function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = (scrollTop / docHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', updateScrollProgress);
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div
      id="scroll-bar"
      className="fixed top-0 left-0 h-0.5 z-[9999]"
      style={{
        width: `${scrollProgress}%`,
        background: 'linear-gradient(90deg, #8B7FF0, #F0D078)',
      }}
    />
  );
}
