"""
MIDDLEWARE — firebase_verify.py — MODE DEV FORCÉ
"""
from __future__ import annotations
import logging
from fastapi import Request

log = logging.getLogger("doctorsmile.auth")
log.warning("⚠️  firebase_verify.py — MODE DEV TOTAL — aucune vérification JWT")

_DEV_PAYLOAD: dict = {
    "uid":   "dev-uid-000",
    "email": "dev@doctorsmile.io",
    "name":  "Dev User",
    "plan":  "extra",
}

async def verify_token(request: Request) -> dict:
    return _DEV_PAYLOAD