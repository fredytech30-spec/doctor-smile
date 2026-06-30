"""
ADMIN ROUTER — Doctor Smile
Endpoints sécurisés pour l'administration :
  - GET /admin/users : Lister les utilisateurs (avec recherche)
  - GET /admin/users/{user_id} : Détails utilisateur
  - POST /admin/users/{user_id}/role : Modifier le rôle
  - POST /admin/users/{user_id}/block : Bloquer
  - POST /admin/users/{user_id}/unblock : Débloquer
  - DELETE /admin/users/{user_id} : Supprimer (anonymiser)
  - GET /admin/stats : Stats système
  - GET /admin/analyses : Analyses récentes
  - GET /admin/logs : Audit logs
  - GET /admin/export/users : Export CSV utilisateurs
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Optional, Any

from app.middleware.firebase_verify import get_current_firebase_uid
from app.services.firebase_service import firebase_service
from app.services.admin_service import admin_service

log = logging.getLogger("doctorsmile.admin")

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─────────────────────────────────────────────────────────────
# MODÈLES DE DONNÉES
# ─────────────────────────────────────────────────────────────

class UpdateRoleRequest(BaseModel):
    new_role: str

class BlockUserRequest(BaseModel):
    reason: Optional[str] = ""


# ─────────────────────────────────────────────────────────────
# VÉRIFICATION ADMIN (DEPENDENCY)
# ─────────────────────────────────────────────────────────────

async def verify_is_admin(uid: str = Depends(get_current_firebase_uid)) -> str:
    """Vérifie que l'utilisateur est administrateur."""
    if not firebase_service.available:
        raise HTTPException(503, detail="Service Firestore indisponible")

    doc = firebase_service.db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(403, detail="Accès refusé")
    user_data = doc.to_dict() or {}
    role = user_data.get("role", "user")
    if role != "admin":
        raise HTTPException(403, detail="Vous n'êtes pas administrateur")
    return uid


# ─────────────────────────────────────────────────────────────
# ENDPOINTS UTILISATEURS
# ─────────────────────────────────────────────────────────────

@router.get("/users")
async def admin_get_users(
    limit: int = 100,
    offset: int = 0,
    search: Optional[str] = None,
    admin_id: str = Depends(verify_is_admin),
):
    """Récupère la liste des utilisateurs (admin uniquement)."""
    users = admin_service.get_all_users(limit, offset, search)
    return {"status": "success", "count": len(users), "users": users}


@router.get("/users/{user_id}")
async def admin_get_user(
    user_id: str,
    admin_id: str = Depends(verify_is_admin),
):
    """Récupère un utilisateur par son ID (admin uniquement)."""
    user = admin_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, detail="Utilisateur introuvable")
    return {"status": "success", "user": user}


@router.post("/users/{user_id}/role")
async def admin_update_role(
    user_id: str,
    body: UpdateRoleRequest,
    admin_id: str = Depends(verify_is_admin),
):
    """Modifie le rôle d'un utilisateur (admin uniquement)."""
    if body.new_role not in ["user", "admin", "cabinet"]:
        raise HTTPException(400, detail="Rôle invalide")
    ok = admin_service.update_user_role(user_id, body.new_role, admin_id)
    if not ok:
        raise HTTPException(500, detail="Erreur modification rôle")
    return {"status": "success", "message": f"Rôle mis à jour : {body.new_role}"}


@router.post("/users/{user_id}/block")
async def admin_block_user(
    user_id: str,
    body: BlockUserRequest,
    admin_id: str = Depends(verify_is_admin),
):
    """Bloque un utilisateur (admin uniquement)."""
    ok = admin_service.block_user(user_id, admin_id, body.reason)
    if not ok:
        raise HTTPException(500, detail="Erreur blocage utilisateur")
    return {"status": "success", "message": "Utilisateur bloqué"}


@router.post("/users/{user_id}/unblock")
async def admin_unblock_user(
    user_id: str,
    admin_id: str = Depends(verify_is_admin),
):
    """Débloque un utilisateur (admin uniquement)."""
    ok = admin_service.unblock_user(user_id, admin_id)
    if not ok:
        raise HTTPException(500, detail="Erreur déblocage utilisateur")
    return {"status": "success", "message": "Utilisateur débloqué"}


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin_id: str = Depends(verify_is_admin),
):
    """Supprime un utilisateur (anonymise les données) (admin uniquement)."""
    ok = admin_service.delete_user(user_id, admin_id)
    if not ok:
        raise HTTPException(500, detail="Erreur suppression utilisateur")
    return {"status": "success", "message": "Utilisateur supprimé"}


# ─────────────────────────────────────────────────────────────
# ENDPOINTS ANALYTICS
# ─────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_get_stats(admin_id: str = Depends(verify_is_admin)):
    """Récupère les stats système (admin uniquement)."""
    stats = admin_service.get_system_stats()
    return {"status": "success", "stats": stats}


@router.get("/analyses")
async def admin_get_analyses(
    limit: int = 20,
    admin_id: str = Depends(verify_is_admin),
):
    """Récupère les analyses récentes (admin uniquement)."""
    analyses = admin_service.get_recent_analyses(limit)
    return {"status": "success", "count": len(analyses), "analyses": analyses}


@router.get("/logs")
async def admin_get_logs(
    limit: int = 50,
    admin_id: str = Depends(verify_is_admin),
):
    """Récupère les logs admin (admin uniquement)."""
    logs = admin_service.get_admin_logs(limit)
    return {"status": "success", "count": len(logs), "logs": logs}


# ─────────────────────────────────────────────────────────────
# ENDPOINTS EXPORTS
# ─────────────────────────────────────────────────────────────

@router.get("/export/users", response_class=PlainTextResponse)
async def admin_export_users_csv(
    admin_id: str = Depends(verify_is_admin),
):
    """Exporte les utilisateurs en CSV (admin uniquement)."""
    csv_content = admin_service.export_users_csv()
    return PlainTextResponse(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"}
    )
