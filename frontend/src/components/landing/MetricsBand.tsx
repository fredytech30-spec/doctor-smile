'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Globe, Users, TrendingUp, Award } from 'lucide-react';

function CountUp({ end, suffix = '', duration = 1800 }: { end: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !startedRef.current) {
        startedRef.current = true;
        let start: number | null = null;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setVal(Math.round(end * ease));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

const metrics = [
  {
    icon: Target,
    value: 95, suffix: '%+',
    label: 'Précision ML',
    sub: 'Random Forest · XGBoost · LightGBM',
    color: 'var(--violet)',
    bg: 'var(--violet-soft)',
    border: 'var(--violet-border)',
  },
  {
    icon: Zap,
    value: 0, suffix: '.3s',
    label: 'Temps de traitement',
    sub: 'Analyse complète d\'un bilan',
    color: 'var(--gold-strong)',
    bg: 'rgba(212,175,55,0.08)',
    border: 'rgba(212,175,55,0.2)',
  },
  {
    icon: Users,
    value: 150, suffix: '+',
    label: 'Analystes actifs',
    sub: 'Experts-comptables en zone OHADA',
    color: 'var(--success)',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.2)',
  },
  {
    icon: Globe,
    value: 15, suffix: '+',
    label: 'Pays couverts',
    sub: 'Zone UEMOA et CEMAC',
    color: 'var(--info)',
    bg: 'rgba(2,132,199,0.08)',
    border: 'rgba(2,132,199,0.2)',
  },
  {
    icon: TrendingUp,
    value: 98, suffix: '%',
    label: 'Satisfaction client',
    sub: 'Note moyenne sur les rapports',
    color: 'var(--violet)',
    bg: 'var(--violet-soft)',
    border: 'var(--violet-border)',
  },
  {
    icon: Award,
    value: 47, suffix: '+',
    label: 'Ratios financiers',
    sub: 'Conforme normes SYSCOHADA 2024',
    color: 'var(--gold-strong)',
    bg: 'rgba(212,175,55,0.08)',
    border: 'rgba(212,175,55,0.2)',
  },
];

export function MetricsBand() {
  return (
    <section
      className="py-16 sm:py-20 relative overflow-hidden"
      style={{
        background: 'var(--bg-elevated)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 100% at 50% 50%, rgba(124,58,237,0.05), transparent)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4"
            style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', color: 'var(--violet)' }}
          >
            <Award className="w-3 h-3" />
            Performance mesurée
          </span>
          <h2 className="font-display font-bold text-2xl sm:text-3xl" style={{ color: 'var(--text)' }}>
            Des chiffres qui parlent d&apos;eux-mêmes
          </h2>
        </motion.div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="relative rounded-2xl p-5 text-center group cursor-default transition-all"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = m.border;
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${m.bg}`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: m.bg, border: `1px solid ${m.border}` }}
                >
                  <Icon className="w-4 h-4" style={{ color: m.color }} />
                </div>

                {/* Value */}
                <div
                  className="font-display font-black text-2xl sm:text-3xl leading-none mb-1"
                  style={{ color: m.color }}
                >
                  <CountUp end={m.value} suffix={m.suffix} />
                </div>

                {/* Label */}
                <p className="text-xs font-bold leading-tight mb-1" style={{ color: 'var(--text)' }}>
                  {m.label}
                </p>
                <p className="text-[9px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                  {m.sub}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
