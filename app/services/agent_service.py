"""
Agent IA Amélioré — Doctor Smile
Fonctionnalités :
  - Chatbot interactif
  - Recommandations personnalisées
  - Génération de résumés IA
  - Prédictions de score
  - Moteur de règles personnalisées
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

log = logging.getLogger("doctorsmile.agent_service")


class AgentService:
    """Service principal de l'Agent IA."""

    def __init__(self):
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        self.use_ai = bool(self.groq_api_key)

    async def get_chat_response(
        self,
        user_message: str,
        user_data: dict[str, Any],
        analyses: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        Répond à une question de l'utilisateur via le chatbot IA.
        Si OpenAI n'est pas configuré, utilise des réponses prédéfinies intelligentes.
        """
        try:
            # Construire le contexte pour l'IA
            context = self._build_context(user_data, analyses)
            
            if self.use_ai:
                return await self._get_ai_response(user_message, context)
            else:
                return self._get_rule_based_response(user_message, user_data, analyses)

        except Exception as e:
            log.error(f"[Agent Chat] Error: {e}")
            return {
                "success": False,
                "message": "Désolé, je ne peux pas répondre pour le moment. Veuillez réessayer plus tard."
            }

    def _build_context(
        self,
        user_data: dict[str, Any],
        analyses: list[dict[str, Any]]
    ) -> str:
        """Construit le contexte pour l'IA."""
        context = []
        context.append(f"Entreprise : {user_data.get('entreprise', {}).get('nom', 'Non renseignée')}")
        context.append(f"Secteur : {user_data.get('entreprise', {}).get('secteur', 'Non renseigné')}")
        
        if analyses:
            last_analysis = analyses[0]
            context.append(f"Dernier score : {last_analysis.get('score', 'N/A')}/100")
            context.append(f"Zone : {last_analysis.get('zone', 'N/A')}")
        
        return "\n".join(context)

    async def _get_ai_response(
        self,
        user_message: str,
        context: str
    ) -> dict[str, Any]:
        """Réponse via Groq API."""
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.groq_api_key, base_url="https://api.groq.com/openai/v1")
            
            system_prompt = """Tu es Doctor Smile, un analyste financier stratège de très haut niveau.
Tu analyses les données d'entreprises africaines et fournis des conseils ultra-pointus, directs et chiffrés.
Aucun jargon inutile, uniquement des recommandations stratégiques à haute valeur ajoutée.
Sois incisif, professionnel, et orienté action."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Contexte :\n{context}\n\nQuestion : {user_message}"}
            ]

            response = await client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=messages,
                max_tokens=800,
                temperature=0.4
            )

            return {
                "success": True,
                "message": response.choices[0].message.content
            }

        except Exception as e:
            log.error(f"[Agent Groq] Error: {e}")
            return self._get_rule_based_response(user_message, {}, [])

    def _get_rule_based_response(
        self,
        user_message: str,
        user_data: dict[str, Any],
        analyses: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Réponses intelligentes prédéfinies (fallback sans OpenAI)."""
        message_lower = user_message.lower()
        
        # Analyse du dernier score
        if analyses:
            last = analyses[0]
            score = last.get("score", 0)
        
        if "score" in message_lower:
            if not analyses:
                return {"success": True, "message": "Vous n'avez pas encore fait d'analyse ! Rendez-vous dans la section Analyse pour calculer votre score."}
            score_msg = f"Votre dernier score est de {score}/100, ce qui vous place dans la zone {last.get('zone', 'N/A')}."
            if score >= 80:
                score_msg += " Excellent travail ! Votre entreprise est en très bonne santé financière."
            elif score >= 60:
                score_msg += " Bon résultat ! Quelques ajustements pourraient vous amener dans la zone Saine."
            elif score >= 40:
                score_msg += " Attention, il y a des points à surveiller. Je vous recommande de consulter les recommandations détaillées."
            else:
                score_msg += " Votre situation nécessite une attention immédiate. Contactez un expert pour obtenir des conseils adaptés."
            return {"success": True, "message": score_msg}

        elif "conseil" in message_lower or "recommandation" in message_lower:
            return {
                "success": True,
                "message": """Voici mes recommandations générales pour améliorer votre santé financière :
1. 🔄 Suivez vos flux de trésorerie chaque mois
2. 📊 Analysez vos ratios clés régulièrement
3. 💹 Optimisez vos coûts variables
4. 📈 Élaborez un plan de trésorerie prévisionnel
5. 🤝 Envisagez un accompagnement par un expert-comptable

Pour des conseils personnalisés, faites une analyse financière complète !"""
            }

        elif "analyse" in message_lower:
            return {
                "success": True,
                "message": "Pour lancer une analyse, rendez-vous dans la section « Analyse » du dashboard et uploadez votre fichier (Excel, CSV ou PDF). Notre IA calculera votre score en quelques secondes !"
            }

        elif "aide" in message_lower or "help" in message_lower:
            return {
                "success": True,
                "message": """Voici ce que je peux faire pour vous :
• 💬 Répondre à vos questions sur votre score et vos analyses
• 📊 Donner des recommandations pour améliorer votre santé financière
• 📄 Expliquer les différents ratios financiers
• 🔔 Configurer des alertes personnalisées
• 📈 Vous aider à comprendre vos prévisions

N'hésitez pas à me poser des questions !"""
            }

        elif "ratio" in message_lower:
            return {
                "success": True,
                "message": """Les ratios clés que nous analysons :
• 📉 **Liquidité courante** : Capacité à rembourser les dettes à court terme
• 💰 **Marge bénéficiaire** : Rentabilité de vos ventes
• 📊 **Endettement** : Niveau de dette par rapport aux capitaux propres
• 📈 **ROA/ROE** : Rentabilité des actifs et des capitaux propres

Voulez-vous plus de détails sur un ratio en particulier ?"""
            }

        else:
            return {
                "success": True,
                "message": "Je suis là pour vous aider avec vos questions financières ! Essayez de me demander :\n• Votre score actuel\n• Des conseils\n• Une explication des ratios\n• De l'aide pour lancer une analyse"
            }

    async def get_personalized_recommendations(
        self,
        user_data: dict[str, Any],
        last_analysis: Optional[dict[str, Any]] = None
    ) -> list[dict[str, Any]]:
        """Génère des recommandations personnalisées via IA (JSON Structured Output)."""
        if not last_analysis:
            return [{
                "type": "info",
                "priority": "high",
                "title": "Lancez votre première analyse",
                "description": "Pour obtenir des recommandations avancées via notre IA, commencez par analyser vos données financières."
            }]

        if not self.use_ai:
            # Fallback simple
            return [{
                "type": "warning",
                "priority": "medium",
                "title": "Mode IA désactivé",
                "description": f"Votre score est de {last_analysis.get('score', 0)}/100. Configurez une clé API Groq pour des recommandations dynamiques."
            }]

        try:
            import openai
            client = openai.AsyncOpenAI(api_key=self.groq_api_key, base_url="https://api.groq.com/openai/v1")

            system_prompt = """Tu es Doctor Smile, un Consultant Stratégique Senior (CFO d'élite).
Analyse les données financières suivantes avec une précision extrême.
Génère EXACTEMENT 3 recommandations stratégiques majeures. Pas de conseils basiques (comme "réduisez vos dépenses"). Donne des stratégies sophistiquées (ex: "Optimisation du BFR via l'affacturage inversé", "Restructuration de la dette mezzanine").
Réponds UNIQUEMENT avec un objet JSON valide ayant cette structure exacte :
{
  "recommendations": [
    {
      "type": "warning" | "success" | "info",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "Titre stratégique pointu",
      "description": "Explication haut niveau de la stratégie, incluant les impacts chiffrés attendus."
    }
  ]
}"""
            context = f"Entreprise: {user_data}\nAnalyse: {last_analysis}"

            response = await client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Génère les recommandations stratégiques:\n{context}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.3
            )

            import json
            data = json.loads(response.choices[0].message.content)
            return data.get("recommendations", [])

        except Exception as e:
            log.error(f"[Agent Recommendations] Error: {e}")
            return [{
                "type": "warning",
                "priority": "high",
                "title": "Erreur d'analyse IA",
                "description": "L'intelligence artificielle n'a pas pu générer les recommandations. Veuillez réessayer."
            }]

    async def generate_summary(
        self,
        analysis_data: dict[str, Any]
    ) -> dict[str, Any]:
        """Génère un résumé IA puissant et analytique de l'analyse financière."""
        try:
            if not self.use_ai:
                return {
                    "success": True,
                    "summary": f"Score: {analysis_data.get('score', 0)}/100. (Mode IA désactivé)",
                    "highlights": []
                }

            import openai
            client = openai.AsyncOpenAI(api_key=self.groq_api_key, base_url="https://api.groq.com/openai/v1")

            system_prompt = """Tu es un auditeur financier d'élite (ex-Big 4).
Analyse les données financières et génère un résumé exécutif extrêmement pointu. Pas de bla-bla.
Réponds UNIQUEMENT avec un objet JSON valide ayant cette structure exacte :
{
  "summary": "Résumé exécutif percutant (2-3 phrases max) identifiant le risque critique ou le levier de croissance clé.",
  "highlights": [
    {
      "metric": "Nom de la métrique clé (ex: Ratio de Solvabilité)",
      "value": "Valeur avec unité",
      "status": "critical" | "warning" | "success" | "info"
    }
  ]
}"""
            response = await client.chat.completions.create(
                model="openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Données:\n{analysis_data}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.2
            )

            import json
            data = json.loads(response.choices[0].message.content)
            return {
                "success": True,
                "summary": data.get("summary", "Résumé non disponible."),
                "highlights": data.get("highlights", [])
            }

        except Exception as e:
            log.error(f"[Agent Summary] Error: {e}")
            return {"success": False, "error": str(e)}


# Instance singleton
agent_service = AgentService()
