"""
══════════════════════════════════════════════════════════════════
  app/routers/email.py — Doctor Smile · Emails Transactionnels
  Fournisseur : Brevo (HTML direct — aucun template ID requis)
══════════════════════════════════════════════════════════════════

Endpoints :

  POST /email/welcome            → Email de bienvenue (1er login)
  POST /email/analyse-ready      → Email "votre analyse est prête"
  POST /email/schedule-relance   → Relance si inactif 7j
  POST /email/agent-weekly       → Rapport hebdomadaire Agent IA
  POST /email/agent-alert        → Alerte personnalisée Agent
  GET  /email/status/{uid}       → Statut des emails (debug)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr
from firebase_admin import auth as fb_auth

from app.services.email_service import email_service, _base_template
from app.services.firebase_service import firebase_service

log    = logging.getLogger("doctorsmile.email")
router = APIRouter(prefix="/email", tags=["Email"])


# ════════════════════════════════════════════════════════════════
#  SCHÉMAS DE REQUÊTE
# ════════════════════════════════════════════════════════════════

class WelcomeRequest(BaseModel):
    uid:  str
    name: str = "là"

class AnalyseReadyRequest(BaseModel):
    uid:        str
    entreprise: str  = "votre entreprise"
    score:      int  = 0
    zone:       str  = "saine"
    analyseId:  str  = ""

class ScheduleRelanceRequest(BaseModel):
    uid:            str
    lastActivityAt: str = ""

class VerifyRequest(BaseModel):
    uid: str

class AgentWeeklyRequest(BaseModel):
    uid:         str
    email:       str = ""
    prenom:      str = ""
    score:       int = 0
    delta:       int = 0
    analysesCnt: int = 0
    summary:     str = ""

class AgentAlertRequest(BaseModel):
    uid:    str
    rule:   str   = "Alerte personnalisée"
    metric: str   = "score"
    value:  float = 0


# ════════════════════════════════════════════════════════════════
#  HELPER — récupérer l'email et le nom d'un utilisateur Firebase
# ════════════════════════════════════════════════════════════════

def _extract_email_from_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        v = value.strip()
        return v if "@" in v and "." in v else ""
    if isinstance(value, dict):
        for _, v in value.items():
            found = _extract_email_from_value(v)
            if found:
                return found
    if isinstance(value, (list, tuple, set)):
        for v in value:
            found = _extract_email_from_value(v)
            if found:
                return found
    return ""


async def _get_user_email(uid: str) -> tuple[str, str]:
    """Retourne (email, prenom) pour un uid Firebase."""
    email = ""
    name  = ""

    # 1. Firebase Admin SDK
    try:
        if firebase_service.available:
            user  = fb_auth.get_user(uid)
            email = user.email or ""
            name  = user.display_name or ""
    except Exception as e:
        log.debug("Firebase Admin get_user: %s", e)

    # 2. Fallback Firestore
    if not email:
        try:
            if firebase_service.available:
                snap = firebase_service.db.collection("users").document(uid).get()
                if snap.exists:
                    doc = snap.to_dict() or {}
                    name = (
                        doc.get("prenom")
                        or doc.get("displayName")
                        or doc.get("name")
                        or name
                    ) or ""
                    for field in ("email", "mail", "userEmail", "emailAddress", "primaryEmail"):
                        candidate = _extract_email_from_value(doc.get(field, ""))
                        if candidate:
                            email = candidate
                            break
                    if not email:
                        email = _extract_email_from_value(doc)
        except Exception as e:
            log.debug("Firestore fallback: %s", e)

    return email, name


# ════════════════════════════════════════════════════════════════
#  GARDE ANTI-DOUBLON — mémorisé en Firestore
# ════════════════════════════════════════════════════════════════

async def _already_sent(uid: str, email_type: str) -> bool:
    try:
        if not firebase_service.available:
            return False
        ref = firebase_service.db.collection("email_sent").document(f"{uid}_{email_type}")
        return ref.get().exists
    except Exception:
        return False

async def _mark_sent(uid: str, email_type: str) -> None:
    try:
        if not firebase_service.available:
            return
        firebase_service.db.collection("email_sent").document(f"{uid}_{email_type}").set({
            "uid": uid, "type": email_type,
            "sentAt": datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        log.warning("_mark_sent: %s", e)


# ════════════════════════════════════════════════════════════════
#  HELPERS — couleurs de zone
# ════════════════════════════════════════════════════════════════

_ZONE_CONFIG = {
    "saine":     {"color": "#10b981", "label": "Zone Saine",     "emoji": "🟢"},
    "vigilance": {"color": "#f59e0b", "label": "Zone Vigilance", "emoji": "🟡"},
    "risque":    {"color": "#f97316", "label": "Zone Risque",    "emoji": "🟠"},
    "critique":  {"color": "#ef4444", "label": "Zone Critique",  "emoji": "🔴"},
}

def _zone_for_score(score: int) -> dict:
    if score >= 75: return _ZONE_CONFIG["saine"]
    if score >= 50: return _ZONE_CONFIG["vigilance"]
    if score >= 25: return _ZONE_CONFIG["risque"]
    return _ZONE_CONFIG["critique"]


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Email de bienvenue
#  POST /email/welcome
# ════════════════════════════════════════════════════════════════

@router.post("/welcome")
async def send_welcome(req: WelcomeRequest):
    """Envoie l'email de bienvenue au nouvel utilisateur via Brevo (HTML direct)."""
    log.info("[email/welcome] uid=%s", req.uid)

    if await _already_sent(req.uid, "welcome"):
        return {"status": "already_sent"}

    email, name_db = await _get_user_email(req.uid)
    name = req.name if req.name not in ("là", "") else (name_db or "là")

    if not email:
        log.warning("[email/welcome] Pas d'email pour uid=%s", req.uid)
        return {"status": "no_email", "sent": False}

    ok = await email_service.send_welcome(email, name)

    if ok:
        await _mark_sent(req.uid, "welcome")
        log.info("[email/welcome] ✓ Envoyé à %s", email)

    return {"status": "sent" if ok else "error", "sent": ok, "to": email, "provider": "brevo"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Email "Analyse prête"
#  POST /email/analyse-ready
# ════════════════════════════════════════════════════════════════

@router.post("/analyse-ready")
async def send_analyse_ready(req: AnalyseReadyRequest):
    """Notifie l'utilisateur que son analyse ML est disponible via Brevo."""
    log.info("[email/analyse-ready] uid=%s score=%d zone=%s", req.uid, req.score, req.zone)

    email, name = await _get_user_email(req.uid)
    if not email:
        return {"status": "no_email", "sent": False}

    zc = _ZONE_CONFIG.get(req.zone, _ZONE_CONFIG["saine"])

    ok = await email_service.send_analyse_ready(
        email       = email,
        name        = name or "là",
        entreprise  = req.entreprise,
        score       = req.score,
        zone_label  = zc["label"],
        zone_color  = zc["color"],
        zone_emoji  = zc["emoji"],
        analyse_id  = req.analyseId,
    )

    log.info("[email/analyse-ready] %s → %s", email, "✓" if ok else "✗")
    return {"status": "sent" if ok else "error", "sent": ok, "provider": "brevo"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 3 — Planification de la relance
#  POST /email/schedule-relance
# ════════════════════════════════════════════════════════════════

@router.post("/schedule-relance")
async def schedule_relance(req: ScheduleRelanceRequest):
    """Enregistre l'activité et envoie une relance si inactif depuis 7j."""
    log.info("[email/schedule-relance] uid=%s lastActivity=%s", req.uid, req.lastActivityAt)

    # Enregistrer dans Firestore
    try:
        if firebase_service.available:
            firebase_service.db.collection("user_activity").document(req.uid).set({
                "uid":            req.uid,
                "lastActivityAt": req.lastActivityAt or datetime.now(timezone.utc).isoformat(),
                "updatedAt":      datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        log.warning("[schedule-relance] Firestore write: %s", e)

    # Vérifier inactivité > 7 jours
    try:
        if req.lastActivityAt:
            last_dt = datetime.fromisoformat(req.lastActivityAt.replace("Z", "+00:00"))
            inactive_days = (datetime.now(timezone.utc) - last_dt).days
            if inactive_days >= 7:
                key = f"relance_{datetime.now().strftime('%Y-%W')}"
                if not await _already_sent(req.uid, key):
                    email, name = await _get_user_email(req.uid)
                    if email:
                        ok = await email_service.send_relance(email, name or "là", inactive_days)
                        if ok:
                            await _mark_sent(req.uid, key)
                            log.info("[relance] ✓ Envoyée à %s (inactif %dj)", email, inactive_days)
    except Exception as e:
        log.warning("[schedule-relance] Calcul inactivité: %s", e)

    return {"status": "scheduled", "uid": req.uid}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 4 — Rapport hebdomadaire Agent IA
#  POST /email/agent-weekly
# ════════════════════════════════════════════════════════════════

@router.post("/agent-weekly")
async def send_agent_weekly(req: AgentWeeklyRequest):
    """Envoie le rapport hebdomadaire généré par l'agent IA via Brevo."""
    log.info("[email/agent-weekly] uid=%s score=%d delta=%+d", req.uid, req.score, req.delta)

    email = req.email
    if not email:
        email, _ = await _get_user_email(req.uid)
    if not email:
        return {"status": "no_email", "sent": False}

    _, name_db = await _get_user_email(req.uid)
    name = req.prenom or name_db or "là"
    zc   = _zone_for_score(req.score)

    ok = await email_service.send_agent_weekly(
        email        = email,
        name         = name,
        score        = req.score,
        delta        = req.delta,
        analyses_cnt = req.analysesCnt,
        zone_label   = zc["label"],
        zone_color   = zc["color"],
        zone_emoji   = zc["emoji"],
        summary      = req.summary,
    )

    log.info("[email/agent-weekly] %s → %s", email, "✓" if ok else "✗")
    return {"status": "sent" if ok else "error", "sent": ok, "provider": "brevo"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 5 — Alerte personnalisée Agent
#  POST /email/agent-alert
# ════════════════════════════════════════════════════════════════

@router.post("/agent-alert")
async def send_agent_alert(req: AgentAlertRequest):
    """Envoie un email d'alerte quand une règle personnalisée est franchie via Brevo."""
    log.info("[email/agent-alert] uid=%s rule=%s metric=%s val=%s",
             req.uid, req.rule, req.metric, req.value)

    email, name = await _get_user_email(req.uid)
    if not email:
        return {"status": "no_email", "sent": False}

    # Anti-doublon : max 1 email par règle par heure
    key = f"agent_alert_{req.uid}_{req.rule[:20]}_{datetime.now().strftime('%Y%m%d%H')}"
    if await _already_sent(req.uid, key):
        return {"status": "already_sent"}

    ok = await email_service.send_agent_alert(
        email  = email,
        name   = name or "là",
        rule   = req.rule,
        metric = req.metric,
        value  = req.value,
    )

    if ok:
        await _mark_sent(req.uid, key)

    log.info("[email/agent-alert] %s → %s", email, "✓" if ok else "✗")
    return {"status": "sent" if ok else "error", "sent": ok, "provider": "brevo"}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 6 — Statut emails (debug)
#  GET /email/status/{uid}
# ════════════════════════════════════════════════════════════════

@router.get("/status/{uid}")
async def email_status(uid: str):
    """Retourne les emails envoyés pour un utilisateur (debug/admin)."""
    types_to_check = ("welcome", "analyse-ready", "relance")
    sent = [t for t in types_to_check if await _already_sent(uid, t)]
    return {
        "uid":        uid,
        "sent_types": sent,
        "provider":   "Brevo (HTML direct)"
    }


# ════════════════════════════════════════════════════════════════
#  ENDPOINTS SECURE PROXY BREVO (Pour le Frontend)
#  Garantit que la clé API n'est jamais exposée côté client.
# ════════════════════════════════════════════════════════════════

class EmailOTPRequest(BaseModel):
    email: EmailStr
    otp: str
    expiry_minutes: int = 5

class EmailVerificationRequest(BaseModel):
    email: EmailStr
    verification_link: str

class GenericEmailRequest(BaseModel):
    to: EmailStr
    subject: str
    html_content: str
    text_content: str | None = None

@router.post("/otp")
async def send_otp_endpoint(req: EmailOTPRequest):
    """Proxy sécurisé : Envoie un code OTP par email."""
    log.info("[email/otp] Demande d'envoi OTP vers %s", req.email)
    
    # Essayer de récupérer le prénom depuis Firebase si l'email existe
    name = "utilisateur"
    try:
        if firebase_service.available:
            user = fb_auth.get_user_by_email(req.email)
            if user.display_name:
                name = user.display_name.split()[0] if user.display_name else "utilisateur"
            # Fallback sur Firestore pour le prénom
            else:
                snap = firebase_service.db.collection("users").document(user.uid).get()
                if snap.exists:
                    doc = snap.to_dict()
                    name = doc.get("prenom") or doc.get("displayName") or "utilisateur"
    except Exception as e:
        log.debug("[email/otp] Impossible de récupérer le nom: %s", e)
    
    ok = await email_service.send_otp(req.email, name, req.otp)
    if not ok:
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email OTP.")
    return {"status": "success", "message": "Email OTP envoyé."}

@router.post("/verification")
async def send_verification_endpoint(req: EmailVerificationRequest):
    """Proxy sécurisé : Envoie le lien de vérification d'email."""
    log.info("[email/verification] Demande d'envoi lien de vérification vers %s", req.email)
    subject = "Vérification de votre email - Doctor Smile"
    body_html = f"""
      <div class="greeting">Bonjour,</div>
      <p class="text">
        Merci de vous être inscrit sur Doctor Smile. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email :
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="{req.verification_link}" style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg, #7c3aed, #8b5cf6);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">
          Vérifier mon email
        </a>
      </div>
      <p class="text" style="font-size:12px;color:rgba(255,255,255,0.4);">
        Si le bouton ne fonctionne pas, copiez-collez ce lien : {req.verification_link}
      </p>
    """
    html = _base_template(subject, body_html, "Vérification d'email")
    provider = email_service._get_provider()
    if provider == "brevo":
        ok = await email_service._send_brevo(req.email, subject, html)
    else:
        ok = await email_service._send(req.email, subject, html)

    if not ok:
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email de vérification.")
    return {"status": "success", "message": "Email de vérification envoyé."}

@router.post("/send")
async def send_generic_endpoint(req: GenericEmailRequest):
    """Proxy sécurisé : Envoie un email générique formaté."""
    log.info("[email/send] Demande d'envoi email vers %s (sujet: %s)", req.to, req.subject)
    html = _base_template(req.subject, req.html_content, req.subject)
    provider = email_service._get_provider()
    if provider == "brevo":
        ok = await email_service._send_brevo(req.to, req.subject, html)
    else:
        ok = await email_service._send(req.to, req.subject, html)

    if not ok:
        raise HTTPException(status_code=500, detail="Échec de l'envoi de l'email.")
    return {"status": "success", "message": "Email envoyé."}
