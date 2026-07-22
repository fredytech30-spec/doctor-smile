

"""
Kimi Intelligence Service - Doctor Smile
Integrates Kimi (via Groq) for advanced automation, prevention, analysis, and correction
"""

from __future__ import annotations
import asyncio
import logging
import os
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger("doctorsmile.kimi_intelligence")

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AnalysisType(Enum):
    RISK = "risk"
    OPPORTUNITY = "opportunity"
    ANOMALY = "anomaly"
    TREND = "trend"

class KimiIntelligenceService:
    """
    Advanced intelligence service powered by Kimi (via Groq)
    - Proactive prevention (anomaly detection, risk alerts)
    - Deep analysis (financial insights, trend forecasting)
    - Smart correction (data validation, inconsistency fixing)
    - Intelligent automation (workflow generation, decision support)
    """

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.use_kimi = bool(self.groq_api_key)
        self.base_url = "https://api.groq.com/openai/v1"
        self.model = "openai/gpt-oss-120b"

    async def _call_kimi(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.2,
        max_tokens: int = 4000,
        response_format: Optional[Dict] = None,
    ) -> str:
        """Helper to call Kimi via Groq API"""
        if not self.use_kimi:
            raise ValueError("GROQ_API_KEY not configured")
        
        try:
            import httpx
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            payload = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            if response_format:
                payload["response_format"] = response_format
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.groq_api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                response.raise_for_status()
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
        
        except Exception as e:
            logger.error(f"[Kimi] API call failed: {e}")
            raise

    # ==================== PROACTIVE PREVENTION ====================
    
    async def detect_anomalies(
        self,
        financial_data: Dict[str, Any],
        historical_data: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        """
        Detect financial anomalies and risks proactively
        """
        system_prompt = """
Tu es un expert comptable et auditeur financier OHADA/SYSCOHADA spécialisé en détection d'anomalies.
Analyse ces données financières et identifie tous les risques, anomalies ou points d'attention.

Réponds UNIQUEMENT en JSON avec ce format :
{
  "anomalies": [
    {
      "type": "anomaly_type",
      "description": "Description claire",
      "severity": "critical|high|medium|low",
      "account": "Compte OHADA concerné",
      "impact": "Impact financier potentiel",
      "recommendation": "Action immédiate à prendre"
    }
  ],
  "risk_score": 0-100,
  "summary": "Résumé exécutif"
}
        """.strip()
        
        financial_data_json = json.dumps(financial_data, ensure_ascii=False, indent=2)
        historical_part = ''
        if historical_data:
            historical_part = 'Données historiques pour comparaison :\n' + json.dumps(historical_data[-3:], ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Données financières actuelles :',
            financial_data_json,
            '',
            historical_part,
            '',
            'Identifie toutes les anomalies et risques.'
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.1,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "data": result,
                "detected_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Anomaly detection failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "anomalies": [],
                "risk_score": 50
            }

    async def generate_preventive_alerts(
        self,
        financial_data: Dict[str, Any],
    ) -> List[Dict[str, Any]]:
        """Generate proactive preventive alerts"""
        anomaly_result = await self.detect_anomalies(financial_data)
        
        if not anomaly_result["success"]:
            return []
        
        alerts = []
        for anomaly in anomaly_result["data"].get("anomalies", []):
            alert = {
                "alert_id": f"ALERT_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{hash(anomaly['description']) % 1000}",
                "type": anomaly["type"],
                "severity": anomaly["severity"],
                "title": f"Risque détecté : {anomaly['type']}",
                "description": anomaly["description"],
                "account": anomaly.get("account"),
                "impact": anomaly.get("impact"),
                "recommendation": anomaly.get("recommendation"),
                "created_at": datetime.utcnow().isoformat(),
                "status": "active"
            }
            alerts.append(alert)
        
        return alerts

    # ==================== DEEP ANALYSIS ====================
    
    async def analyze_financial_health(
        self,
        financial_data: Dict[str, Any],
        sector: str = "default",
    ) -> Dict[str, Any]:
        """
        Comprehensive financial health analysis with actionable insights
        """
        system_prompt = """
Tu es un Directeur Financier (CFO) virtuel expert OHADA/SYSCOHADA et stratégie d'entreprise africaine.
Analyse approfondie de la santé financière et recommandations stratégiques.

Réponds UNIQUEMENT en JSON :
{
  "overall_health": "excellent|good|moderate|poor|critical",
  "health_score": 0-100,
  "strengths": [
    {
      "factor": "Nom du point fort",
      "description": "Explication",
      "impact": "Impact positif"
    }
  ],
  "weaknesses": [
    {
      "factor": "Nom du point faible",
      "description": "Explication",
      "impact": "Risque associé"
    }
  ],
  "key_insights": [
    {
      "title": "Titre de l'insight",
      "content": "Contenu détaillé",
      "priority": "high|medium|low"
    }
  ],
  "strategic_recommendations": [
    {
      "action": "Action à prendre",
      "timeline": "30j|90j|180j",
      "expected_impact": "Impact attendu",
      "priority": "critical|high|medium|low"
    }
  ]
}
        """.strip()
        
        financial_data_json = json.dumps(financial_data, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Analyse approfondie de cette entreprise (secteur: ' + sector + ') :',
            financial_data_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.3,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "analysis": result,
                "analyzed_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Health analysis failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def forecast_trends(
        self,
        financial_data: Dict[str, Any],
        historical_periods: int = 6,
    ) -> Dict[str, Any]:
        """Forecast financial trends"""
        system_prompt = """
Tu es un analyste financier spécialisé en prévisions et tendances pour entreprises africaines.
Basé sur les données fournies, prévois les tendances financières pour les 3 prochains mois.

Réponds UNIQUEMENT en JSON :
{
  "forecasts": [
    {
      "metric": "Nom de la métrique",
      "current_value": 0,
      "forecast_1m": 0,
      "forecast_3m": 0,
      "trend": "up|down|stable",
      "confidence": 0-100,
      "factors": ["Facteur 1", "Facteur 2"]
    }
  ],
  "opportunities": [
    {
      "description": "Description de l'opportunité",
      "potential_impact": "Impact potentiel",
      "confidence": 0-100
    }
  ],
  "risks": [
    {
      "description": "Description du risque",
      "potential_impact": "Impact potentiel",
      "mitigation": "Mesure de mitigation"
    }
  ],
  "executive_summary": "Résumé des prévisions"
}
        """.strip()
        
        financial_data_json = json.dumps(financial_data, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Données financières pour prévisions :',
            financial_data_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.2,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "forecast": result,
                "generated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Trend forecasting failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # ==================== SMART CORRECTION ====================
    
    async def validate_and_correct_data(
        self,
        financial_data: Dict[str, Any],
    ) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate financial data and suggest corrections
        Returns (is_valid, issues, corrected_data)
        """
        system_prompt = """
Tu es un auditeur comptable expert OHADA/SYSCOHADA.
Valide ces données financières, identifie les incohérences et propose des corrections.

Réponds UNIQUEMENT en JSON :
{
  "is_valid": true/false,
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "description": "Description du problème",
      "field": "Champ concerné",
      "current_value": "Valeur actuelle",
      "suggested_value": "Valeur corrigée suggérée",
      "reason": "Raison de la correction"
    }
  ],
  "corrected_data": { ... }
}
        """.strip()
        
        financial_data_json = json.dumps(financial_data, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Valide et corrige ces données financières :',
            financial_data_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.1,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return (
                result.get("is_valid", True),
                result.get("issues", []),
                result.get("corrected_data", financial_data)
            )
        except Exception as e:
            logger.error(f"[Kimi] Data validation failed: {e}")
            return (True, [], financial_data)

    async def reconcile_inconsistencies(
        self,
        data_sources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Reconcile data from multiple sources"""
        system_prompt = """
Tu es un expert en réconciliation comptable OHADA.
Réconcilie ces données provenant de sources multiples et propose une version cohérente finale.

Réponds UNIQUEMENT en JSON :
{
  "reconciled_data": { ... },
  "adjustments": [
    {
      "source": "Source des données",
      "field": "Champ ajusté",
      "original_value": "Valeur originale",
      "adjusted_value": "Valeur ajustée",
      "reason": "Raison de l'ajustement"
    }
  ],
  "confidence": 0-100,
  "summary": "Résumé de la réconciliation"
}
        """.strip()
        
        data_sources_json = json.dumps(data_sources, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Réconcilie ces sources de données :',
            data_sources_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.1,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "data": result,
                "reconciled_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Reconciliation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # ==================== INTELLIGENT AUTOMATION ====================
    
    async def generate_workflow(
        self,
        goal: str,
        context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Generate automated workflow suggestions"""
        system_prompt = """
Tu es un consultant en automatisation financière expert.
Génère un workflow d'automatisation détaillé pour atteindre l'objectif donné.

Réponds UNIQUEMENT en JSON :
{
  "workflow_name": "Nom du workflow",
  "objective": "Objectif clair",
  "steps": [
    {
      "step_number": 1,
      "action": "Action à exécuter",
      "trigger": "Condition de déclenchement",
      "responsible": "Qui/quoi exécute",
      "tools_needed": ["Outil 1", "Outil 2"],
      "expected_output": "Résultat attendu",
      "timeline_seconds": 30
    }
  ],
  "automation_level": "fully|partial|manual",
  "estimated_time_saved": "Temps économisé par période",
  "prerequisites": ["Prérequis 1", "Prérequis 2"]
}
        """.strip()
        
        context_json = json.dumps(context, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Objectif : ' + goal,
            'Contexte : ' + context_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.3,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "workflow": result,
                "generated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Workflow generation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def suggest_decisions(
        self,
        decision_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Suggest data-driven decisions"""
        system_prompt = """
Tu es un conseil stratégique financier pour entreprises africaines.
Propose des décisions basées sur les données fournies.

Réponds UNIQUEMENT en JSON :
{
  "decision_options": [
    {
      "option": "Nom de l'option",
      "description": "Description détaillée",
      "pros": ["Avantage 1", "Avantage 2"],
      "cons": ["Inconvénient 1", "Inconvénient 2"],
      "financial_impact": "Impact financier estimé",
      "risk_level": "low|medium|high",
      "recommended": true/false,
      "confidence": 0-100
    }
  ],
  "executive_recommendation": "Recommandation finale",
  "key_factors": ["Facteur clé 1", "Facteur clé 2"]
}
        """.strip()
        
        decision_context_json = json.dumps(decision_context, ensure_ascii=False, indent=2)
        user_prompt = '\n'.join([
            'Contexte de la décision :',
            decision_context_json
        ]).strip()
        
        try:
            response = await self._call_kimi(
                system_prompt, user_prompt, temperature=0.3,
                response_format={"type": "json_object"}
            )
            result = json.loads(response)
            return {
                "success": True,
                "decisions": result,
                "generated_at": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"[Kimi] Decision suggestion failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    # ==================== COMPREHENSIVE ANALYSIS WRAPPER ====================
    
    async def full_intelligence_analysis(
        self,
        financial_data: Dict[str, Any],
        sector: str = "default",
    ) -> Dict[str, Any]:
        """
        Run complete intelligence analysis pipeline:
        - Anomaly detection
        - Health analysis
        - Trend forecasting
        - Data validation
        - Recommendations
        """
        logger.info("[Kimi] Starting full intelligence analysis")
        
        results = {}
        
        # Run all analyses in parallel
        tasks = [
            self.detect_anomalies(financial_data),
            self.analyze_financial_health(financial_data, sector),
            self.forecast_trends(financial_data),
            self.validate_and_correct_data(financial_data)
        ]
        
        anomaly_result, health_result, forecast_result, validation_result = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        results["anomalies"] = anomaly_result if not isinstance(anomaly_result, Exception) else {"success": False, "error": str(anomaly_result)}
        results["health"] = health_result if not isinstance(health_result, Exception) else {"success": False, "error": str(health_result)}
        results["forecast"] = forecast_result if not isinstance(forecast_result, Exception) else {"success": False, "error": str(forecast_result)}
        
        if not isinstance(validation_result, Exception):
            is_valid, issues, corrected = validation_result
            results["validation"] = {
                "success": True,
                "is_valid": is_valid,
                "issues": issues,
                "corrected_data": corrected
            }
        else:
            results["validation"] = {"success": False, "error": str(validation_result)}
        
        # Generate executive summary
        results["executive_summary"] = await self._generate_executive_summary(results)
        
        logger.info("[Kimi] Full intelligence analysis complete")
        
        return {
            "success": True,
            "results": results,
            "generated_at": datetime.utcnow().isoformat()
        }

    async def _generate_executive_summary(
        self,
        results: Dict[str, Any],
    ) -> str:
        """Generate human-readable executive summary"""
        try:
            system_prompt = """
Tu es un rédacteur de rapports financiers d'élite.
Rédige un résumé exécutif concis et percutant basé sur ces analyses.
Max 250 mots.
            """.strip()
            
            results_json = json.dumps(results, ensure_ascii=False, indent=2)
            user_prompt = '\n'.join([
                'Résultats des analyses :',
                results_json
            ]).strip()
            
            summary = await self._call_kimi(system_prompt, user_prompt, temperature=0.3, max_tokens=500)
            return summary
        except Exception as e:
            logger.error(f"[Kimi] Summary generation failed: {e}")
            return "Analyse complète terminée. Consultez les détails pour plus d'informations."


# Singleton instance
kimi_intelligence_service = KimiIntelligenceService()

