"""
══════════════════════════════════════════════════════════════════
  app/routers/email.py — Doctor Smile · Emails Transactionnels
══════════════════════════════════════════════════════════════════

Endpoints appelés par phase1.js :

  POST /email/welcome            → Email de bienvenue (1er login)
  POST /email/analyse-ready      → Email "votre analyse est prête"
  POST /email/schedule-relance   → Planifier relance si inactif 7j
  POST /email/verify             → Renvoyer email de vérification Firebase
  GET  /email/status/{uid}       → Statut des emails pour un utilisateur

Fournisseur : Resend (resend.com) — gratuit jusqu'à 3 000 emails/mois
Alternative : SendGrid (SENDGRID_API_KEY dans .env)
Variable d'env requise : RESEND_API_KEY  (ou SENDGRID_API_KEY)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.services.email_service import email_service
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
    lastActivityAt: str = ""   # ISO datetime string

class VerifyRequest(BaseModel):
    uid: str


# ════════════════════════════════════════════════════════════════
#  HELPER — récupérer l'email d'un utilisateur Firebase
# ════════════════════════════════════════════════════════════════

async def _get_user_email(uid: str) -> tuple[str, str]:
    """
    Retourne (email, displayName) pour un uid Firebase.
    Fallback sur Firestore users/{uid} si Firebase Admin non dispo.
    """
    email = ""
    name  = ""

    # 1. Firebase Admin SDK (méthode préférée)
    try:
        if firebase_service.available and firebase_service._auth:
            user   = firebase_service._auth.get_user(uid)
            email  = user.email or ""
            name   = user.display_name or ""
    except Exception as e:
        log.debug("Firebase Admin get_user: %s", e)

    # 2. Fallback Firestore — document users/{uid}
    if not email:
        try:
            if firebase_service.available:
                snap = firebase_service.db.collection("users").document(uid).get()
                if snap.exists:
                    doc   = snap.to_dict()
                    email = doc.get("email", "")
                    name  = doc.get("prenom") or doc.get("displayName") or name
        except Exception as e:
            log.debug("Firestore fallback: %s", e)

    return email, name


# ════════════════════════════════════════════════════════════════
#  GARDE ANTI-DOUBLON — mémorisé en Firestore
# ════════════════════════════════════════════════════════════════

async def _already_sent(uid: str, email_type: str) -> bool:
    """Vérifie si cet email a déjà été envoyé via Firestore."""
    try:
        if not firebase_service.available:
            return False
        db  = firebase_service.db
        ref = db.collection("email_sent").document(f"{uid}_{email_type}")
        snap = ref.get()
        return snap.exists
    except Exception:
        return False

async def _mark_sent(uid: str, email_type: str) -> None:
    """Marque l'email comme envoyé dans Firestore."""
    try:
        if not firebase_service.available:
            return
        db  = firebase_service.db
        db.collection("email_sent").document(f"{uid}_{email_type}").set({
            "uid":     uid,
            "type":    email_type,
            "sentAt":  datetime.now(timezone.utc).isoformat(),
        })
    except Exception as e:
        log.warning("_mark_sent: %s", e)


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 1 — Email de bienvenue
#  POST /email/welcome
# ════════════════════════════════════════════════════════════════

@router.post("/welcome")
async def send_welcome(req: WelcomeRequest):
    """
    Envoie l'email de bienvenue au nouvel utilisateur.
    Idempotent : ne renvoie pas si déjà envoyé.
    """
    log.info("[email/welcome] uid=%s", req.uid)

    # Anti-doublon
    if await _already_sent(req.uid, "welcome"):
        log.info("[email/welcome] Déjà envoyé pour uid=%s — skip", req.uid)
        return {"status": "already_sent"}

    email, name_db = await _get_user_email(req.uid)
    name = req.name if req.name != "là" else (name_db or "là")

    if not email:
        log.warning("[email/welcome] Pas d'email pour uid=%s", req.uid)
        return {"status": "no_email", "sent": False}

    ok = await email_service.send_welcome(email=email, name=name)

    if ok:
        await _mark_sent(req.uid, "welcome")
        log.info("[email/welcome] ✓ Envoyé à %s", email)

    return {"status": "sent" if ok else "error", "sent": ok, "to": email}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 2 — Email "Analyse prête"
#  POST /email/analyse-ready
# ════════════════════════════════════════════════════════════════

@router.post("/analyse-ready")
async def send_analyse_ready(req: AnalyseReadyRequest):
    """
    Notifie l'utilisateur que son analyse ML est disponible.
    Envoyé automatiquement après chaque nouvelle analyse.
    """
    log.info("[email/analyse-ready] uid=%s score=%d zone=%s",
             req.uid, req.score, req.zone)

    email, name = await _get_user_email(req.uid)
    if not email:
        return {"status": "no_email", "sent": False}

    # Couleur selon la zone
    zone_config = {
        "saine":     {"color": "#10b981", "label": "Zone Saine",     "emoji": "🟢"},
        "vigilance": {"color": "#f59e0b", "label": "Zone Vigilance", "emoji": "🟡"},
        "risque":    {"color": "#f97316", "label": "Zone Risque",    "emoji": "🟠"},
        "critique":  {"color": "#ef4444", "label": "Zone Critique",  "emoji": "🔴"},
    }
    zc = zone_config.get(req.zone, zone_config["saine"])

    ok = await email_service.send_analyse_ready(
        email      = email,
        name       = name or "là",
        entreprise = req.entreprise,
        score      = req.score,
        zone_label = zc["label"],
        zone_color = zc["color"],
        zone_emoji = zc["emoji"],
        analyse_id = req.analyseId,
    )

    log.info("[email/analyse-ready] %s → %s", email, "✓" if ok else "✗")
    return {"status": "sent" if ok else "error", "sent": ok}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 3 — Planification de la relance
#  POST /email/schedule-relance
# ════════════════════════════════════════════════════════════════

@router.post("/schedule-relance")
async def schedule_relance(req: ScheduleRelanceRequest):
    """
    Enregistre la dernière activité de l'utilisateur.
    Un job (cron ou Cloud Function) vérifiera après 7j sans activité
    et enverra l'email de relance.

    En dev sans cron : envoie directement si lastActivityAt > 7j.
    En prod : utiliser Cloud Scheduler ou APScheduler.
    """
    log.info("[email/schedule-relance] uid=%s lastActivity=%s",
             req.uid, req.lastActivityAt)

    # Enregistrer la dernière activité dans Firestore
    try:
        if firebase_service.available:
            firebase_service.db.collection("user_activity").document(req.uid).set({
                "uid":            req.uid,
                "lastActivityAt": req.lastActivityAt or datetime.now(timezone.utc).isoformat(),
                "updatedAt":      datetime.now(timezone.utc).isoformat(),
            })
    except Exception as e:
        log.warning("[schedule-relance] Firestore write: %s", e)

    # Vérifier si l'utilisateur est inactif depuis > 7 jours
    # (en production ce serait fait par un cron, pas ici)
    try:
        if req.lastActivityAt:
            last_dt = datetime.fromisoformat(req.lastActivityAt.replace("Z", "+00:00"))
            inactive_days = (datetime.now(timezone.utc) - last_dt).days
            if inactive_days >= 7:
                # Envoyer la relance si pas déjà envoyée cette semaine
                key = f"relance_{datetime.now().strftime('%Y-%W')}"
                if not await _already_sent(req.uid, key):
                    email, name = await _get_user_email(req.uid)
                    if email:
                        ok = await email_service.send_relance(
                            email=email,
                            name=name or "là",
                            inactive_days=inactive_days,
                        )
                        if ok:
                            await _mark_sent(req.uid, key)
                            log.info("[relance] ✓ Envoyée à %s (inactif %dj)", email, inactive_days)
    except Exception as e:
        log.warning("[schedule-relance] Calcul inactivité: %s", e)

    return {"status": "scheduled", "uid": req.uid}



# ════════════════════════════════════════════════════════════════
#  ENDPOINT 5 — Rapport hebdomadaire Agent IA
#  POST /email/agent-weekly
# ════════════════════════════════════════════════════════════════

class AgentWeeklyRequest(BaseModel):
    uid:         str
    email:       str = ""
    prenom:      str = ""
    score:       int = 0
    delta:       int = 0
    analysesCnt: int = 0
    summary:     str = ""

@router.post("/agent-weekly")
async def send_agent_weekly(req: AgentWeeklyRequest):
    """
    Envoie le rapport hebdomadaire généré par l'agent IA autonome.
    Déclenché le lundi au premier login (côté client) ou via cron.
    """
    log.info("[email/agent-weekly] uid=%s score=%d delta=%+d", req.uid, req.score, req.delta)

    email = req.email
    if not email:
        email, _ = await _get_user_email(req.uid)
    if not email:
        return {"status": "no_email", "sent": False}

    zone_config = {
        "saine":     {"color": "#10b981", "label": "Zone Saine",     "emoji": "🟢"},
        "vigilance": {"color": "#f59e0b", "label": "Zone Vigilance", "emoji": "🟡"},
        "risque":    {"color": "#f97316", "label": "Zone Risque",    "emoji": "🟠"},
        "critique":  {"color": "#ef4444", "label": "Zone Critique",  "emoji": "🔴"},
    }
    zone_key = "saine" if req.score >= 75 else "vigilance" if req.score >= 50 else "risque" if req.score >= 25 else "critique"
    zc = zone_config[zone_key]

    ok = await email_service.send_agent_weekly(
        email       = email,
        name        = req.prenom or "là",
        score       = req.score,
        delta       = req.delta,
        analyses_cnt = req.analysesCnt,
        zone_label  = zc["label"],
        zone_color  = zc["color"],
        zone_emoji  = zc["emoji"],
        summary     = req.summary,
    )

    log.info("[email/agent-weekly] %s → %s", email, "✓" if ok else "✗")
    return {"status": "sent" if ok else "error", "sent": ok}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 6 — Alerte personnalisée Agent
#  POST /email/agent-alert
# ════════════════════════════════════════════════════════════════

class AgentAlertRequest(BaseModel):
    uid:    str
    rule:   str = "Alerte personnalisée"
    metric: str = "score"
    value:  float = 0

@router.post("/agent-alert")
async def send_agent_alert(req: AgentAlertRequest):
    """
    Envoie un email d'alerte quand une règle personnalisée est franchie.
    Déclenché par P1_AGENT.checkRules() côté client.
    """
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
    return {"status": "sent" if ok else "error", "sent": ok}


# ════════════════════════════════════════════════════════════════
#  ENDPOINT 4 — Statut emails (debug)
#  GET /email/status/{uid}
# ════════════════════════════════════════════════════════════════

@router.get("/status/{uid}")
async def email_status(uid: str):
    """Retourne les emails envoyés pour un utilisateur (debug/admin)."""
    sent = []
    for email_type in ("welcome", "analyse-ready", "relance"):
        if await _already_sent(uid, email_type):
            sent.append(email_type)
    return {
        "uid":        uid,
        "sent_types": sent,
        "provider":   email_service.provider_name,
    }