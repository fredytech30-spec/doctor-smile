'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lightbulb, ChevronDown, ChevronUp, Info, AlertCircle } from 'lucide-react';

interface Explanation {
  id: string;
  indicator: string;
  currentValue: string;
  targetValue: string;
  explanation: string;
  impact: string;
  severity: 'high' | 'medium' | 'low';
  category: 'liquidity' | 'profitability' | 'solvency' | 'efficiency';
}

interface ExplicabilityData {
  explanations: Explanation[];
  totalAlerts: number;
  criticalAlerts: number;
}

export function ExplicabilityWidget({ data }: { data: ExplicabilityData }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
      case 'low': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-text-muted bg-slate-700 border-slate-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'liquidity': return '💧';
      case 'profitability': return '📈';
      case 'solvency': return '🏛️';
      case 'efficiency': return '⚡';
      default: return '📊';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'liquidity': return 'Liquidité';
      case 'profitability': return 'Rentabilité';
      case 'solvency': return 'Solvabilité';
      case 'efficiency': return 'Efficacité';
      default: return 'Général';
    }
  };

  return (
    <Card className="bg-slate-900/90 backdrop-blur-xl border border-violet-primary/20 p-6 shadow-violet">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-primary">Explicabilité</h3>
            <p className="text-xs text-text-secondary">Décisions financières</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {data.criticalAlerts > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">{data.criticalAlerts}</span>
            </div>
          )}
          <div className="text-right">
            <p className="text-2xl font-display font-bold text-yellow-500">
              {data.totalAlerts}
            </p>
            <p className="text-xs text-text-secondary">Alertes</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.explanations.map((explanation, index) => (
          <motion.div
            key={explanation.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border transition-all ${
              explanation.severity === 'high' 
                ? 'bg-red-500/10 border-red-500/30' 
                : explanation.severity === 'medium'
                ? 'bg-orange-500/10 border-orange-500/30'
                : 'bg-slate-800/50 border-violet-primary/20'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-2xl">{getCategoryIcon(explanation.category)}</div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-text-primary">
                      {explanation.indicator}
                    </h4>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(explanation.severity)}`}>
                      {explanation.severity === 'high' ? 'Critique' : 
                       explanation.severity === 'medium' ? 'Moyen' : 'Faible'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-2 text-xs">
                    <span className="text-text-secondary">
                      Actuel: <span className="text-text-primary font-medium">{explanation.currentValue}</span>
                    </span>
                    <span className="text-text-secondary">
                      Cible: <span className="text-violet-500 font-medium">{explanation.targetValue}</span>
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary mb-2">
                    {explanation.explanation}
                  </p>

                  <div className="flex items-center gap-1 text-xs text-violet-500">
                    <Info className="w-3 h-3" />
                    <span>{explanation.impact}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedId(expandedId === explanation.id ? null : explanation.id)}
                className="ml-2 text-text-muted hover:text-violet-500"
              >
                {expandedId === explanation.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </div>

            {expandedId === explanation.id && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-violet-primary/20"
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-1">
                      Analyse détaillée
                    </p>
                    <p className="text-xs text-text-secondary">
                      Cet indicateur {explanation.severity === 'high' ? 'présente un risque significatif' : 
                        explanation.severity === 'medium' ? 'nécessite une attention particulière' : 
                        'est dans une zone acceptable mais peut être amélioré'}.
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-semibold text-text-primary mb-1">
                      Recommandations
                    </p>
                    <ul className="text-xs text-text-secondary space-y-1 list-disc list-inside">
                      <li>Surveiller l'évolution mensuelle</li>
                      <li>Comparer avec le secteur {getCategoryLabel(explanation.category)}</li>
                      <li>Implémenter les plans d'actions suggérés</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {data.totalAlerts === 0 && (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-text-secondary text-sm">
            Aucune alerte en cours. Situation saine.
          </p>
        </div>
      )}
    </Card>
  );
}
