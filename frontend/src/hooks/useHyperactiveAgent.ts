/**
 * useHyperactiveAgent — Hook pour le système d'agents hyperactifs
 * Doctor Smile v6.0 — Système IA Agentique Ultra-Adaptatif
 */

import { useState, useCallback, useEffect } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';

export interface AgentInsight {
  agent_type: string;
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: 'certain' | 'high' | 'moderate' | 'low' | 'uncertain';
  title: string;
  description: string;
  data: Record<string, any>;
  timestamp: string;
  expires_at?: string;
  action_required: boolean;
}

export interface PMEContext {
  user_id: string;
  company_name: string;
  sector: string;
  size: string;
  financial_health: number;
  historical_analyses: any[];
  user_behavior: Record<string, any>;
  preferences: Record<string, any>;
  risk_profile string;
  growth_stage: string;
  last_activity?: string;
}

export interface HyperactiveSummary {
  user_id: string;
  total_insights: number;
  critical_insights: number;
  high_priority_insights: number;
  agent_activity: Record<string, number>;
  financial_health: number;
  last_analysis?: any;
  recommended_actions: Array<{
    title: string;
    priority: string;
    action: string;
  }>;
}

export function useHyperactiveAgent(userId: string) {
  const [insights, setInsights] = useState<AgentInsight[]>([]);
  const [summary, setSummary] = useState<HyperactiveSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mettre à jour le contexte utilisateur
  const updateContext = useCallback(async (contextData: Partial<PMEContext>) => {
    try {
      const response = await fetch(`${API_BASE}/hyperactive/context`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          ...contextData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update context');
      }

      return await response.json();
    } catch (err) {
      console.error('[Hyperactive] Context update error:', err);
      throw err;
    }
  }, [userId]);

  // Déclencher tous les agents
  const triggerAgents = useCallback(async (triggerEvent?: Record<string, any>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/hyperactive/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          trigger_event: triggerEvent
        })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger agents');
      }

      const data = await response.json();
      setInsights(data.insights || []);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Récupérer les insights actifs
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/hyperactive/insights/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Exécuter une action suggérée
  const executeInsight = useCallback(async (insightId: string) => {
    try {
      const response = await fetch(`${API_BASE}/hyperactive/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          insight_id: insightId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute insight');
      }

      return await response.json();
    } catch (err) {
      console.error('[Hyperactive] Execute error:', err);
      throw err;
    }
  }, [userId]);

  // Récupérer le résumé hyperactif
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/hyperactive/summary/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Recherche proactive
  const proactiveResearch = useCallback(async (query: string, context?: Record<string, any>) => {
    try {
      const response = await fetch(`${API_BASE}/hyperactive/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          query,
          context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to perform research');
      }

      return await response.json();
    } catch (err) {
      console.error('[Hyperactive] Research error:', err);
      throw err;
    }
  }, [userId]);

  // Prévisualiser un impact
  const previewImpact = useCallback(async (
    actionType: string,
    actionData: Record<string, any>,
    timeHorizon: string = '30d'
  ) => {
    try {
      const response = await fetch(`${API_BASE}/hyperactive/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action_type: actionType,
          action_data: actionData,
          time_horizon: timeHorizon
        })
      });

      if (!response.ok) {
        throw new Error('Failed to preview impact');
      }

      return await response.json();
    } catch (err) {
      console.error('[Hyperactive] Preview error:', err);
      throw err;
    }
  }, [userId]);

  // Auto-learning
  const autoLearn = useCallback(async (experience: Record<string, any>) => {
    try {
      const response = await fetch(`${API_BASE}/hyperactive/auto-learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          experience
        })
      });

      if (!response.ok) {
        throw new Error('Failed to record experience');
      }

      return await response.json();
    } catch (err) {
      console.error('[Hyperactive] Auto-learn error:', err);
      throw err;
    }
  }, [userId]);

  // Charger les insights au montage
  useEffect(() => {
    if (userId) {
      fetchInsights();
      fetchSummary();
    }
  }, [userId, fetchInsights, fetchSummary]);

  return {
    // State
    insights,
    summary,
    loading,
    error,
    
    // Actions
    updateContext,
    triggerAgents,
    fetchInsights,
    executeInsight,
    fetchSummary,
    proactiveResearch,
    previewImpact,
    autoLearn,
    
    // Helpers
    criticalInsights: insights.filter(i => i.priority === 'critical'),
    highPriorityInsights: insights.filter(i => i.priority === 'high'),
    hasCriticalAlerts: insights.some(i => i.priority === 'critical'),
    totalInsights: insights.length
  };
}
