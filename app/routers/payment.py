"""
==========================================
ROUTER — payment.py
DOCTOR SMILE — NotchPay Payment Integration
==========================================

Endpoints :
  POST /payment/create-checkout  → Crée une session NotchPay ou FAPSHI
  POST /payment/webhook          → Webhook NotchPay (mise à jour plan)
  POST /payment/verify-payment   → Vérifie un paiement via reference
  GET  /payment/plans            → Liste des plans disponibles

Variables d'environnement (.env) :
  NOTCHPAY_API_KEY=pk.xxxxx      ← clé PUBLIQUE (pk.) — obligatoire pour /payments
  NOTCHPAY_BASE_URL=https://api.notchpay.co
  NOTCHPAY_WEBHOOK_SECRET=xxxxxx  ← secret webhook NotchPay (facultatif mais recommandé)
  FAPSHI_API_KEY=FAK_xxx         ← clé API FAPSHI
  FAPSHI_USER_ID=xxxxxxxx-xxxx
  FAPSHI_API_URL=https://api.fapshi.example/checkout
  FAPSHI_WEBHOOK_URL=https://.../api/payment/webhook
  FAPSHI_WEBHOOK_SECRET=xxxxxx    ← secret webhook Fapshi (facultatif mais recommandé)

Doc officielle NotchPay (https://developer.notchpay.co/api-reference/authentication) :
  Authorization: YOUR_PUBLIC_KEY   (clé publique pk., sans "Bearer")
  Endpoint : POST https://api.notchpay.co/payments
  Réponse  : { authorization_url, transaction, code, message }
"""

from __future__ import annotations

import hashlib
import hmac
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

# ── Config FAPSHI ──────────────────────────────────────────────
FAPSHI_API_KEY      = os.getenv("FAPSHI_API_KEY", "")
FAPSHI_USER_ID      = os.getenv("FAPSHI_USER_ID", "")
FAPSHI_API_URL      = os.getenv("FAPSHI_API_URL", "").rstrip("/")
FAPSHI_WEBHOOK_URL  = os.getenv("FAPSHI_WEBHOOK_URL", "").rstrip("/")
FAPSHI_VERIFY_URL   = os.getenv("FAPSHI_VERIFY_URL", "")
NOTCHPAY_WEBHOOK_SECRET = os.getenv("NOTCHPAY_WEBHOOK_SECRET", "")
FAPSHI_WEBHOOK_SECRET  = os.getenv("FAPSHI_WEBHOOK_SECRET", "")

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
    operator: Optional[str] = None
    plan: Optional[str] = None


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


def _fapshi_configured() -> bool:
    if not FAPSHI_API_KEY:
        log.error("[Fapshi] FAPSHI_API_KEY est vide dans .env")
        return False
    if not FAPSHI_USER_ID:
        log.error("[Fapshi] FAPSHI_USER_ID est vide dans .env")
        return False
    if not FAPSHI_API_URL:
        log.error("[Fapshi] FAPSHI_API_URL est vide dans .env")
        return False
    if not FAPSHI_WEBHOOK_URL:
        log.error("[Fapshi] FAPSHI_WEBHOOK_URL est vide dans .env")
        return False
    return True


def _fapshi_headers() -> dict[str, str]:
    return {
        "Authorization": FAPSHI_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _parse_signature(signature: str) -> str:
    if not signature:
        return ""
    signature = signature.strip()
    if "=" in signature:
        _, signature = signature.split("=", 1)
    return signature.strip()


def _verify_webhook_signature(request: Request, payload: bytes) -> bool:
    headers = request.headers
    candidates = [
        ("notchpay", "x-notchpay-signature"),
        ("notchpay", "x-notchpay-webhook-signature"),
        ("fapshi", "x-fapshi-signature"),
        ("fapshi", "x-fapshi-webhook-signature"),
        ("generic", "x-signature"),
        ("generic", "x-hub-signature"),
    ]

    for provider, header_name in candidates:
        signature = headers.get(header_name)
        if not signature:
            continue

        signature = _parse_signature(signature)
        if not signature:
            log.error("[Webhook] signature vide dans l en-tete %s", header_name)
            return False

        if provider == "notchpay":
            secret = NOTCHPAY_WEBHOOK_SECRET
        elif provider == "fapshi":
            secret = FAPSHI_WEBHOOK_SECRET
        else:
            secret = NOTCHPAY_WEBHOOK_SECRET or FAPSHI_WEBHOOK_SECRET

        if not secret:
            log.error("[Webhook] secret webhook non configuré pour %s", provider)
            return False

        expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, signature):
            log.error("[Webhook] signature invalide pour %s : attendu=%s recu=%s", provider, expected, signature)
            return False

        log.info("[Webhook] signature valide pour %s", provider)
        return True

    if NOTCHPAY_WEBHOOK_SECRET or FAPSHI_WEBHOOK_SECRET:
        log.warning("[Webhook] secret configure mais aucune signature detectee — rejet de la requete")
        return False

    log.warning("[Webhook] aucun secret webhook configure ; acceptation en mode permissif")
    return True


def _cache_payment_reference(uid: str, reference: str, plan: str, operator: str) -> None:
    """Enregistre la référence de paiement dans Firestore pour vérification ultérieure."""
    try:
        if not firebase_service.db:
            return
        doc = firebase_service.db.collection("payment_references").document(reference)
        doc.set({
            "uid": uid,
            "plan": plan,
            "operator": operator,
            "created_at": time.time(),
            "verified": False,
        }, merge=False)
        log.debug("[Cache] Référence enregistrée : %s → %s/%s", reference, uid, plan)
    except Exception as e:
        log.warning("[Cache] Erreur enregistrement référence : %s", e)


def _get_cached_payment(reference: str) -> dict[str, Any]:
    """Récupère les métadonnées de paiement en cache Firestore."""
    try:
        if not firebase_service.db:
            return {}
        doc = firebase_service.db.collection("payment_references").document(reference).get()
        if doc.exists:
            return doc.to_dict() or {}
    except Exception as e:
        log.warning("[Cache] Erreur récupération référence : %s", e)
    return {}


def _validate_payment_owner(uid: str, metadata: dict[str, Any], provider: str, reference: str = "") -> None:
    """Vérifie que l'utilisateur connecté est propriétaire du paiement."""
    # D'abord chercher en cache Firestore (source de vérité)
    cached = _get_cached_payment(reference) if reference else {}
    owner_uid = cached.get("uid") or metadata.get("uid")
    
    if not owner_uid:
        log.warning("[verify-payment] %s : UID absent (cache=%s, metadata=%s, ref=%s)", 
                    provider, bool(cached.get("uid")), bool(metadata.get("uid")), reference)
        raise HTTPException(403, "Référence de paiement non autorisée : utilisateur non identifié.")
    
    if owner_uid != uid:
        log.warning(
            "[verify-payment] %s UID mismatch : token_uid=%s cached_uid=%s metadata_uid=%s",
            provider,
            uid,
            cached.get("uid"),
            metadata.get("uid"),
        )
        raise HTTPException(403, "Référence de paiement non autorisée pour cet utilisateur.")


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
    operator = (body.operator or "notchpay").strip().lower()
    plan  = _get_plan(body.plan)
    uid   = token.get("uid", "")
    email = token.get("email", "") or f"{uid}@doctorsmile.io"

    reference = _build_reference(uid, body.plan)
    amount    = int(plan["price_xaf"])
    currency  = (body.currency or "XAF").upper()

    if operator == "fapshi":
        if not _fapshi_configured():
            raise HTTPException(
                500,
                "Fapshi non configuré — ajoutez FAPSHI_API_KEY, FAPSHI_USER_ID et FAPSHI_WEBHOOK_URL dans .env",
            )

        api_url = FAPSHI_API_URL
        payload: dict[str, Any] = {
            "user_id": FAPSHI_USER_ID,
            "amount": amount,
            "currency": currency,
            "reference": reference,
            "description": plan.get("description", plan["name"]),
            "callback_url": body.success_url,
            "cancel_url": body.cancel_url,
            "webhook_url": FAPSHI_WEBHOOK_URL,
            "customer": {
                "email": email,
                "name":  email,
            },
            "metadata": {
                "uid":  uid,
                "plan": body.plan,
                "operator": "fapshi",
            },
        }

        log.info(
            "[POST /payment/create-checkout] uid=%s plan=%s operator=fapshi amount=%d %s ref=%s",
            uid, body.plan, amount, currency, reference,
        )

        try:
            _timeout = httpx.Timeout(60.0, connect=20.0)
            try:
                resp = httpx.post(
                    api_url,
                    json=payload,
                    headers=_fapshi_headers(),
                    timeout=_timeout,
                )
            except httpx.TimeoutException:
                log.warning("[Fapshi] Timeout — retry une fois (timeout=%ss connect=%ss)", 60.0, 20.0)
                resp = httpx.post(
                    api_url,
                    json=payload,
                    headers=_fapshi_headers(),
                    timeout=_timeout,
                )

            log.debug("[Fapshi] %s → HTTP %s : %s", api_url, resp.status_code, resp.text[:500])
            if resp.status_code == 401:
                log.error("[Fapshi] 401 Unauthorized — clé API refusée. FAPSHI_API_KEY=%s...", FAPSHI_API_KEY[:12])
                raise HTTPException(
                    502,
                    "Fapshi 401 : clé API refusée. Vérifiez la valeur de FAPSHI_API_KEY dans .env.",
                )
            if resp.status_code == 404:
                log.error("[Fapshi] 404 — endpoint introuvable : %s", api_url)
                raise HTTPException(502, f"Fapshi 404 : endpoint introuvable ({api_url}).")
            if resp.status_code == 422:
                log.error("[Fapshi] 422 — payload invalide : %s", resp.text[:400])
                raise HTTPException(502, f"Fapshi 422 : données invalides — {resp.text[:200]}")
            resp.raise_for_status()
        except HTTPException:
            raise
        except httpx.ConnectError as exc:
            log.error("[Fapshi] ConnectError → %s : %s", api_url, exc)
            raise HTTPException(502, f"Fapshi : impossible de joindre {api_url}.")
        except httpx.TimeoutException:
            raise HTTPException(502, "Fapshi : délai dépassé. Réessayez.")
        except httpx.HTTPStatusError as exc:
            status = getattr(exc.response, "status_code", "?")
            text   = exc.response.text[:300] if hasattr(exc.response, "text") else str(exc)
            log.error("[Fapshi] HTTP %s : %s", status, text)
            raise HTTPException(502, f"Fapshi : erreur HTTP {status}")
        except httpx.RequestError as exc:
            log.error("[Fapshi] RequestError : %s", exc)
            raise HTTPException(502, "Fapshi : requête échouée.")

        try:
            data: dict[str, Any] = resp.json()
        except Exception:
            log.error("[Fapshi] Réponse non-JSON : %s", resp.text[:300])
            raise HTTPException(502, "Fapshi : réponse non-JSON.")

        def _deep_get_any(obj: Any, keys: list[str]) -> Optional[str]:
            if isinstance(obj, dict):
                for k in keys:
                    if k in obj and isinstance(obj.get(k), str) and obj.get(k):
                        return obj.get(k)
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

        checkout_url: str = (
            _deep_get_any(
                data,
                [
                    "checkout_url",
                    "payment_url",
                    "redirect_url",
                    "url",
                    "authorization_url",
                    "redirectUrl",
                ],
            )
            or ""
        )

        if not checkout_url:
            log.error("[Fapshi] URL de paiement absente. Réponse complète : %s", str(data)[:900])
            raise HTTPException(
                502,
                "Fapshi : URL de paiement absente dans la réponse. "
                "Vérifie la structure du payload Fapshi (checkout_url/payment_url/redirect_url). " 
                f"Réponse : {str(data)[:300]}",
            )

        transaction = data.get("transaction") or {}
        if isinstance(transaction, str):
            session_id = transaction
        else:
            session_id = (
                transaction.get("reference")
                or transaction.get("id")
                or data.get("reference")
                or reference
            )

        log.info("[Fapshi] ✅ Checkout créé — ref=%s url=%s", session_id, checkout_url)
        local_session = session_id
        _cache_payment_reference(uid, local_session, body.plan, "fapshi")
        return CheckoutResponse(checkout_url=checkout_url, session_id=local_session)

    if operator != "notchpay":
        raise HTTPException(400, f"Opérateur de paiement inconnu : {operator}")

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
    _cache_payment_reference(uid, session_id, body.plan, "notchpay")
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
    operator = (body.operator or "notchpay").strip().lower()

    if operator == "fapshi":
        log.info("[POST /payment/verify-payment] uid=%s reference=%s operator=fapshi", uid, body.reference)
        if not _fapshi_configured():
            raise HTTPException(500, "Fapshi non configuré.")

        if not FAPSHI_VERIFY_URL:
            log.warning("[Fapshi verify] FAPSHI_VERIFY_URL non configuré, retour status pending")
            plan = body.plan or "standard"
            return VerifyPaymentResponse(plan=plan, status="pending", reference=body.reference)

        api_url = f"{FAPSHI_VERIFY_URL.rstrip('/')}/{body.reference}"
        try:
            resp = httpx.get(api_url, headers=_fapshi_headers(), timeout=15.0)
            if resp.status_code == 401:
                raise HTTPException(502, "Fapshi 401 : clé API invalide.")
            if resp.status_code == 404:
                raise HTTPException(404, f"Référence '{body.reference}' introuvable.")
            resp.raise_for_status()
        except HTTPException:
            raise
        except httpx.RequestError as exc:
            log.error("[Fapshi verify] RequestError : %s", exc)
            raise HTTPException(502, "Fapshi : impossible de vérifier le paiement.")

        try:
            data = resp.json()
        except Exception:
            raise HTTPException(502, "Fapshi : réponse non-JSON.")

        transaction = data.get("transaction") or {}
        status      = transaction.get("status", data.get("status", "unknown"))
        meta        = transaction.get("metadata") or transaction.get("meta") or {}
        reference   = transaction.get("reference", body.reference)
        _validate_payment_owner(uid, meta, "Fapshi", reference)
        plan        = meta.get("plan", body.plan or "standard")

        if status in ("complete", "completed", "success", "accepted"):
            _update_user_plan(uid, plan)
            log.info("[Fapshi verify] ✅ Paiement confirmé uid=%s plan=%s", uid, plan)

        return VerifyPaymentResponse(plan=plan, status=status, reference=reference)

    if operator != "notchpay":
        raise HTTPException(400, f"Opérateur de paiement inconnu : {operator}")

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
    reference = transaction.get("reference", body.reference)
    _validate_payment_owner(uid, meta, "NotchPay", reference)
    plan      = meta.get("plan", "standard")

    if status in ("complete", "completed", "success"):
        _update_user_plan(uid, plan)
        log.info("[NotchPay verify] ✅ Paiement confirmé uid=%s plan=%s", uid, plan)

    return VerifyPaymentResponse(plan=plan, status=status, reference=reference)


# ════════════════════════════════════════════════════════════════
#  POST /payment/webhook  (NotchPay / Fapshi)
# ════════════════════════════════════════════════════════════════

@router.post("/webhook")
async def payment_webhook(request: Request) -> dict:
    """
    Webhook de paiement — reçoit les événements NotchPay ou Fapshi.
    URL : {APP_URL}/payment/webhook
    """
    import json as _json

    try:
        payload = await request.body()
        if not _verify_webhook_signature(request, payload):
            raise HTTPException(401, "Signature webhook invalide.")
        event = _json.loads(payload)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(400, "Payload webhook invalide.")

    event_type  = event.get("event", "")
    transaction = event.get("data") or event.get("transaction") or {}
    if isinstance(transaction, str):
        transaction = {}

    meta = (
        transaction.get("customer_meta")
        or transaction.get("metadata")
        or transaction.get("meta")
        or {}
    )
    uid      = meta.get("uid", "")
    plan     = meta.get("plan", "standard")
    operator = (meta.get("operator") or "notchpay").strip().lower()
    reference = transaction.get("reference", "")

    log.info("[Webhook] provider=%s event=%s uid=%s plan=%s ref=%s", operator, event_type, uid, plan, reference)

    if event_type in (
        "payment.complete",
        "payment.success",
        "transaction.complete",
        "payment.succeeded",
        "payment.successful",
        "checkout.completed",
    ):
        if uid:
            _update_user_plan(uid, plan)
            # Marquer la transaction comme vérifiée dans le cache
            if reference:
                try:
                    if firebase_service.db:
                        firebase_service.db.collection("payment_references").document(reference).update({
                            "verified": True,
                            "verified_at": time.time(),
                        })
                        log.debug("[Webhook] Référence marquée vérifiée : %s", reference)
                except Exception as e:
                    log.warning("[Webhook] Erreur update cache : %s", e)
            log.info("[Webhook] ✅ Plan mis à jour uid=%s → %s", uid, plan)
        else:
            log.warning("[Webhook] uid absent dans meta : %s", meta)

    elif event_type in ("payment.failed", "transaction.failed", "checkout.failed"):
        log.warning("[Webhook] Paiement échoué provider=%s : %s", operator, transaction)

    else:
        log.info("[Webhook] evenement ignore : %s", event_type)

    return {"received": True}


# ════════════════════════════════════════════════════════════════
# Helpers Firestore
# ════════════════════════════════════════════════════════════════

def _update_user_plan(uid: str, plan: str) -> None:
    """Met à jour le plan utilisateur dans Firestore."""
    if not firebase_service.available:
        log.warning("[Firestore] Skipped — mode mock (Firebase non disponible)")
        return
    
    try:
        # Mise à jour simple et sûre : utiliser serverTimestamp() de Firestore
        import google.cloud.firestore as firestore_module
        
        # Mettre à jour la collection abonnements
        firebase_service.db.collection("abonnements").document(uid).set(
            {
                "plan": plan,
                "status": "active",
                "updatedAt": firestore_module.SERVER_TIMESTAMP,
            },
            merge=True,
        )
        
        # Mettre à jour la collection users
        firebase_service.db.collection("users").document(uid).set(
            {"plan": plan},
            merge=True,
        )
        
        log.info("[Firestore] ✅ Plan mis à jour uid=%s → %s", uid, plan)
        
        # Envoi d'email de confirmation en arrière-plan (optionnel)
        _send_payment_confirmation_async(uid, plan)
        
    except Exception as exc:
        log.error("[Firestore] Erreur mise à jour plan uid=%s : %s", uid, exc)


def _send_payment_confirmation_async(uid: str, plan: str) -> None:
    """Envoie un email de confirmation de paiement (non bloquant)."""
    if plan not in ("premium", "extra"):
        return  # Pas d'email pour le plan standard
    
    try:
        user = firebase_service.get_user(uid)
        if not user:
            log.warning("[Email] Utilisateur %s non trouvé pour email confirmation", uid)
            return
        
        email = user.get("email") or user.get("mail")
        if not email:
            log.warning("[Email] Email absent pour uid=%s", uid)
            return
        
        name = user.get("prenom") or user.get("displayName") or "Utilisateur"
        amount = 50000 if plan == "premium" else 100000
        
        # Tentative d'envoi sans bloquer
        try:
            from app.services.email_service import email_service
            # La méthode doit être synchrone ou utiliser run_in_executor dans le contexte FastAPI
            email_service.send_payment_confirmation(
                email=email,
                name=name,
                plan=plan,
                amount=amount
            )
            log.info("[Email] ✅ Confirmation envoyée → %s (plan=%s)", email, plan)
        except Exception as email_exc:
            log.warning("[Email] Erreur envoi confirmation exception : %s", email_exc)
    
    except Exception as exc:
        log.error("[Email] Erreur préparation confirmation : %s", exc)