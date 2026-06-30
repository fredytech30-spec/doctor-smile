"""
ADMIN SERVICE — Doctor Smile
Gestion complète de l'administration :
  - Gestion des utilisateurs (lister, bloquer, promouvoir, supprimer)
  - Analytics système et tendances
  - Audit logs des actions admin
  - Statut des services et configuration
  - Suivi des emails et exports CSV
"""
from __future__ import annotations

import logging
import os
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.admin")


class AdminService:
    """Service principal pour l'administration Doctor Smile."""

    def __init__(self):
        pass

    # ─────────────────────────────────────────────────────────────
    # GESTION DES UTILISATEURS (AMÉLIORÉE)
    # ─────────────────────────────────────────────────────────────

    def get_all_users(self, limit: int = 100, offset: int = 0, search: Optional[str] = None) -> list[dict[str, Any]]:
        """Récupère tous les utilisateurs (avec pagination et recherche)."""
        if not firebase_service.available:
            return []
        try:
            query = firebase_service.db.collection("users").order_by("createdAt", direction="DESCENDING").limit(limit)
            docs = query.stream()
            users = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                # Filtrer si recherche
                if search:
                    email = data.get("email", "").lower()
                    name = data.get("name", "").lower()
                    if search.lower() not in email and search.lower() not in name:
                        continue
                users.append(data)
            return users
        except Exception as e:
            log.error(f"[Admin] Erreur get_all_users: {e}")
            return []

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        """Récupère un utilisateur par son ID."""
        if not firebase_service.available:
            return None
        try:
            doc = firebase_service.db.collection("users").document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                data["id"] = doc.id
                # Ajouter les analyses de l'utilisateur
                analyses_docs = firebase_service.db.collection("analyses").where("userId", "==", user_id).limit(10).stream()
                data["recentAnalyses"] = [{"id": adoc.id, **adoc.to_dict()} for adoc in analyses_docs]
                return data
        except Exception as e:
            log.error(f"[Admin] Erreur get_user_by_id: {e}")
        return None

    def update_user_role(self, user_id: str, new_role: str, admin_id: str) -> bool:
        """Modifie le rôle d'un utilisateur (admin/user/cabinet)."""
        if not firebase_service.available:
            return False
        try:
            firebase_service.db.collection("users").document(user_id).set(
                {
                    "role": new_role,
                    "updatedAt": datetime.now(timezone.utc),
                },
                merge=True,
            )
            self._log_admin_action(
                admin_id,
                action="UPDATE_USER_ROLE",
                metadata={"userId": user_id, "newRole": new_role},
            )
            log.info(f"[Admin] Rôle modifié pour {user_id}: {new_role}")
            return True
        except Exception as e:
            log.error(f"[Admin] Erreur update_user_role: {e}")
            return False

    def block_user(self, user_id: str, admin_id: str, reason: str = "") -> bool:
        """Bloque un utilisateur."""
        if not firebase_service.available:
            return False
        try:
            firebase_service.db.collection("users").document(user_id).set(
                {
                    "blocked": True,
                    "blockedReason": reason,
                    "blockedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                },
                merge=True,
            )
            self._log_admin_action(
                admin_id,
                action="BLOCK_USER",
                metadata={"userId": user_id, "reason": reason},
            )
            log.info(f"[Admin] Utilisateur bloqué: {user_id}")
            return True
        except Exception as e:
            log.error(f"[Admin] Erreur block_user: {e}")
            return False

    def unblock_user(self, user_id: str, admin_id: str) -> bool:
        """Débloque un utilisateur."""
        if not firebase_service.available:
            return False
        try:
            firebase_service.db.collection("users").document(user_id).set(
                {
                    "blocked": False,
                    "updatedAt": datetime.now(timezone.utc),
                },
                merge=True,
            )
            self._log_admin_action(
                admin_id,
                action="UNBLOCK_USER",
                metadata={"userId": user_id},
            )
            log.info(f"[Admin] Utilisateur débloqué: {user_id}")
            return True
        except Exception as e:
            log.error(f"[Admin] Erreur unblock_user: {e}")
            return False

    def delete_user(self, user_id: str, admin_id: str) -> bool:
        """Supprime un utilisateur (anonymise les données)."""
        if not firebase_service.available:
            return False
        try:
            # Anonymiser plutôt que supprimer pour l'historique
            firebase_service.db.collection("users").document(user_id).set(
                {
                    "email": f"deleted_{user_id}@example.com",
                    "name": "Utilisateur supprimé",
                    "deletedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc),
                },
                merge=True,
            )
            self._log_admin_action(
                admin_id,
                action="DELETE_USER",
                metadata={"userId": user_id},
            )
            log.info(f"[Admin] Utilisateur supprimé: {user_id}")
            return True
        except Exception as e:
            log.error(f"[Admin] Erreur delete_user: {e}")
            return False

    # ─────────────────────────────────────────────────────────────
    # ANALYTICS SYSTÈME AMÉLIORÉES
    # ─────────────────────────────────────────────────────────────

    def get_system_stats(self) -> dict[str, Any]:
        """Récupère les stats globales du système."""
        stats = {
            "totalUsers": 0,
            "totalAnalyses": 0,
            "averageScore": 0,
            "activeUsers24h": 0,
            "blockedUsers": 0,
            "newUsers7d": 0,
            "services": {
                "firebase": firebase_service.available,
                "email": self._check_email_service(),
                "openai": bool(os.getenv("OPENAI_API_KEY")),
            },
        }
        if not firebase_service.available:
            return stats

        try:
            # Stats utilisateurs
            users_docs = list(firebase_service.db.collection("users").stream())
            stats["totalUsers"] = len(users_docs)
            stats["blockedUsers"] = len([u for u in users_docs if u.to_dict().get("blocked", False)])

            # Stats analyses
            analyses_docs = list(firebase_service.db.collection("analyses").stream())
            stats["totalAnalyses"] = len(analyses_docs)

            # Score moyen
            if analyses_docs:
                total_score = 0
                count = 0
                for doc in analyses_docs:
                    data = doc.to_dict()
                    if "score" in data and isinstance(data["score"], (int, float)):
                        total_score += data["score"]
                        count += 1
                stats["averageScore"] = round(total_score / count, 1) if count > 0 else 0

            # Utilisateurs actifs dans les 24h
            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
            active_docs = (
                firebase_service.db.collection("users")
                .where("updatedAt", ">=", yesterday)
                .stream()
            )
            stats["activeUsers24h"] = len(list(active_docs))

            # Nouveaux utilisateurs 7 derniers jours
            seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
            new_users_docs = (
                firebase_service.db.collection("users")
                .where("createdAt", ">=", seven_days_ago)
                .stream()
            )
            stats["newUsers7d"] = len(list(new_users_docs))

        except Exception as e:
            log.error(f"[Admin] Erreur get_system_stats: {e}")

        return stats

    def get_recent_analyses(self, limit: int = 20) -> list[dict[str, Any]]:
        """Récupère les N analyses les plus récentes."""
        if not firebase_service.available:
            return []
        try:
            docs = (
                firebase_service.db.collection("analyses")
                .order_by("createdAt", direction="DESCENDING")
                .limit(limit)
                .stream()
            )
            analyses = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                analyses.append(data)
            return analyses
        except Exception as e:
            log.error(f"[Admin] Erreur get_recent_analyses: {e}")
            return []

    # ─────────────────────────────────────────────────────────────
    # EXPORTS CSV
    # ─────────────────────────────────────────────────────────────

    def export_users_csv(self) -> str:
        """Exporte les utilisateurs en CSV (renvoie le contenu)."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Email", "Nom", "Rôle", "Bloqué", "Créé le", "Mise à jour le"])
        for user in self.get_all_users(limit=1000):
            writer.writerow([
                user.get("id", ""),
                user.get("email", ""),
                user.get("name", ""),
                user.get("role", "user"),
                "Oui" if user.get("blocked", False) else "Non",
                user.get("createdAt", ""),
                user.get("updatedAt", ""),
            ])
        return output.getvalue()

    # ─────────────────────────────────────────────────────────────
    # AUDIT LOGS
    # ─────────────────────────────────────────────────────────────

    def _log_admin_action(self, admin_id: str, action: str, metadata: dict[str, Any]):
        """Enregistre une action admin dans Firestore."""
        if not firebase_service.available:
            return
        try:
            firebase_service.db.collection("adminLogs").add({
                "adminId": admin_id,
                "action": action,
                "metadata": metadata,
                "createdAt": datetime.now(timezone.utc),
            })
        except Exception as e:
            log.warning(f"[Admin] Erreur écriture audit log: {e}")

    def get_admin_logs(self, limit: int = 50) -> list[dict[str, Any]]:
        """Récupère les N derniers logs admin."""
        if not firebase_service.available:
            return []
        try:
            docs = (
                firebase_service.db.collection("adminLogs")
                .order_by("createdAt", direction="DESCENDING")
                .limit(limit)
                .stream()
            )
            logs = []
            for doc in docs:
                data = doc.to_dict()
                data["id"] = doc.id
                logs.append(data)
            return logs
        except Exception as e:
            log.error(f"[Admin] Erreur get_admin_logs: {e}")
            return []

    # ─────────────────────────────────────────────────────────────
    # VÉRIFICATIONS INTERNES
    # ─────────────────────────────────────────────────────────────

    def _check_email_service(self) -> bool:
        """Vérifie si le service email est configuré."""
        brevo_key = os.getenv("BREVO_API_KEY")
        resend_key = os.getenv("RESEND_API_KEY")
        sendgrid_key = os.getenv("SENDGRID_API_KEY")
        return bool(brevo_key or resend_key or sendgrid_key)


# Instance singleton
admin_service = AdminService()
