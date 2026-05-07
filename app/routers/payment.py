"""
==========================================
ROUTER — payment.py
DOCTOR SMILE — Stripe Payment Integration
==========================================

Endpoints :
  POST /payment/create-checkout  → Crée une session Stripe Checkout
  POST /payment/webhook          → Webhook Stripe (mise à jour plan)
  GET  /payment/plans            → Liste des plans disponibles

Installation :
  pip install stripe

Variables d'environnement (.env) :
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_PRICE_PREMIUM=price_...
  STRIPE_PRICE_EXTRA=price_...
"""

from __future__ import annotations

import logging
import os
from typing import Any

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.middleware.firebase_verify import verify_token
from app.services.firebase_service  import firebase_service

log    = logging.getLogger("doctorsmile.payment")
router = APIRouter(prefix="/payment", tags=["Paiement"])

# ── Config Stripe ─────────────────────────────────────────────
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

# Prix Stripe (créer dans dashboard.stripe.com)
PLANS = {
    "premium": {
        "name":        "Doctor Smile Premium",
        "price":       7900,          # en centimes = 79€
        "currency":    "eur",
        "interval":    "month",
        "description": "RF + XGBoost + LightGBM · Simulateur What-If · Rapports PDF",
        "price_id":    os.getenv("STRIPE_PRICE_PREMIUM", ""),
        "features": [
            "3 modèles ML ensemble",
            "Simulateur What-If",
            "Historique illimité",
            "Rapports PDF",
            "Support prioritaire",
        ],
    },
    "extra": {
        "name":        "Doctor Smile Extra",
        "price":       15900,         # en centimes = 159€
        "currency":    "eur",
        "interval":    "month",
        "description": "Stacking 4 modèles · API accès direct · Analyses illimitées",
        "price_id":    os.getenv("STRIPE_PRICE_EXTRA", ""),
        "features": [
            "4 modèles en stacking",
            "Accès API direct",
            "Analyses illimitées",
            "Support dédié 24/7",
            "Onboarding personnalisé",
        ],
    },
}


# ── Schemas ───────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan:       str   # "premium" ou "extra"
    success_url: str  # URL de redirection après paiement
    cancel_url:  str  # URL si annulation


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id:   str


# ════════════════════════════════════════════════════════════════
#  GET /payment/plans — Liste des plans
# ════════════════════════════════════════════════════════════════

@router.get("/plans", tags=["Paiement"])
async def get_plans() -> dict:
    """Retourne les plans disponibles avec prix et features."""
    return {
        "plans": {
            "standard": {
                "name":        "Standard",
                "price":       0,
                "currency":    "eur",
                "interval":    "month",
                "description": "RF + XGBoost · Analyses de base",
                "features": [
                    "2 modèles ML",
                    "5 analyses/mois",
                    "Dashboard complet",
                    "Support email",
                ],
            },
            **PLANS,
        }
    }


# ════════════════════════════════════════════════════════════════
#  POST /payment/create-checkout — Créer session Stripe
# ════════════════════════════════════════════════════════════════

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    body:  CheckoutRequest,
    token: dict = Depends(verify_token),
) -> CheckoutResponse:
    """
    Crée une session Stripe Checkout.
    Retourne l'URL de paiement à ouvrir côté frontend.
    """
    if not stripe.api_key:
        raise HTTPException(500, "STRIPE_SECRET_KEY non configurée")

    plan = PLANS.get(body.plan)
    if not plan:
        raise HTTPException(400, f"Plan inconnu : {body.plan}")

    uid   = token.get("uid", "")
    email = token.get("email", "")

    log.info("[POST /payment/create-checkout] uid=%s plan=%s", uid, body.plan)

    try:
        # Si price_id Stripe configuré → utiliser prix Stripe
        if plan["price_id"]:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{"price": plan["price_id"], "quantity": 1}],
                customer_email=email or None,
                metadata={"uid": uid, "plan": body.plan},
                success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=body.cancel_url,
            )
        else:
            # Mode test sans price_id → créer le prix à la volée
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                mode="subscription",
                line_items=[{
                    "price_data": {
                        "currency":     plan["currency"],
                        "unit_amount":  plan["price"],
                        "recurring":    {"interval": plan["interval"]},
                        "product_data": {
                            "name":        plan["name"],
                            "description": plan["description"],
                        },
                    },
                    "quantity": 1,
                }],
                customer_email=email or None,
                metadata={"uid": uid, "plan": body.plan},
                success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=body.cancel_url,
            )

        log.info("[Stripe] Session créée : %s", session.id)
        return CheckoutResponse(
            checkout_url=session.url,
            session_id=session.id,
        )

    except stripe.error.StripeError as exc:
        log.error("[Stripe] Erreur : %s", exc)
        raise HTTPException(500, f"Erreur Stripe : {exc.user_message or str(exc)}")


# ════════════════════════════════════════════════════════════════
#  POST /payment/webhook — Webhook Stripe
# ════════════════════════════════════════════════════════════════

@router.post("/webhook")
async def stripe_webhook(request: Request) -> dict:
    """
    Reçoit les événements Stripe et met à jour le plan dans Firestore.
    À configurer dans : dashboard.stripe.com → Webhooks
    URL : https://api.doctorsmile.io/payment/webhook
    Événements à écouter : checkout.session.completed, customer.subscription.deleted
    """
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Vérification signature Stripe
    if WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            log.warning("[Webhook] Signature invalide")
            raise HTTPException(400, "Signature Stripe invalide")
    else:
        # Mode dev sans webhook secret
        import json
        event = json.loads(payload)

    event_type = event.get("type", "")
    log.info("[Webhook] Event reçu : %s", event_type)

    # ── Paiement réussi ──────────────────────────────────────
    if event_type == "checkout.session.completed":
        session  = event["data"]["object"]
        uid      = session.get("metadata", {}).get("uid", "")
        plan     = session.get("metadata", {}).get("plan", "standard")

        if uid:
            _update_user_plan(uid, plan)
            log.info("[Webhook] Plan mis à jour : uid=%s → %s", uid, plan)

    # ── Abonnement annulé ────────────────────────────────────
    elif event_type == "customer.subscription.deleted":
        customer_id = event["data"]["object"].get("customer", "")
        if customer_id:
            _downgrade_user(customer_id)

    return {"received": True}


# ════════════════════════════════════════════════════════════════
#  HELPERS
# ════════════════════════════════════════════════════════════════

def _update_user_plan(uid: str, plan: str) -> None:
    """Met à jour le plan dans Firestore après paiement réussi."""
    try:
        firebase_service.db.collection("abonnements").document(uid).set({
            "plan":      plan,
            "updatedAt": firebase_service._now(),
            "status":    "active",
        }, merge=True)

        firebase_service.db.collection("users").document(uid).set({
            "plan": plan,
        }, merge=True)

        log.info("Plan Firestore mis à jour : uid=%s → %s", uid, plan)
    except Exception as exc:
        log.error("Erreur mise à jour plan Firestore : %s", exc)


def _downgrade_user(customer_id: str) -> None:
    """Rétrograde l'utilisateur vers Standard si abonnement annulé."""
    try:
        # Trouver l'uid via customer_id Stripe
        customers = stripe.Customer.retrieve(customer_id)
        email     = customers.get("email", "")
        if email:
            users = firebase_service.db.collection("users")\
                .where("email", "==", email).limit(1).stream()
            for user in users:
                _update_user_plan(user.id, "standard")
    except Exception as exc:
        log.error("Erreur downgrade : %s", exc)
