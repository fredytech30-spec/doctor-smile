'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { motion } from 'framer-motion';

interface MetricPoint {
  date: string;
  avgScore: number;
  confidence: number;
  processingTime: number;
}

export function PerformanceMetricsChart({ data }: { data: MetricPoint[] }) {
  if (!data || !data.length) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="px-4 py-3 rounded-xl text-xs"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--violet-border)',
          boxShadow: '0 12px 32px rgba(124,58,237,0.2)',
        }}
      >
        <p style={{ color: 'var(--text-muted)' }}>{payload[0]?.payload?.date}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} style={{ color: entry.color }} className="font-semibold">
            {entry.name}: {entry.value}
            {entry.name === 'Confiance' ? '%' : entry.name === 'Score' ? '%' : 'ms'}
          </p>
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Évolution des performances</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: -16, bottom: 5 }}>
          <defs>
            <linearGradient id="scoreGradLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--violet-strong)" />
              <stop offset="100%" stopColor="var(--gold-strong)" />
            </linearGradient>
            <filter id="glow-line">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            strokeDasharray="3 6"
            stroke="var(--border)"
            strokeOpacity={0.4}
            vertical={false}
          />

          <ReferenceLine y={75} stroke="var(--gold)" strokeDasharray="4 4" strokeOpacity={0.3} />

          <XAxis
            dataKey="date"
            stroke="var(--text-muted)"
            fontSize={11}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            stroke="var(--text-muted)"
            fontSize={11}
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
          />
          
          <Tooltip content={<CustomTooltip />} />

          <Line
            type="monotone"
            dataKey="avgScore"
            stroke="url(#scoreGradLine)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive
            name="Score moyen"
            filter="url(#glow-line)"
          />

          <Line
            type="monotone"
            dataKey="confidence"
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            isAnimationActive
            name="Confiance"
            opacity={0.7}
          />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
