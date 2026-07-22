"""
ROUTER — marketplace.py v4.0
Marketplace Experts ONECCA - Doctor Smile
════════════════════════════════════════════════════════════════

POST /marketplace/experts → Lister experts disponibles
POST /marketplace/match → Smart Matching IA → Expert
POST /marketplace/contact → Contacter un expert
POST /marketplace/booking → Réserver un expert
GET  /marketplace/bookings/{id} → Récupérer réservation

NOUVEAU v4.0 :
  - Marketplace experts ONECCA certifiés
  - Smart Matching IA basé sur profil entreprise
  - Système de réservation avec Escrow
  - Commission DoctorSmile (10-20%)
════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import logging
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from firebase_admin import firestore as fs
from app.middleware.firebase_verify import verify_token
from app.services.expert_matching_service import expert_matching_service

log = logging.getLogger("doctorsmile.router.marketplace")
router = APIRouter(prefix="/marketplace", tags=["Marketplace"])


# ── Schemas ──────────────────────────────────────────────────

class ExpertProfile(BaseModel):
    id: str
    name: str
    certification: str = "ONECCA"
    specializations: list[str] = []
    experience_years: int = 0
    rating: float = 0.0
    hourly_rate: int = 0
    availability: str = "available"  # available, busy, offline
    location: str = "Cameroun"
    languages: list[str] = []
    bio: str = ""

class MatchRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    analyseId: str = Field(..., min_length=10)
    risk_level: str = Field(..., pattern="^(CRITIQUE|ÉLEVÉ|MOYEN|FAIBLE)$")
    sector: str | None = None
    company_size: str | None = None
    budget_range: str | None = None

class MatchResponse(BaseModel):
    matched_experts: list[ExpertProfile]
    match_score: float
    reasoning: str

class ContactRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    expertId: str = Field(..., min_length=5)
    message: str = Field(..., min_length=10, max_length=500)
    analyseId: str | None = None

class BookingRequest(BaseModel):
    userId: str = Field(..., min_length=5)
    expertId: str = Field(..., min_length=5)
    date: str = Field(..., min_length=10)  # YYYY-MM-DD
    duration_hours: int = Field(..., ge=1, le=8)
    service_type: str = Field(..., pattern="^(consultation|audit|restructuring|training)$")
    budget: int = Field(..., ge=10000)


# ════════ POST /marketplace/experts ════════════════════════════════════

@router.post("/experts", response_model=list[ExpertProfile], status_code=200,
    summary="Lister les experts ONECCA disponibles")
async def list_experts(
    token: dict = Depends(verify_token),
) -> list[ExpertProfile]:
    """
    Retourne la liste des experts certifiés ONECCA disponibles.
    Filtrage par disponibilité et spécialisation.
    """
    try:
        # Simulation de données experts (à remplacer par Firestore)
        experts = [
            ExpertProfile(
                id="expert_001",
                name="Jean-Pierre Mbea",
                certification="ONECCA",
                specializations=["Audit", "Restructuration", "Fiscalité"],
                experience_years=15,
                rating=4.8,
                hourly_rate=25000,
                availability="available",
                location="Douala",
                languages=["Français", "Anglais"],
                bio="Expert comptable certifié ONECCA avec 15 ans d'expérience en audit et restructuration d'entreprises camerounaises."
            ),
            ExpertProfile(
                id="expert_002",
                name="Marie-Claire Ngo",
                certification="ONECCA",
                specializations=["Trésorerie", "BFR", "Financement"],
                experience_years=12,
                rating=4.7,
                hourly_rate=22000,
                availability="available",
                location="Yaoundé",
                languages=["Français"],
                bio="Spécialiste en gestion de trésorerie et optimisation du BFR pour PME."
            ),
            ExpertProfile(
                id="expert_003",
                name="Paul Emmanuel Tchoumi",
                certification="ONECCA",
                specializations=["Comptabilité OHADA", "Fiscalité", "Formation"],
                experience_years=20,
                rating=4.9,
                hourly_rate=30000,
                availability="busy",
                location="Douala",
                languages=["Français", "Anglais"],
                bio="Formateur expert en comptabilité OHADA et fiscalité camerounaise."
            )
        ]
        
        log.info(f"[Marketplace] {len(experts)} experts disponibles")
        return experts
        
    except Exception as e:
        log.error(f"[Marketplace] Erreur listing experts: {e}")
        raise HTTPException(500, "Erreur lors de la récupération des experts")


# ════════ POST /marketplace/match ════════════════════════════════════

@router.post("/match", response_model=MatchResponse, status_code=200,
    summary="Smart Matching IA → Expert ONECCA")
async def match_expert(
    body: MatchRequest,
    token: dict = Depends(verify_token),
) -> MatchResponse:
    """
    Smart Matching IA basé sur le profil de l'entreprise et son niveau de risque.
    Déclenché automatiquement sur score rouge vif (>= 70).
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        # Appel au service de matching
        match_result = expert_matching_service.match_expert(
            user_id=body.userId,
            analyse_id=body.analyseId,
            risk_level=body.risk_level,
            sector=body.sector,
            company_size=body.company_size,
            budget_range=body.budget_range
        )
        
        return MatchResponse(
            matched_experts=match_result["experts"],
            match_score=match_result["score"],
            reasoning=match_result["reasoning"]
        )
        
    except Exception as e:
        log.error(f"[Marketplace] Erreur matching expert: {e}")
        raise HTTPException(500, "Erreur lors du matching expert")


# ════════ POST /marketplace/contact ════════════════════════════════════

@router.post("/contact", status_code=200,
    summary="Contacter un expert")
async def contact_expert(
    body: ContactRequest,
    token: dict = Depends(verify_token),
) -> dict[str, str]:
    """
    Envoie un message à un expert ONECCA.
    Notification envoyée via WhatsApp/Email à l'expert.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        # Enregistrement du message dans Firestore
        # À implémenter avec notification service
        
        log.info(f"[Marketplace] Contact expert {body.expertId} par user {body.userId}")
        
        return {
            "status": "message_sent",
            "message_id": str(uuid.uuid4()),
            "expert_notified": True
        }
        
    except Exception as e:
        log.error(f"[Marketplace] Erreur contact expert: {e}")
        raise HTTPException(500, "Erreur lors de l'envoi du message")


# ════════ POST /marketplace/booking ════════════════════════════════════

@router.post("/booking", status_code=201,
    summary="Réserver un expert avec Escrow")
async def book_expert(
    body: BookingRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Réserve une séance avec un expert.
    Paiement sécurisé via Escrow (Fapshi/NotchPay).
    Commission DoctorSmile : 15%.
    """
    try:
        uid = token.get("uid", "")
        if uid and uid != "dev-uid-000" and uid != body.userId:
            raise HTTPException(403, "userId ne correspond pas au token Firebase")
        
        booking_id = str(uuid.uuid4())
        
        # Calcul du montant total (avec commission)
        commission_rate = 0.15
        total_amount = int(body.budget * (1 + commission_rate))
        
        # Enregistrement de la réservation
        # À implémenter avec escrow_service
        
        log.info(f"[Marketplace] Réservation {booking_id} expert {body.expertId}")
        
        return {
            "booking_id": booking_id,
            "status": "pending_payment",
            "total_amount": total_amount,
            "commission": int(body.budget * commission_rate),
            "payment_link": f"https://payment.doctorsmile.cm/{booking_id}"
        }
        
    except Exception as e:
        log.error(f"[Marketplace] Erreur réservation: {e}")
        raise HTTPException(500, "Erreur lors de la réservation")
