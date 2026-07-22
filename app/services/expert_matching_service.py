"""
Expert Matching Service - Doctor Smile v4.0
Smart Matching IA pour connecter entrepreneurs aux experts ONECCA
Basé sur profil entreprise + niveau de risque
"""

from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


class ExpertMatchingService:
    """Service de Smart Matching pour experts ONECCA"""
    
    def __init__(self):
        # Base de données experts ONECCA (simulation)
        self.experts_db = [
            {
                "id": "expert_001",
                "name": "Jean-Pierre Mbea",
                "certification": "ONECCA",
                "specializations": ["Audit", "Restructuration", "Fiscalité"],
                "experience_years": 15,
                "rating": 4.8,
                "hourly_rate": 25000,
                "availability": "available",
                "location": "Douala",
                "languages": ["Français", "Anglais"],
                "sectors": ["Commerce", "Services", "Industrie"],
                "risk_expertise": ["CRITIQUE", "ÉLEVÉ"]
            },
            {
                "id": "expert_002",
                "name": "Marie-Claire Ngo",
                "certification": "ONECCA",
                "specializations": ["Trésorerie", "BFR", "Financement"],
                "experience_years": 12,
                "rating": 4.7,
                "hourly_rate": 22000,
                "availability": "available",
                "location": "Yaoundé",
                "languages": ["Français"],
                "sectors": ["Commerce", "Services"],
                "risk_expertise": ["MOYEN", "ÉLEVÉ"]
            },
            {
                "id": "expert_003",
                "name": "Paul Emmanuel Tchoumi",
                "certification": "ONECCA",
                "specializations": ["Comptabilité OHADA", "Fiscalité", "Formation"],
                "experience_years": 20,
                "rating": 4.9,
                "hourly_rate": 30000,
                "availability": "busy",
                "location": "Douala",
                "languages": ["Français", "Anglais"],
                "sectors": ["Industrie", "Construction"],
                "risk_expertise": ["CRITIQUE", "ÉLEVÉ", "MOYEN"]
            },
            {
                "id": "expert_004",
                "name": "Françoise Mbarga",
                "certification": "ONECCA",
                "specializations": ["Fiscalité", "Déclarations", "Contentieux"],
                "experience_years": 18,
                "rating": 4.6,
                "hourly_rate": 28000,
                "availability": "available",
                "location": "Yaoundé",
                "languages": ["Français"],
                "sectors": ["Commerce", "Services", "Industrie"],
                "risk_expertise": ["MOYEN", "FAIBLE"]
            }
        ]
    
    def match_expert(
        self,
        user_id: str,
        analyse_id: str,
        risk_level: str,
        sector: Optional[str] = None,
        company_size: Optional[str] = None,
        budget_range: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Effectue le Smart Matching IA entre entreprise et expert
        
        Args:
            user_id: ID de l'utilisateur
            analyse_id: ID de l'analyse
            risk_level: Niveau de risque (CRITIQUE, ÉLEVÉ, MOYEN, FAIBLE)
            sector: Secteur d'activité
            company_size: Taille de l'entreprise
            budget_range: Fourchette budgétaire
            
        Returns:
            Dict avec experts matchés et score de matching
        """
        try:
            logger.info(f"[Matching] User {user_id}, Risk {risk_level}, Sector {sector}")
            
            # Filtrage des experts disponibles
            available_experts = [
                exp for exp in self.experts_db 
                if exp["availability"] == "available"
            ]
            
            # Scoring et matching
            scored_experts = []
            for expert in available_experts:
                score = self._calculate_match_score(
                    expert, 
                    risk_level, 
                    sector, 
                    company_size, 
                    budget_range
                )
                
                if score > 0.3:  # Seuil minimum de matching
                    scored_experts.append({
                        **expert,
                        "match_score": score
                    })
            
            # Tri par score de matching
            scored_experts.sort(key=lambda x: x["match_score"], reverse=True)
            
            # Top 3 experts
            top_experts = scored_experts[:3]
            
            # Génération du raisonnement
            reasoning = self._generate_reasoning(risk_level, sector, top_experts)
            
            return {
                "experts": top_experts,
                "score": top_experts[0]["match_score"] if top_experts else 0.0,
                "reasoning": reasoning,
                "total_candidates": len(available_experts),
                "matched_count": len(top_experts)
            }
            
        except Exception as e:
            logger.error(f"[Matching] Erreur matching: {e}")
            return {
                "experts": [],
                "score": 0.0,
                "reasoning": "Erreur lors du matching expert",
                "total_candidates": 0,
                "matched_count": 0
            }
    
    def _calculate_match_score(
        self,
        expert: Dict[str, Any],
        risk_level: str,
        sector: Optional[str],
        company_size: Optional[str],
        budget_range: Optional[str]
    ) -> float:
        """
        Calcule le score de matching pour un expert
        
        Score basé sur :
        - Expertise en niveau de risque (40%)
        - Spécialisation secteur (25%)
        - Expérience (15%)
        - Rating (10%)
        - Disponibilité (10%)
        """
        score = 0.0
        
        # 1. Expertise en niveau de risque (40%)
        if risk_level in expert.get("risk_expertise", []):
            score += 0.4
        elif risk_level == "CRITIQUE" and "ÉLEVÉ" in expert.get("risk_expertise", []):
            score += 0.3  # Expert ÉLEVÉ peut gérer CRITIQUE
        elif risk_level == "ÉLEVÉ" and "MOYEN" in expert.get("risk_expertise", []):
            score += 0.2
        
        # 2. Spécialisation secteur (25%)
        if sector and sector in expert.get("sectors", []):
            score += 0.25
        elif not sector:
            score += 0.1  # Pas de filtre secteur = bonus neutre
        
        # 3. Expérience (15%)
        exp_years = expert.get("experience_years", 0)
        if exp_years >= 15:
            score += 0.15
        elif exp_years >= 10:
            score += 0.10
        elif exp_years >= 5:
            score += 0.05
        
        # 4. Rating (10%)
        rating = expert.get("rating", 0.0)
        if rating >= 4.8:
            score += 0.10
        elif rating >= 4.5:
            score += 0.08
        elif rating >= 4.0:
            score += 0.05
        
        # 5. Disponibilité (10%)
        if expert.get("availability") == "available":
            score += 0.10
        
        return min(score, 1.0)
    
    def _generate_reasoning(
        self,
        risk_level: str,
        sector: Optional[str],
        matched_experts: List[Dict[str, Any]]
    ) -> str:
        """Génère le raisonnement du matching"""
        if not matched_experts:
            return "Aucun expert disponible correspondant à votre profil."
        
        top_expert = matched_experts[0]
        
        reasoning_parts = []
        
        # Niveau de risque
        if risk_level == "CRITIQUE":
            reasoning_parts.append("Situation critique nécessitant un expert en restructuration")
        elif risk_level == "ÉLEVÉ":
            reasoning_parts.append("Risque élevé requérant une expertise approfondie")
        elif risk_level == "MOYEN":
            reasoning_parts.append("Situation à surveiller avec accompagnement")
        else:
            reasoning_parts.append("Situation stable pour optimisation")
        
        # Secteur
        if sector:
            reasoning_parts.append(f"Expertise en secteur {sector}")
        
        # Expert top
        reasoning_parts.append(
            f"Expert recommandé : {top_expert['name']} "
            f"(Rating {top_expert['rating']}/5, "
            f"{top_expert['experience_years']} ans d'expérience)"
        )
        
        return " | ".join(reasoning_parts)


# Instance singleton
expert_matching_service = ExpertMatchingService()
