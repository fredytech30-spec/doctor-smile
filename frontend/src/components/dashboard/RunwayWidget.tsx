'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Gauge, Battery, AlertTriangle, CheckCircle } from 'lucide-react';

interface RunwayData {
  months: number;
  percentage: number;
  status: 'critical' | 'warning' | 'healthy';
}

export function RunwayWidget({ data }: { data: RunwayData }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-orange-500';
      case 'healthy': return 'text-green-500';
      default: return 'text-text-muted';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500/20 border-red-500/30';
      case 'warning': return 'bg-orange-500/20 border-orange-500/30';
      case 'healthy': return 'bg-green-500/20 border-green-500/30';
      default: return 'bg-slate-700 border-slate-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      case 'warning': return <Battery className="w-5 h-5" />;
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      default: return <Gauge className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'Critique';
      case 'warning': return 'Attention';
      case 'healthy': return 'Sain';
      default: return 'Inconnu';
    }
  };

  return (
    <Card className="bg-slate-900/90 backdrop-blur-xl border border-violet-primary/20 p-6 shadow-violet">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${getStatusBg(data.status)} border flex items-center justify-center`}>
            <Gauge className={`w-5 h-5 ${getStatusColor(data.status)}`} />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-primary">Runway</h3>
            <p className="text-xs text-text-secondary">Mois de survie</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-1 rounded-full ${getStatusBg(data.status)} ${getStatusColor(data.status)}`}>
          {getStatusIcon(data.status)}
          <span>{getStatusLabel(data.status)}</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center py-8">
        {/* Jauge circulaire */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="rgba(139, 92, 246, 0.1)"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <motion.circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={data.status === 'critical' ? '#ef4444' : data.status === 'warning' ? '#f97316' : '#22c55e'}
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: data.percentage / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              style={{
                strokeDasharray: `${2 * Math.PI * 70}`,
                strokeDashoffset: `${2 * Math.PI * 70 * (1 - data.percentage / 100)}`,
              }}
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className={`font-display font-bold text-4xl ${getStatusColor(data.status)}`}
            >
              {data.months}
            </motion.p>
            <p className="text-text-secondary text-sm">mois</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Capacité actuelle</span>
          <span className={`font-semibold ${getStatusColor(data.status)}`}>
            {data.percentage}%
          </span>
        </div>
        
        {data.status === 'critical' && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-500 font-medium mb-1">
              ⚠️ Action immédiate requise
            </p>
            <p className="text-xs text-text-secondary">
              Optimiser les coûts ou sécuriser du financement
            </p>
          </div>
        )}
        
        {data.status === 'warning' && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-xs text-orange-500 font-medium mb-1">
              ⚡ Surveiller activement
            </p>
            <p className="text-xs text-text-secondary">
              Planifier des actions correctives
            </p>
          </div>
        )}
        
        {data.status === 'healthy' && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-xs text-green-500 font-medium mb-1">
              ✅ Situation stable
            </p>
            <p className="text-xs text-text-secondary">
              Maintenir les bonnes pratiques
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
