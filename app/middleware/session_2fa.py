"""
session_2fa.py — Middleware d'enforcement 2FA pour Doctor Smile

Sessions 2FA stockées dans Firestore (collection `sessions_2fa`) avec TTL.
Fallback mémoire si Firebase non disponible.
En production multi-workers, Firestore garantit la cohérence inter-processus.
"""

import time
import logging
from fastapi import Request
from fastapi.responses import RedirectResponse, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

log = logging.getLogger("doctorsmile.session_2fa")

# ════════════════════════════════════════════════════════════════
#  STOCKAGE DES SESSIONS 2FA — HYBRIDE FIRESTORE + MÉMOIRE
#  Firestore : collection sessions_2fa/{uid}
#  Champs   : { token: str, expires_at: float }
#  Mémoire  : fallback si Firebase non disponible
# ════════════════════════════════════════════════════════════════

_SESSION_TTL: int = 3600  # 1 heure

# Fallback mémoire (uniquement si Firestore indisponible)
_mem_sessions: dict[str, dict] = {}


def _get_db():
    """Retourne le client Firestore si disponible, None sinon."""
    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            return firebase_service.db
    except Exception:
        pass
    return None


def _set_session(uid: str, token: str) -> None:
    """Enregistre une session 2FA valide — Firestore en priorité."""
    expires_at = time.time() + _SESSION_TTL
    db = _get_db()
    if db:
        try:
            db.collection("sessions_2fa").document(uid).set({
                "token": token,
                "expires_at": expires_at,
            })
            log.debug("[2FA] Session Firestore créée pour uid=%s", uid)
            return
        except Exception as exc:
            log.warning("[2FA] Erreur écriture Firestore session, fallback mémoire : %s", exc)

    # Fallback mémoire
    _mem_sessions[uid] = {"token": token, "expires_at": expires_at}
    log.debug("[2FA] Session mémoire créée pour uid=%s", uid)


def _get_session_token(uid: str) -> str | None:
    """Retourne le token de session si valide, None sinon."""
    now = time.time()
    db = _get_db()
    if db:
        try:
            doc = db.collection("sessions_2fa").document(uid).get()
            if doc.exists:
                data = doc.to_dict() or {}
                if data.get("expires_at", 0) > now:
                    return data.get("token")
                # Expirée — supprimer
                db.collection("sessions_2fa").document(uid).delete()
            return None
        except Exception as exc:
            log.warning("[2FA] Erreur lecture Firestore session, fallback mémoire : %s", exc)

    # Fallback mémoire
    session = _mem_sessions.get(uid)
    if not session:
        return None
    if now > session.get("expires_at", 0):
        del _mem_sessions[uid]
        return None
    return session.get("token")


def _is_token_valid_any(token: str) -> bool:
    """Vérifie si un token correspond à une session 2FA valide (sans uid connu)."""
    now = time.time()
    db = _get_db()
    if db:
        try:
            # Requête Firestore sur le champ token (nécessite un index simple sur `token`)
            docs = db.collection("sessions_2fa").where("token", "==", token).limit(1).stream()
            for doc in docs:
                data = doc.to_dict() or {}
                if data.get("expires_at", 0) > now:
                    return True
            return False
        except Exception as exc:
            log.warning("[2FA] Erreur recherche token Firestore, fallback mémoire : %s", exc)

    # Fallback mémoire
    for uid, session in list(_mem_sessions.items()):
        if now > session.get("expires_at", 0):
            del _mem_sessions[uid]
            continue
        if session.get("token") == token:
            return True
    return False


# ════════════════════════════════════════════════════════════════
#  API PUBLIQUE — utilisée par auth_2fa.py
# ════════════════════════════════════════════════════════════════

class _PendingDict:
    """Proxy dict qui délègue vers le stockage hybride avec TTL."""

    def __setitem__(self, uid: str, token: str):
        _set_session(uid, token)

    def __getitem__(self, uid: str) -> str | None:
        return _get_session_token(uid)

    def get(self, uid: str, default=None):
        token = _get_session_token(uid)
        return token if token is not None else default

    def values(self):
        # Utilisé uniquement en fallback mémoire
        return [s["token"] for s in _mem_sessions.values()
                if time.time() <= s.get("expires_at", 0)]

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
