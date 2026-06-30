"""
session_2fa.py — Middleware d'enforcement 2FA pour Doctor Smile

Protège l'accès au dashboard.html en exigeant une session 2FA valide.
Les sessions sont stockées en mémoire (dict) avec un TTL d'1 heure.

En production : remplacer par Redis pour la persistance entre redémarrages.
"""

import time
import logging
from fastapi import Request
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("doctorsmile.session_2fa")

# ════════════════════════════════════════════════════════════════
#  STOCKAGE DES SESSIONS 2FA
#  Format: {uid: {"token": str, "expires_at": float}}
# ════════════════════════════════════════════════════════════════

_SESSION_TTL = 3600  # 1 heure en secondes
_sessions_2fa: dict[str, dict] = {}


def _set_session(uid: str, token: str) -> None:
    """Enregistre une session 2FA valide."""
    _sessions_2fa[uid] = {
        "token": token,
        "expires_at": time.time() + _SESSION_TTL
    }
    log.debug(f"[2FA] Session créée pour uid={uid}")


def _get_session_token(uid: str) -> str | None:
    """Retourne le token de session si valide, None sinon."""
    session = _sessions_2fa.get(uid)
    if not session:
        return None
    if time.time() > session.get("expires_at", 0):
        del _sessions_2fa[uid]
        log.debug(f"[2FA] Session expirée pour uid={uid}")
        return None
    return session.get("token")


def _is_token_valid_any(token: str) -> bool:
    """Vérifie si un token correspond à une session 2FA valide (sans uid connu)."""
    now = time.time()
    for uid, session in list(_sessions_2fa.items()):
        if time.time() > session.get("expires_at", 0):
            del _sessions_2fa[uid]
            continue
        if session.get("token") == token:
            return True
    return False


def _cleanup_expired() -> None:
    """Supprime les sessions expirées."""
    now = time.time()
    expired = [uid for uid, s in _sessions_2fa.items() if now > s.get("expires_at", 0)]
    for uid in expired:
        del _sessions_2fa[uid]


# ════════════════════════════════════════════════════════════════
#  API PUBLIQUE — utilisée par auth_2fa.py
# ════════════════════════════════════════════════════════════════

# Compatibilité avec l'ancienne interface dict (auth_2fa.py fait pending_2fa[uid] = token)
class _PendingDict:
    """Proxy dict qui délègue vers le stockage avec TTL."""

    def __setitem__(self, uid: str, token: str):
        _set_session(uid, token)

    def __getitem__(self, uid: str) -> str | None:
        return _get_session_token(uid)

    def get(self, uid: str, default=None):
        token = _get_session_token(uid)
        return token if token is not None else default

    def values(self):
        _cleanup_expired()
        return [s["token"] for s in _sessions_2fa.values()]

    def __contains__(self, uid: str):
        return _get_session_token(uid) is not None


pending_2fa = _PendingDict()


# ════════════════════════════════════════════════════════════════
#  MIDDLEWARE
# ════════════════════════════════════════════════════════════════

# Routes qui ne nécessitent PAS de session 2FA
_PUBLIC_PREFIXES = (
    "/auth/2fa",
    "/auth/",
    "/email",
    "/reset-password",
    "/otp-verify",
    "/intro",
    "/doctorSmile",
    "/assets/",
    "/js/",
    "/public/",
    "/docs",
    "/redoc",
    "/openapi",
)

_PUBLIC_PATHS = ("/", "/auth.html", "/otp-verify.html", "/intro.html")


class Enforce2FAMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        # Toujours autoriser OPTIONS (preflight CORS)
        if method == "OPTIONS":
            return await call_next(request)

        # Autoriser les routes publiques
        if path in _PUBLIC_PATHS:
            return await call_next(request)

        for prefix in _PUBLIC_PREFIXES:
            if path.startswith(prefix):
                return await call_next(request)

        # ── Protection du dashboard.html ────────────────────────
        if path.endswith("/dashboard.html") or path == "/dashboard.html":
            header_token = request.headers.get("X-2FA-Verified", "")
            cookie_token = request.cookies.get("ds_2fa", "")
            uid = request.headers.get("X-User-UID", "")

            # Vérification par uid + header
            if uid and header_token and pending_2fa.get(uid) == header_token:
                return await call_next(request)

            # Vérification par cookie (sans uid connu)
            if cookie_token and _is_token_valid_any(cookie_token):
                return await call_next(request)

            # Pas de session valide → redirection OTP
            log.warning(f"[2FA] Accès dashboard sans session valide — redirection OTP (path={path})")
            return RedirectResponse(url="/otp-verify.html", status_code=302)

        # ── Protection des endpoints API /dashboard/* ───────────
        if path.startswith("/dashboard"):
            header_token = request.headers.get("X-2FA-Verified", "")
            cookie_token = request.cookies.get("ds_2fa", "")
            uid = request.headers.get("X-User-UID", "")

            if uid and header_token and pending_2fa.get(uid) == header_token:
                return await call_next(request)

            if cookie_token and _is_token_valid_any(cookie_token):
                return await call_next(request)

            return JSONResponse(
                status_code=403,
                content={"detail": "Session 2FA requise", "redirect": "/otp-verify.html"}
            )

        # Toutes les autres routes sont libres
        return await call_next(request)
