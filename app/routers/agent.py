"""
==========================================
ROUTER — agent.py  (+ peers + cosign + whatsapp)
DOCTOR SMILE Backend v2.0 · Phase 3
==========================================

Routes :
  POST /agent/log              → Enregistrer un événement de surveillance
  GET  /agent/status/{uid}     → Statut de l'agent pour un utilisateur

  GET  /peers/benchmark        → Benchmark agrégé anonymisé par secteur
  POST /peers/contribute       → Contribuer ses ratios anonymisés au réseau

  POST /cosign/request         → Demander une co-signature à un expert
  GET  /cosign/requests        → Lister ses demandes en cours

  POST /whatsapp/configure     → Configurer le numéro WhatsApp
  POST /whatsapp/send-alert    → Envoyer une alerte via WhatsApp API
  POST /whatsapp/webhook       → Webhook entrant WhatsApp Business
"""

from __future__ import annotations

import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

log = logging.getLogger("doctorsmile.phase3")

# ── Routers séparés par domaine ───────────────────────────────
agent_router   = APIRouter(prefix="/agent",    tags=["Agent IA"])
peers_router   = APIRouter(prefix="/peers",    tags=["Réseau Pairs"])
cosign_router  = APIRouter(prefix="/cosign",   tags=["Co-signature"])
wa_router      = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])

# ════════════════════════════════════════════════════════════════
#  AGENT IA AUTONOME
# ════════════════════════════════════════════════════════════════

class AgentLogPayload(BaseModel):
    analyseId: str = ""
    uid:       str = ""
    triggers:  list[dict[str, Any]] = []
    timestamp: str = ""


@agent_router.post("/log")
async def agent_log(payload: AgentLogPayload, request: Request):
    """Enregistre un événement de surveillance Agent IA dans Firestore."""
    uid = payload.uid
    if not uid:
        try:
            from app.services.firebase_service import firebase_service
            token = request.headers.get("Authorization","").replace("Bearer ","")
            if token and firebase_service.available:
                decoded = firebase_service.auth.verify_id_token(token)
                uid = decoded.get("uid","")
        except Exception: pass

    if not uid:
        return {"status": "ok", "dev": True}

    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            firebase_service.db.collection("agent_logs").add({
                "uid":       uid,
                "analyseId": payload.analyseId,
                "triggers":  payload.triggers,
                "timestamp": payload.timestamp or datetime.now(timezone.utc).isoformat(),
                "createdAt": datetime.now(timezone.utc),
            })

            # Créer des notifications Firestore pour chaque trigger critique
            for t in payload.triggers:
                if t.get("severity") == "critical":
                    firebase_service.db.collection(f"notifications/{uid}/items").add({
                        "type":    "agent_critical",
                        "title":   t.get("name", "Alerte critique"),
                        "body":    f"L'Agent IA a détecté : {t.get('name','anomalie')}",
                        "severity": "critical",
                        "read":    False,
                        "createdAt": datetime.now(timezone.utc),
                    })
    except Exception as e:
        log.warning("[Agent] Log failed: %s", e)

    return {"status": "ok", "logged": len(payload.triggers)}


@agent_router.get("/status/{uid}")
async def agent_status(uid: str):
    """Retourne le statut de l'agent et les derniers événements."""
    try:
        from app.services.firebase_service import firebase_service
        if not firebase_service.available:
            return {"status": "ok", "dev": True, "events": []}

        snaps = firebase_service.db.collection("agent_logs") \
            .where("uid", "==", uid) \
            .order_by("createdAt", direction="DESCENDING") \
            .limit(10).get()

        events = [{"id": s.id, **s.to_dict()} for s in snaps]
        return {"status": "ok", "events": events, "total": len(events)}
    except Exception as e:
        return {"status": "error", "error": str(e), "events": []}


# ════════════════════════════════════════════════════════════════
#  RÉSEAU DE PAIRS ANONYMISÉ
# ════════════════════════════════════════════════════════════════

# Données de base (seed) — enrichies par les contributions réelles
PEER_SEEDS = {
    "Tech / SaaS": {"n": 124, "score_med": 71, "liquidite_med": 1.82, "marge_med": 11.2,
                    "endettement_med": 0.68, "roa_med": 5.8, "roe_med": 14.2},
    "Industrie":   {"n": 89,  "score_med": 63, "liquidite_med": 1.45, "marge_med": 5.1,
                    "endettement_med": 0.88, "roa_med": 3.2, "roe_med": 9.8},
    "Retail":      {"n": 67,  "score_med": 58, "liquidite_med": 1.18, "marge_med": 3.4,
                    "endettement_med": 1.12, "roa_med": 2.8, "roe_med": 11.4},
    "Santé":       {"n": 45,  "score_med": 74, "liquidite_med": 1.65, "marge_med": 8.2,
                    "endettement_med": 0.54, "roa_med": 6.1, "roe_med": 12.8},
    "Services":    {"n": 112, "score_med": 68, "liquidite_med": 1.72, "marge_med": 9.1,
                    "endettement_med": 0.58, "roa_med": 4.9, "roe_med": 13.5},
    "Finance":     {"n": 38,  "score_med": 72, "liquidite_med": 1.55, "marge_med": 14.2,
                    "endettement_med": 0.72, "roa_med": 5.2, "roe_med": 15.1},
}


class PeerContribution(BaseModel):
    secteur:     str
    score:       int
    zone:        str
    ratios:      list[dict[str, Any]] = []
    # Intentionnellement pas d'uid — anonyme


@peers_router.get("/benchmark")
async def get_peers_benchmark(secteur: str = "Services"):
    """
    Retourne les statistiques agrégées anonymisées du réseau pour un secteur.
    Combine les données seed + contributions réelles Firestore.
    """
    seed = PEER_SEEDS.get(secteur, PEER_SEEDS["Services"]).copy()

    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            snaps = firebase_service.db.collection("peer_contributions") \
                .where("secteur", "==", secteur) \
                .limit(500).get()

            contributions = [s.to_dict() for s in snaps]
            if contributions:
                scores = [c.get("score", 0) for c in contributions if c.get("score")]
                if scores:
                    import statistics
                    seed["n"]         = seed["n"] + len(contributions)
                    seed["score_med"] = round(statistics.median(scores))
                    seed["live"]      = True
    except Exception as e:
        log.warning("[Peers] Firestore load: %s", e)

    return {"status": "ok", "secteur": secteur, "peers": seed}


@peers_router.post("/contribute")
async def contribute_to_peers(payload: PeerContribution):
    """
    Enregistre une contribution anonyme au réseau de pairs.
    Aucun identifiant personnel n'est stocké — uniquement les ratios agrégés.
    """
    # Hash du score pour garantir l'anonymat (pas de lien avec l'utilisateur)
    anon_id = hashlib.sha256(
        f"{payload.secteur}{payload.score}{datetime.now().date()}".encode()
    ).hexdigest()[:16]

    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            firebase_service.db.collection("peer_contributions").add({
                "anonId":    anon_id,
                "secteur":   payload.secteur,
                "score":     payload.score,
                "zone":      payload.zone,
                "ratios":    payload.ratios,  # Valeurs numériques seulement, pas de noms d'entreprise
                "createdAt": datetime.now(timezone.utc),
            })
    except Exception as e:
        log.warning("[Peers] Contribute failed: %s", e)

    return {"status": "ok", "anonId": anon_id, "message": "Contribution enregistrée anonymement"}


# ════════════════════════════════════════════════════════════════
#  CO-SIGNATURE EXPERT
# ════════════════════════════════════════════════════════════════

class CosignRequest(BaseModel):
    id:          str = ""
    expertId:    str = ""
    expertName:  str = ""
    analyseId:   str = ""
    entreprise:  str = ""
    score:       int = 0
    zone:        str = ""
    status:      str = "pending"
    requestedAt: str = ""
    message:     str = ""


@cosign_router.post("/request")
async def cosign_request(payload: CosignRequest, request: Request):
    """Enregistre une demande de co-signature et notifie l'expert."""
    uid = None
    try:
        from app.services.firebase_service import firebase_service
        token = request.headers.get("Authorization","").replace("Bearer ","")
        if token and firebase_service.available:
            decoded = firebase_service.auth.verify_id_token(token)
            uid = decoded.get("uid","")
    except Exception: pass

    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            doc_ref = firebase_service.db.collection("cosign_requests").add({
                "uid":        uid,
                "expertId":   payload.expertId,
                "expertName": payload.expertName,
                "analyseId":  payload.analyseId,
                "entreprise": payload.entreprise,
                "score":      payload.score,
                "zone":       payload.zone,
                "status":     "pending",
                "message":    payload.message,
                "requestedAt": payload.requestedAt or datetime.now(timezone.utc).isoformat(),
                "createdAt":   datetime.now(timezone.utc),
            })
            log.info("[Cosign] Demande créée: %s", doc_ref[1].id)
    except Exception as e:
        log.warning("[Cosign] Save failed: %s", e)

    # Notifier l'expert par email
    try:
        import resend
        resend.api_key = os.getenv("RESEND_API_KEY","")
        if resend.api_key and payload.expertId:
            expert_emails = {
                "e1": "aminatou.diallo@doctorsmile.io",
                "e2": "claire.fontaine@doctorsmile.io",
                "e3": "kouassi.bamba@doctorsmile.io",
                "e4": "antoine.muller@doctorsmile.io",
            }
            expert_email = expert_emails.get(payload.expertId)
            if expert_email:
                resend.Emails.send({
                    "from": os.getenv("FROM_EMAIL","Doctor Smile <noreply@doctorsmile.io>"),
                    "to": [expert_email],
                    "subject": f"[Co-signature] Nouvelle demande — {payload.entreprise}",
                    "html": f"""<p>Bonjour {payload.expertName},</p>
                    <p>Une nouvelle demande de co-signature vient d'arriver :</p>
                    <ul>
                    <li>Entreprise : <strong>{payload.entreprise}</strong></li>
                    <li>Score ML : <strong>{payload.score}/100</strong></li>
                    <li>Zone : <strong>{payload.zone}</strong></li>
                    </ul>
                    <p>{payload.message}</p>
                    <p><a href="{os.getenv('APP_URL','https://doctorsmile-d8d8f.web.app')}/dashboard.html">
                    Voir la demande dans Doctor Smile →</a></p>""",
                })
    except Exception as e:
        log.warning("[Cosign] Email expert failed: %s", e)

    return {"status": "ok", "requestId": payload.id or "local"}


@cosign_router.get("/requests")
async def get_cosign_requests(request: Request):
    """Retourne les demandes de co-signature de l'utilisateur courant."""
    uid = None
    try:
        from app.services.firebase_service import firebase_service
        token = request.headers.get("Authorization","").replace("Bearer ","")
        if token and firebase_service.available:
            decoded = firebase_service.auth.verify_id_token(token)
            uid = decoded.get("uid","")
    except Exception: pass

    if not uid:
        return {"status": "ok", "requests": [], "dev": True}

    try:
        from app.services.firebase_service import firebase_service
        snaps = firebase_service.db.collection("cosign_requests") \
            .where("uid","==",uid) \
            .order_by("createdAt", direction="DESCENDING") \
            .limit(20).get()
        requests = [{"id": s.id, **s.to_dict()} for s in snaps]
        return {"status": "ok", "requests": requests}
    except Exception as e:
        return {"status": "error", "requests": [], "error": str(e)}


# ════════════════════════════════════════════════════════════════
#  WHATSAPP BUSINESS
# ════════════════════════════════════════════════════════════════

class WAConfigPayload(BaseModel):
    phoneNumber: str


class WAAlertPayload(BaseModel):
    uid:        str = ""
    phoneNumber: str = ""
    analyseId:  str = ""
    message:    str = ""


@wa_router.post("/configure")
async def wa_configure(payload: WAConfigPayload, request: Request):
    """Enregistre le numéro WhatsApp de l'utilisateur."""
    uid = None
    try:
        from app.services.firebase_service import firebase_service
        token = request.headers.get("Authorization","").replace("Bearer ","")
        if token and firebase_service.available:
            decoded = firebase_service.auth.verify_id_token(token)
            uid = decoded.get("uid","")
    except Exception: pass

    if uid:
        try:
            from app.services.firebase_service import firebase_service
            if firebase_service.available:
                firebase_service.db.collection("users").document(uid).set(
                    {"settings.whatsapp": payload.phoneNumber}, merge=True
                )
        except Exception as e:
            log.warning("[WA] Config save: %s", e)

    return {"status": "ok", "phoneNumber": payload.phoneNumber}


@wa_router.post("/send-alert")
async def wa_send_alert(payload: WAAlertPayload):
    """
    Envoie une alerte WhatsApp via l'API WhatsApp Business Cloud (Meta).
    Nécessite : WA_TOKEN, WA_PHONE_NUMBER_ID dans .env
    """
    wa_token   = os.getenv("WA_TOKEN","")
    wa_phone_id= os.getenv("WA_PHONE_NUMBER_ID","")

    if not wa_token or not wa_phone_id:
        log.info("[WA] Mode dev — message non envoyé (WA_TOKEN manquant)")
        return {"status": "ok", "dev": True, "note": "WA_TOKEN ou WA_PHONE_NUMBER_ID manquant dans .env"}

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            r = await client.post(
                f"https://graph.facebook.com/v18.0/{wa_phone_id}/messages",
                headers={"Authorization": f"Bearer {wa_token}", "Content-Type": "application/json"},
                json={
                    "messaging_product": "whatsapp",
                    "to": payload.phoneNumber.replace("+","").replace(" ",""),
                    "type": "text",
                    "text": {"body": payload.message},
                },
                timeout=10.0,
            )
            if r.status_code == 200:
                return {"status": "ok", "sent": True}
            else:
                return {"status": "error", "code": r.status_code, "detail": r.text}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@wa_router.post("/webhook")
async def wa_webhook(request: Request):
    """
    Webhook WhatsApp Business — reçoit les messages entrants.
    Traite les commandes : SCORE, ALERTE, RAPPORT, CREDIT, AIDE.
    """
    # Vérification du webhook (GET requis pour l'activation initiale)
    data = await request.json()

    # Extraire le message entrant
    try:
        entry    = data.get("entry", [{}])[0]
        changes  = entry.get("changes", [{}])[0]
        value    = changes.get("value", {})
        messages = value.get("messages", [])

        for msg in messages:
            phone = msg.get("from","")
            text  = msg.get("text",{}).get("body","").strip().upper()
            log.info("[WA Webhook] Message de %s : %s", phone, text)

            # Réponse selon commande
            response = _process_wa_command(text, phone)
            if response:
                await _send_wa_reply(phone, response)
    except Exception as e:
        log.warning("[WA Webhook] Parse error: %s", e)

    return {"status": "ok"}


@wa_router.get("/webhook")
async def wa_webhook_verify(request: Request):
    """Vérification du webhook WhatsApp Business (GET)."""
    params = request.query_params
    verify_token = os.getenv("WA_VERIFY_TOKEN","doctorsmile2025")

    if (params.get("hub.mode") == "subscribe" and
        params.get("hub.verify_token") == verify_token):
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(params.get("hub.challenge",""))
    return {"status": "forbidden"}


def _process_wa_command(text: str, phone: str) -> str | None:
    """Génère la réponse à une commande WhatsApp."""
    commands = {
        "SCORE":    "📊 *Votre dernier score Doctor Smile*\n\nConnectez-vous sur doctorsmile.io pour voir votre score en temps réel ou envoyez ANALYSE pour lancer une nouvelle analyse.",
        "AIDE":     "🤖 *Commandes Doctor Smile™*\n\n• *SCORE* — Votre dernier score\n• *ALERTE ON/OFF* — Alertes automatiques\n• *ANALYSE* — Lancer une analyse\n• *RAPPORT* — Résumé du rapport\n• *CREDIT* — Score de crédit bankable\n• *AIDE* — Ce message",
        "ANALYSE":  "📤 *Lancer une analyse*\n\nRendez-vous sur doctorsmile.io/dashboard et uploadez votre fichier Excel, CSV ou PDF.\n\nNos modèles ML (RF + XGBoost + LightGBM) calculeront votre score en quelques secondes.",
        "RAPPORT":  "📄 *Votre rapport complet*\n\nConnectez-vous sur doctorsmile.io pour télécharger votre rapport PDF ou le partager avec votre banque.",
        "CREDIT":   "🏦 *Score de crédit bankable*\n\nVotre dossier de crédit Doctor Smile™ est accessible depuis la vue \"Crédit Bankable\" du dashboard.\n\nIl inclut la notation AAA→B et les critères COBAC/BEAC.",
        "ALERTE ON": "✅ *Alertes activées*\n\nVous recevrez une notification WhatsApp si :\n• Score baisse de > 10 pts\n• Ratio en zone critique\n• Agent IA déclenche une alerte",
        "ALERTE OFF":"⏸ *Alertes désactivées*\n\nVous ne recevrez plus d'alertes automatiques. Envoyez ALERTE ON pour réactiver.",
    }
    return commands.get(text, commands.get("AIDE") if any(text.startswith(k) for k in commands) else None)


async def _send_wa_reply(phone: str, message: str) -> None:
    """Envoie un message WhatsApp en réponse à un webhook."""
    wa_token    = os.getenv("WA_TOKEN","")
    wa_phone_id = os.getenv("WA_PHONE_NUMBER_ID","")
    if not wa_token or not wa_phone_id:
        log.info("[WA] Reply non envoyé — mode dev")
        return

    import httpx
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"https://graph.facebook.com/v18.0/{wa_phone_id}/messages",
                headers={"Authorization": f"Bearer {wa_token}"},
                json={"messaging_product":"whatsapp","to":phone,"type":"text","text":{"body":message}},
                timeout=10.0,
            )
    except Exception as e:
        log.warning("[WA] Reply failed: %s", e)
