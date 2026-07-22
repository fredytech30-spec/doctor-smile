'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Zap, Shield, TrendingUp, AlertTriangle, 
  CheckCircle, Lightbulb, Eye, Search, ArrowRight,
  Sparkles, Activity, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHyperactiveAgent, AgentInsight } from '@/hooks/useHyperactiveAgent';

interface HyperactiveAgentPanelProps {
  userId: string;
  contextData?: any;
}

export function HyperactiveAgentPanel({ userId, contextData }: HyperactiveAgentPanelProps) {
  const {
    insights,
    summary,
    loading,
    error,
    triggerAgents,
    executeInsight,
    fetchInsights,
    criticalInsights,
    highPriorityInsights,
    hasCriticalAlerts
  } = useHyperactiveAgent(userId);

  const [activeTab, setActiveTab] = useState<'insights' | 'summary' | 'preview'>('insights');
  const [selectedInsight, setSelectedInsight] = useState<AgentInsight | null>(null);

  useEffect(() => {
    if (contextData) {
      // Update context when data changes
    }
  }, [contextData]);

  const handleTriggerAgents = async () => {
    await triggerAgents();
  };

  const handleExecuteInsight = async (insight: AgentInsight) => {
    try {
      await executeInsight(`${insight.agent_type}_${insight.action}`);
      await fetchInsights();
    } catch (err) {
      console.error('Failed to execute insight:', err);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'prediction': return <TrendingUp className="w-5 h-5" />;
      case 'anticipation': return <Zap className="w-5 h-5" />;
      case 'improvement': return <Sparkles className="w-5 h-5" />;
      case 'correction': return <Shield className="w-5 h-5" />;
      case 'context': return <Brain className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Agents Hyperactifs</h2>
            <p className="text-sm text-gray-400">IA adaptative et prédictive</p>
          </div>
        </div>
        
        <Button
          onClick={handleTriggerAgents}
          disabled={loading}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        >
          {loading ? (
            <>
              <Activity className="w-4 h-4 mr-2 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Déclencher les agents
            </>
          )}
        </Button>
      </div>

      {/* Critical Alerts */}
      {hasCriticalAlerts && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl border bg-red-500/10 border-red-500/20"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="font-medium text-red-500">
                {criticalInsights.length} alerte(s) critique(s) détectée(s)
              </p>
              <p className="text-sm text-red-400">
                Action immédiate recommandée
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl">
        {[
          { id: 'insights', label: 'Insights', icon: Lightbulb, count: insights.length },
          { id: 'summary', label: 'Résumé', icon: Activity, count: summary?.total_insights || 0 },
          { id: 'preview', label: 'Prévisualisation', icon: Eye, count: 0 }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-violet-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-white/20">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'insights' && (
          <motion.div
            key="insights"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {insights.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Aucun insight disponible</p>
                <p className="text-sm">Déclenchez les agents pour générer des insights</p>
              </div>
            ) : (
              insights.map((insight, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 rounded-xl border ${getPriorityColor(insight.priority)}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getAgentIcon(insight.agent_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          insight.priority === 'critical' ? 'bg-red-500/20 text-red-500' :
                          insight.priority === 'high' ? 'bg-orange-500/20 text-orange-500' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                      
                      <p className="text-sm opacity-80 mb-3">{insight.description}</p>
                      
                      {insight.action_required && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleExecuteInsight(insight)}
                          className="text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-2" />
                          Exécuter l'action
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(insight.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'summary' && summary && (
          <motion.div
            key="summary"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="text-2xl font-bold text-violet-500">{summary.total_insights}</div>
                <div className="text-sm text-gray-400">Total insights</div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="text-2xl font-bold text-red-500">{summary.critical_insights}</div>
                <div className="text-sm text-gray-400">Critiques</div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="text-2xl font-bold text-orange-500">{summary.high_priority_insights}</div>
                <div className="text-sm text-gray-400">Haute priorité</div>
              </div>
              
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <div className="text-2xl font-bold text-green-500">{summary.financial_health}</div>
                <div className="text-sm text-gray-400">Santé financière</div>
              </div>
            </div>

            {/* Agent Activity */}
            <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
              <h3 className="font-medium mb-3">Activité des agents</h3>
              <div className="space-y-2">
                {Object.entries(summary.agent_activity).map(([agent, count]) => (
                  <div key={agent} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400 capitalize">{agent}</span>
                    <span className="text-sm font-medium">{count} insights</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Actions */}
            {summary.recommended_actions.length > 0 && (
              <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">
                <h3 className="font-medium mb-3">Actions recommandées</h3>
                <div className="space-y-2">
                  {summary.recommended_actions.map((action, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-700/30">
                      <div>
                        <p className="text-sm font-medium">{action.title}</p>
                        <p className="text-xs text-gray-400">{action.action}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="text-center py-12 text-gray-400"
          >
            <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Prévisualisation d'impact</p>
            <p className="text-sm">Sélectionnez une action pour prévisualiser son impact</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 rounded-xl border bg-red-500/10 border-red-500/20 text-red-500"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
