"""
====================================================
SERVICE DE PAIEMENT DOCTOR SMILE — REFONTE COMPLÈTE
Phase 6 (Conception Backend)
====================================================
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta
from typing import Any, Literal
from dataclasses import dataclass

import firebase_admin
from firebase_admin import firestore

from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.payment")

# ==================================================
# 1. PLAN SERVICE — GESTION DES PLANS
# ==================================================

@dataclass
class Plan:
    id: str
    name: str
    price_ttc: float
    currency: Literal["XAF", "XOF", "EUR", "USD"]
    vat_rate: float
    billing_cycle: Literal["monthly", "yearly"]
    features: list[str]
    limits: dict[str, Any]

class PlanService:
    """
    Service for managing subscription plans.
    In production, you'd load these from Firestore, but we'll start with hardcoded.
    """

    # DEFAULT PLANS (from old payment.py, updated for OHADA)
    _DEFAULT_PLANS: list[Plan] = [
        Plan(
            id="standard",
            name="Standard",
            price_ttc=25000,
            currency="XAF",
            vat_rate=0.1925,  # TVA Cameroun
            billing_cycle="monthly",
            features=[
                "Score financier",
                "Ratios SYSCOHADA",
                "Rapport PDF complet",
                "3 analyses par mois",
            ],
            limits={"analyses_per_month": 3},
        ),
        Plan(
            id="premium",
            name="Premium",
            price_ttc=50000,
            currency="XAF",
            vat_rate=0.1925,
            billing_cycle="monthly",
            features=[
                "Toutes les fonctionnalités Standard",
                "Chatbot Doctor Smile",
                "Simulateur What-If",
                "10 analyses par mois",
            ],
            limits={"analyses_per_month": 10},
        ),
        Plan(
            id="extra",
            name="Extra",
            price_ttc=100000,
            currency="XAF",
            vat_rate=0.1925,
            billing_cycle="monthly",
            features=[
                "Toutes les fonctionnalités Premium",
                "API REST",
                "Support 24/7",
                "Analyses illimitées",
            ],
            limits={"analyses_per_month": 10000},
        ),
    ]

    @classmethod
    def get_all(cls) -> list[Plan]:
        """Get all available plans."""
        return cls._DEFAULT_PLANS

    @classmethod
    def get_by_id(cls, plan_id: str) -> Plan | None:
        """Get a specific plan by ID."""
        for plan in cls._DEFAULT_PLANS:
            if plan.id == plan_id:
                return plan
        return None

    @classmethod
    def calculate_ht(cls, plan: Plan) -> float:
        """Calculate HT (hors taxe) from TTC and VAT rate."""
        return round(plan.price_ttc / (1 + plan.vat_rate), 2)

    @classmethod
    def calculate_vat(cls, plan: Plan) -> float:
        """Calculate VAT amount from plan."""
        ht = cls.calculate_ht(plan)
        return round(ht * plan.vat_rate, 2)


# ==================================================
# 2. FACTURE SERVICE — GESTION DES FACTURES
# ==================================================

class FactureStatus:
    BROUILLON = "brouillon"
    ENVOYEE = "envoyée"
    EN_ATTENTE = "en_attente_de_paiement"
    PARTIELLEMENT_PAYEE = "partiellement_payée"
    VALIDEE = "validée"
    ECHOUEE = "échouée"
    EXPIREE = "expirée"
    REMBOURSEE = "remboursée"
    ANNULEE = "annulée"
    ARCHIVEE = "archivée"


class FactureService:
    """Service for managing invoices (factures)."""

    @classmethod
    def _generate_id(cls) -> str:
        """Generate a friendly invoice ID: FAC-YYYY-MM-XXXX."""
        now = datetime.utcnow()
        return f"FAC-{now.year}-{now.month:02d}-{uuid.uuid4().hex[:4].upper()}"

    @classmethod
    def create_facture_abonnement(
        cls,
        user_id: str,
        plan: Plan,
        due_days: int = 7,
    ) -> dict[str, Any]:
        """
        Create an invoice for an abonnement subscription.
        Returns the invoice document (dict).
        """
        facture_id = cls._generate_id()
        amount_ht = PlanService.calculate_ht(plan)
        vat_amount = PlanService.calculate_vat(plan)
        now = datetime.utcnow()

        doc = {
            "id": facture_id,
            "userId": user_id,
            "type": "abonnement",
            "planId": plan.id,
            "status": FactureStatus.BROUILLON,
            "amountHt": amount_ht,
            "vatAmount": vat_amount,
            "amountTtc": plan.price_ttc,
            "currency": plan.currency,
            "dueDate": now + timedelta(days=due_days),
            "paidAt": None,
            "paymentMethod": None,
            "paymentProvider": None,
            "paymentReference": None,
            "createdAt": now,
            "updatedAt": now,
        }

        if firebase_service.available:
            firebase_service.db.collection("factures").document(facture_id).set(doc)
            log.info("✅ Facture créée → factures/%s", facture_id)

        return doc

    @classmethod
    def update_status(
        cls,
        facture_id: str,
        new_status: str,
        **kwargs,
    ) -> dict[str, Any] | None:
        """Update an invoice's status and optional fields."""
        if not firebase_service.available:
            log.warning("update_status skipped (mock mode)")
            return None

        try:
            ref = firebase_service.db.collection("factures").document(facture_id)
            update_data = {
                "status": new_status,
                "updatedAt": datetime.utcnow(),
                **kwargs,
            }
            ref.update(update_data)
            log.info("✅ Facture %s → statut: %s", facture_id, new_status)
            return ref.get().to_dict()
        except Exception as e:
            log.error("Erreur update facture: %s", e)
            return None


# ==================================================
# 3. ABONNEMENT SERVICE — GESTION DES ABONNEMENTS
# ==================================================

class AbonnementStatus:
    INACTIF = "inactif"
    ACTIF = "actif"
    ANNULE = "annulé"


class AbonnementService:
    """Service for managing subscriptions (abonnements)."""

    @classmethod
    def create_abonnement(
        cls,
        user_id: str,
        plan: Plan,
        billing_cycle_months: int = 1,
    ) -> dict[str, Any]:
        """Create a subscription for a user."""
        now = datetime.utcnow()
        abonnement_id = f"ABO-{user_id[:6]}-{uuid.uuid4().hex[:4].upper()}"

        doc = {
            "id": abonnement_id,
            "userId": user_id,
            "planId": plan.id,
            "status": AbonnementStatus.INACTIF,
            "startedAt": None,
            "currentPeriodStart": None,
            "currentPeriodEnd": None,
            "cancelAtPeriodEnd": False,
            "createdAt": now,
            "updatedAt": now,
        }

        if firebase_service.available:
            firebase_service.db.collection("abonnements").document(abonnement_id).set(doc)
            log.info("✅ Abonnement créé → abonnements/%s", abonnement_id)

        return doc

    @classmethod
    def activate_abonnement(
        cls,
        abonnement_id: str,
        user_id: str,
        plan: Plan,
    ) -> dict[str, Any] | None:
        """Activate an existing subscription."""
        if not firebase_service.available:
            log.warning("activate_abonnement skipped (mock mode)")
            return None

        now = datetime.utcnow()
        period_end = now + timedelta(days=30)

        update_data = {
            "status": AbonnementStatus.ACTIF,
            "startedAt": now,
            "currentPeriodStart": now,
            "currentPeriodEnd": period_end,
            "updatedAt": now,
        }

        try:
            ref = firebase_service.db.collection("abonnements").document(abonnement_id)
            ref.update(update_data)
            # Also update user document for compatibility with existing frontend
            firebase_service.db.collection("users").document(user_id).set(
                {"plan": plan.id, "abonnementId": abonnement_id, "updatedAt": now},
                merge=True,
            )
            log.info("✅ Abonnement activé → %s", abonnement_id)
            return ref.get().to_dict()
        except Exception as e:
            log.error("Erreur activate abonnement: %s", e)
            return None


# ==================================================
# 4. COMPTA SERVICE — ÉCRITURES COMPTABLES OHADA
# ==================================================

class ComptaService:
    """
    Service for automatic OHADA accounting entries (écritures comptables).
    """

    @classmethod
    def _generate_id(cls) -> str:
        now = datetime.utcnow()
        return f"ECR-{now.year}-{now.month:02d}-{uuid.uuid4().hex[:4].upper()}"

    @classmethod
    def ecrire_vente_abonnement(
        cls,
        facture: dict[str, Any],
        plan: Plan,
    ) -> dict[str, Any]:
        """
        Generate OHADA accounting entries when a subscription is paid.
        512 (Banque) débit → 706 (Ventes de services) crédit + 4457 (TVA collectée) crédit.
        """
        ecriture_id = cls._generate_id()
        now = datetime.utcnow()

        # 1ère écriture: Banque débit, Ventes crédit
        doc1 = {
            "id": ecriture_id,
            "type": "vente_de_service",
            "date": now,
            "compteDebit": "512",
            "intituleDebit": "Banque",
            "compteCredit": "706",
            "intituleCredit": "Ventes de services",
            "amount": facture["amountHt"],
            "currency": plan.currency,
            "reference": facture["id"],
            "description": f"Abonnement {plan.name} - Facture {facture['id']}",
            "createdAt": now,
        }

        # 2ème écriture: TVA collectée
        ecriture_id2 = cls._generate_id()
        doc2 = {
            "id": ecriture_id2,
            "type": "tva_collectee",
            "date": now,
            "compteDebit": "512",
            "intituleDebit": "Banque",
            "compteCredit": "4457",
            "intituleCredit": "TVA collectée",
            "amount": facture["vatAmount"],
            "currency": plan.currency,
            "reference": facture["id"],
            "description": f"TVA abonnement {plan.name} - Facture {facture['id']}",
            "createdAt": now,
        }

        if firebase_service.available:
            firebase_service.db.collection("ecritures_comptables").document(ecriture_id).set(doc1)
            firebase_service.db.collection("ecritures_comptables").document(ecriture_id2).set(doc2)
            log.info("✅ Écritures comptables créées → %s et %s", ecriture_id, ecriture_id2)

        return doc1


# ==================================================
# 5. MAIN PAYMENT SERVICE — ORCHESTRATEUR
# ==================================================

class PaymentService:
    """
    Master orchestrator for all payment operations.
    """

    @classmethod
    def process_new_abonnement(
        cls,
        user_id: str,
        plan_id: str,
    ) -> dict[str, Any] | None:
        """
        Orchestrates a new subscription:
        1. Get plan
        2. Create invoice
        3. Create subscription
        (Then, you'd call create-checkout with the invoice)
        """
        # 1. Get plan
        plan = PlanService.get_by_id(plan_id)
        if not plan:
            log.error("Plan non trouvé: %s", plan_id)
            return None

        # 2. Create invoice
        facture = FactureService.create_facture_abonnement(
            user_id=user_id,
            plan=plan,
        )

        # 3. Create abonnement (inactif for now, will activate after payment)
        abonnement = AbonnementService.create_abonnement(
            user_id=user_id,
            plan=plan,
        )

        return {
            "plan": plan,
            "facture": facture,
            "abonnement": abonnement,
        }

    @classmethod
    def confirm_paiement_and_activate(
        cls,
        facture_id: str,
        abonnement_id: str,
        user_id: str,
        plan_id: str,
        payment_method: str = "not_set",
        payment_provider: str = "not_set",
        payment_reference: str = "not_set",
    ) -> dict[str, Any] | None:
        """
        Called after successful payment!
        1. Update facture to VALIDEE
        2. Activate abonnement
        3. Write OHADA accounting entries
        """
        # 1. Get plan
        plan = PlanService.get_by_id(plan_id)
        if not plan:
            log.error("Plan non trouvé: %s", plan_id)
            return None

        # 2. Update facture
        facture = FactureService.update_status(
            facture_id=facture_id,
            new_status=FactureStatus.VALIDEE,
            paidAt=datetime.utcnow(),
            paymentMethod=payment_method,
            paymentProvider=payment_provider,
            paymentReference=payment_reference,
        )
        if not facture:
            log.error("Erreur mise à jour facture")
            return None

        # 3. Activate abonnement
        abonnement = AbonnementService.activate_abonnement(
            abonnement_id=abonnement_id,
            user_id=user_id,
            plan=plan,
        )

        # 4. Write OHADA entries
        ComptaService.ecrire_vente_abonnement(
            facture=facture,
            plan=plan,
        )

        return {
            "facture": facture,
            "abonnement": abonnement,
        }


# ==================================================
# SINGLETONS (pour usage dans les routers)
# ==================================================

plan_service = PlanService()
facture_service = FactureService()
abonnement_service = AbonnementService()
compta_service = ComptaService()
payment_service = PaymentService()
