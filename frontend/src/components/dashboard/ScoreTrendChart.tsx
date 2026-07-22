'use client';

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface Point { label: string; score: number; }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const score = payload[0]?.value;
  const isGood = score >= 75;
  const color = isGood ? 'var(--gold)' : score >= 50 ? 'var(--violet)' : 'var(--error)';
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs font-semibold"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--violet-border)',
        boxShadow: '0 8px 24px rgba(124,58,237,0.15)',
        color: 'var(--text)',
      }}
    >
      <div className="text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ color }} className="font-mono font-black text-base">{score}<span className="text-xs font-medium">%</span></div>
    </div>
  );
};

export function ScoreTrendChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div
        className="h-[260px] flex flex-col items-center justify-center gap-3"
        style={{ padding: '0 1.5rem 1.5rem' }}
      >
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center opacity-30"
          style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--violet)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Aucune donnée d&apos;évolution disponible
        </p>
        <p className="text-[10px] text-center max-w-[200px]" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          Complétez votre première analyse pour voir le graphique apparaître ici.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 1.5rem 0' }}>
      <ResponsiveContainer width="100%" height={248}>
        <AreaChart data={data} margin={{ top: 16, right: 24, left: -16, bottom: 4 }}>
          <defs>
            <linearGradient id="scoreGradFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--violet-strong)" stopOpacity={0.28} />
              <stop offset="80%" stopColor="var(--violet-strong)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="scoreGradStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--violet)" />
              <stop offset="100%" stopColor="var(--gold)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            strokeDasharray="3 6"
            stroke="var(--border)"
            strokeOpacity={0.6}
            vertical={false}
          />

          <ReferenceLine y={75} stroke="var(--gold-strong)" strokeDasharray="4 4" strokeOpacity={0.4} />
          <ReferenceLine y={50} stroke="var(--warning)" strokeDasharray="4 4" strokeOpacity={0.3} />

          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--violet-border)', strokeWidth: 1 }} />

          <Area
            type="monotoneX"
            dataKey="score"
            stroke="url(#scoreGradStroke)"
            strokeWidth={2.5}
            fill="url(#scoreGradFill)"
            dot={{ fill: 'var(--violet)', r: 4, strokeWidth: 2, stroke: 'var(--bg-card)' }}
            activeDot={{ r: 6, fill: 'var(--gold)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
            filter="url(#glow)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center gap-5 px-6 mt-1">
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <div className="w-4 h-[2px] rounded-full" style={{ background: 'var(--gold-strong)', opacity: 0.6 }} />
          Zone saine ≥75%
        </div>
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <div className="w-4 h-[2px] rounded-full" style={{ background: 'var(--warning)', opacity: 0.5 }} />
          Vigilance ≥50%
        </div>
      </div>
    </div>
  );
}
