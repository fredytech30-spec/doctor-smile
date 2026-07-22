'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DoctorScoreGaugeProps {
  score: number;
  zone?: string;
  label?: string;
}

const ZONE_CONFIG: Record<string, { color: string; glow: string; bg: string; border: string; label: string }> = {
  saine:    { color: 'var(--gold)',    glow: 'var(--gold-glow)',    bg: 'rgba(212,175,55,0.10)',   border: 'rgba(212,175,55,0.30)',   label: 'Zone Saine' },
  vigilance:{ color: 'var(--warning)', glow: 'rgba(217,119,6,0.3)', bg: 'rgba(217,119,6,0.10)',    border: 'rgba(217,119,6,0.28)',    label: 'Zone Vigilance' },
  critique: { color: 'var(--error)',   glow: 'rgba(225,29,72,0.3)', bg: 'rgba(225,29,72,0.10)',    border: 'rgba(225,29,72,0.28)',    label: 'Zone Critique' },
};

// Arc helper
const R = 80;
const CX = 100;
const CY = 100;
const START_ANGLE = -210;   // degrees — bottom-left
const SWEEP_ANGLE = 240;    // degrees sweep total

function polarToXY(angle: number) {
  const rad = (angle * Math.PI) / 180;
  return { x: CX + R * Math.cos(rad), y: CY + R * Math.sin(rad) };
}

function describeArc(startDeg: number, endDeg: number) {
  const s = polarToXY(startDeg);
  const e = polarToXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

export function DoctorScoreGauge({ score, zone = 'vigilance', label = 'Doctor Score™' }: DoctorScoreGaugeProps) {
  const pct = Math.min(100, Math.max(0, score));
  const cfg = ZONE_CONFIG[zone] ?? ZONE_CONFIG['vigilance'];

  const circumference = (SWEEP_ANGLE / 360) * (2 * Math.PI * R);
  const arcOffset = circumference * (1 - pct / 100);

  const trackPath = describeArc(START_ANGLE, START_ANGLE + SWEEP_ANGLE);

  const tipAngle = START_ANGLE + SWEEP_ANGLE * (pct / 100);
  const tipXY = polarToXY(tipAngle);

  return (
    <div className="flex flex-col items-center">
      {/* Section label */}
      <p
        className="text-[10px] font-black uppercase tracking-[0.18em] mb-5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>

      {/* Gauge SVG */}
      <div className="relative" style={{ width: 200, height: 200 }}>
        <svg width="200" height="200" viewBox="0 0 200 200" overflow="visible">
          <defs>
            <linearGradient id="gaugeStroke" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--violet)" />
              <stop offset="100%" stopColor={cfg.color} />
            </linearGradient>
          </defs>

          {/* Background track */}
          <path
            d={trackPath}
            fill="none"
            stroke="var(--border)"
            strokeWidth="13"
            strokeLinecap="round"
          />

          {/* Animated progress arc */}
          <motion.path
            d={trackPath}
            fill="none"
            stroke="url(#gaugeStroke)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: arcOffset }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ filter: `drop-shadow(0 0 10px ${cfg.color})` }}
          />

          {/* Tip dot */}
          {pct > 2 && (
            <motion.circle
              cx={tipXY.x}
              cy={tipXY.y}
              r="8"
              fill={cfg.color}
              initial={{ opacity: 0, r: 0 }}
              animate={{ opacity: 1, r: 8 }}
              transition={{ delay: 1.3, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ filter: `drop-shadow(0 0 8px ${cfg.color})` }}
            />
          )}
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: 12 }}>
          <motion.span
            className="font-display font-black leading-none"
            style={{
              fontSize: 54,
              color: cfg.color,
              filter: `drop-shadow(0 0 24px ${cfg.glow})`,
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {Math.round(pct)}
          </motion.span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
            / 100
          </span>
        </div>
      </div>

      {/* Zone badge */}
      <motion.div
        className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
        style={{
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          color: cfg.color,
        }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.4 }}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.color, boxShadow: `0 0 6px ${cfg.color}` }}
        />
        {cfg.label}
      </motion.div>
    </div>
  );
}
