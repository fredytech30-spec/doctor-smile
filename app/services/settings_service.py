"""
Settings Service - Doctor Smile v4.0
Gestion des préférences utilisateur et paramètres application
Paramètres : notifications, thème, langue, intégrations
"""

from typing import Dict, Optional, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class SettingsService:
    """Service de gestion des paramètres utilisateur"""
    
    def __init__(self):
        self.user_settings = {}  # user_id -> settings
        self.default_settings = {
            "theme": "dark",
            "language": "fr",
            "notifications": {
                "whatsapp_enabled": True,
                "sms_enabled": False,
                "email_enabled": True,
                "in_app_enabled": True,
                "proactive_alerts": True,
                "daily_digest": False,
                "weekly_report": True
            },
            "automation": {
                "auto_reminders": True,
                "auto_sync": False,
                "auto_backup": True
            },
            "display": {
                "currency": "FCFA",
                "date_format": "DD/MM/YYYY",
                "number_format": "fr_FR"
            },
            "integrations": {
                "quickbooks": False,
                "sage": False,
                "cegid": False
            }
        }
    
    def get_user_settings(self, user_id: str) -> Dict[str, Any]:
        """
        Récupère les paramètres d'un utilisateur
        
        Args:
            user_id: ID de l'utilisateur
            
        Returns:
            Dict avec paramètres utilisateur
        """
        try:
            if user_id not in self.user_settings:
                # Créer les paramètres par défaut pour le nouvel utilisateur
                self.user_settings[user_id] = self.default_settings.copy()
                logger.info(f"[Settings] Paramètres par défaut créés pour user {user_id}")
            
            return self.user_settings[user_id]
            
        except Exception as e:
            logger.error(f"[Settings] Erreur récupération paramètres: {e}")
            return {"error": str(e)}
    
    def update_user_settings(
        self,
        user_id: str,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Met à jour les paramètres d'un utilisateur
        
        Args:
            user_id: ID de l'utilisateur
            settings: Paramètres à mettre à jour
            
        Returns:
            Dict avec paramètres mis à jour
        """
        try:
            if user_id not in self.user_settings:
                self.user_settings[user_id] = self.default_settings.copy()
            
            # Fusion profonde des paramètres
            self._deep_merge(self.user_settings[user_id], settings)
            
            logger.info(f"[Settings] Paramètres mis à jour pour user {user_id}")
            
            return {
                "user_id": user_id,
                "settings": self.user_settings[user_id],
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur mise à jour paramètres: {e}")
            return {"error": str(e)}
    
    def _deep_merge(self, base: Dict, update: Dict):
        """Fusion profonde de dictionnaires"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
    
    def reset_user_settings(self, user_id: str) -> Dict[str, Any]:
        """
        Réinitialise les paramètres d'un utilisateur aux valeurs par défaut
        
        Args:
            user_id: ID de l'utilisateur
            
        Returns:
            Dict avec paramètres réinitialisés
        """
        try:
            self.user_settings[user_id] = self.default_settings.copy()
            
            logger.info(f"[Settings] Paramètres réinitialisés pour user {user_id}")
            
            return {
                "user_id": user_id,
                "settings": self.user_settings[user_id],
                "reset_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur réinitialisation paramètres: {e}")
            return {"error": str(e)}
    
    def update_notification_preferences(
        self,
        user_id: str,
        preferences: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Met à jour les préférences de notification
        
        Args:
            user_id: ID de l'utilisateur
            preferences: Préférences de notification
            
        Returns:
            Dict avec préférences mises à jour
        """
        try:
            if user_id not in self.user_settings:
                self.user_settings[user_id] = self.default_settings.copy()
            
            self.user_settings[user_id]["notifications"].update(preferences)
            
            logger.info(f"[Settings] Préférences notification mises à jour pour user {user_id}")
            
            return {
                "user_id": user_id,
                "notifications": self.user_settings[user_id]["notifications"],
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur mise à jour préférences notification: {e}")
            return {"error": str(e)}
    
    def update_automation_settings(
        self,
        user_id: str,
        settings: Dict[str, bool]
    ) -> Dict[str, Any]:
        """
        Met à jour les paramètres d'automatisation
        
        Args:
            user_id: ID de l'utilisateur
            settings: Paramètres d'automatisation
            
        Returns:
            Dict avec paramètres mis à jour
        """
        try:
            if user_id not in self.user_settings:
                self.user_settings[user_id] = self.default_settings.copy()
            
            self.user_settings[user_id]["automation"].update(settings)
            
            logger.info(f"[Settings] Paramètres automatisation mis à jour pour user {user_id}")
            
            return {
                "user_id": user_id,
                "automation": self.user_settings[user_id]["automation"],
                "updated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur mise à jour paramètres automatisation: {e}")
            return {"error": str(e)}
    
    def configure_integration(
        self,
        user_id: str,
        integration: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Configure une intégration tierce
        
        Args:
            user_id: ID de l'utilisateur
            integration: Nom de l'intégration (quickbooks, sage, cegid)
            config: Configuration de l'intégration
            
        Returns:
            Dict avec statut de configuration
        """
        try:
            if user_id not in self.user_settings:
                self.user_settings[user_id] = self.default_settings.copy()
            
            if integration not in self.user_settings[user_id]["integrations"]:
                return {"error": f"Intégration {integration} non supportée"}
            
            self.user_settings[user_id]["integrations"][integration] = True
            self.user_settings[user_id][f"{integration}_config"] = config
            
            logger.info(f"[Settings] Intégration {integration} configurée pour user {user_id}")
            
            return {
                "user_id": user_id,
                "integration": integration,
                "status": "configured",
                "configured_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur configuration intégration: {e}")
            return {"error": str(e)}
    
    def get_integration_config(
        self,
        user_id: str,
        integration: str
    ) -> Dict[str, Any]:
        """
        Récupère la configuration d'une intégration
        
        Args:
            user_id: ID de l'utilisateur
            integration: Nom de l'intégration
            
        Returns:
            Dict avec configuration de l'intégration
        """
        try:
            if user_id not in self.user_settings:
                return {"error": "Utilisateur introuvable"}
            
            enabled = self.user_settings[user_id]["integrations"].get(integration, False)
            config = self.user_settings[user_id].get(f"{integration}_config", {})
            
            return {
                "integration": integration,
                "enabled": enabled,
                "config": config if enabled else {}
            }
            
        except Exception as e:
            logger.error(f"[Settings] Erreur récupération configuration intégration: {e}")
            return {"error": str(e)}


# Instance singleton
settings_service = SettingsService()
