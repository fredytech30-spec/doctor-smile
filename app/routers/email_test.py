"""
Temporary test endpoints for emailing during local debugging.

POST /email/test-send
  body: { kind: 'welcome'|'analyse_ready'|'relance', uid?: str, email?: str, name?: str, entreprise?: str, score?: int }

This route requires a verified token (or AUTH_DEV_MODE to skip). It is intended
for local debugging and should be removed in production.
"""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.middleware.firebase_verify import verify_token
from app.services.email_service import email_service
from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.email_test")
router = APIRouter(prefix="/email", tags=["EmailTest"])


class TestEmailRequest(BaseModel):
    kind: str
    uid: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    entreprise: Optional[str] = None
    score: Optional[int] = 0
    zone_label: Optional[str] = "Zone Saine"
    zone_color: Optional[str] = "#10b981"
    zone_emoji: Optional[str] = "🟢"
    analyse_id: Optional[str] = "test-123"
    inactive_days: Optional[int] = 7


@router.post("/test-send")
async def test_send_email(body: TestEmailRequest, token: dict = Depends(verify_token)) -> dict:
    """Trigger a sample transactional email for testing.

    Requires auth token; in dev mode the verify_token will provide a dev payload.
    """
    # Resolve uid/email
    uid = body.uid or token.get("uid") or ""
    to_email = body.email
    name = body.name or "là"

    if not to_email and uid:
        try:
            prof = firebase_service.get_user_profile(uid)
            if prof and prof.get("email"):
                to_email = prof.get("email")
            else:
                # try raw user doc
                doc = firebase_service.get_user(uid) or {}
                to_email = doc.get("email") or doc.get("mail")
                name = name or doc.get("prenom") or doc.get("displayName") or name
        except Exception as e:
            log.debug("firebase get_user failed: %s", e)

    if not to_email:
        # fallback to a clearly invalid address to make behavior obvious
        to_email = f"{uid or 'test'}@doctorsmile.test"

    kind = (body.kind or "").lower()
    ok = False

    # Run diagnostics first to surface provider / SMTP errors
    try:
        diag = await email_service.run_diagnostics()
    except Exception as e:
        log.error("email diagnostics failed: %s", e, exc_info=True)
        diag = {"error": str(e)}

    if kind == "welcome":
        ok = await email_service.send_welcome(to_email, name)
    elif kind in ("analyse_ready", "analyse-ready", "analyse"):
        ok = await email_service.send_analyse_ready(
            email=to_email,
            name=name,
            entreprise=body.entreprise or "Votre entreprise",
            score=body.score or 42,
            zone_label=body.zone_label or "Zone Saine",
            zone_color=body.zone_color or "#10b981",
            zone_emoji=body.zone_emoji or "🟢",
            analyse_id=body.analyse_id or "test-123",
        )
    elif kind in ("relance", "reminder"):
        ok = await email_service.send_relance(to_email, name, body.inactive_days or 7)
    else:
        raise HTTPException(400, "kind unknown — choose 'welcome'|'analyse_ready'|'relance'")

    return {"to": to_email, "provider": email_service._get_provider(), "sent": bool(ok), "diagnostics": diag}


@router.post("/test-brevo")
async def test_brevo_email(email: str, token: dict = Depends(verify_token)) -> dict:
    """Test d'envoi d'email via Brevo."""
    from app.services.email_service import email_service
    result = await email_service._send_brevo(
        to_email=email,
        subject="Test Doctor Smile - Brevo ✅",
        html="<h1>Test réussi !</h1><p>Votre configuration Brevo fonctionne parfaitement.</p>"
    )
    return {"success": result, "provider": "brevo", "to": email}


@router.post("/test-brevo-noauth")
async def test_brevo_email_noauth(email: str):
    """Test d'envoi d'email via Brevo sans authentification."""
    from app.services.email_service import email_service
    result = await email_service._send_brevo(
        to_email=email,
        subject="Test Doctor Smile - Brevo ✅",
        html="<h1>Test réussi !</h1><p>Votre configuration Brevo fonctionne parfaitement.</p>"
    )
    return {"success": result, "provider": "brevo", "to": email}


@router.post("/test-otp")
async def test_otp_email(email: str, name: str = "Test User") -> dict:
    """
    Test d'envoi d'un code OTP réel via Brevo (sans authentification).
    ⚠️ Route de débogage uniquement.
    """
    import secrets as _sec
    test_code = f"{_sec.randbelow(1000000):06d}"
    from app.services.email_service import email_service
    result = await email_service.send_otp(email, name, test_code)
    return {
        "success": result,
        "provider": email_service._get_provider(),
        "to": email,
        "note": "Email OTP envoyé via Brevo" if result else f"Échec — code fallback: {test_code}"
    }
