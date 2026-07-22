"""
Chatbot Service - Doctor Smile v4.0
Chatbot focalisé sur diagnostic financier avec réponses percutantes
Template : Réponse concise + actionnable
"""

from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


class ChatbotService:
    """Service de chatbot pour diagnostic financier"""
    
    def __init__(self):
        self.max_response_length = 300  # Caractères max par réponse
        self.focus_areas = [
            "liquidité",
            "endettement", 
            "rentabilité",
            "trésorerie",
            "créances clients",
            "dettes fournisseurs"
        ]
    
    async def generate_response(
        self,
        user_query: str,
        analysis_data: Dict[str, Any],
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Génère une réponse percutante à la question de l'utilisateur
        
        Args:
            user_query: Question de l'utilisateur
            analysis_data: Données de l'analyse financière
            llm_client: Client LLM optionnel
            
        Returns:
            Dict avec réponse et métadonnées
        """
        try:
            logger.info(f"[Chatbot] Question: {user_query}")
            logger.info(f"[Chatbot] LLM client available: {bool(llm_client)}")
            
            # Détection de l'intention
            intent = self._detect_intent(user_query)
            
            # Génération de la réponse
            if llm_client:
                logger.info(f"[Chatbot] Using LLM client for response generation")
                response = await self._generate_llm_response(
                    user_query, 
                    analysis_data, 
                    intent,
                    llm_client
                )
            else:
                logger.info(f"[Chatbot] Using rule-based response (no LLM client)")
                response = self._generate_rule_based_response(
                    user_query,
                    analysis_data,
                    intent
                )
            
            return {
                'success': True,
                'response': response,
                'intent': intent,
                'confidence': 0.8
            }
            
        except Exception as e:
            logger.error(f"[Chatbot] Erreur génération réponse: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': "Je n'ai pas pu répondre à votre question. Veuillez reformuler."
            }
    
    def _detect_intent(self, query: str) -> str:
        """Détecte l'intention de la question"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['liquidité', 'trésorerie', 'cash', 'argent']):
            return 'liquidite'
        elif any(word in query_lower for word in ['dette', 'emprunt', 'crédit', 'financement']):
            return 'endettement'
        elif any(word in query_lower for word in ['rentabilité', 'profit', 'marge', 'bénéfice']):
            return 'rentabilite'
        elif any(word in query_lower for word in ['client', 'créance', 'facture', 'paiement']):
            return 'creances'
        elif any(word in query_lower for word in ['fournisseur', 'dette fournisseur']):
            return 'fournisseurs'
        elif any(word in query_lower for word in ['score', 'risque', 'vulnérabilité']):
            return 'score'
        elif any(word in query_lower for word in ['recommandation', 'conseil', 'action']):
            return 'recommandations'
        else:
            return 'general'
    
    async def _generate_llm_response(
        self,
        query: str,
        analysis_data: Dict[str, Any],
        intent: str,
        llm_client: Any
    ) -> str:
        """Génère une réponse via LLM"""
        prompt = self._build_chatbot_prompt(query, analysis_data, intent)
        logger.info(f"[Chatbot] Calling LLM with prompt (first 100 chars): {prompt[:100]}...")
        
        try:
            response = await llm_client.generate(prompt)
            logger.info(f"[Chatbot] LLM response received (first 100 chars): {response[:100]}...")
            # Nettoyage pour garder la réponse concise
            return self._clean_response(response)
        except Exception as e:
            logger.error(f"[Chatbot] Erreur LLM: {e}", exc_info=True)
            return self._generate_rule_based_response(query, analysis_data, intent)
    
    def _generate_rule_based_response(
        self,
        query: str,
        analysis_data: Dict[str, Any],
        intent: str
    ) -> str:
        """Génère une réponse basée sur des règles"""
        ratios = analysis_data.get('ratios', {})
        score = analysis_data.get('score', 0)
        
        if intent == 'liquidite':
            current_ratio = ratios.get('current_ratio', 0)
            if current_ratio < 1.0:
                return f"⚠️ Liquidité critique ({current_ratio:.2f}). Négociez des délais fournisseurs ou obtenez un financement court terme."
            elif current_ratio < 1.5:
                return f"⚡ Liquidité fragile ({current_ratio:.2f}). Surveillez vos créances clients."
            else:
                return f"✅ Liquidité saine ({current_ratio:.2f}). Continuez ainsi."
        
        elif intent == 'endettement':
            debt_equity = ratios.get('debt_equity', 0)
            if debt_equity > 2.0:
                return f"⚠️ Endettement élevé ({debt_equity:.2f}). Renégociez votre dette long terme."
            elif debt_equity > 1.0:
                return f"⚡ Endettement modéré ({debt_equity:.2f}). Surveillez votre capacité de remboursement."
            else:
                return f"✅ Endettement maîtrisé ({debt_equity:.2f})."
        
        elif intent == 'rentabilite':
            roe = ratios.get('roe', 0)
            if roe < 0.05:
                return f"⚠️ Rentabilité faible ({roe:.2%}). Optimisez vos coûts et marges."
            elif roe < 0.10:
                return f"⚡ Rentabilité moyenne ({roe:.2%}). Améliorez votre rotation d'actifs."
            else:
                return f"✅ Rentabilité satisfaisante ({roe:.2%})."
        
        elif intent == 'creances':
            dsr = ratios.get('dsr', 0)
            if dsr > 60:
                return f"⚠️ Clients paient trop lentement ({dsr:.0f} jours). Mettez en place des relances systématiques."
            elif dsr > 45:
                return f"⚡ Délai de paiement moyen ({dsr:.0f} jours). Proposez des escomptes pour paiement anticipé."
            else:
                return f"✅ Recouvrement correct ({dsr:.0f} jours)."
        
        elif intent == 'fournisseurs':
            dpo = ratios.get('dpo', 0)
            if dpo < 30:
                return f"⚠️ Vous payez trop rapidement ({dpo:.0f} jours). Négociez des délais plus longs."
            elif dpo < 45:
                return f"⚡ Délai moyen ({dpo:.0f} jours). Optimisez votre politique fournisseurs."
            else:
                return f"✅ Délai fournisseurs optimal ({dpo:.0f} jours)."
        
        elif intent == 'score':
            if score >= 70:
                return f"⚠️ Score critique ({score}/100). Contactez un expert comptable ONECCA immédiatement."
            elif score >= 50:
                return f"⚡ Score fragile ({score}/100). Prenez des actions correctives rapides."
            elif score >= 30:
                return f"✅ Score acceptable ({score}/100). Surveillez les indicateurs clés."
            else:
                return f"✅ Score sain ({score}/100). Continuez ainsi."
        
        elif intent == 'recommandations':
            recommendations = analysis_data.get('recommendations', [])
            if recommendations:
                top_rec = recommendations[0]
                return f"🎯 Priorité : {top_rec.get('action', 'Optimisez votre gestion financière')}"
            else:
                return "Consultez l'onglet Recommandations pour les actions prioritaires."
        
        else:
            return "Posez une question sur votre liquidité, endettement, rentabilité ou score de vulnérabilité."
    
    def _build_chatbot_prompt(
        self,
        query: str,
        analysis_data: Dict[str, Any],
        intent: str
    ) -> str:
        """Construit le prompt pour le chatbot LLM"""
        ratios = analysis_data.get('ratios', {})
        score = analysis_data.get('score', 0)
        
        prompt = f"""
Tu es un assistant financier expert pour PME camerounaises. Réponds de manière CONCISE et ACTIONNABLE.

Question de l'utilisateur : {query}

Contexte financier :
- Score de vulnérabilité : {score}/100
- Liquidité générale : {ratios.get('current_ratio', 0):.2f}
- Ratio d'endettement : {ratios.get('debt_equity', 0):.2f}
- Rentabilité (ROE) : {ratios.get('roe', 0):.2%}
- Délai recouvrement clients : {ratios.get('dsr', 0):.0f} jours
- Délai paiement fournisseurs : {ratios.get('dpo', 0):.0f} jours

Règles :
1. Réponse MAXIMUM 300 caractères
2. Commence par un emoji (⚠️ pour alerte, ⚡ pour attention, ✅ pour positif)
3. Donne UNE action concrète et immédiate
4. Pas de jargon technique
5. Format : [Emoji] [Diagnostic] + [Action]

Réponse :
"""
        return prompt
    
    def _clean_response(self, response: str) -> str:
        """Nettoie la réponse LLM pour la rendre concise"""
        # Supprimer les sauts de ligne multiples
        response = ' '.join(response.split())
        
        # Tronquer si trop long
        if len(response) > self.max_response_length:
            response = response[:self.max_response_length - 3] + "..."
        
        return response.strip()


# Instance singleton
chatbot_service = ChatbotService()
