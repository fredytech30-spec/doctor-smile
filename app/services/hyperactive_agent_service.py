"""
═══════════════════════════════════════════════════════════════════
HYPERACTIVE AGENT SERVICE — Système IA Agentique Ultra-Adaptatif
Doctor Smile v6.0 — Pour PME Africaines

Capacités Hyperactives:
  🔮 Anticipation: Prédire les besoins avant qu'ils ne surviennent
  📊 Prédiction: Forecasting financier et risques
  🔍 Recherche: Data gathering proactive
  ⚡ Amélioration: Auto-optimisation continue
  🛡️ Correction: Auto-correction des erreurs
  👁️ Prévisualisation: Preview des impacts avant action
  🧠 Compréhension: Deep learning du contexte PME
  🔄 Adaptation: Learning from user behavior
  🎯 Action: Autonomous decision making
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any, Optional, List, Dict, Callable
from enum import Enum
from dataclasses import dataclass, field
import statistics

log = logging.getLogger("doctorsmile.hyperactive_agent")


# ════════════════════════════════════════════════════════════════════
#  ENUMS & MODELS
# ════════════════════════════════════════════════════════════════════

class AgentAction(str, Enum):
    """Types d'actions des agents"""
    PREDICT = "predict"
    ANTICIPATE = "anticipate"
    IMPROVE = "improve"
    CORRECT = "correct"
    PREVIEW = "preview"
    RESEARCH = "research"
    ADAPT = "adapt"
    EXECUTE = "execute"

class AgentPriority(str, Enum):
    """Priorités des actions"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class AgentConfidence(str, Enum):
    """Niveaux de confiance"""
    CERTAIN = "certain"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"
    UNCERTAIN = "uncertain"

@dataclass
class AgentInsight:
    """Insight généré par un agent"""
    agent_type: str
    action: AgentAction
    priority: AgentPriority
    confidence: AgentConfidence
    title: str
    description: str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expires_at: Optional[str] = None
    action_required: bool = True

@dataclass
class PMEContext:
    """Contexte complet de la PME"""
    user_id: str
    company_name: str
    sector: str
    size: str  # micro, small, medium
    financial_health: float  # 0-100
    historical_analyses: List[Dict[str, Any]] = field(default_factory=list)
    user_behavior: Dict[str, Any] = field(default_factory=dict)
    preferences: Dict[str, Any] = field(default_factory=dict)
    risk_profile: str = "moderate"
    growth_stage: str = "stable"
    last_activity: Optional[str] = None


# ════════════════════════════════════════════════════════════════════
#  AGENT BASE CLASS
# ════════════════════════════════════════════════════════════════════

class BaseAgent:
    """Agent de base avec capacités hyperactives"""
    
    def __init__(self, agent_type: str):
        self.agent_type = agent_type
        self.insights_cache: List[AgentInsight] = []
        self.learning_memory: Dict[str, Any] = {}
        self.confidence_threshold = 0.6
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        """Analyse le contexte et génère des insights"""
        raise NotImplementedError
        
    async def learn(self, experience: Dict[str, Any]):
        """Apprend de nouvelles expériences"""
        key = experience.get("type", "general")
        if key not in self.learning_memory:
            self.learning_memory[key] = []
        self.learning_memory[key].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": experience
        })
        
    async def learn_from_groq(self, experience: Dict[str, Any], orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        """Apprentissage avancé utilisant Groq pour l'analyse des expériences"""
        if not orchestrator or not orchestrator.use_ai:
            await self.learn(experience)
            return
            
        system_prompt = """Tu es un système d'apprentissage automatique pour agents IA.
Analyse l'expérience fournie et extrait des patterns d'apprentissage.
Identifie ce qui fonctionne, ce qui échoue, et comment s'améliorer."""
        
        user_message = f"""Analyse cette expérience et génère des insights d'apprentissage:
{json.dumps(experience, indent=2)}

Réponds en format JSON:
{{
  "learnings": [
    {{
      "pattern": "pattern identifié",
      "improvement": "suggestion d'amélioration",
      "confidence": 0.0-1.0
    }}
  ]
}}"""
        
        try:
            response = await orchestrator._call_groq(
                system_prompt=system_prompt,
                user_message=user_message,
                response_format={"type": "json_object"},
                temperature=0.5
            )
            
            if response:
                data = json.loads(response)
                learnings = data.get("learnings", [])
                
                # Stocker les learnings avec l'expérience
                key = experience.get("type", "general")
                if key not in self.learning_memory:
                    self.learning_memory[key] = []
                    
                self.learning_memory[key].append({
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "data": experience,
                    "groq_learnings": learnings
                })
                
                log.info(f"[{self.agent_type}] Learned {len(learnings)} patterns from Groq")
        except Exception as e:
            log.error(f"Groq learning error: {e}")
            # Fallback to basic learning
            await self.learn(experience)
        
    def get_confidence(self, data: Dict[str, Any]) -> AgentConfidence:
        """Calcule le niveau de confiance"""
        score = data.get("confidence_score", 0.5)
        if score >= 0.9: return AgentConfidence.CERTAIN
        if score >= 0.75: return AgentConfidence.HIGH
        if score >= 0.6: return AgentConfidence.MODERATE
        if score >= 0.4: return AgentConfidence.LOW
        return AgentConfidence.UNCERTAIN


# ════════════════════════════════════════════════════════════════════
#  PREDICTION AGENT — Forecasting Financier & Risques
# ════════════════════════════════════════════════════════════════════

class PredictionAgent(BaseAgent):
    """Agent de prédiction financière et de risques avec Groq"""
    
    def __init__(self, orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        super().__init__("prediction")
        self.orchestrator = orchestrator
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        insights = []
        
        if not context.historical_analyses:
            return insights
            
        # 1. Prédiction de tendance de score (avec Groq si disponible)
        trend_insight = await self._predict_score_trend(context)
        if trend_insight:
            insights.append(trend_insight)
            
        # 2. Détection de risques financiers (avec Groq si disponible)
        risk_insight = await self._predict_financial_risks(context)
        if risk_insight:
            insights.append(risk_insight)
            
        # 3. Prédiction de trésorerie (avec Groq si disponible)
        cashflow_insight = await self._predict_cashflow(context)
        if cashflow_insight:
            insights.append(cashflow_insight)
            
        # 4. Prédictions avancées avec Groq
        if self.orchestrator and self.orchestrator.use_ai:
            advanced_insight = await self._predict_advanced_groq(context)
            if advanced_insight:
                insights.append(advanced_insight)
            
        return insights
        
    async def _predict_score_trend(self, context: PMEContext) -> Optional[AgentInsight]:
        """Prédit l'évolution du score financier"""
        if len(context.historical_analyses) < 2:
            return None
            
        scores = [a.get("score", 0) for a in context.historical_analyses]
        recent_trend = statistics.linear_regression(
            range(len(scores)), scores
        ) if len(scores) > 1 else (0, scores[-1])
        
        slope, intercept = recent_trend
        predicted_next = intercept + slope * len(scores)
        
        trend_direction = "amélioration" if slope > 0 else "dégradation"
        confidence = AgentConfidence.HIGH if abs(slope) > 2 else AgentConfidence.MODERATE
        
        return AgentInsight(
            agent_type=self.agent_type,
            action=AgentAction.PREDICT,
            priority=AgentPriority.HIGH if slope < -1 else AgentPriority.MEDIUM,
            confidence=confidence,
            title=f"Tendance score: {trend_direction}",
            description=f"Basé sur {len(scores)} analyses, votre score devrait atteindre {predicted_next:.1f}/100 lors de la prochaine analyse.",
            data={
                "current_score": scores[-1],
                "predicted_score": predicted_next,
                "trend_slope": slope,
                "history_count": len(scores)
            },
            expires_at=(datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        )
        
    async def _predict_financial_risks(self, context: PMEContext) -> Optional[AgentInsight]:
        """Prédit les risques financiers potentiels"""
        if not context.historical_analyses:
            return None
            
        latest = context.historical_analyses[0]
        risks = []
        
        # Analyse des ratios critiques
        ratios = latest.get("ratios", {})
        if ratios.get("liquidite_courante", 1) < 1.0:
            risks.append("Liquidité insuffisante")
        if ratios.get("endettement", 0) > 0.7:
            risks.append("Endettement élevé")
        if ratios.get("marge_beneficiaire", 0) < 0.05:
            risks.append("Marge bénéficiaire faible")
            
        if not risks:
            return None
            
        return AgentInsight(
            agent_type=self.agent_type,
            action=AgentAction.PREDICT,
            priority=AgentPriority.HIGH,
            confidence=AgentConfidence.HIGH,
            title=f"{len(risks)} risque(s) financier(s) détecté(s)",
            description="Des indicateurs suggèrent des risques financiers potentiels.",
            data={"risks": risks, "ratios": ratios},
            expires_at=(datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
        )
        
    async def _predict_cashflow(self, context: PMEContext) -> Optional[AgentInsight]:
        """Prédit les problèmes de trésorerie"""
        if not context.historical_analyses:
            return None
            
        latest = context.historical_analyses[0]
        bfr = latest.get("bfr", 0)
        tresorerie = latest.get("tresorerie", 0)
        
        if bfr > 0 and tresorerie < bfr * 0.3:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.PREDICT,
                priority=AgentPriority.CRITICAL,
                confidence=AgentConfidence.HIGH,
                title="Alerte Trésorerie",
                description=f"Votre BFR ({bfr:,.0f} FCFA) est largement supérieur à votre trésorerie disponible. Risque de tension de trésorerie.",
                data={"bfr": bfr, "tresorerie": tresorerie, "ratio": tresorerie/bfr if bfr else 0},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            )
        return None
        
    async def _predict_advanced_groq(self, context: PMEContext) -> Optional[AgentInsight]:
        """Prédictions avancées utilisant Groq LLM"""
        if not self.orchestrator:
            return None
            
        system_prompt = """Tu es un analyste financier d'élite spécialisé dans les PME africaines.
Analyse les données financières fournies et génère des prédictions stratégiques avancées.
Identifie les opportunités de croissance, les risques cachés, et les tendances de marché.
Sois précis, chiffré et orienté action."""
        
        context_str = f"""
Entreprise: {context.company_name}
Secteur: {context.sector}
Taille: {context.size}
Santé financière actuelle: {context.financial_health}/100
Nombre d'analyses: {len(context.historical_analyses)}
Dernière analyse: {context.historical_analyses[0] if context.historical_analyses else 'N/A'}
"""
        
        user_message = f"""Basé sur ce contexte, génère 3 prédictions stratégiques avancées:
1. Une prédiction de croissance à 6 mois
2. Un risque caché potentiel
3. Une opportunité d'optimisation

Réponds en format JSON avec cette structure:
{{
  "predictions": [
    {{
      "type": "growth|risk|opportunity",
      "title": "Titre percutant",
      "description": "Explication détaillée avec chiffres",
      "confidence": 0.0-1.0,
      "timeframe": "3m|6m|12m",
      "impact": "low|medium|high|critical"
    }}
  ]
}}"""
        
        try:
            response = await self.orchestrator._call_groq(
                system_prompt=system_prompt,
                user_message=user_message,
                response_format={"type": "json_object"},
                temperature=0.6
            )
            
            if not response:
                return None
                
            import json
            data = json.loads(response)
            predictions = data.get("predictions", [])
            
            if predictions:
                best_prediction = predictions[0]
                return AgentInsight(
                    agent_type=self.agent_type,
                    action=AgentAction.PREDICT,
                    priority=AgentPriority.HIGH if best_prediction.get("impact") in ["high", "critical"] else AgentPriority.MEDIUM,
                    confidence=self._confidence_from_score(best_prediction.get("confidence", 0.7)),
                    title=f"Prédiction IA: {best_prediction.get('title', 'Analyse avancée')}",
                    description=best_prediction.get("description", ""),
                    data={
                        "prediction_type": best_prediction.get("type"),
                        "timeframe": best_prediction.get("timeframe"),
                        "impact": best_prediction.get("impact"),
                        "all_predictions": predictions
                    },
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                )
        except Exception as e:
            log.error(f"Groq advanced prediction error: {e}")
            
        return None
        
    def _confidence_from_score(self, score: float) -> AgentConfidence:
        """Convertit un score numérique en AgentConfidence"""
        if score >= 0.9: return AgentConfidence.CERTAIN
        if score >= 0.75: return AgentConfidence.HIGH
        if score >= 0.6: return AgentConfidence.MODERATE
        if score >= 0.4: return AgentConfidence.LOW
        return AgentConfidence.UNCERTAIN


# ════════════════════════════════════════════════════════════════════
#  ANTICIPATION AGENT — Besoins Proactifs
# ════════════════════════════════════════════════════════════════════

class AnticipationAgent(BaseAgent):
    """Agent d'anticipation des besoins utilisateur avec Groq"""
    
    def __init__(self, orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        super().__init__("anticipation")
        self.orchestrator = orchestrator
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        insights = []
        
        # 1. Anticipation des besoins d'analyse
        analysis_insight = await self._anticipate_analysis_need(context)
        if analysis_insight:
            insights.append(analysis_insight)
            
        # 2. Anticipation des besoins d'expertise
        expert_insight = await self._anticipate_expert_need(context)
        if expert_insight:
            insights.append(expert_insight)
            
        # 3. Anticipation des besoins de formation
        training_insight = await self._anticipate_training_need(context)
        if training_insight:
            insights.append(training_insight)
            
        # 4. Anticipation avancée avec Groq
        if self.orchestrator and self.orchestrator.use_ai:
            advanced_insight = await self._anticipate_advanced_groq(context)
            if advanced_insight:
                insights.append(advanced_insight)
            
        return insights
        
    async def _anticipate_analysis_need(self, context: PMEContext) -> Optional[AgentInsight]:
        """Anticipe quand une nouvelle analyse est nécessaire"""
        if not context.historical_analyses:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.ANTICIPATE,
                priority=AgentPriority.HIGH,
                confidence=AgentConfidence.HIGH,
                title="Première analyse recommandée",
                description="Lancez votre première analyse financière pour découvrir votre score et obtenir des recommandations personnalisées.",
                data={"suggested_action": "start_analysis"},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            )
            
        last_analysis = context.historical_analyses[0]
        last_date = last_analysis.get("created_at", "")
        if last_date:
            days_since = (datetime.now(timezone.utc) - datetime.fromisoformat(last_date)).days
            if days_since > 30:
                return AgentInsight(
                    agent_type=self.agent_type,
                    action=AgentAction.ANTICIPATE,
                    priority=AgentPriority.MEDIUM,
                    confidence=AgentConfidence.MODERATE,
                    title="Nouvelle analyse recommandée",
                    description=f"Votre dernière analyse date de {days_since} jours. Une nouvelle analyse pourrait révéler des évolutions importantes.",
                    data={"days_since": days_since, "suggested_action": "new_analysis"},
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
                )
        return None
        
    async def _anticipate_expert_need(self, context: PMEContext) -> Optional[AgentInsight]:
        """Anticipe le besoin d'expert comptable"""
        if not context.historical_analyses:
            return None
            
        latest = context.historical_analyses[0]
        score = latest.get("score", 100)
        
        if score < 50:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.ANTICIPATE,
                priority=AgentPriority.HIGH,
                confidence=AgentConfidence.HIGH,
                title="Expertise recommandée",
                description="Votre score financier suggère qu'un accompagnement par un expert-comptable pourrait être bénéfique.",
                data={"score": score, "suggested_action": "contact_expert"},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
            )
        return None
        
    async def _anticipate_training_need(self, context: PMEContext) -> Optional[AgentInsight]:
        """Anticipe les besoins de formation financière"""
        behavior = context.user_behavior
        failed_actions = behavior.get("failed_actions", [])
        
        if len(failed_actions) > 3:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.ANTICIPATE,
                priority=AgentPriority.MEDIUM,
                confidence=AgentConfidence.MODERATE,
                title="Formation suggérée",
                description="Certaines actions semblent difficiles. Une formation sur la gestion financière pourrait vous aider.",
                data={"failed_count": len(failed_actions), "suggested_action": "training"},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            )
        return None
        
    async def _anticipate_advanced_groq(self, context: PMEContext) -> Optional[AgentInsight]:
        """Anticipation avancée utilisant Groq LLM"""
        if not self.orchestrator:
            return None
            
        system_prompt = """Tu es un consultant stratégique expert en PME africaines.
Analyse le contexte de l'entreprise et anticipe les besoins futurs avec précision.
Identifie les besoins émergents, les opportunités de croissance, et les actions proactives à prendre."""
        
        context_str = f"""
Entreprise: {context.company_name}
Secteur: {context.sector}
Taille: {context.size}
Santé financière: {context.financial_health}/100
Stade de croissance: {context.growth_stage}
Profil de risque: {context.risk_profile}
Historique analyses: {len(context.historical_analyses)}
"""
        
        user_message = f"""Basé sur ce contexte, anticipe 3 besoins futurs:
1. Un besoin opérationnel imminent
2. Une opportunité stratégique à saisir
3. Une action préventive recommandée

Réponds en format JSON:
{{
  "anticipations": [
    {{
      "type": "operational|strategic|preventive",
      "title": "Titre clair",
      "description": "Explication détaillée",
      "urgency": "immediate|short_term|medium_term|long_term",
      "confidence": 0.0-1.0,
      "suggested_action": "action concrète"
    }}
  ]
}}"""
        
        try:
            response = await self.orchestrator._call_groq(
                system_prompt=system_prompt,
                user_message=user_message,
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            if not response:
                return None
                
            import json
            data = json.loads(response)
            anticipations = data.get("anticipations", [])
            
            if anticipations:
                best = anticipations[0]
                urgency_priority = {
                    "immediate": AgentPriority.CRITICAL,
                    "short_term": AgentPriority.HIGH,
                    "medium_term": AgentPriority.MEDIUM,
                    "long_term": AgentPriority.LOW
                }
                
                return AgentInsight(
                    agent_type=self.agent_type,
                    action=AgentAction.ANTICIPATE,
                    priority=urgency_priority.get(best.get("urgency", "medium_term"), AgentPriority.MEDIUM),
                    confidence=self._confidence_from_score(best.get("confidence", 0.7)),
                    title=f"Anticipation IA: {best.get('title', 'Analyse avancée')}",
                    description=best.get("description", ""),
                    data={
                        "anticipation_type": best.get("type"),
                        "urgency": best.get("urgency"),
                        "suggested_action": best.get("suggested_action"),
                        "all_anticipations": anticipations
                    },
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=21)).isoformat()
                )
        except Exception as e:
            log.error(f"Groq advanced anticipation error: {e}")
            
        return None


# ════════════════════════════════════════════════════════════════════
#  IMPROVEMENT AGENT — Auto-Optimisation
# ════════════════════════════════════════════════════════════════════

class ImprovementAgent(BaseAgent):
    """Agent d'amélioration continue avec Groq"""
    
    def __init__(self, orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        super().__init__("improvement")
        self.orchestrator = orchestrator
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        insights = []
        
        # 1. Suggestions d'optimisation
        opt_insight = await self._suggest_optimizations(context)
        if opt_insight:
            insights.append(opt_insight)
            
        # 2. Recommandations de workflow
        workflow_insight = await self._improve_workflow(context)
        if workflow_insight:
            insights.append(workflow_insight)
            
        # 3. Optimisations avancées avec Groq
        if self.orchestrator and self.orchestrator.use_ai:
            advanced_insight = await self._improve_advanced_groq(context)
            if advanced_insight:
                insights.append(advanced_insight)
            
        return insights
        
    async def _suggest_optimizations(self, context: PMEContext) -> Optional[AgentInsight]:
        """Suggère des optimisations basées sur l'historique"""
        if not context.historical_analyses:
            return None
            
        latest = context.historical_analyses[0]
        score = latest.get("score", 0)
        
        optimizations = []
        if score < 70:
            optimizations.append("Optimiser la gestion de trésorerie")
        if score < 60:
            optimizations.append("Réduire les coûts fixes")
        if score < 50:
            optimizations.append("Restructurer la dette")
            
        if optimizations:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.IMPROVE,
                priority=AgentPriority.HIGH,
                confidence=AgentConfidence.HIGH,
                title=f"{len(optimizations)} optimisation(s) suggérée(s)",
                description="Basé sur votre analyse, voici des pistes d'amélioration concrètes.",
                data={"optimizations": optimizations, "current_score": score},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            )
        return None
        
    async def _improve_workflow(self, context: PMEContext) -> Optional[AgentInsight]:
        """Améliore le workflow utilisateur"""
        behavior = context.user_behavior
        frequent_actions = behavior.get("frequent_actions", {})
        
        if "analysis" in frequent_actions and frequent_actions["analysis"] > 5:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.IMPROVE,
                priority=AgentPriority.LOW,
                confidence=AgentConfidence.MODERATE,
                title="Automatisation possible",
                description="Vous effectuez régulièrement des analyses. Configurez des alertes automatiques pour gagner du temps.",
                data={"action_count": frequent_actions["analysis"], "suggested_action": "setup_automation"},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
            )
        return None
        
    async def _improve_advanced_groq(self, context: PMEContext) -> Optional[AgentInsight]:
        """Optimisations avancées utilisant Groq LLM"""
        if not self.orchestrator:
            return None
            
        system_prompt = """Tu es un consultant en optimisation d'entreprise spécialisé dans les PME africaines.
Analyse la situation et propose des optimisations stratégiques concrètes et chiffrées.
Focus sur l'efficacité opérationnelle, la réduction des coûts, et l'amélioration de la rentabilité."""
        
        context_str = f"""
Entreprise: {context.company_name}
Secteur: {context.sector}
Taille: {context.size}
Santé financière: {context.financial_health}/100
Stade de croissance: {context.growth_stage}
"""
        
        user_message = f"""Propose 3 optimisations stratégiques avancées:
1. Une optimisation de trésorerie
2. Une optimification des coûts
3. Une optimification des processus

Réponds en format JSON:
{{
  "optimizations": [
    {{
      "type": "cashflow|costs|processes",
      "title": "Titre de l'optimisation",
      "description": "Explication détaillée avec bénéfices attendus",
      "estimated_impact": "percentage ou montant",
      "implementation_difficulty": "low|medium|high",
      "confidence": 0.0-1.0,
      "priority": "immediate|short_term|medium_term"
    }}
  ]
}}"""
        
        try:
            response = await self.orchestrator._call_groq(
                system_prompt=system_prompt,
                user_message=user_message,
                response_format={"type": "json_object"},
                temperature=0.6
            )
            
            if not response:
                return None
                
            import json
            data = json.loads(response)
            optimizations = data.get("optimizations", [])
            
            if optimizations:
                best = optimizations[0]
                priority_map = {
                    "immediate": AgentPriority.HIGH,
                    "short_term": AgentPriority.MEDIUM,
                    "medium_term": AgentPriority.LOW
                }
                
                return AgentInsight(
                    agent_type=self.agent_type,
                    action=AgentAction.IMPROVE,
                    priority=priority_map.get(best.get("priority", "medium_term"), AgentPriority.MEDIUM),
                    confidence=self._confidence_from_score(best.get("confidence", 0.7)),
                    title=f"Optimisation IA: {best.get('title', 'Analyse avancée')}",
                    description=best.get("description", ""),
                    data={
                        "optimization_type": best.get("type"),
                        "estimated_impact": best.get("estimated_impact"),
                        "difficulty": best.get("implementation_difficulty"),
                        "all_optimizations": optimizations
                    },
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=45)).isoformat()
                )
        except Exception as e:
            log.error(f"Groq advanced improvement error: {e}")
            
        return None


# ════════════════════════════════════════════════════════════════════
#  CORRECTION AGENT — Auto-Correction
# ════════════════════════════════════════════════════════════════════

class CorrectionAgent(BaseAgent):
    """Agent de correction automatique avec Groq"""
    
    def __init__(self, orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        super().__init__("correction")
        self.orchestrator = orchestrator
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        insights = []
        
        if trigger_event and trigger_event.get("type") == "error":
            correction = await self._suggest_correction(trigger_event)
            if correction:
                insights.append(correction)
                
        # Vérification des données incohérentes
        data_insight = await self._detect_data_inconsistencies(context)
        if data_insight:
            insights.append(data_insight)
            
        return insights
        
    async def _suggest_correction(self, error_event: Dict[str, Any]) -> Optional[AgentInsight]:
        """Suggère une correction pour une erreur"""
        error_type = error_event.get("error_type", "")
        error_msg = error_event.get("message", "")
        
        corrections = {
            "invalid_file": "Vérifiez le format du fichier (PDF, Excel, CSV)",
            "ocr_failed": "Essayez un fichier avec une meilleure qualité numérique",
            "missing_data": "Complétez les informations manquantes dans le document",
            "api_error": "Réessayez dans quelques instants ou contactez le support"
        }
        
        suggestion = corrections.get(error_type, "Vérifiez les données et réessayez")
        
        return AgentInsight(
            agent_type=self.agent_type,
            action=AgentAction.CORRECT,
            priority=AgentPriority.HIGH,
            confidence=AgentConfidence.HIGH,
            title="Correction suggérée",
            description=f"Erreur: {error_msg}. {suggestion}",
            data={"error_type": error_type, "suggestion": suggestion},
            expires_at=(datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
        )
        
    async def _detect_data_inconsistencies(self, context: PMEContext) -> Optional[AgentInsight]:
        """Détecte les incohérences dans les données"""
        if not context.historical_analyses:
            return None
            
        latest = context.historical_analyses[0]
        inconsistencies = []
        
        # Vérification équilibre bilan
        actif = latest.get("actif_total", 0)
        passif = latest.get("passif_total", 0)
        if abs(actif - passif) > max(actif, passif) * 0.05:
            inconsistencies.append("Déséquilibre Actif/Passif > 5%")
            
        if inconsistencies:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.CORRECT,
                priority=AgentPriority.MEDIUM,
                confidence=AgentConfidence.HIGH,
                title="Incohérence détectée",
                description="Certaines données semblent incohérentes. Vérifiez votre document source.",
                data={"inconsistencies": inconsistencies},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
            )
        return None


# ════════════════════════════════════════════════════════════════════
#  CONTEXT AGENT — Compréhension Contextuelle
# ════════════════════════════════════════════════════════════════════

class ContextAgent(BaseAgent):
    """Agent de compréhension et d'adaptation contextuelle avec Groq"""
    
    def __init__(self, orchestrator: Optional['HyperactiveAgentOrchestrator'] = None):
        super().__init__("context")
        self.orchestrator = orchestrator
        
    async def analyze(
        self, 
        context: PMEContext,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        insights = []
        
        # 1. Adaptation au secteur
        sector_insight = await self._adapt_to_sector(context)
        if sector_insight:
            insights.append(sector_insight)
            
        # 2. Adaptation à la taille
        size_insight = await self._adapt_to_size(context)
        if size_insight:
            insights.append(size_insight)
            
        # 3. Adaptation avancée avec Groq
        if self.orchestrator and self.orchestrator.use_ai:
            advanced_insight = await self._adapt_advanced_groq(context)
            if advanced_insight:
                insights.append(advanced_insight)
            
        return insights
        
    async def _adapt_to_sector(self, context: PMEContext) -> Optional[AgentInsight]:
        """Adapte les recommandations au secteur"""
        sector_specific = {
            "commerce": ["Gestion des stocks", "Rotation des marchandises"],
            "services": ["Optimisation de la facturation", "Gestion des délais de paiement"],
            "industrie": ["Gestion des approvisionnements", "Maintenance des équipements"],
            "tech": ["Burn rate", "Runway"]
        }
        
        recommendations = sector_specific.get(context.sector.lower(), [])
        
        if recommendations:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.ADAPT,
                priority=AgentPriority.MEDIUM,
                confidence=AgentConfidence.HIGH,
                title=f"Recommandations secteur {context.sector}",
                description="Indicateurs spécifiques à votre secteur à surveiller.",
                data={"sector": context.sector, "recommendations": recommendations},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
            )
        return None
        
    async def _adapt_to_size(self, context: PMEContext) -> Optional[AgentInsight]:
        """Adapte à la taille de l'entreprise"""
        size_specific = {
            "micro": ["Simplifier la comptabilité", "Focus sur la trésorerie"],
            "small": ["Mettre en place des procédures", "Planifier la croissance"],
            "medium": ["Optimiser les processus", "Gestion de trésorerie avancée"]
        }
        
        recommendations = size_specific.get(context.size.lower(), [])
        
        if recommendations:
            return AgentInsight(
                agent_type=self.agent_type,
                action=AgentAction.ADAPT,
                priority=AgentPriority.MEDIUM,
                confidence=AgentConfidence.HIGH,
                title=f"Recommandations taille {context.size}",
                description="Conseils adaptés à la taille de votre entreprise.",
                data={"size": context.size, "recommendations": recommendations},
                expires_at=(datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
            )
        return None
        
    async def _adapt_advanced_groq(self, context: PMEContext) -> Optional[AgentInsight]:
        """Adaptation contextuelle avancée utilisant Groq LLM"""
        if not self.orchestrator:
            return None
            
        system_prompt = """Tu es un expert en adaptation organisationnelle pour PME africaines.
Analyse le contexte complet de l'entreprise et propose des adaptations personnalisées.
Considère le secteur, la taille, le stade de croissance, et le profil de risque."""
        
        context_str = f"""
Entreprise: {context.company_name}
Secteur: {context.sector}
Taille: {context.size}
Santé financière: {context.financial_health}/100
Stade de croissance: {context.growth_stage}
Profil de risque: {context.risk_profile}
Préférences utilisateur: {context.preferences}
"""
        
        user_message = f"""Propose 3 adaptations contextuelles personnalisées:
1. Une adaptation stratégique
2. Une adaptation opérationnelle
3. Une adaptation culturelle

Réponds en format JSON:
{{
  "adaptations": [
    {{
      "type": "strategic|operational|cultural",
      "title": "Titre de l'adaptation",
      "description": "Explication détaillée",
      "relevance_score": 0.0-1.0,
      "implementation_effort": "low|medium|high",
      "expected_benefit": "bénéfice attendu"
    }}
  ]
}}"""
        
        try:
            response = await self.orchestrator._call_groq(
                system_prompt=system_prompt,
                user_message=user_message,
                response_format={"type": "json_object"},
                temperature=0.7
            )
            
            if not response:
                return None
                
            import json
            data = json.loads(response)
            adaptations = data.get("adaptations", [])
            
            if adaptations:
                best = adaptations[0]
                return AgentInsight(
                    agent_type=self.agent_type,
                    action=AgentAction.ADAPT,
                    priority=AgentPriority.MEDIUM,
                    confidence=self._confidence_from_score(best.get("relevance_score", 0.7)),
                    title=f"Adaptation IA: {best.get('title', 'Analyse avancée')}",
                    description=best.get("description", ""),
                    data={
                        "adaptation_type": best.get("type"),
                        "implementation_effort": best.get("implementation_effort"),
                        "expected_benefit": best.get("expected_benefit"),
                        "all_adaptations": adaptations
                    },
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=60)).isoformat()
                )
        except Exception as e:
            log.error(f"Groq advanced adaptation error: {e}")
            
        return None
        
    def _confidence_from_score(self, score: float) -> AgentConfidence:
        """Convertit un score numérique en AgentConfidence"""
        if score >= 0.9: return AgentConfidence.CERTAIN
        if score >= 0.75: return AgentConfidence.HIGH
        if score >= 0.6: return AgentConfidence.MODERATE
        if score >= 0.4: return AgentConfidence.LOW
        return AgentConfidence.UNCERTAIN


# ════════════════════════════════════════════════════════════════════
#  ORCHESTRATOR — Coordination des Agents Hyperactifs
# ════════════════════════════════════════════════════════════════════

class HyperactiveAgentOrchestrator:
    """
    Orchestrateur principal des agents hyperactifs
    Coordination, priorisation et exécution des insights
    """
    
    def __init__(self):
        # Pass self to agents for Groq access
        self.agents: List[BaseAgent] = [
            PredictionAgent(orchestrator=self),
            AnticipationAgent(orchestrator=self),
            ImprovementAgent(orchestrator=self),
            CorrectionAgent(orchestrator=self),
            ContextAgent(orchestrator=self)
        ]
        self.active_insights: Dict[str, AgentInsight] = {}
        self.context_cache: Dict[str, PMEContext] = {}
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.use_ai = bool(self.groq_api_key)
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
    async def _call_groq(
        self,
        system_prompt: str,
        user_message: str,
        response_format: Optional[dict] = None,
        temperature: float = 0.7
    ) -> str:
        """Appelle l'API Groq pour des capacités avancées"""
        if not self.use_ai:
            log.warning("Groq API key not configured, using fallback")
            return ""
            
        try:
            import openai
            client = openai.AsyncOpenAI(
                api_key=self.groq_api_key,
                base_url="https://api.groq.com/openai/v1"
            )
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
            
            kwargs = {
                "model": self.groq_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": 2000
            }
            
            if response_format:
                kwargs["response_format"] = response_format
                
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
            
        except Exception as e:
            log.error(f"Groq API error: {e}")
            return ""
        
    async def update_context(self, user_id: str, context_data: Dict[str, Any]):
        """Met à jour le contexte d'un utilisateur"""
        context = PMEContext(
            user_id=user_id,
            company_name=context_data.get("company_name", ""),
            sector=context_data.get("sector", "Unknown"),
            size=context_data.get("size", "small"),
            financial_health=context_data.get("financial_health", 50),
            historical_analyses=context_data.get("historical_analyses", []),
            user_behavior=context_data.get("user_behavior", {}),
            preferences=context_data.get("preferences", {}),
            risk_profile=context_data.get("risk_profile", "moderate"),
            growth_stage=context_data.get("growth_stage", "stable"),
            last_activity=context_data.get("last_activity")
        )
        self.context_cache[user_id] = context
        
    async def trigger_agents(
        self,
        user_id: str,
        trigger_event: Optional[Dict[str, Any]] = None
    ) -> List[AgentInsight]:
        """Déclenche tous les agents pour un utilisateur"""
        if user_id not in self.context_cache:
            log.warning(f"No context found for user {user_id}")
            return []
            
        context = self.context_cache[user_id]
        all_insights = []
        
        # Exécution parallèle des agents
        tasks = [agent.analyze(context, trigger_event) for agent in self.agents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, Exception):
                log.error(f"Agent error: {result}")
            elif isinstance(result, list):
                all_insights.extend(result)
                
        # Filtrage et priorisation
        filtered_insights = self._filter_insights(all_insights)
        prioritized = self._prioritize_insights(filtered_insights)
        
        # Stockage des insights actifs
        for insight in prioritized:
            self.active_insights[f"{user_id}_{insight.agent_type}_{insight.action}"] = insight
            
        return prioritized
        
    def _filter_insights(self, insights: List[AgentInsight]) -> List[AgentInsight]:
        """Filtre les insights selon la confiance et l'expiration"""
        now = datetime.now(timezone.utc)
        filtered = []
        
        for insight in insights:
            # Vérifier la confiance
            if insight.confidence in [AgentConfidence.UNCERTAIN, AgentConfidence.LOW]:
                continue
                
            # Vérifier l'expiration
            if insight.expires_at:
                expires = datetime.fromisoformat(insight.expires_at)
                if expires < now:
                    continue
                    
            filtered.append(insight)
            
        return filtered
        
    def _prioritize_insights(self, insights: List[AgentInsight]) -> List[AgentInsight]:
        """Priorise les insights"""
        priority_order = {
            AgentPriority.CRITICAL: 0,
            AgentPriority.HIGH: 1,
            AgentPriority.MEDIUM: 2,
            AgentPriority.LOW: 3
        }
        
        return sorted(insights, key=lambda x: priority_order.get(x.priority, 4))
        
    async def get_active_insights(self, user_id: str) -> List[AgentInsight]:
        """Récupère les insights actifs pour un utilisateur"""
        user_insights = [
            insight for key, insight in self.active_insights.items()
            if key.startswith(f"{user_id}_")
        ]
        
        # Nettoyer les insights expirés
        now = datetime.now(timezone.utc)
        active = []
        for insight in user_insights:
            if insight.expires_at:
                expires = datetime.fromisoformat(insight.expires_at)
                if expires > now:
                    active.append(insight)
                else:
                    # Supprimer l'insight expiré
                    key = f"{user_id}_{insight.agent_type}_{insight.action}"
                    self.active_insights.pop(key, None)
            else:
                active.append(insight)
                
        return active
        
    async def execute_insight_action(
        self,
        user_id: str,
        insight_id: str
    ) -> Dict[str, Any]:
        """Exécute l'action suggérée par un insight"""
        key = f"{user_id}_{insight_id}"
        insight = self.active_insights.get(key)
        
        if not insight:
            return {"success": False, "error": "Insight not found"}
            
        try:
            # Exécution selon le type d'action
            if insight.action == AgentAction.ANTICIPATE:
                return await self._execute_anticipation(insight)
            elif insight.action == AgentAction.IMPROVE:
                return await self._execute_improvement(insight)
            elif insight.action == AgentAction.CORRECT:
                return await self._execute_correction(insight)
            else:
                return {"success": True, "message": "Action noted", "insight": insight.model_dump()}
                
        except Exception as e:
            log.error(f"Execute insight error: {e}")
            return {"success": False, "error": str(e)}
            
    async def _execute_anticipation(self, insight: AgentInsight) -> Dict[str, Any]:
        """Exécute une anticipation"""
        suggested = insight.data.get("suggested_action")
        return {
            "success": True,
            "message": f"Anticipation exécutée: {suggested}",
            "action_taken": suggested
        }
        
    async def _execute_improvement(self, insight: AgentInsight) -> Dict[str, Any]:
        """Exécute une amélioration"""
        optimizations = insight.data.get("optimizations", [])
        return {
            "success": True,
            "message": f"{len(optimizations)} optimisation(s) notée(s)",
            "optimizations": optimizations
        }
        
    async def _execute_correction(self, insight: AgentInsight) -> Dict[str, Any]:
        """Exécute une correction"""
        suggestion = insight.data.get("suggestion")
        return {
            "success": True,
            "message": f"Correction appliquée: {suggestion}",
            "correction": suggestion
        }
        
    async def generate_hyperactive_summary(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """Génère un résumé hyperactif de la situation"""
        insights = await self.get_active_insights(user_id)
        context = self.context_cache.get(user_id)
        
        summary = {
            "user_id": user_id,
            "total_insights": len(insights),
            "critical_insights": len([i for i in insights if i.priority == AgentPriority.CRITICAL]),
            "high_priority_insights": len([i for i in insights if i.priority == AgentPriority.HIGH]),
            "agent_activity": {
                agent.agent_type: len([i for i in insights if i.agent_type == agent.agent_type])
                for agent in self.agents
            },
            "financial_health": context.financial_health if context else 0,
            "last_analysis": context.historical_analyses[0] if context and context.historical_analyses else None,
            "recommended_actions": [
                {
                    "title": i.title,
                    "priority": i.priority,
                    "action": i.data.get("suggested_action")
                }
                for i in insights[:5]
            ]
        }
        
        return summary


# Instance singleton
hyperactive_orchestrator = HyperactiveAgentOrchestrator()
