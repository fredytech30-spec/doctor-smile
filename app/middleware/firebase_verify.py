"""
MIDDLEWARE — firebase_verify.py
Vérification JWT Firebase Admin SDK.
Fallback dev uniquement si AUTH_DEV_MODE=true.
"""
from __future__ import annotations

import logging
import os

from fastapi import HTTPException, Request

log = logging.getLogger("doctorsmile.auth")

_DEV_MODE = os.getenv("AUTH_DEV_MODE", "false").lower() in ("1", "true", "yes")

_DEV_PAYLOAD: dict = {
    "uid":   "dev-uid-000",
    "email": "dev@doctorsmile.io",
    "name":  "Dev User",
    "plan":  "extra",
}


def _decode_firebase_token(token: str) -> dict:
    from firebase_admin import auth as fb_auth

    decoded = fb_auth.verify_id_token(token)
    return {
        "uid":   decoded.get("uid", ""),
        "email": decoded.get("email", ""),
        "name":  decoded.get("name", ""),
        "plan":  decoded.get("plan", "standard"),
    }


async def verify_token(request: Request) -> dict:
    log.info(f"[Auth] verify_token called!")
    log.info(f"[Auth] Request headers: {dict(request.headers)}")
    
    auth_header = request.headers.get("Authorization", "")
    log.info(f"[Auth] Authorization header: {auth_header[:50] if auth_header else '<empty>'}")

    if not auth_header.startswith("Bearer "):
        log.warning("[Auth] Header does not start with Bearer!")
        if _DEV_MODE:
            log.debug("[Auth] Pas de Bearer — mode dev")
            return _DEV_PAYLOAD
        raise HTTPException(401, "Authentification requise")

    raw = auth_header[7:].strip()
    log.info(f"[Auth] Raw token (first 50 chars): {raw[:50]}...")
    if not raw:
        log.warning("[Auth] Token is empty!")
        if _DEV_MODE:
            return _DEV_PAYLOAD
        raise HTTPException(401, "Token vide")

    try:
        decoded = _decode_firebase_token(raw)
        log.info(f"[Auth] Successfully decoded token! User: {decoded['uid']}, Email: {decoded['email']}")
        return decoded
    except Exception as exc:
        log.warning("[Auth] JWT invalide : %s", exc)
        if _DEV_MODE:
            log.info("[Auth] Using dev payload because of token error")
            return _DEV_PAYLOAD
        raise HTTPException(401, "Token Firebase invalide ou expiré")


async def get_current_firebase_uid(request: Request) -> str:
    """Récupère l'UID Firebase depuis le token JWT (pour compatibilité)."""
    payload = await verify_token(request)
    return payload.get("uid", "")
