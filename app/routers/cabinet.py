"""
==========================================
ROUTER — cabinet.py
DOCTOR SMILE Backend v2.0 · Phase 2
==========================================

Routes :
  GET  /cabinet/clients           → Liste consolidée des clients du cabinet
  GET  /cabinet/clients/{uid}     → Détail d'un client
  POST /cabinet/invite            → Inviter un client
  GET  /cabinet/dashboard         → Vue consolidée (stats globales)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel

log = logging.getLogger("doctorsmile.cabinet")

router = APIRouter(prefix="/cabinet", tags=["Cabinet"])


class InvitePayload(BaseModel):
    email:      str
    name:       str = ""
    message:    str = ""


def _zone_from_score(score: int) -> str:
    if score >= 75: return "saine"
    if score >= 50: return "vigilance"
    if score >= 25: return "risque"
    return "critique"


@router.get("/clients")
async def get_clients(request: Request):
    """
    Retourne la liste consolidée des entreprises/clients du cabinet.
    Stratégie : groupe les analyses de l'utilisateur courant par 'entreprise'.
    Les cabinets comptables créent un compte par client OU utilisent
    le champ 'entreprise' pour distinguer leurs clients.
    """
    uid = None
    try:
        from app.services.firebase_service import firebase_service
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if token and firebase_service.available:
            decoded = firebase_service.auth.verify_id_token(token)
            uid = decoded.get("uid")
    except Exception:
        pass

    if not uid:
        # Mode dev — retourner données vides avec structure correcte
        return {"status": "ok", "clients": [], "total": 0, "dev": True}

    try:
        from app.services.firebase_service import firebase_service
        # Charger toutes les analyses de l'utilisateur
        snaps = firebase_service.db.collection("analyses") \
            .where("userId", "==", uid) \
            .order_by("createdAt", direction="DESCENDING") \
            .limit(200).get()

        # Grouper par entreprise
        clients_map: dict[str, list] = {}
        for snap in snaps:
            d    = snap.to_dict()
            name = d.get("entreprise") or "Entreprise"
            clients_map.setdefault(name, []).append({**d, "id": snap.id})

        clients = []
        for name, analyses in clients_map.items():
            latest  = analyses[0]
            prev    = analyses[1] if len(analyses) > 1 else None
            score   = latest.get("score", 0)
            trend   = score - (prev.get("score", score) if prev else score)

            ratios      = latest.get("ratios") or []
            alert_count = sum(1 for r in ratios if r.get("status") == "red")

            clients.append({
                "name":       name,
                "score":      score,
                "zone":       latest.get("zone") or _zone_from_score(score),
                "analyses":   len(analyses),
                "lastDate":   latest.get("createdAt").strftime("%d/%m/%Y")
                              if hasattr(latest.get("createdAt"), "strftime")
                              else "—",
                "trend":      trend,
                "alertCount": alert_count,
                "latestId":   latest.get("id", ""),
                "confidence": latest.get("confidence", 0),
                "model":      latest.get("model", "ML"),
            })

        # Trier par score ascendant (les plus à risque en premier)
        clients.sort(key=lambda c: c["score"])

        return {
            "status":  "ok",
            "clients": clients,
            "total":   len(clients),
        }

    except Exception as e:
        log.error("[Cabinet] get_clients error: %s", e)
        return {"status": "error", "clients": [], "error": str(e)}


@router.get("/dashboard")
async def get_dashboard(request: Request):
    """Vue consolidée : stats globales du cabinet."""
    result = await get_clients(request)
    clients = result.get("clients", [])

    if not clients:
        return {"status": "ok", "stats": {}, "alerts": []}

    total   = len(clients)
    avg_score = round(sum(c["score"] for c in clients) / total)
    zones   = {}
    for c in clients:
        zones[c["zone"]] = zones.get(c["zone"], 0) + 1

    top_alerts = sorted(
        [c for c in clients if c["alertCount"] > 0],
        key=lambda c: c["alertCount"],
        reverse=True
    )[:5]

    return {
        "status": "ok",
        "stats": {
            "total":        total,
            "avg_score":    avg_score,
            "en_alerte":    sum(1 for c in clients if c["alertCount"] > 0),
            "zones":        zones,
        },
        "top_alerts":  top_alerts,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/invite")
async def invite_client(payload: InvitePayload, request: Request):
    """
    Envoie une invitation email à un nouveau client.
    Le client reçoit un lien pour créer son compte Doctor Smile
    et partager automatiquement ses analyses avec le cabinet.
    """
    try:
        import resend
        import os
        resend.api_key = os.getenv("RESEND_API_KEY", "")
        if not resend.api_key:
            return {"status": "ok", "dev": True, "note": "Email non envoyé — RESEND_API_KEY manquant"}

        app_url = os.getenv("APP_URL", "https://doctorsmile-d8d8f.web.app")

        resend.Emails.send({
            "from":    os.getenv("FROM_EMAIL", "Doctor Smile <noreply@doctorsmile.io>"),
            "to":      [payload.email],
            "subject": f"Votre cabinet vous invite sur Doctor Smile",
            "html":    f"""<p>Bonjour {payload.name or ''},</p>
            <p>Votre expert-comptable vous invite à rejoindre Doctor Smile pour
            analyser la santé financière de votre entreprise.</p>
            {f'<p><em>{payload.message}</em></p>' if payload.message else ''}
            <p><a href="{app_url}/auth.html">Créer mon compte →</a></p>""",
        })
        return {"status": "ok", "sent": True}
    except Exception as e:
        log.error("[Cabinet] invite error: %s", e)
        return {"status": "error", "error": str(e)}
