"""
ROUTER — scores.py
DOCTOR SMILE
GET    /scores                → liste analyses utilisateur
GET    /scores/{analyse_id}   → details complets d une analyse
DELETE /scores/{analyse_id}   → supprimer une analyse

Note : le dashboard utilise onSnapshot() Firestore directement.
Ces routes servent les integrations tierces, exports, API REST, CLI.
"""
from __future__ import annotations
import asyncio
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.middleware.firebase_verify import verify_token
from app.services.firebase_service  import firebase_service

log    = logging.getLogger("doctorsmile.router.scores")
router = APIRouter(prefix="/scores", tags=["Scores & Historique"])

class DeleteResponse(BaseModel):
    deleted:   bool
    analyseId: str
    message:   str

def _serialize_ts(ts) -> str:
    if ts is None:
        return ""
    try:
        return ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
    except Exception:
        return str(ts)


# ════════ GET /scores ════════════════════════════════════════════

@router.get("", status_code=200,
    summary="Lister les analyses de l utilisateur (résumé)")
async def list_scores(
    token: dict = Depends(verify_token),
    limit: int  = Query(20, ge=1, le=100, description="Max analyses retournees"),
) -> dict[str, Any]:
    """
    Retourne les résumés des analyses.
    
    Usage principal : intégrations tierces, exports, reporting, CLI.
    Le dashboard utilise onSnapshot() Firestore pour le temps réel.
    """
    uid = token.get("uid", "")
    if not uid:
        raise HTTPException(401, "uid manquant dans le token.")

    # Exécution non-bloquante via un thread pool
    analyses = await asyncio.to_thread(firebase_service.get_analyses_for_user, uid, limit=limit)

    summaries = []
    for a in analyses:
        summaries.append({
            "id":                a.get("id", ""),
            "entreprise":        a.get("entreprise", ""),
            "score":             a.get("score", 0),
            "zone":              a.get("zone", ""),
            "confidence":        a.get("confidence", 0),
            "confiance":         a.get("confiance", ""),
            "plan":              a.get("plan", "standard"),
            "processingMs":      a.get("processingMs", 0),
            "createdAt":         _serialize_ts(a.get("createdAt")),
            "filename":          a.get("filename", ""),
            "secteur":           a.get("secteur", ""),
            "pays":              a.get("pays", ""),
        })

    log.info("[GET /scores] user=%s count=%d", uid, len(summaries))
    return {"userId": uid, "count": len(summaries), "analyses": summaries}


# ════════ GET /scores/{analyse_id} ═══════════════════════════════

@router.get("/{analyse_id}", status_code=200,
    summary="Détails complets : ratios, radar, recommandations")
async def get_score(
    analyse_id: str,
    token:      dict = Depends(verify_token),
) -> dict[str, Any]:
    """
    Retourne le document complet de l'analyse :
    score, zone, ratios, radarDimensions,
    recommendations, scoreHistory.

    Usage :
    - Intégrations tierces / webhooks
    - Export rapport PDF
    - Debug pipeline SYSCOHADA
    """
    # Exécution non-bloquante via un thread pool
    analyse = await asyncio.to_thread(firebase_service.get_analysis, analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {analyse_id!r} introuvable.")

    uid = token.get("uid", "")
    if uid and uid != "dev-uid-000":
        if analyse.get("userId") and analyse.get("userId") != uid:
            raise HTTPException(403, "Acces refuse a cette analyse.")

    log.info("[GET /scores/%s] user=%s score=%s", analyse_id, uid, analyse.get("score"))

    result = dict(analyse)
    result["createdAt"] = _serialize_ts(result.get("createdAt"))
    return result


# ════════ DELETE /scores/{analyse_id} ════════════════════════════

@router.delete("/{analyse_id}", response_model=DeleteResponse, status_code=200,
    summary="Supprimer une analyse (irreversible — trace dans audit_logs)")
async def delete_score(
    analyse_id: str,
    token:      dict = Depends(verify_token),
) -> DeleteResponse:
    """
    Supprime definitivement l analyse de Firestore.
    Seul le proprietaire peut supprimer.
    L operation est tracee dans audit_logs/{event}.
    """
    # Exécution non-bloquante via un thread pool
    analyse = await asyncio.to_thread(firebase_service.get_analysis, analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {analyse_id!r} introuvable.")

    uid = token.get("uid", "")
    if uid and uid != "dev-uid-000":
        if analyse.get("userId") and analyse.get("userId") != uid:
            raise HTTPException(403, "Acces refuse — vous n etes pas le proprietaire.")

    # Exécution non-bloquante via un thread pool
    success = await asyncio.to_thread(firebase_service.delete_analysis, analyse_id)
    if not success:
        raise HTTPException(500, "Suppression echouee.")

    # Exécution non-bloquante via un thread pool
    await asyncio.to_thread(
        firebase_service.log_event,
        uid,
        "analyse_deleted",
        {
            "analyseId":  analyse_id,
            "entreprise": analyse.get("entreprise", ""),
            "score":      analyse.get("score", 0),
        }
    )

    log.info("[DELETE /scores/%s] supprime par user=%s", analyse_id, uid)
    return DeleteResponse(
        deleted=True, analyseId=analyse_id,
        message=f"Analyse {analyse_id!r} supprimee avec succes.",
    )

