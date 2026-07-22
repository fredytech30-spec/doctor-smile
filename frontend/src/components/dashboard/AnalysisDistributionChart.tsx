'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';

interface DistributionData {
  zone: string;
  count: number;
  avgScore: number;
}

export function AnalysisDistributionChart({ data }: { data: DistributionData[] }) {
  if (!data || !data.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-64 flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)]"
      >
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-30"
          style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--violet)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--text-muted)]">Pas de données</p>
      </motion.div>
    );
  }

  const colors = ['var(--violet)', 'var(--gold)', 'var(--success)', 'var(--warning)'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4"
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Distribution par zone</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--violet-strong)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--violet)" stopOpacity={0.4} />
            </linearGradient>
            <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gold-strong)" stopOpacity={0.8} />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" strokeOpacity={0.3} />
          <XAxis dataKey="zone" stroke="var(--text-muted)" fontSize={12} />
          <YAxis stroke="var(--text-muted)" fontSize={12} />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-card)',
              border: '1px solid var(--violet-border)',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(124,58,237,0.15)',
            }}
            labelStyle={{ color: 'var(--text)' }}
            formatter={(value) => [value, 'Analyses']}
          />
          <Legend wrapperStyle={{ paddingTop: '16px' }} />
          <Bar dataKey="count" fill="url(#barGrad1)" name="Nombre d'analyses" radius={[8, 8, 0, 0]} />
          <Bar dataKey="avgScore" fill="url(#barGrad2)" name="Score moyen %" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
