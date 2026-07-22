"""
Notification Service - Doctor Smile v4.0
Gestion des notifications multi-canal (WhatsApp, SMS, Email, In-app)
Notifications proactives basées sur événements financiers
"""

from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class NotificationChannel(Enum):
    """Canaux de notification"""
    WHATSAPP = "whatsapp"
    SMS = "sms"
    EMAIL = "email"
    IN_APP = "in_app"


class NotificationPriority(Enum):
    """Priorité des notifications"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class NotificationService:
    """Service de gestion des notifications multi-canal"""
    
    def __init__(self):
        self.notification_history = []  # Historique des notifications
        self.user_preferences = {}      # user_id -> preferences
        self.whatsapp_api_key = None     # À configurer via env
        self.sms_api_key = None          # À configurer via env
    
    def send_notification(
        self,
        user_id: str,
        channel: NotificationChannel,
        message: str,
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Envoie une notification via un canal spécifique
        
        Args:
            user_id: ID de l'utilisateur
            channel: Canal de notification
            message: Message à envoyer
            priority: Priorité de la notification
            metadata: Métadonnées additionnelles
            
        Returns:
            Dict avec statut d'envoi
        """
        try:
            logger.info(f"[Notification] Envoi {channel.value} à user {user_id}")
            
            # Vérification des préférences utilisateur
            if not self._is_channel_enabled(user_id, channel):
                return {
                    "status": "skipped",
                    "reason": "Canal désactivé par l'utilisateur"
                }
            
            # Envoi selon le canal
            if channel == NotificationChannel.WHATSAPP:
                result = self._send_whatsapp(user_id, message, metadata)
            elif channel == NotificationChannel.SMS:
                result = self._send_sms(user_id, message, metadata)
            elif channel == NotificationChannel.EMAIL:
                result = self._send_email(user_id, message, metadata)
            elif channel == NotificationChannel.IN_APP:
                result = self._send_in_app(user_id, message, metadata)
            else:
                result = {"success": False, "error": "Canal inconnu"}
            
            # Enregistrement dans l'historique
            notification = {
                "notification_id": f"NOTIF_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                "user_id": user_id,
                "channel": channel.value,
                "message": message,
                "priority": priority.value,
                "metadata": metadata or {},
                "status": result.get("status", "unknown"),
                "sent_at": datetime.utcnow().isoformat()
            }
            
            self.notification_history.append(notification)
            
            return notification
            
        except Exception as e:
            logger.error(f"[Notification] Erreur envoi: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def send_proactive_notification(
        self,
        user_id: str,
        event_type: str,
        analysis_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Envoie une notification proactive basée sur un événement
        
        Args:
            user_id: ID de l'utilisateur
            event_type: Type d'événement (score_critical, dso_high, payment_overdue)
            analysis_data: Données de l'analyse
            
        Returns:
            Dict avec statut d'envoi
        """
        try:
            logger.info(f"[Notification] Notification proactive {event_type} pour user {user_id}")
            
            # Génération du message selon le type d'événement
            message, priority, channels = self._generate_proactive_message(
                event_type, 
                analysis_data
            )
            
            # Envoi multi-canal
            results = []
            for channel in channels:
                result = self.send_notification(
                    user_id,
                    channel,
                    message,
                    priority,
                    {"event_type": event_type, "analysis_data": analysis_data}
                )
                results.append(result)
            
            return {
                "event_type": event_type,
                "message": message,
                "priority": priority.value,
                "channels": [r["channel"] for r in results],
                "results": results
            }
            
        except Exception as e:
            logger.error(f"[Notification] Erreur notification proactive: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def _generate_proactive_message(
        self,
        event_type: str,
        analysis_data: Dict[str, Any]
    ) -> tuple[str, NotificationPriority, List[NotificationChannel]]:
        """Génère le message et les canaux pour une notification proactive"""
        score = analysis_data.get("score", 0)
        ratios = analysis_data.get("ratios", {})
        
        if event_type == "score_critical":
            message = f"⚠️ Alert: Votre score de vulnérabilité est critique ({score}/100). Contactez un expert ONECCA immédiatement."
            priority = NotificationPriority.URGENT
            channels = [NotificationChannel.WHATSAPP, NotificationChannel.SMS, NotificationChannel.IN_APP]
        
        elif event_type == "dso_high":
            dsr = ratios.get("dsr", 0)
            message = f"⚡ Vos clients paient trop lentement ({dsr:.0f} jours). Mettez en place des relances systématiques."
            priority = NotificationPriority.HIGH
            channels = [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP]
        
        elif event_type == "payment_overdue":
            message = "⚠️ Des paiements sont en retard. Relancez vos clients pour améliorer votre trésorerie."
            priority = NotificationPriority.HIGH
            channels = [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP]
        
        elif event_type == "cash_low":
            message = "⚡ Votre trésorerie est faible. Optimisez votre BFR ou obtenez un financement court terme."
            priority = NotificationPriority.HIGH
            channels = [NotificationChannel.WHATSAPP, NotificationChannel.IN_APP]
        
        else:
            message = "Nouvelle mise à jour disponible sur votre tableau de bord DoctorSmile."
            priority = NotificationPriority.MEDIUM
            channels = [NotificationChannel.IN_APP]
        
        return message, priority, channels
    
    def _send_whatsapp(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Envoie une notification WhatsApp (simulation)"""
        # À remplacer par WhatsApp Business API
        logger.info(f"[Notification] WhatsApp → {user_id}: {message[:50]}...")
        return {
            "status": "sent",
            "channel": "whatsapp",
            "message_id": f"WA_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        }
    
    def _send_sms(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Envoie une notification SMS (simulation)"""
        # À remplacer par API SMS (Twilio, Orange SMS, etc.)
        logger.info(f"[Notification] SMS → {user_id}: {message[:50]}...")
        return {
            "status": "sent",
            "channel": "sms",
            "message_id": f"SMS_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        }
    
    def _send_email(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Envoie une notification Email (simulation)"""
        # À remplacer par service email existant
        logger.info(f"[Notification] Email → {user_id}: {message[:50]}...")
        return {
            "status": "sent",
            "channel": "email",
            "message_id": f"EMAIL_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        }
    
    def _send_in_app(
        self,
        user_id: str,
        message: str,
        metadata: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Envoie une notification in-app"""
        # Stockée dans Firestore pour affichage dans l'app
        return {
            "status": "sent",
            "channel": "in_app",
            "message_id": f"INAPP_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
        }
    
    def _is_channel_enabled(
        self,
        user_id: str,
        channel: NotificationChannel
    ) -> bool:
        """Vérifie si un canal est activé pour l'utilisateur"""
        preferences = self.user_preferences.get(user_id, {})
        return preferences.get(f"{channel.value}_enabled", True)
    
    def set_user_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Définit les préférences de notification d'un utilisateur
        
        Args:
            user_id: ID de l'utilisateur
            preferences: Préférences (whatsapp_enabled, sms_enabled, etc.)
            
        Returns:
            Dict avec statut de mise à jour
        """
        try:
            self.user_preferences[user_id] = preferences
            logger.info(f"[Notification] Préférences mises à jour pour user {user_id}")
            
            return {
                "user_id": user_id,
                "preferences": preferences,
                "status": "updated",
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Notification] Erreur mise à jour préférences: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def get_notification_history(
        self,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Récupère l'historique des notifications
        
        Args:
            user_id: Filtre par utilisateur (optionnel)
            limit: Nombre maximum de notifications
            
        Returns:
            Liste des notifications
        """
        notifications = self.notification_history
        
        if user_id:
            notifications = [n for n in notifications if n.get("user_id") == user_id]
        
        # Tri par date décroissante
        notifications.sort(key=lambda x: x["sent_at"], reverse=True)
        
        return notifications[:limit]


# Instance singleton
notification_service = NotificationService()
