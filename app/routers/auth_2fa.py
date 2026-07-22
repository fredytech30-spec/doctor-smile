"""
ROUTER — auth_2fa.py — Double authentification par email OTP

Endpoints :
  POST /auth/2fa/send           → Envoyer un code OTP à l'utilisateur
  POST /auth/2fa/verify         → Vérifier le code OTP
  POST /auth/2fa/enable         → Activer la 2FA pour l'utilisateur
  POST /auth/2fa/disable        → Désactiver la 2FA
  GET  /auth/2fa/status/{uid}   → Vérifier si la 2FA est active
"""

from __future__ import annotations

import logging
import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.middleware.firebase_verify import verify_token
from app.services.otp_service import otp_service

# Initialize rate limiter for this router
limiter = Limiter(key_func=get_remote_address)

log = logging.getLogger("doctorsmile.router.auth_2fa")
router = APIRouter(prefix="/auth/2fa", tags=["Authentification 2FA"])


# ════════════════════════════════════════════════════════════════
#  SCHÉMAS
# ════════════════════════════════════════════════════════════════

class SendOTPRequest(BaseModel):
    uid: str
    email: str
    name: str = "là"


class VerifyOTPRequest(BaseModel):
    uid: str
    code: str


class Toggle2FARequest(BaseModel):
    uid: str


# ════════════════════════════════════════════════════════════════
#  HELPER — token optionnel (ne bloque pas si Firebase lent)
# ════════════════════════════════════════════════════════════════

async def _optional_token(request: Request) -> Optional[dict]:
    """
    Tente de vérifier le token Firebase.
    Retourne None si absent ou invalide (ne lève pas 401).
    Permet à la page OTP de fonctionner même quand le SDK
    Firebase Admin est lent à s'initialiser.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        log.debug("[2FA] Pas de Bearer header — token optionnel accepté")
        return None

    raw = auth_header[7:].strip()
    if not raw:
        return None

    try:
        from firebase_admin import auth as fb_auth
        decoded = fb_auth.verify_id_token(raw)
        return {
            "uid":   decoded.get("uid", ""),
            "email": decoded.get("email", ""),
            "name":  decoded.get("name", ""),
        }
    except Exception as exc:
        log.warning("[2FA] Token Firebase invalide (non-bloquant) : %s", exc)
        return None


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Envoyer un code OTP
#  POST /auth/2fa/send
# ════════════════════════════════════════════════════════════════

@router.post("/send")
@limiter.limit("5/minute")  # 5 requests per minute per IP
async def send_otp(request: Request, req: SendOTPRequest):
    """
    Envoie un code OTP à 6 chiffres par email.
    Le code est valable 5 minutes.
    Token Firebase optionnel (non bloquant) pour compatibilité.
    """
    log.info("=" * 60)
    log.info("🔗 [BACKEND] /auth/2fa/send endpoint HIT")
    log.info("🔗 [BACKEND] Request from: %s", request.client.host if request.client else "unknown")
    log.info("🔗 [BACKEND] Request headers: %s", dict(request.headers))
    log.info("[2FA] 📧 DEMANDE D'ENVOI OTP")
    log.info("[2FA] From: %s", request.client.host if request.client else "unknown")
    log.info("[2FA] To: %s (uid: %s)", req.email, req.uid)

    # Vérification du token — optionnelle pour ne pas bloquer l'OTP
    token_payload = await _optional_token(request)
    if token_payload:
        token_uid = token_payload.get("uid", "")
        if token_uid and token_uid != req.uid:
            log.warning("[2FA] UID mismatch! token=%s req=%s", token_uid, req.uid)
            raise HTTPException(403, "uid ne correspond pas au token")
        log.info("[2FA] Token valide pour uid=%s", token_uid)
    else:
        log.info("[2FA] Pas de token Firebase — mode sans-auth accepté pour OTP")

    # Validation minimale
    if not req.uid or not req.email or "@" not in req.email:
        raise HTTPException(400, "uid et email valides sont requis")

    # Créer et stocker l'OTP
    log.info("[2FA] 🔐 Génération du code OTP pour %s...", req.email)
    otp_data = await otp_service.create_otp(req.uid, req.email)
    otp_code = otp_data["code"]
    expires_at = otp_data["expires_at"]
    
    dev_mode = os.getenv("AUTH_DEV_MODE", "false").lower() in ("1", "true", "yes")
    if dev_mode:
        log.info("[2FA] ⚠️ [DEV MODE] CODE OTP GÉNÉRÉ POUR %s : %s", req.email, otp_code)
    else:
        log.info("[2FA] ✅ Code généré (expire: %s)", expires_at)

    # Envoyer par email
    log.info("[2FA] 📤 Envoi de l'email à %s...", req.email)
    sent = await otp_service.send_otp_email(req.email, req.name, otp_code)

    if sent:
        log.info("[2FA] ✅ EMAIL ENVOYÉ AVEC SUCCÈS à %s", req.email)
        log.info("🔗 [BACKEND] OTP send completed successfully")
    else:
        log.error("[2FA] ❌ ÉCHEC DE L'ENVOI à %s", req.email)
        log.error("🔗 [BACKEND] OTP send failed")
        # En mode dev (pas de provider email configuré), on retourne quand même succès
        dev_mode = os.getenv("AUTH_DEV_MODE", "false").lower() in ("1", "true", "yes")
        if not dev_mode:
            raise HTTPException(500, "Erreur lors de l'envoi du code OTP. Vérifiez la configuration email.")

    log.info("[2FA] 🎯 Processus OTP terminé !")
    log.info("=" * 60)

    return {
        "status": "success",
        "message": f"Code OTP envoyé à {req.email}",
        "email_sent": sent,
        "expires_at": expires_at.isoformat() if hasattr(expires_at, "isoformat") else str(expires_at),
        "to": req.email,
    }


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Vérifier le code OTP
#  POST /auth/2fa/verify
# ════════════════════════════════════════════════════════════════

@router.post("/verify")
@limiter.limit("10/minute")  # 10 requests per minute per IP
async def verify_otp(request: Request, req: VerifyOTPRequest):
    """
    Vérifie le code OTP soumis par l'utilisateur contre le code généré et stocké.
    Appelle otp_service.verify_otp() pour une vérification cryptographique réelle.
    Token Firebase optionnel (non bloquant).
    """
    _dev_mode = os.getenv("AUTH_DEV_MODE", "false").lower() in ("1", "true", "yes")

    # Validation du format
    if not req.code or len(req.code) != 6 or not req.code.isdigit():
        log.warning("[2FA] ⚠️ Code OTP invalide pour uid=%s (format non valide)", req.uid)
        raise HTTPException(400, "Code doit être exactement 6 chiffres.")

    # ── Vérification réelle contre otp_service ────────────────────
    if _dev_mode and req.code == "123456":
        # Mode développement uniquement : code universel de debug
        log.warning("[2FA] 🟡 [DEV ONLY] Code de bypass dev (123456) accepté pour uid=%s", req.uid)
        verify_result = {"success": True, "message": "Code valide (mode dev)"}
    else:
        try:
            verify_result = await otp_service.verify_otp(req.uid, req.code)
        except Exception as exc:
            log.error("[2FA] ❌ Erreur vérification OTP pour uid=%s : %s", req.uid, exc)
            raise HTTPException(500, "Erreur technique lors de la vérification — réessayez.")

        if not verify_result.get("success"):
            reason = verify_result.get("message", "Code incorrect ou expiré")
            log.warning("[2FA] ❌ OTP refusé pour uid=%s : %s", req.uid, reason)
            raise HTTPException(400, reason)

    log.info("[2FA] ✅ OTP vérifié avec succès pour uid=%s", req.uid)

    # ── Générer et stocker le token de session 2FA ─────────────────
    import secrets as _secrets
    verification_token = _secrets.token_urlsafe(32)

    from app.middleware.session_2fa import pending_2fa
    pending_2fa[req.uid] = verification_token
    log.info("[2FA] 🔐 Session 2FA créée pour uid=%s (token=***%s)", req.uid, verification_token[-6:])

    cookie_secure = os.getenv("AUTH_SECURE_COOKIES", "false").lower() in ("1", "true", "yes")
    resp = JSONResponse(content={
        "status": "verified",
        "message": "Authentification à deux facteurs réussie.",
        "verification_token": verification_token,
    })
    resp.set_cookie(
        key="ds_2fa",
        value=verification_token,
        httponly=True,
        secure=cookie_secure,
        samesite="None",
        max_age=3600,
    )
    return resp


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 2b — Vérifier la session 2FA active
#  POST /auth/2fa/check-session
# ════════════════════════════════════════════════════════════════

@router.post("/check-session")
async def check_session(request: Request):
    """Vérifie si la session 2FA est toujours valide."""
    token = request.headers.get("X-2FA-Verified", "")
    uid   = request.headers.get("X-User-UID", "")

    from app.middleware.session_2fa import pending_2fa
    if not uid or pending_2fa.get(uid) != token:
        raise HTTPException(403, "Session 2FA invalide ou expirée")

    return {"status": "valid", "message": "Session 2FA valide"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 3 — Activer la 2FA
#  POST /auth/2fa/enable
# ════════════════════════════════════════════════════════════════

@router.post("/enable")
async def enable_2fa(req: Toggle2FARequest, token: dict = Depends(verify_token)):
    uid = token.get("uid", "")
    if uid and uid != req.uid:
        raise HTTPException(403, "uid ne correspond pas au token")

    success = await otp_service.enable_2fa(req.uid)
    if not success:
        raise HTTPException(500, "Erreur lors de l'activation de la 2FA")

    log.info("[2FA] Activée pour uid=%s", req.uid)
    return {"status": "enabled", "message": "Double authentification activée"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 4 — Désactiver la 2FA
#  POST /auth/2fa/disable
# ════════════════════════════════════════════════════════════════

@router.post("/disable")
async def disable_2fa(req: Toggle2FARequest, token: dict = Depends(verify_token)):
    uid = token.get("uid", "")
    if uid and uid != req.uid:
        raise HTTPException(403, "uid ne correspond pas au token")

    success = await otp_service.disable_2fa(req.uid)
    if not success:
        raise HTTPException(500, "Erreur lors de la désactivation de la 2FA")

    log.info("[2FA] Désactivée pour uid=%s", req.uid)
    return {"status": "disabled", "message": "Double authentification désactivée"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 5 — Vérifier le statut 2FA
#  GET /auth/2fa/status/{uid}
# ════════════════════════════════════════════════════════════════

@router.get("/status/{uid}")
async def get_2fa_status(uid: str):
    """
    Vérifie si la double authentification est activée pour cet utilisateur.
    Toujours vrai pour forcer la 2FA.
    """
    return {"two_factor_auth": True}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 6 — Diagnostic OTP (debug uniquement)
#  GET /auth/2fa/debug
# ════════════════════════════════════════════════════════════════

@router.get("/debug")
async def debug_otp():
    """Endpoint de diagnostic — vérifie la config email et Firebase."""
    from app.services.email_service import email_service
    from app.services.firebase_service import firebase_service

    diag = {
        "firebase_available": firebase_service.available,
        "email_provider": email_service._get_provider(),
        "brevo_key_set": bool(os.getenv("BREVO_API_KEY")),
        "resend_key_set": bool(os.getenv("RESEND_API_KEY")),
        "auth_dev_mode": os.getenv("AUTH_DEV_MODE", "false"),
    }
    log.info("[2FA/debug] %s", diag)
    return diag
