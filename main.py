"""
MAIN — main.py · Phase 3 COMPLÈTE
DOCTOR SMILE Backend v2.0
"""
from __future__ import annotations
import multiprocessing
multiprocessing.set_start_method("spawn", force=True)

import logging, os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

try:
    from dotenv import load_dotenv; load_dotenv()
except ImportError: pass

# ── Phases 1 & 2 ─────────────────────────────────────────────
from app.routers.analyses     import router as analyses_router
from app.routers.chat         import router as chat_router
from app.routers.scores       import router as scores_router
from app.routers.upload       import router as upload_router
from app.routers.validate     import router as validate_router
from app.routers.preview      import router as preview_router
from app.routers.payment      import router as payment_router
from app.routers.email        import router as email_router
from app.routers.rgpd         import router as rgpd_router
from app.routers.forecasting  import router as forecasting_router
from app.routers.cabinet      import router as cabinet_router
from app.routers.credit_score import router as credit_router
from app.routers.auth_2fa     import router as auth_2fa_router
from app.routers.speech       import router as speech_router
from app.routers.admin        import router as admin_router
from app.routers.reset_password import router as reset_password_router

# ── Phase 3 ───────────────────────────────────────────────────
from app.routers.agent import (
    agent_router, peers_router, cosign_router, wa_router
)

from app.services.firebase_service import firebase_service
from app.services.analyse_service  import analyse_service_standard
from app.middleware.session_2fa    import Enforce2FAMiddleware

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("doctorsmile.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Doctor Smile API v2.0 — Phase 3 COMPLÈTE — démarrage")
    log.info("Firebase   : %s", "connecté" if firebase_service.available else "mode dev")
    brevo_key = os.getenv("BREVO_API_KEY", "")
    resend_key = os.getenv("RESEND_API_KEY", "")
    email_provider = "brevo" if brevo_key else ("resend" if resend_key else "dev")
    log.info("Email      : %s", email_provider)
    log.info("WhatsApp   : %s", "API configurée" if os.getenv("WA_TOKEN") else "dev (désactivé)")
    try:
        analyse_service_standard.load_models()
        log.info("Modèles ML chargés ✓")
    except Exception as e:
        log.warning("ML mock actif : %s", e)
    yield
    log.info("Doctor Smile API — arrêt propre")


app = FastAPI(
    title="Doctor Smile API",
    description="ML · Phase 3 : Agent IA · Pairs · Co-signature · WhatsApp",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

_allow_all = os.getenv("CORS_ALLOW_ALL","true").lower() == "true"
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else [
        "http://127.0.0.1:5500","http://localhost:5500",
        "http://127.0.0.1:8000","http://localhost:8000",
        "https://doctorsmile-d8d8f.web.app",
        "https://doctorsmile-d8d8f.firebaseapp.com",
    ],
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Middleware 2FA (après CORS, avant routes) ─────────────────
app.add_middleware(Enforce2FAMiddleware)

# ── Phase 1 ───────────────────────────────────────────────────
app.include_router(analyses_router)
app.include_router(chat_router)
app.include_router(scores_router)
app.include_router(upload_router)
app.include_router(validate_router)
app.include_router(preview_router)
app.include_router(payment_router)
app.include_router(email_router)
app.include_router(auth_2fa_router)
app.include_router(rgpd_router)
app.include_router(speech_router)
app.include_router(reset_password_router)
app.include_router(admin_router)

# ── Phase 2 ───────────────────────────────────────────────────
app.include_router(forecasting_router)
app.include_router(cabinet_router)
app.include_router(credit_router)

# ── Phase 3 ───────────────────────────────────────────────────
app.include_router(agent_router)    # /agent/log · /agent/status/{uid}
app.include_router(peers_router)    # /peers/benchmark · /peers/contribute
app.include_router(cosign_router)   # /cosign/request · /cosign/requests
app.include_router(wa_router)       # /whatsapp/configure · /send-alert · /webhook


# ── Health ────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def health():
    try:
        from app.services.chat_service_v2 import _get_gemini
        llm = "gemini-1.5-flash" if _get_gemini() else "local-fallback"
    except Exception:
        llm = "unknown"
    brevo_key = os.getenv("BREVO_API_KEY", "")
    resend_key = os.getenv("RESEND_API_KEY", "")
    return {
        "status": "ok", "version": "3.0.0",
        "firebase":  "connecté" if firebase_service.available else "mode dev",
        "llm": llm,
        "email":     "brevo" if brevo_key else ("resend" if resend_key else "dev"),
        "whatsapp":  "api"   if os.getenv("WA_TOKEN") else "dev",
        "phase": "3 — COMPLÈTE",
        "routes": {
            "phase_1": [
                "POST /analyses", "POST /analyses/upload", "POST /analyses/whatif",
                "POST /chat", "GET /scores", "DELETE /scores/{id}",
                "POST /upload", "POST /validate", "POST /preview-transform",
                "GET /payment/plans", "POST /payment/create-checkout",
                "POST /payment/portal", "POST /payment/cancel",
                "POST /email/welcome", "POST /email/analyse-ready",
                "POST /email/schedule-relance", "POST /rgpd/delete-request",
                "POST /auth/2fa/send", "POST /auth/2fa/verify",
                "GET  /auth/2fa/debug", "GET /auth/2fa/status/{uid}",
            ],
            "phase_2": [
                "POST /forecasting/cash-flow", "GET /forecasting/{id}",
                "GET /cabinet/clients", "GET /cabinet/dashboard", "POST /cabinet/invite",
                "GET /credit/banks", "POST /credit/score", "POST /credit/generate-report",
            ],
            "phase_3": [
                "POST /agent/log", "GET /agent/status/{uid}",
                "GET /peers/benchmark", "POST /peers/contribute",
                "POST /cosign/request", "GET /cosign/requests",
                "POST /whatsapp/configure", "POST /whatsapp/send-alert",
                "POST /whatsapp/webhook", "GET /whatsapp/webhook",
            ],
        },
    }


# ── Routes HTML directes (servir les fichiers à la racine) ────
# NB : Ces routes doivent être APRÈS les routers API
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _html(filename: str):
    """Helper — retourne le chemin absolu d'un fichier HTML à la racine."""
    path = os.path.join(_BASE_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="text/html")
    return FileResponse(os.path.join(_BASE_DIR, "public", filename), media_type="text/html")


@app.get("/auth.html",        include_in_schema=False)
async def serve_auth():       return _html("auth.html")

@app.get("/otp-verify.html",  include_in_schema=False)
async def serve_otp():        return _html("otp-verify.html")

@app.get("/dashboard.html",   include_in_schema=False)
async def serve_dashboard():  return _html("dashboard.html")

@app.get("/doctorSmile.html", include_in_schema=False)
async def serve_landing():    return _html("doctorSmile.html")

@app.get("/intro.html",       include_in_schema=False)
async def serve_intro():      return _html("intro.html")

@app.get("/reset-password.html", include_in_schema=False)
async def serve_reset():      return _html("reset-password.html")


# ── Fichiers statiques (assets, js, css, images) ─────────────
# Servir les assets du dossier racine (js/, css/, assets/)
for _folder in ("js", "css", "assets", "images"):
    _path = os.path.join(_BASE_DIR, _folder)
    if os.path.isdir(_path):
        app.mount(f"/{_folder}", StaticFiles(directory=_path), name=_folder)

# Fallback : fichiers statiques du dossier public/
_public_dir = os.path.join(_BASE_DIR, "public")
if os.path.isdir(_public_dir):
    app.mount("/public", StaticFiles(directory=_public_dir), name="public")
