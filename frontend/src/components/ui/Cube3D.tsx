import React from 'react';

interface Cube3DProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Cube3D: React.FC<Cube3DProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: 'w-10 h-10',
    md: 'w-20 h-20',
    lg: 'w-40 h-40',
  };

  const translate = {
    sm: 'translateZ(20px)',
    md: 'translateZ(40px)',
    lg: 'translateZ(80px)',
  };

  const sizeClass = dimensions[size];
  const translateZ = translate[size];

  return (
    <div className={`cube-wrap ${sizeClass} ${className}`} style={{ perspective: '1000px' }}>
      <div className="cube w-full h-full relative" style={{ transformStyle: 'preserve-3d' }}>
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/20 backdrop-blur-sm"
             style={{ transform: `rotateY(0deg) ${translateZ}` }}>
          <div className="w-1/2 h-1/2 rounded-full bg-brand-violet shadow-[0_0_15px_rgba(109,78,219,0.8)]" />
        </div>
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/10 backdrop-blur-sm"
             style={{ transform: `rotateY(180deg) ${translateZ}` }} />
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/10 backdrop-blur-sm"
             style={{ transform: `rotateY(90deg) ${translateZ}` }} />
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/10 backdrop-blur-sm"
             style={{ transform: `rotateY(-90deg) ${translateZ}` }} />
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/10 backdrop-blur-sm"
             style={{ transform: `rotateX(90deg) ${translateZ}` }} />
        <div className="face absolute w-full h-full border border-brand-violet/30 flex items-center justify-center bg-brand-violet/10 backdrop-blur-sm"
             style={{ transform: `rotateX(-90deg) ${translateZ}` }} />
      </div>

      <style jsx>{`
        .cube {
          animation: spin 20s linear infinite;
        }
        @keyframes spin {
          from { transform: rotateX(0deg) rotateY(0deg); }
          to { transform: rotateX(360deg) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
};
