'use client';

import { useState } from 'react';

export function BentoGridFeatures() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  const features = [
    {
      icon: 'fa-solid fa-microchip',
      badge: 'ML Ensemble',
      badgeColor: 'violet',
      title: 'Précision 95%+',
      description: 'Combinaison de Random Forest, XGBoost et LightGBM pour une précision maximale.',
      image: '/assets/pictures/ml-ensemble.png',
      large: true
    },
    {
      icon: 'fa-solid fa-upload',
      badge: 'Upload',
      badgeColor: 'gold',
      title: 'Import Intelligent',
      description: 'Importez vos données financières en un clic. Excel, CSV et formats comptables.',
      image: '/assets/pictures/upload.png',
      large: false
    },
    {
      icon: 'fa-solid fa-bolt',
      badge: 'Rapidité',
      badgeColor: 'green',
      title: 'Analyse en 0.3s',
      description: 'Notre architecture optimisée analyse instantanément vos données.',
      image: '/assets/pictures/speed.png',
      large: false
    }
  ];

  return (
    <section className="features py-[130px]">
      <div className="container mx-auto px-7">
        {/* Header */}
        <div className="feat-header text-center max-w-[680px] mx-auto mb-20">
          <span className="section-tag inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[100px] text-[10.5px] font-bold uppercase tracking-[1.5px] mb-4.5" style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', color: 'var(--violet)' }}>
            Fonctionnalités
          </span>
          <h2 className="font-display font-bold text-[clamp(30px,3.5vw,52px)] tracking-tighter mb-4" style={{ color: 'var(--text)' }}>
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-[16.5px] mt-4.5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
            Une suite complète d'outils pour analyser, comprendre et agir sur la santé financière des entreprises.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid grid grid-cols-[1.6fr_1fr] gap-5.5 mb-5.5">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`bento-card relative overflow-hidden rounded-[22px] p-9.5 flex flex-col isolation-auto ${feature.large ? 'col-span-1' : ''}`}
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                animation: index === 0 ? 'floatBento1 6.5s ease-in-out infinite' : 'floatBento2 7.2s ease-in-out infinite'
              }}
              onMouseMove={(e) => handleMouseMove(e, index)}
            >
              {/* Spotlight Effect */}
              <div
                className="absolute inset-0 rounded-[22px] pointer-events-none opacity-0 transition-opacity duration-75"
                style={{
                  background: `radial-gradient(400px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(139,127,240,0.16), transparent 70%)`,
                  opacity: mousePosition.x > 0 ? 1 : 0
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                {/* Badge */}
                <div className={`fc-badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[100px] text-[10.5px] font-bold uppercase tracking-wider mb-4.5 ${feature.badgeColor === 'gold' ? 'fcb-gold' : feature.badgeColor === 'green' ? '' : ''}`}
                     style={{ background: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid var(--violet-border)' }}>
                  <i className={feature.icon} />
                  {feature.badge}
                </div>

                {/* Title */}
                <h3 className="fc-title font-display text-[19px] font-bold mb-2.5 leading-snug" style={{ color: 'var(--text)' }}>
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="fc-desc text-[13.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {feature.description}
                </p>

                {/* Image */}
                <div className="bento-img-wrap w-full h-[260px] mt-7 rounded-[14px] overflow-hidden border relative flex-shrink-0" style={{ background: 'var(--bg-alt)', border: '1px solid var(--border)' }}>
                  <div className="absolute inset-0 rounded-[14px]" style={{ background: 'linear-gradient(to top, var(--surface-card) 0%, transparent 40%)' }} />
                  <img src={feature.image} alt={feature.title} className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bento Details Row */}
        <div className="bento-details grid grid-cols-3 gap-5.5">
          {[
            { icon: 'fa-solid fa-chart-line', title: 'Explicabilité SHAP', desc: 'Comprenez chaque décision avec SHAP values' },
            { icon: 'fa-solid fa-file-pdf', title: 'Export PDF', desc: 'Rapports professionnels prêts à partager' },
            { icon: 'fa-solid fa-robot', title: 'Chat IA', desc: 'Assistant intelligent pour insights personnalisés' }
          ].map((item, index) => (
            <div
              key={index}
              className="bento-card relative overflow-hidden rounded-[22px] p-9.5 flex flex-col isolation-auto"
              style={{
                background: 'var(--surface-card)',
                border: '1px solid var(--border)',
                animation: `floatBento2 ${8 + index * 0.5}s ease-in-out infinite`
              }}
              onMouseMove={(e) => handleMouseMove(e, index)}
            >
              <div
                className="absolute inset-0 rounded-[22px] pointer-events-none opacity-0 transition-opacity duration-75"
                style={{
                  background: `radial-gradient(400px circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(139,127,240,0.16), transparent 70%)`,
                  opacity: mousePosition.x > 0 ? 1 : 0
                }}
              />
              <div className="relative z-10">
                <div className={`fi w-[46px] h-[46px] rounded-[12px] flex items-center justify-center mb-5.5 text-[19px] flex-shrink-0 ${index === 1 ? 'fi-gold' : index === 2 ? 'fi-green' : ''}`}
                     style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', color: 'var(--violet)' }}>
                  <i className={item.icon} />
                </div>
                <h3 className="fc-title font-display text-[19px] font-bold mb-2.5 leading-snug" style={{ color: 'var(--text)' }}>
                  {item.title}
                </h3>
                <p className="fc-desc text-[13.5px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes floatBento1 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }
        @keyframes floatBento2 {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .bento-card:hover {
          animation-play-state: paused;
          transform: translateY(-5px);
          box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 25px rgba(139, 127, 240, 0.22), 0 0 0 1px var(--violet-border);
        }
        .fcb-gold {
          background: var(--gold-soft) !important;
          color: var(--gold) !important;
          border-color: var(--gold-border) !important;
        }
        .fi-gold {
          background: var(--gold-soft) !important;
          border-color: var(--gold-border) !important;
          color: var(--gold) !important;
        }
        .fi-green {
          background: rgba(16,185,129,0.08) !important;
          border-color: rgba(16,185,129,0.22) !important;
          color: #10b981 !important;
        }
      `}</style>
    </section>
  );
}
