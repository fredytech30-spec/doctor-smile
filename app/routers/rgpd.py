"""
==========================================
ROUTER — rgpd.py
DOCTOR SMILE Backend v2.0
==========================================

Routes :
  POST /rgpd/delete-request  → Demande de suppression de compte (RGPD Art. 17)

Conforme RGPD : délai 30 jours, email de confirmation, log Firestore.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, Request
from pydantic import BaseModel

log = logging.getLogger("doctorsmile.rgpd")

router = APIRouter(prefix="/rgpd", tags=["RGPD"])

APP_URL       = os.getenv("APP_URL",      "https://doctorsmile-d8d8f.web.app")
FROM_EMAIL    = os.getenv("FROM_EMAIL",   "Doctor Smile <noreply@doctorsmile.io>")
DPO_EMAIL     = os.getenv("DPO_EMAIL",    "privacy@doctorsmile.io")
SUPPORT_EMAIL = os.getenv("SUPPORT_EMAIL","support@doctorsmile.io")

# ── Resend (optionnel) ────────────────────────────────────────────
try:
    import resend
    resend.api_key = os.getenv("RESEND_API_KEY", "")
    _RESEND_OK = bool(resend.api_key)
except ImportError:
    _RESEND_OK = False


class DeleteRequestPayload(BaseModel):
    uid:    str = ""
    reason: str = ""  # Optionnel — raison de départ


def _send_confirmation_email(email: str, uid: str) -> None:
    """Envoie un email de confirmation de demande de suppression."""
    if not _RESEND_OK:
        log.info("[RGPD] Mode dev — email confirmation non envoyé à %s", email)
        return

    deadline = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><title>Demande de suppression</title></head>
<body style="margin:0;padding:40px 0;background:#02040B;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0"
        style="background:rgba(10,14,26,.98);border:1px solid rgba(239,68,68,.2);
        border-radius:18px;padding:36px 40px;color:#fff;">

        <tr><td style="text-align:center;padding-bottom:24px;">
          <span style="font-size:40px;">🗑️</span>
        </td></tr>

        <tr><td>
          <h1 style="font-size:20px;font-weight:900;margin:0 0 10px 0;color:#ef4444;">
            Demande de suppression enregistrée
          </h1>
          <p style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.7;margin:0 0 20px 0;">
            Nous avons bien reçu votre demande de suppression de compte Doctor Smile.
            Conformément au <strong style="color:#fff;">RGPD Art. 17</strong>, vos données
            seront supprimées dans un délai maximum de <strong style="color:#fff;">30 jours</strong>.
          </p>

          <div style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);
            border-radius:12px;padding:16px;margin-bottom:20px;">
            <div style="font-size:10px;font-weight:800;color:#ef4444;margin-bottom:6px;
              letter-spacing:.08em;text-transform:uppercase;">Ce qui sera supprimé</div>
            <ul style="font-size:11px;color:rgba(255,255,255,.55);margin:0;padding-left:18px;
              line-height:1.9;">
              <li>Votre profil et données personnelles</li>
              <li>Toutes vos analyses financières</li>
              <li>Vos conversations avec l'IA</li>
              <li>Votre abonnement (annulé immédiatement)</li>
            </ul>
          </div>

          <p style="font-size:11px;color:rgba(255,255,255,.35);line-height:1.7;margin:0 0 20px 0;">
            Référence de la demande : <code style="color:#8B7FF0;">{uid[:12]}…</code><br>
            Date de la demande : {deadline}<br>
            Traitement par : {DPO_EMAIL}
          </p>

          <div style="text-align:center;">
            <a href="mailto:{DPO_EMAIL}?subject=Annuler ma demande de suppression {uid[:8]}"
              style="display:inline-block;padding:11px 24px;
              background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
              border-radius:10px;color:rgba(255,255,255,.5);text-decoration:none;
              font-size:11px;">
              Annuler cette demande →
            </a>
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""

    try:
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [email],
            "subject": "🗑️ Confirmation de votre demande de suppression — Doctor Smile",
            "html":    html,
        })
        # Notifier aussi le DPO
        resend.Emails.send({
            "from":    FROM_EMAIL,
            "to":      [DPO_EMAIL],
            "subject": f"[RGPD] Nouvelle demande de suppression — UID {uid[:12]}",
            "html":    f"<p>UID : {uid}<br>Email : {email}<br>Date : {datetime.now(timezone.utc).isoformat()}</p>",
        })
    except Exception as e:
        log.error("[RGPD] Erreur email confirmation : %s", e)


async def _log_deletion_request(uid: str, email: str | None, reason: str) -> None:
    """Enregistre la demande dans Firestore pour traçabilité."""
    try:
        from app.services.firebase_service import firebase_service
        if not firebase_service.available:
            return

        db = firebase_service.db
        db.collection("deletion_requests").add({
            "uid":       uid,
            "email":     email or "inconnu",
            "reason":    reason or "",
            "status":    "pending",
            "requestedAt": datetime.now(timezone.utc).isoformat(),
            "processBy":   "30 jours",
        })
        log.info("[RGPD] Demande suppression enregistrée Firestore — uid=%s", uid)
    except Exception as e:
        log.warning("[RGPD] Firestore log échoué : %s", e)

    # Marquer aussi dans le document utilisateur
    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            firebase_service.db.collection("users").document(uid).set(
                {"deletionRequested": True, "deletionRequestedAt": datetime.now(timezone.utc).isoformat()},
                merge=True
            )
    except Exception:
        pass


@router.post("/delete-request")
async def request_deletion(payload: DeleteRequestPayload, request: Request):
    """
    Enregistre une demande de suppression de compte RGPD.
    - Log dans Firestore (collection deletion_requests)
    - Email de confirmation à l'utilisateur
    - Email de notification au DPO
    Conforme RGPD Art. 17 (droit à l'effacement).
    """
    # Récupérer l'UID depuis le token Firebase (si auth middleware disponible)
    uid = payload.uid
    if not uid:
        # Essayer depuis le header Authorization
        try:
            from app.services.firebase_service import firebase_service
            token = request.headers.get("Authorization", "").replace("Bearer ", "")
            if token and firebase_service.available:
                decoded = firebase_service.auth.verify_id_token(token)
                uid = decoded.get("uid", "")
        except Exception:
            pass

    if not uid:
        return {"status": "ok", "dev": True, "note": "UID non résolu — demande ignorée en dev"}

    # Récupérer l'email
    email = None
    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            user = firebase_service.auth.get_user(uid)
            email = user.email
    except Exception as e:
        log.warning("[RGPD] Email non récupéré : %s", e)

    # Enregistrer dans Firestore
    await _log_deletion_request(uid, email, payload.reason)

    # Envoyer les emails de confirmation
    if email:
        _send_confirmation_email(email, uid)

    log.info("[RGPD] Demande suppression — uid=%s email=%s", uid, email or "inconnu")

    return {
        "status":    "ok",
        "message":   "Demande enregistrée — traitement sous 30 jours (RGPD Art. 17)",
        "uid":       uid[:12] + "…",
        "dpo":       DPO_EMAIL,
    }
