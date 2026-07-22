'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  suffix?: string;
  icon: LucideIcon;
  highlight?: 'gold' | 'violet' | 'success' | 'default';
  sub?: string;
  animate?: boolean;
  trend?: number; // % change, positive = up
}

function useCountUp(end: number, duration = 900, enabled = true) {
  const [val, setVal] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof end !== 'number' || startedRef.current) return;
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
  }, [end, duration, enabled]);

  return val;
}

const highlightConfig = {
  gold: {
    iconBg: 'rgba(212,175,55,0.12)',
    iconBorder: 'rgba(212,175,55,0.28)',
    iconColor: 'var(--gold)',
    textClass: 'gradient-gold',
    glow: 'rgba(212,175,55,0.12)',
  },
  violet: {
    iconBg: 'var(--violet-soft)',
    iconBorder: 'var(--violet-border)',
    iconColor: 'var(--violet)',
    textClass: 'gradient-text',
    glow: 'var(--violet-glow)',
  },
  success: {
    iconBg: 'rgba(5,150,105,0.1)',
    iconBorder: 'rgba(5,150,105,0.22)',
    iconColor: 'var(--success)',
    textClass: 'text-[var(--success)]',
    glow: 'rgba(5,150,105,0.10)',
  },
  default: {
    iconBg: 'var(--bg-muted)',
    iconBorder: 'var(--border)',
    iconColor: 'var(--text-2)',
    textClass: 'text-[var(--text)]',
    glow: 'none',
  },
};

export function KPICard({
  label,
  value,
  suffix = '',
  icon: Icon,
  highlight = 'default',
  sub,
  animate = true,
  trend,
}: KPICardProps) {
  const numVal = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const animated = useCountUp(numVal, 900, animate && typeof value === 'number');
  const display = animate && typeof value === 'number' ? animated : value;

  const cfg = highlightConfig[highlight];

  const TrendIcon =
    trend === undefined || trend === 0 ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor =
    trend === undefined || trend === 0
      ? 'var(--text-muted)'
      : trend > 0
      ? 'var(--success)'
      : 'var(--error)';

  return (
    <motion.div
      className="relative rounded-2xl p-6 overflow-hidden card-clean"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={(e) => {
        const target = e.currentTarget as HTMLElement;
        if (cfg.glow !== 'none') {
          target.style.boxShadow = `0 4px 24px ${cfg.glow}`;
          target.style.borderColor = cfg.iconBorder;
        }
      }}
      onMouseLeave={(e) => {
        const target = e.currentTarget as HTMLElement;
        target.style.boxShadow = 'none';
        target.style.borderColor = 'var(--border)';
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-5 relative z-10">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 icon-container"
          style={{
            background: cfg.iconBg,
            border: `1px solid ${cfg.iconBorder}`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color: cfg.iconColor }} />
        </div>

        {trend !== undefined && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs"
            style={{
              color: trendColor,
              background: trend > 0 ? 'var(--success-soft)' : trend < 0 ? 'var(--error-soft)' : 'var(--bg-muted)',
              border: `1px solid ${trend > 0 ? 'rgba(5,150,105,0.2)' : trend < 0 ? 'rgba(225,29,72,0.2)' : 'var(--border)'}`,
            }}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      {/* Label */}
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
        {label}
      </p>

      {/* Value */}
      <p className={`font-display font-bold text-3xl leading-tight ${cfg.textClass}`}>
        {display}
        {suffix && <span className="text-lg ml-1 font-medium opacity-80">{suffix}</span>}
      </p>

      {/* Sub */}
      {sub && <p className="text-sm text-[var(--text-muted)] mt-3">{sub}</p>}
    </motion.div>
  );
}
