"""
==========================================
ROUTER — payment.py
DOCTOR SMILE — NotchPay Payment Integration
==========================================

Endpoints :
  POST /payment/create-checkout  → Crée une session NotchPay
  POST /payment/webhook          → Webhook NotchPay (mise à jour plan)
  POST /payment/verify-payment   → Vérifie un paiement NotchPay via reference
  GET  /payment/plans            → Liste des plans disponibles

Variables d'environnement (.env) :
  NOTCHPAY_API_KEY=pk.xxxxx      ← clé PUBLIQUE (pk.) — obligatoire pour /payments
  NOTCHPAY_BASE_URL=https://api.notchpay.co

Doc officielle NotchPay (https://developer.notchpay.co/api-reference/authentication) :
  Authorization: YOUR_PUBLIC_KEY   (clé publique pk., sans "Bearer")
  Endpoint : POST https://api.notchpay.co/payments
  Réponse  : { authorization_url, transaction, code, message }
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.middleware.firebase_verify import verify_token
from app.services.firebase_service import firebase_service
from app.services.email_service import email_service

log = logging.getLogger("doctorsmile.payment")
router = APIRouter(prefix="/payment", tags=["Paiement"])

# ── Config NotchPay ───────────────────────────────────────────
# IMPORTANT : NotchPay attend la clé PUBLIQUE (pk.) dans Authorization
# La clé secrète (sk.) est refusée sur l'endpoint /payments avec 401
NOTCHPAY_API_KEY  = os.getenv("NOTCHPAY_API_KEY", "")
NOTCHPAY_BASE_URL = os.getenv("NOTCHPAY_BASE_URL", "https://api.notchpay.co")

# Endpoint officiel — NE PAS modifier via .env
_NOTCHPAY_INIT_URL  = "/payments"       # POST  — initialiser un paiement
_NOTCHPAY_GET_URL   = "/payments/{ref}" # GET   — vérifier un paiement

# ── Plans ──────────────────────────────────────────────────────
PLANS: dict[str, dict[str, Any]] = {
    "premium": {
        "name": "Doctor Smile Premium",
        "price_xaf": 50000,
        "interval": "month",
        "description": "RF + XGBoost + LightGBM · Simulateur What-If · Rapports PDF",
        "features": [
            "3 modèles ML ensemble",
            "Simulateur What-If",
            "Historique illimité",
            "Rapports PDF",
            "Support prioritaire",
        ],
    },
    "extra": {
        "name": "Doctor Smile Extra",
        "price_xaf": 100000,
        "interval": "month",
        "description": "Stacking 4 modèles · API accès direct · Analyses illimitées",
        "features": [
            "4 modèles en stacking",
            "Accès API direct",
            "Analyses illimitées",
            "Support dédié 24/7",
            "Onboarding personnalisé",
        ],
    },
}


# ── Schemas ─────────────────────────────────────────────────────

class CheckoutRequest(BaseModel):
    plan: str
    success_url: str
    cancel_url: str
    operator: Optional[str] = None
    currency: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: str   # = authorization_url NotchPay
    session_id: str     # = reference NotchPay


class VerifyPaymentRequest(BaseModel):
    reference: str


class VerifyPaymentResponse(BaseModel):
    plan: str
    status: str
    reference: str


# ── Helpers ─────────────────────────────────────────────────────

def _notchpay_configured() -> bool:
    """Vérifie la présence d'une clé API et d'une base URL valide."""
    if not NOTCHPAY_API_KEY:
        log.error("[NotchPay] NOTCHPAY_API_KEY est vide dans .env")
        return False
    if not NOTCHPAY_BASE_URL.startswith("http"):
        log.error("[NotchPay] NOTCHPAY_BASE_URL invalide : %s", NOTCHPAY_BASE_URL)
        return False
    return True


def _get_plan(plan_key: str) -> dict[str, Any]:
    plan = PLANS.get(plan_key)
    if not plan:
        raise HTTPException(
            400,
            f"Plan inconnu : '{plan_key}'. Valeurs acceptées : {list(PLANS.keys())}",
        )
    return plan


def _notchpay_headers() -> dict[str, str]:
    """
    Authentification NotchPay officielle :
      Authorization: YOUR_PUBLIC_KEY   (clé pk., sans préfixe Bearer)
    """
    return {
        "Authorization": NOTCHPAY_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _build_reference(uid: str, plan: str) -> str:
    """Référence unique par transaction — alphanumérique + tirets."""
    ts = int(time.time())
    return f"ds-{uid[:16]}-{plan}-{ts}"


# ════════════════════════════════════════════════════════════════
#  GET /payment/plans
# ════════════════════════════════════════════════════════════════

@router.get("/plans")
async def get_plans() -> dict:
    """Liste tous les plans disponibles."""
    return {
        "plans": {
            "standard": {
                "name": "Standard",
                "price": 0,
                "currency": "XAF",
                "interval": "month",
                "description": "RF + XGBoost · Analyses de base",
                "features": [
                    "2 modèles ML",
                    "5 analyses/mois",
                    "Dashboard complet",
                    "Support email",
                ],
            },
            **{
                k: {**v, "price": v["price_xaf"], "currency": "XAF"}
                for k, v in PLANS.items()
            },
        }
    }


# ════════════════════════════════════════════════════════════════
#  POST /payment/create-checkout
# ════════════════════════════════════════════════════════════════

@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    body: CheckoutRequest,
    token: dict = Depends(verify_token),
) -> CheckoutResponse:
    """
    Initialise un paiement NotchPay et retourne l'URL de checkout.

    Doc : POST https://api.notchpay.co/payments
    Auth : Authorization: pk.xxxxx  (clé publique, SANS Bearer)
    Réponse : { authorization_url, transaction: { reference, ... }, code, message }
    """
    plan  = _get_plan(body.plan)
    uid   = token.get("uid", "")
    email = token.get("email", "") or f"{uid}@doctorsmile.io"

    if not _notchpay_configured():
        raise HTTPException(
            500,
            "NotchPay non configuré — ajoutez NOTCHPAY_API_KEY=pk.xxx dans .env",
        )

    reference = _build_reference(uid, body.plan)
    amount    = int(plan["price_xaf"])
    api_url   = NOTCHPAY_BASE_URL.rstrip("/") + _NOTCHPAY_INIT_URL

    # ── Payload officiel NotchPay ─────────────────────────────
    # Champs obligatoires : amount, currency, + (email OU phone OU customer)
    payload: dict[str, Any] = {
        "amount":      amount,
        "currency":    "XAF",
        "email":       email,
        "description": plan.get("description", plan["name"]),
        "reference":   reference,
        "callback":    body.success_url,    # URL de redirection après paiement
        "customer": {
            "email": email,
            "name":  email,
        },
        "customer_meta": {                  # métadonnées récupérées dans le webhook
            "uid":  uid,
            "plan": body.plan,
        },
    }

    log.info(
        "[POST /payment/create-checkout] uid=%s plan=%s amount=%d XAF ref=%s",
        uid, body.plan, amount, reference,
    )

    # ── Appel API ─────────────────────────────────────────────
    try:
        # NotchPay peut être lent selon la région/réseau.
        # Pour éviter le "504 Gateway Time-out" côté proxy,
        # on augmente le timeout et on retry une fois sur timeout.
        _timeout = httpx.Timeout(60.0, connect=20.0)
        try:
            resp = httpx.post(
                api_url,
                json=payload,
                headers=_notchpay_headers(),
                timeout=_timeout,
            )
        except httpx.TimeoutException:
            log.warning("[NotchPay] Timeout — retry une fois (timeout=%ss connect=%ss)", 60.0, 20.0)
            # si le retry timeout aussi, on laisse remonter l'exception
            resp = httpx.post(
                api_url,
                json=payload,
                headers=_notchpay_headers(),
                timeout=_timeout,
            )

        log.debug("[NotchPay] %s → HTTP %s : %s", api_url, resp.status_code, resp.text[:500])

        # Gestion explicite des codes d'erreur courants
        if resp.status_code == 401:
            log.error(
                "[NotchPay] 401 Unauthorized — clé invalide ou mauvais type. "
                "NOTCHPAY_API_KEY doit être la clé PUBLIQUE (pk.) — valeur actuelle : %s...",
                NOTCHPAY_API_KEY[:12],
            )
            raise HTTPException(
                502,
                "NotchPay 401 : clé API refusée. "
                "Vérifiez que NOTCHPAY_API_KEY est la clé publique (pk.) dans votre dashboard "
                "https://business.notchpay.co/settings/developer",
            )

        if resp.status_code == 404:
            log.error("[NotchPay] 404 — endpoint introuvable : %s", api_url)
            raise HTTPException(502, f"NotchPay 404 : endpoint introuvable ({api_url}).")

        if resp.status_code == 422:
            log.error("[NotchPay] 422 — payload invalide : %s", resp.text[:400])
            raise HTTPException(502, f"NotchPay 422 : données invalides — {resp.text[:200]}")

        resp.raise_for_status()

    except HTTPException:
        raise
    except httpx.ConnectError as exc:
        log.error("[NotchPay] ConnectError → %s : %s", api_url, exc)
        raise HTTPException(502, f"NotchPay : impossible de joindre {NOTCHPAY_BASE_URL}.")
    except httpx.TimeoutException:
        raise HTTPException(502, "NotchPay : délai dépassé. Réessayez.")
    except httpx.HTTPStatusError as exc:
        status = getattr(exc.response, "status_code", "?")
        text   = exc.response.text[:300] if hasattr(exc.response, "text") else str(exc)
        log.error("[NotchPay] HTTP %s : %s", status, text)
        raise HTTPException(502, f"NotchPay : erreur HTTP {status}")
    except httpx.RequestError as exc:
        log.error("[NotchPay] RequestError : %s", exc)
        raise HTTPException(502, "NotchPay : requête échouée.")

    # ── Parsing réponse ───────────────────────────────────────
    # Structure officielle de la réponse NotchPay :
    # {
    #   "status": "Accepted",
    #   "message": "Payment initialized",
    #   "code": 201,
    #   "transaction": { "reference": "...", "amount": ..., ... },
    #   "authorization_url": "https://pay.notchpay.co/..."   ← À LA RACINE
    # }
    try:
        data: dict[str, Any] = resp.json()
    except Exception:
        log.error("[NotchPay] Réponse non-JSON : %s", resp.text[:300])
        raise HTTPException(502, "NotchPay : réponse non-JSON.")

    log.debug("[NotchPay] Réponse parsée : %s", data)

    # authorization_url — selon les retours NotchPay, l'URL peut être à la racine,
    # ou parfois imbriquée (ex: transaction.authorization_url, transaction.url, etc.)
    def _deep_get_any(obj: Any, keys: list[str]) -> Optional[str]:
        if isinstance(obj, dict):
            for k in keys:
                if k in obj and isinstance(obj.get(k), str) and obj.get(k):
                    return obj.get(k)
            # recherche récursive
            for v in obj.values():
                found = _deep_get_any(v, keys)
                if found:
                    return found
        elif isinstance(obj, list):
            for it in obj:
                found = _deep_get_any(it, keys)
                if found:
                    return found
        return None

    # Checkout URL / authorization URL NotchPay peut arriver à plusieurs endroits.
    # Objectif : éviter toute page blanche due à un champ non trouvé.
    checkout_url: str = (
        _deep_get_any(
            data,
            [
                # les plus communs
                "authorization_url",
                "payment_url",
                "checkout_url",
                "redirect_url",
                "redirectUrl",
                # parfois imbriqué dans transaction
                "transaction.authorization_url",
                "transaction.url",
                "transaction.redirect_url",
                "transaction.redirectUrl",
                # fallback large
                "url",
            ],
        )
        or ""
    )

    # Fallback complémentaire (root-level parfois)
    if not checkout_url:
        for k in ["authorization_url", "payment_url", "checkout_url", "url", "redirect_url", "redirectUrl"]:
            v = data.get(k) if isinstance(data, dict) else None
            if isinstance(v, str) and v:
                checkout_url = v
                break

    # reference est dans l'objet transaction
    transaction = data.get("transaction") or {}
    if isinstance(transaction, str):
        # Parfois retourné comme UUID string
        session_id = transaction
    else:
        session_id = (
            transaction.get("reference")
            or transaction.get("id")
            or data.get("reference")
            or reference
        )

    if not checkout_url:
        # Renvoi d'un message explicite pour éviter une page blanche côté front.
        log.error(
            "[NotchPay] URL de paiement absente. Réponse complète : %s",
            str(data)[:900],
        )
        raise HTTPException(
            502,
            "NotchPay : URL de paiement absente dans la réponse. "
            "Vérifie la structure du payload NotchPay (authorization_url/checkout_url). "
            f"Réponse : {str(data)[:300]}",
        )

    log.info("[NotchPay] ✅ Checkout créé — ref=%s url=%s", session_id, checkout_url)
    return CheckoutResponse(checkout_url=checkout_url, session_id=session_id)


# ════════════════════════════════════════════════════════════════
#  POST /payment/verify-payment
# ════════════════════════════════════════════════════════════════

@router.post("/verify-payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    body: VerifyPaymentRequest,
    token: dict = Depends(verify_token),
) -> VerifyPaymentResponse:
    """
    Vérifie le statut d'un paiement après redirection.
    Doc : GET https://api.notchpay.co/payments/{reference}
    """
    uid = token.get("uid", "")

    if not _notchpay_configured():
        raise HTTPException(500, "NotchPay non configuré.")

    api_url = f"{NOTCHPAY_BASE_URL.rstrip('/')}/payments/{body.reference}"
    log.info("[POST /payment/verify-payment] uid=%s reference=%s", uid, body.reference)

    try:
        resp = httpx.get(api_url, headers=_notchpay_headers(), timeout=15.0)
        if resp.status_code == 401:
            raise HTTPException(502, "NotchPay 401 : clé API invalide.")
        if resp.status_code == 404:
            raise HTTPException(404, f"Référence '{body.reference}' introuvable.")
        resp.raise_for_status()
    except HTTPException:
        raise
    except httpx.RequestError as exc:
        log.error("[NotchPay verify] RequestError : %s", exc)
        raise HTTPException(502, "NotchPay : impossible de vérifier le paiement.")

    try:
        data = resp.json()
    except Exception:
        raise HTTPException(502, "NotchPay : réponse non-JSON.")

    transaction = data.get("transaction") or {}
    if isinstance(transaction, str):
        transaction = {}

    status    = transaction.get("status", data.get("status", "unknown"))
    meta      = transaction.get("customer_meta") or transaction.get("meta") or {}
    plan      = meta.get("plan", "standard")
    reference = transaction.get("reference", body.reference)

    if status in ("complete", "completed", "success"):
        _update_user_plan(uid, plan)
        log.info("[NotchPay verify] ✅ Paiement confirmé uid=%s plan=%s", uid, plan)

    return VerifyPaymentResponse(plan=plan, status=status, reference=reference)


# ════════════════════════════════════════════════════════════════
#  POST /payment/webhook  (NotchPay)
# ════════════════════════════════════════════════════════════════

@router.post("/webhook")
async def notchpay_webhook(request: Request) -> dict:
    """
    Webhook NotchPay — reçoit les événements de paiement.
    Configurer dans : https://business.notchpay.co/settings/developer
    URL : {APP_URL}/payment/webhook
    Événement principal : payment.complete
    """
    import json as _json

    try:
        payload = await request.body()
        event   = _json.loads(payload)
    except Exception:
        raise HTTPException(400, "Payload webhook invalide.")

    event_type  = event.get("event", "")
    transaction = event.get("data") or event.get("transaction") or {}
    if isinstance(transaction, str):
        transaction = {}

    log.info("[Webhook NotchPay] event=%s", event_type)

    if event_type in ("payment.complete", "payment.success", "transaction.complete"):
        meta = transaction.get("customer_meta") or transaction.get("meta") or {}
        uid  = meta.get("uid", "")
        plan = meta.get("plan", "standard")
        if uid:
            _update_user_plan(uid, plan)
            log.info("[Webhook NotchPay] ✅ Plan mis à jour uid=%s → %s", uid, plan)
        else:
            log.warning("[Webhook NotchPay] uid absent dans customer_meta : %s", meta)

    elif event_type in ("payment.failed", "transaction.failed"):
        log.warning("[Webhook NotchPay] Paiement échoué : %s", transaction)

    return {"received": True}


# ════════════════════════════════════════════════════════════════
# Helpers Firestore
# ════════════════════════════════════════════════════════════════

def _update_user_plan(uid: str, plan: str) -> None:
    """Met à jour le plan utilisateur dans Firestore."""
    try:
        now = firebase_service._now()
        firebase_service.db.collection("abonnements").document(uid).set(
            {"plan": plan, "status": "active", "updatedAt": now},
            merge=True,
        )
        firebase_service.db.collection("users").document(uid).set(
            {"plan": plan}, merge=True,
        )
        log.info("[Firestore] ✅ Plan mis à jour uid=%s → %s", uid, plan)
        
        # Envoi de l'email de confirmation de paiement (si plan payant)
        if plan in ("premium", "extra"):
            import asyncio
            try:
                # Récupérer l'email et le nom de l'utilisateur
                user = firebase_service.get_user(uid)
                email = user.get("email") if user else None
                name = user.get("prenom") or user.get("displayName") or "Cher client" if user else "Cher client"
                
                if email:
                    from app.services.email_service import email_service
                    # Appel asynchrone non bloquant
                    asyncio.create_task(email_service.send_payment_confirmation(
                        email=email,
                        name=name,
                        plan=plan,
                        amount=50000 if plan == "premium" else 100000
                    ))
                    log.info(f"📧 Email de confirmation programmé pour {email} (plan {plan})")
            except Exception as e:
                log.error(f"❌ Erreur envoi email confirmation: {e}")
                
    except Exception as exc:
        log.error("[Firestore] Erreur mise à jour plan uid=%s : %s", uid, exc)