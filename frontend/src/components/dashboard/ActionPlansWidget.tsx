'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Square, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  dueDate?: string;
  impact: string;
}

interface ActionPlansData {
  actions: ActionItem[];
  totalActions: number;
  completedActions: number;
  completionRate: number;
}

export function ActionPlansWidget({ data }: { data: ActionPlansData }) {
  const [expanded, setExpanded] = useState(false);
  const [actions, setActions] = useState(data.actions);

  const toggleAction = (id: string) => {
    setActions(actions.map(action => 
      action.id === id ? { ...action, completed: !action.completed } : action
    ));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-orange-500 bg-orange-500/20 border-orange-500/30';
      case 'low': return 'text-green-500 bg-green-500/20 border-green-500/30';
      default: return 'text-text-muted bg-slate-700 border-slate-600';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'Haute';
      case 'medium': return 'Moyenne';
      case 'low': return 'Basse';
      default: return 'Normale';
    }
  };

  const displayActions = expanded ? actions : actions.slice(0, 3);

  return (
    <Card className="bg-slate-900/90 backdrop-blur-xl border border-violet-primary/20 p-6 shadow-violet">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <CheckSquare className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-primary">Plans d'Actions</h3>
            <p className="text-xs text-text-secondary">Correctifs dynamiques</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display font-bold text-violet-500">
            {data.completionRate}%
          </p>
          <p className="text-xs text-text-secondary">Complété</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-secondary">
            {data.completedActions}/{data.totalActions} actions
          </span>
          <span className="text-violet-500 font-medium">
            {data.completionRate}%
          </span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${data.completionRate}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-violet-500 to-violet-600"
          />
        </div>
      </div>

      {/* Actions list */}
      <div className="space-y-3">
        {displayActions.map((action, index) => (
          <motion.div
            key={action.id}
            initial={{ opacity: 0, x: -20 }}
            animate="{{ opacity: 1, x: 0 }}"
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border transition-all ${
              action.completed 
                ? 'bg-green-500/10 border-green-500/30 opacity-60' 
                : 'bg-slate-800/50 border-violet-primary/20 hover:border-violet-primary/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleAction(action.id)}
                className={`mt-1 ${
                  action.completed ? 'text-green-500' : 'text-text-muted hover:text-violet-500'
                }`}
              >
                {action.completed ? (
                  <CheckSquare className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`font-semibold text-sm ${
                    action.completed ? 'text-text-muted line-through' : 'text-text-primary'
                  }`}>
                    {action.title}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(action.priority)}`}>
                    {getPriorityLabel(action.priority)}
                  </span>
                </div>
                
                <p className={`text-xs mb-2 ${
                  action.completed ? 'text-text-muted line-through' : 'text-text-secondary'
                }`}>
                  {action.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-violet-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>{action.impact}</span>
                  </div>
                  
                  {action.dueDate && (
                    <span className="text-xs text-text-muted">
                      {new Date(action.dueDate).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {actions.length > 3 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-4 text-violet-500 hover:text-violet-400"
        >
          {expanded ? 'Voir moins' : `Voir ${actions.length - 3} actions supplémentaires`}
          <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>
      )}

      {data.completionRate === 100 && (
        <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-xs text-green-500 font-medium text-center">
            ✅ Tous les plans d'actions complétés
          </p>
        </div>
      )}
    </Card>
  );
}
