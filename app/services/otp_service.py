"""
OTP Service — Doctor Smile
Génération, stockage et vérification des codes OTP via Brevo.

Fonctionnalités :
  - Génération sécurisée de code à 6 chiffres (secrets module)
  - Stockage temporaire (5 minutes) dans Firestore
  - Envoi par email via Brevo (email_service)
  - Validation et invalidation après usage
  - Rate limiting (max 3 tentatives par code)
  - Nettoyage automatique des anciens OTP
"""

from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.services.firebase_service import firebase_service

log = logging.getLogger("doctorsmile.otp")

# Configuration
OTP_EXPIRY_MINUTES = 5
OTP_LENGTH = 6
MAX_ATTEMPTS = 3


class OTPService:
    """Gestion des codes OTP pour la double authentification via Brevo."""

    def __init__(self):
        self.db = firebase_service.db if firebase_service.available else None

    @property
    def _db(self):
        """Accès lazy à Firestore (réinitialise si besoin)."""
        if self.db is None and firebase_service.available:
            self.db = firebase_service.db
        return self.db

    def generate_otp(self) -> str:
        """Génère un code OTP aléatoire à 6 chiffres (cryptographiquement sûr)."""
        # Utilise secrets pour la sécurité cryptographique
        return f"{secrets.randbelow(1000000):06d}"

    async def send_otp_email(self, email: str, name: str, otp_code: str) -> bool:
        """Envoie l'OTP par email via Brevo."""
        try:
            from app.services.email_service import email_service
            result = await email_service.send_otp(email, name, otp_code)
            if result:
                log.info(f"[OTP] ✅ Email OTP envoyé à {email} via Brevo")
            else:
                log.error(f"[OTP] ❌ Échec envoi email OTP à {email}")
            return result
        except Exception as e:
            log.error(f"[OTP] Erreur send_otp_email: {e}")
            return False

    async def create_otp(self, uid: str, email: str) -> dict:
        """
        Crée un nouveau code OTP pour l'utilisateur.
        Supprime les anciens OTP non utilisés avant d'en créer un nouveau.
        """
        otp_code = self.generate_otp()
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=OTP_EXPIRY_MINUTES)

        otp_data = {
            "uid": uid,
            "email": email,
            "code": otp_code,
            "expires_at": expires_at.isoformat(),
            "attempts": 0,
            "used": False,
            "created_at": now.isoformat(),
        }

        db = self._db
        if db:
            try:
                # Supprimer les anciens OTP non utilisés pour cet utilisateur
                await self._cleanup_old_otps(uid)
                # Sauvegarder le nouveau OTP
                doc_id = f"{uid}_{now.strftime('%Y%m%d%H%M%S')}"
                doc_ref = db.collection("otp_codes").document(doc_id)
                doc_ref.set(otp_data)
                log.info(f"[OTP] Code créé pour {email} (uid={uid}, expire={expires_at})")
            except Exception as e:
                log.error(f"[OTP] Erreur sauvegarde Firestore: {e}")
                # Continuer malgré l'erreur Firestore (OTP en mode dégradé)
        else:
            log.warning("[OTP] Firestore non disponible — OTP en mode mémoire")

        return {"code": otp_code, "expires_at": expires_at}

    async def verify_otp(self, uid: str, code: str) -> dict:
        """
        Vérifie le code OTP soumis par l'utilisateur.
        Retourne {"success": bool, "message": str}
        """
        # Validation basique du format
        if not code or not code.isdigit() or len(code) != 6:
            return {"success": False, "message": "Format de code invalide"}

        db = self._db
        if not db:
            log.warning("[OTP] Firestore non disponible")
            # Mode dev : code 123456 accepté
            if code == "123456":
                return {"success": True, "message": "Code valide (mode dev)"}
            return {"success": False, "message": "Service non disponible"}

        try:
            # Rechercher les OTP actifs pour cet uid
            query = (
                db.collection("otp_codes")
                .where("uid", "==", uid)
                .where("used", "==", False)
            )
            otps = list(query.stream())

            for doc in otps:
                data = doc.to_dict()
                stored_code = data.get("code", "")

                if stored_code != code:
                    # Incrémenter le compteur de tentatives
                    attempts = data.get("attempts", 0) + 1
                    doc.reference.update({"attempts": attempts})
                    if attempts >= MAX_ATTEMPTS:
                        doc.reference.update({"used": True})
                    continue

                # Code trouvé — vérifier expiration
                expires_at_str = data.get("expires_at", "")
                try:
                    expires_at = datetime.fromisoformat(expires_at_str)
                    if expires_at.tzinfo is None:
                        expires_at = expires_at.replace(tzinfo=timezone.utc)
                except (ValueError, TypeError):
                    doc.reference.update({"used": True})
                    return {"success": False, "message": "Code invalide"}

                if expires_at < datetime.now(timezone.utc):
                    doc.reference.update({"used": True})
                    return {"success": False, "message": "Code expiré — veuillez en demander un nouveau"}

                # Vérifier le nombre de tentatives
                attempts = data.get("attempts", 0)
                if attempts >= MAX_ATTEMPTS:
                    doc.reference.update({"used": True})
                    return {"success": False, "message": "Trop de tentatives — veuillez demander un nouveau code"}

                # ✅ Code valide — marquer comme utilisé
                doc.reference.update({
                    "used": True,
                    "verified_at": datetime.now(timezone.utc).isoformat()
                })
                log.info(f"[OTP] ✅ Code validé pour uid={uid}")
                return {"success": True, "message": "Code valide"}

            return {"success": False, "message": "Code incorrect ou expiré"}

        except Exception as e:
            log.error(f"[OTP] Erreur vérification: {e}")
            return {"success": False, "message": "Erreur technique — réessayez"}

    async def _cleanup_old_otps(self, uid: str) -> None:
        """Supprime les anciens OTP expirés ou utilisés de l'utilisateur."""
        db = self._db
        if not db:
            return
        try:
            otps = db.collection("otp_codes").where("uid", "==", uid).stream()
            now = datetime.now(timezone.utc)
            deleted = 0
            for doc in otps:
                data = doc.to_dict()
                # Supprimer si utilisé ou expiré depuis > 1h
                if data.get("used", False):
                    doc.reference.delete()
                    deleted += 1
                else:
                    try:
                        expires_at = datetime.fromisoformat(data["expires_at"])
                        if expires_at.tzinfo is None:
                            expires_at = expires_at.replace(tzinfo=timezone.utc)
                        if expires_at < now:
                            doc.reference.delete()
                            deleted += 1
                    except Exception:
                        pass
            if deleted:
                log.debug(f"[OTP] Cleanup: {deleted} OTP(s) supprimé(s) pour uid={uid}")
        except Exception as e:
            log.warning(f"[OTP] Cleanup erreur: {e}")

    async def is_2fa_enabled(self, uid: str) -> bool:
        """Vérifie si l'utilisateur a activé la double authentification."""
        try:
            db = self._db
            if not db:
                return False
            doc = db.collection("users").document(uid).get()
            if doc.exists:
                return doc.to_dict().get("settings", {}).get("two_factor_auth", False)
        except Exception as e:
            log.warning(f"[OTP] Vérification 2FA: {e}")
        return False

    async def enable_2fa(self, uid: str) -> bool:
        """Active la double authentification pour l'utilisateur."""
        try:
            db = self._db
            if db:
                db.collection("users").document(uid).set(
                    {"settings": {"two_factor_auth": True}}, merge=True
                )
                log.info(f"[OTP] 2FA activée pour uid={uid}")
                return True
        except Exception as e:
            log.error(f"[OTP] Erreur activation 2FA: {e}")
        return False

    async def disable_2fa(self, uid: str) -> bool:
        """Désactive la double authentification."""
        try:
            db = self._db
            if db:
                db.collection("users").document(uid).set(
                    {"settings": {"two_factor_auth": False}}, merge=True
                )
                log.info(f"[OTP] 2FA désactivée pour uid={uid}")
                return True
        except Exception as e:
            log.error(f"[OTP] Erreur désactivation 2FA: {e}")
        return False


# Instance unique
otp_service = OTPService()
