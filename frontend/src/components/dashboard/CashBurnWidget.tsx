'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Flame, TrendingDown, AlertCircle } from 'lucide-react';

interface CashBurnData {
  monthlyBurn: number;
  runway: number;
  cashOnHand: number;
  trend: 'up' | 'down' | 'stable';
}

export function CashBurnWidget({ data }: { data: CashBurnData }) {
  const getRunwayColor = (months: number) => {
    if (months < 3) return 'text-red-500';
    if (months < 6) return 'text-orange-500';
    return 'text-green-500';
  };

  const getRunwayLabel = (months: number) => {
    if (months < 3) return 'Critique';
    if (months < 6) return 'Attention';
    return 'Sain';
  };

  return (
    <Card className="bg-slate-900/90 backdrop-blur-xl border border-violet-primary/20 p-6 shadow-violet">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-primary">Cash-Burn</h3>
            <p className="text-xs text-text-secondary">Consommation mensuelle</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-sm ${
          data.trend === 'up' ? 'text-red-500' : 
          data.trend === 'down' ? 'text-green-500' : 'text-text-muted'
        }`}>
          {data.trend === 'up' && <TrendingDown className="w-4 h-4" />}
          <span className="font-medium">
            {data.trend === 'up' ? '+12%' : data.trend === 'down' ? '-8%' : '0%'}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-text-secondary text-sm mb-1">Burn mensuel</p>
          <p className="font-display font-bold text-2xl text-text-primary">
            {data.monthlyBurn.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        <div className="pt-4 border-t border-violet-primary/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-text-secondary text-sm">Runway</p>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              data.runway < 3 ? 'bg-red-500/20 text-red-500' :
              data.runway < 6 ? 'bg-orange-500/20 text-orange-500' :
              'bg-green-500/20 text-green-500'
            }`}>
              {getRunwayLabel(data.runway)}
            </span>
          </div>
          <div className="flex items-end gap-2">
            <p className={`font-display font-bold text-3xl ${getRunwayColor(data.runway)}`}>
              {data.runway}
            </p>
            <p className="text-text-secondary text-sm mb-1">mois</p>
          </div>
          <div className="mt-3">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((data.runway / 12) * 100, 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full ${
                  data.runway < 3 ? 'bg-red-500' :
                  data.runway < 6 ? 'bg-orange-500' :
                  'bg-green-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-violet-primary/20">
          <p className="text-text-secondary text-sm mb-1">Trésorerie disponible</p>
          <p className="font-display font-bold text-xl text-text-primary">
            {data.cashOnHand.toLocaleString('fr-FR')} FCFA
          </p>
        </div>

        {data.runway < 3 && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-xs text-red-500">
              Trésorerie critique. Action immédiate requise.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
