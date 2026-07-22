"""
═══════════════════════════════════════════════════════════════════
HYPERACTIVE AGENT ROUTER — API Endpoints
Doctor Smile v6.0 — Système IA Agentique Ultra-Adaptatif

Endpoints:
  POST /hyperactive/context — Met à jour le contexte utilisateur
  POST /hyperactive/trigger — Déclenche les agents
  GET  /hyperactive/insights — Récupère les insights actifs
  POST /hyperactive/execute — Exécute une action suggérée
  GET  /hyperactive/summary — Résumé hyperactif
  POST /hyperactive/research — Recherche proactive
  POST /hyperactive/preview — Prévisualise un impact
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import logging
from typing import Any, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.services.hyperactive_agent_service import (
    hyperactive_orchestrator,
    PMEContext,
    AgentAction,
    AgentPriority,
    AgentConfidence
)
from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.hyperactive_agent")
router = APIRouter(prefix="/hyperactive", tags=["Hyperactive Agent"])


# ════════════════════════════════════════════════════════════════════
#  REQUEST MODELS
# ════════════════════════════════════════════════════════════════════

class ContextUpdateRequest(BaseModel):
    """Request pour mettre à jour le contexte"""
    user_id: str
    company_name: str = ""
    sector: str = "Unknown"
    size: str = "small"
    financial_health: float = 50.0
    historical_analyses: list[dict[str, Any]] = []
    user_behavior: dict[str, Any] = {}
    preferences: dict[str, Any] = {}
    risk_profile: str = "moderate"
    growth_stage: str = "stable"
    last_activity: Optional[str] = None

class TriggerAgentsRequest(BaseModel):
    """Request pour déclencher les agents"""
    user_id: str
    trigger_event: Optional[dict[str, Any]] = None

class ExecuteInsightRequest(BaseModel):
    """Request pour exécuter une action"""
    user_id: str
    insight_id: str

class ResearchRequest(BaseModel):
    """Request pour recherche proactive"""
    user_id: str
    query: str
    context: Optional[dict[str, Any]] = None

class PreviewRequest(BaseModel):
    """Request pour prévisualiser un impact"""
    user_id: str
    action_type: str
    action_data: dict[str, Any]
    time_horizon: str = "30d"  # 7d, 30d, 90d


# ════════════════════════════════════════════════════════════════════
#  ENDPOINTS
# ════════════════════════════════════════════════════════════════════

@router.post("/context")
async def update_context(req: ContextUpdateRequest):
    """
    Met à jour le contexte d'un utilisateur pour les agents hyperactifs.
    
    Le contexte inclut:
    - Informations entreprise (nom, secteur, taille)
    - Santé financière actuelle
    - Historique des analyses
    - Comportement utilisateur
    - Préférences et profil de risque
    """
    try:
        await hyperactive_orchestrator.update_context(
            user_id=req.user_id,
            context_data=req.model_dump()
        )
        
        log.info(f"[Hyperactive] Context updated for user {req.user_id}")
        
        return {
            "success": True,
            "message": "Contexte mis à jour avec succès",
            "user_id": req.user_id
        }
    except Exception as e:
        log.error(f"[Hyperactive] Context update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/trigger")
async def trigger_agents(req: TriggerAgentsRequest):
    """
    Déclenche tous les agents hyperactifs pour un utilisateur.
    
    Les agents analysent le contexte et génèrent des insights:
    - PredictionAgent: Prédictions financières et risques
    - AnticipationAgent: Besoins proactifs
    - ImprovementAgent: Suggestions d'optimisation
    - CorrectionAgent: Corrections automatiques
    - ContextAgent: Adaptation contextuelle
    """
    try:
        insights = await hyperactive_orchestrator.trigger_agents(
            user_id=req.user_id,
            trigger_event=req.trigger_event
        )
        
        log.info(f"[Hyperactive] {len(insights)} insights generated for user {req.user_id}")
        
        return {
            "success": True,
            "insights_count": len(insights),
            "insights": [insight.model_dump() for insight in insights],
            "user_id": req.user_id
        }
    except Exception as e:
        log.error(f"[Hyperactive] Trigger error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/insights/{user_id}")
async def get_insights(user_id: str):
    """
    Récupère tous les insights actifs pour un utilisateur.
    
    Les insights sont filtrés par:
    - Niveau de confiance (minimum MODERATE)
    - Date d'expiration
    - Priorité
    """
    try:
        insights = await hyperactive_orchestrator.get_active_insights(user_id)
        
        return {
            "success": True,
            "insights_count": len(insights),
            "insights": [insight.model_dump() for insight in insights],
            "user_id": user_id
        }
    except Exception as e:
        log.error(f"[Hyperactive] Get insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_insight(req: ExecuteInsightRequest):
    """
    Exécute l'action suggérée par un insight.
    
    Actions possibles:
    - ANTICIPATE: Lance une action anticipée
    - IMPROVE: Applique une optimisation
    - CORRECT: Applique une correction
    """
    try:
        result = await hyperactive_orchestrator.execute_insight_action(
            user_id=req.user_id,
            insight_id=req.insight_id
        )
        
        log.info(f"[Hyperactive] Insight executed: {req.insight_id}")
        
        return {
            "success": result.get("success", False),
            "message": result.get("message", ""),
            "result": result
        }
    except Exception as e:
        log.error(f"[Hyperactive] Execute error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{user_id}")
async def get_summary(user_id: str):
    """
    Génère un résumé hyperactif de la situation de l'utilisateur.
    
    Inclut:
    - Nombre total d'insights
    - Insights critiques et haute priorité
    - Activité par agent
    - Santé financière
    - Actions recommandées
    """
    try:
        summary = await hyperactive_orchestrator.generate_hyperactive_summary(user_id)
        
        return {
            "success": True,
            "summary": summary
        }
    except Exception as e:
        log.error(f"[Hyperactive] Summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research")
async def proactive_research(req: ResearchRequest):
    """
    Effectue une recherche proactive basée sur le contexte.
    
    Le système recherche automatiquement:
    - Informations sectorielles pertinentes
    - Benchmarks comparatifs
    - Meilleures pratiques
    - Opportunités d'amélioration
    """
    try:
        # Récupérer le contexte
        context = hyperactive_orchestrator.context_cache.get(req.user_id)
        if not context:
            raise HTTPException(status_code=404, detail="Context not found. Update context first.")
        
        # Simulation de recherche proactive (à remplacer par vraie recherche)
        research_results = {
            "query": req.query,
            "sector": context.sector,
            "findings": [
                {
                    "type": "benchmark",
                    "title": f"Benchmark {context.sector}",
                    "description": f"Comparaison avec les entreprises du secteur {context.sector}",
                    "data": {
                        "average_score": 65,
                        "top_quartile": 80,
                        "user_position": context.financial_health
                    }
                },
                {
                    "type": "best_practice",
                    "title": "Meilleures pratiques",
                    "description": "Pratiques recommandées pour votre secteur",
                    "practices": [
                        "Gestion proactive de la trésorerie",
                        "Suivi régulier des ratios",
                        "Planification budgétaire"
                    ]
                }
            ],
            "confidence": "high",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        log.info(f"[Hyperactive] Research completed for user {req.user_id}")
        
        return {
            "success": True,
            "research": research_results
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"[Hyperactive] Research error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/preview")
async def preview_impact(req: PreviewRequest):
    """
    Prévisualise l'impact d'une action avant de l'exécuter.
    
    Simule les conséquences potentielles:
    - Impact financier
    - Impact sur le score
    - Risques associés
    - Bénéfices attendus
    """
    try:
        # Récupérer le contexte
        context = hyperactive_orchestrator.context_cache.get(req.user_id)
        if not context:
            raise HTTPException(status_code=404, detail="Context not found. Update context first.")
        
        # Simulation de preview selon le type d'action
        action_type = req.action_type
        
        if action_type == "optimize_cashflow":
            preview = {
                "action": "Optimisation de la trésorerie",
                "time_horizon": req.time_horizon,
                "predicted_impacts": {
                    "score_change": "+5 à +10 points",
                    "cashflow_improvement": "+15% à +25%",
                    "risk_reduction": "Modérée"
                },
                "risks": [
                    "Nécessite une réorganisation des processus",
                    "Impact temporaire sur les relations fournisseurs"
                ],
                "benefits": [
                    "Meilleure visibilité sur la trésorerie",
                    "Réduction des coûts financiers",
                    "Capacité d'investissement accrue"
                ],
                "confidence": "high",
                "recommended": True
            }
            
        elif action_type == "reduce_debt":
            preview = {
                "action": "Restructuration de la dette",
                "time_horizon": req.time_horizon,
                "predicted_impacts": {
                    "score_change": "+8 à +15 points",
                    "debt_ratio_improvement": "-10% à -20%",
                    "interest_savings": "Variable selon taux"
                },
                "risks": [
                    "Frais de restructuration",
                    "Impact sur la cote de crédit à court terme"
                ],
                "benefits": [
                    "Charge d'intérêt réduite",
                    "Meilleure solvabilité",
                    "Marge de manœuvre accrue"
                ],
                "confidence": "moderate",
                "recommended": context.financial_health < 60
            }
            
        elif action_type == "increase_revenue":
            preview = {
                "action": "Stratégie de croissance",
                "time_horizon": req.time_horizon,
                "predicted_impacts": {
                    "score_change": "+10 à +20 points",
                    "revenue_growth": "+10% à +30%",
                    "profitability": "+5% à +15%"
                },
                "risks": [
                    "Investissement initial requis",
                    "Délai de retour sur investissement"
                ],
                "benefits": [
                    "Part de marché accrue",
                    "Économies d'échelle",
                    "Valorisation de l'entreprise"
                ],
                "confidence": "moderate",
                "recommended": context.growth_stage in ["growth", "expansion"]
            }
            
        else:
            preview = {
                "action": action_type,
                "time_horizon": req.time_horizon,
                "predicted_impacts": {
                    "score_change": "Variable",
                    "impact": "À évaluer"
                },
                "risks": ["À déterminer"],
                "benefits": ["À déterminer"],
                "confidence": "low",
                "recommended": False
            }
        
        log.info(f"[Hyperactive] Preview generated for user {req.user_id}")
        
        return {
            "success": True,
            "preview": preview
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error(f"[Hyperactive] Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-learn")
async def auto_learn(user_id: str, experience: dict[str, Any]):
    """
    Enregistre une expérience pour l'apprentissage automatique avec Groq.
    
    Le système apprend de:
    - Actions utilisateur
    - Résultats obtenus
    - Feedback explicite
    - Patterns comportementaux
    
    Avec Groq activé, l'analyse des patterns est approfondie par l'IA.
    """
    try:
        # Distribuer l'expérience aux agents avec apprentissage Groq
        for agent in hyperactive_orchestrator.agents:
            await agent.learn_from_groq(experience, hyperactive_orchestrator)
        
        log.info(f"[Hyperactive] Learning experience recorded for user {user_id} (Groq: {hyperactive_orchestrator.use_ai})")
        
        return {
            "success": True,
            "message": "Expérience enregistrée pour l'apprentissage avec IA",
            "user_id": user_id,
            "groq_enabled": hyperactive_orchestrator.use_ai
        }
    except Exception as e:
        log.error(f"[Hyperactive] Auto-learn error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
