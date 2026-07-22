"""
ROUTER — reset_password.py — Réinitialisation mot de passe via Brevo (HTML direct)

Tokens de reset stockés dans Firestore (collection `password_resets/{token}`).
Résiste aux redémarrages et fonctionne avec plusieurs workers.
"""

from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr
from firebase_admin import auth as fb_auth

from app.services.firebase_service import firebase_service
from app.services.email_service import email_service

log = logging.getLogger("doctorsmile.reset_password")
router = APIRouter(prefix="/reset-password", tags=["Réinitialisation"])

_APP_URL = os.getenv("APP_URL", "https://doctorsmile-d8d8f.web.app")


# ── Helpers Firestore pour les tokens de reset ───────────────────

def _save_reset_token(token: str, uid: str, email: str, expires_at: datetime) -> None:
    """Sauvegarde un token de reset dans Firestore."""
    if not firebase_service.available:
        log.warning("[Reset] Firebase non disponible — token non persisté")
        return
    try:
        firebase_service.db.collection("password_resets").document(token).set({
            "uid": uid,
            "email": email,
            "expires_at": expires_at.isoformat(),
            "used": False,
        })
    except Exception as exc:
        log.error("[Reset] Erreur sauvegarde token Firestore : %s", exc)


def _get_reset_token(token: str) -> dict | None:
    """Récupère les données d'un token de reset depuis Firestore."""
    if not firebase_service.available:
        return None
    try:
        doc = firebase_service.db.collection("password_resets").document(token).get()
        if doc.exists:
            return doc.to_dict()
    except Exception as exc:
        log.error("[Reset] Erreur lecture token Firestore : %s", exc)
    return None


def _mark_reset_token_used(token: str) -> None:
    """Marque un token de reset comme utilisé dans Firestore."""
    if not firebase_service.available:
        return
    try:
        firebase_service.db.collection("password_resets").document(token).update({"used": True})
    except Exception as exc:
        log.error("[Reset] Erreur marquage token utilisé : %s", exc)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Demander un reset (envoie l'email via Brevo)
#  POST /reset-password/forgot
# ════════════════════════════════════════════════════════════════

@router.post("/forgot")
async def forgot_password(req: ForgotPasswordRequest, request: Request):
    """
    Génère un token de reset et l'envoie par email via Brevo (HTML direct).
    Répond toujours 200 pour ne pas révéler si l'email existe.
    """
    email = str(req.email)

    uid  = None
    name = email.split("@")[0]
    try:
        user = fb_auth.get_user_by_email(email)
        uid  = user.uid
        name = user.display_name or name
        # Récupérer le prénom depuis Firestore
        if firebase_service.available and uid:
            try:
                doc = firebase_service.db.collection("users").document(uid).get()
                if doc.exists:
                    d = doc.to_dict()
                    name = d.get("prenom") or d.get("displayName") or name
            except Exception:
                pass
    except Exception as e:
        log.warning("Utilisateur non trouvé: %s — %s", email, e)
        return {"status": "sent", "message": "Si un compte existe, un email a été envoyé"}

    # Générer un token sécurisé et le persister dans Firestore
    token      = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)

    _save_reset_token(token, uid, email, expires_at)

    # Déterminer l'URL du frontend dynamiquement (via origin ou referer), avec fallback sur _APP_URL
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer")
        if referer:
            from urllib.parse import urlparse
            p = urlparse(referer)
            origin = f"{p.scheme}://{p.netloc}"
    
    app_url = origin if origin else _APP_URL

    # Lien de reset
    reset_url = f"{app_url}/reset-password.html?token={token}"

    # Envoyer via Brevo HTML direct
    ok = await email_service.send_reset_password(
        email     = email,
        name      = name,
        reset_url = reset_url,
        expires_h = 1,
    )

    if not ok:
        log.error("Erreur envoi email reset Brevo pour %s", email)
        raise HTTPException(500, "Erreur lors de l'envoi de l'email de réinitialisation")

    log.info("✓ Email de réinitialisation envoyé à %s via Brevo", email)
    return {"status": "sent", "message": "Email envoyé avec succès"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Valider le token et changer le mot de passe
#  POST /reset-password/reset
# ════════════════════════════════════════════════════════════════

@router.post("/reset")
async def reset_password(req: ResetPasswordRequest):
    """Réinitialise le mot de passe via Firebase Admin SDK."""
    if len(req.new_password) < 6:
        raise HTTPException(400, "Le mot de passe doit contenir au moins 6 caractères")

    token_data = _get_reset_token(req.token)
    if not token_data:
        raise HTTPException(400, "Token invalide ou expiré")
    if token_data.get("used"):
        raise HTTPException(400, "Ce token a déjà été utilisé")

    expires_at = datetime.fromisoformat(token_data["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(400, "Token expiré — veuillez refaire une demande")

    uid = token_data["uid"]
    try:
        fb_auth.update_user(uid, password=req.new_password)
        _mark_reset_token_used(req.token)
        log.info("Mot de passe réinitialisé pour uid=%s", uid)
        return {"status": "success", "message": "Mot de passe mis à jour avec succès"}
    except Exception as e:
        log.error("Erreur réinitialisation: %s", e)
        raise HTTPException(500, "Erreur technique lors de la réinitialisation")


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 3 — Valider un token (GET)
#  GET /reset-password/validate/{token}
# ════════════════════════════════════════════════════════════════

@router.get("/validate/{token}")
async def validate_reset_token(token: str):
    """Vérifie si un token de reset est valide et non expiré."""
    data = _get_reset_token(token)
    if not data:
        return {"valid": False, "reason": "Token introuvable"}
    if data.get("used"):
        return {"valid": False, "reason": "Token déjà utilisé"}
    expires_at = datetime.fromisoformat(data["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return {"valid": False, "reason": "Token expiré"}
    return {"valid": True, "email": data["email"]}
