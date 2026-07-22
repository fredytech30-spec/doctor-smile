"""
Automation Service - Doctor Smile v4.0
Gestion de l'automatisation visible avec logs
Actions automatisées : relances, alertes, synchronisations
"""

from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class AutomationStatus(Enum):
    """Statuts d'automatisation"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AutomationService:
    """Service de gestion de l'automatisation visible"""
    
    def __init__(self):
        self.automation_logs = []  # Journal des automatisations
        self.active_automations = {}  # automation_id -> automation_info
    
    def create_automation(
        self,
        user_id: str,
        automation_type: str,
        trigger: Dict[str, Any],
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crée une nouvelle automatisation
        
        Args:
            user_id: ID de l'utilisateur
            automation_type: Type d'automatisation (reminder, alert, sync)
            trigger: Conditions de déclenchement
            config: Configuration de l'automatisation
            
        Returns:
            Dict avec détails de l'automatisation
        """
        try:
            automation_id = f"AUTO_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{user_id[:8]}"
            
            automation = {
                "automation_id": automation_id,
                "user_id": user_id,
                "type": automation_type,
                "trigger": trigger,
                "config": config,
                "status": AutomationStatus.PENDING.value,
                "created_at": datetime.utcnow().isoformat(),
                "logs": []
            }
            
            self.active_automations[automation_id] = automation
            
            logger.info(f"[Automation] Création {automation_id} type {automation_type}")
            
            return automation
            
        except Exception as e:
            logger.error(f"[Automation] Erreur création: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def execute_automation(
        self,
        automation_id: str
    ) -> Dict[str, Any]:
        """
        Exécute une automatisation
        
        Args:
            automation_id: ID de l'automatisation
            
        Returns:
            Dict avec résultat de l'exécution
        """
        try:
            if automation_id not in self.active_automations:
                raise ValueError(f"Automatisation {automation_id} introuvable")
            
            automation = self.active_automations[automation_id]
            automation["status"] = AutomationStatus.RUNNING.value
            automation["started_at"] = datetime.utcnow().isoformat()
            
            self._add_log(automation_id, "Démarrage de l'automatisation", "info")
            
            # Exécution selon le type
            result = self._execute_by_type(automation)
            
            automation["status"] = AutomationStatus.COMPLETED.value if result["success"] else AutomationStatus.FAILED.value
            automation["completed_at"] = datetime.utcnow().isoformat()
            automation["result"] = result
            
            self._add_log(automation_id, f"Terminé : {result['message']}", "info")
            
            # Archivage dans les logs
            self.automation_logs.append(automation.copy())
            
            return automation
            
        except Exception as e:
            logger.error(f"[Automation] Erreur exécution: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def _execute_by_type(self, automation: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute l'automatisation selon son type"""
        automation_type = automation["type"]
        config = automation["config"]
        
        if automation_type == "reminder":
            return self._execute_reminder(config)
        elif automation_type == "alert":
            return self._execute_alert(config)
        elif automation_type == "sync":
            return self._execute_sync(config)
        else:
            return {
                "success": False,
                "message": f"Type d'automatisation inconnu: {automation_type}"
            }
    
    def _execute_reminder(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute un rappel automatisé"""
        # Simulation de rappel (à remplacer par notification_service)
        return {
            "success": True,
            "message": "Rappel envoyé avec succès",
            "recipient": config.get("recipient"),
            "channel": config.get("channel", "whatsapp")
        }
    
    def _execute_alert(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute une alerte automatisée"""
        # Simulation d'alerte (à remplacer par notification_service)
        return {
            "success": True,
            "message": "Alerte déclenchée avec succès",
            "alert_type": config.get("alert_type"),
            "severity": config.get("severity", "medium")
        }
    
    def _execute_sync(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute une synchronisation automatisée"""
        # Simulation de synchronisation (à remplacer par appel API)
        return {
            "success": True,
            "message": "Synchronisation terminée",
            "synced_items": config.get("items", [])
        }
    
    def _add_log(self, automation_id: str, message: str, level: str = "info"):
        """Ajoute un log à l'automatisation"""
        if automation_id in self.active_automations:
            log_entry = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": level,
                "message": message
            }
            self.active_automations[automation_id]["logs"].append(log_entry)
    
    def get_automation_logs(
        self,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Récupère les logs d'automatisation
        
        Args:
            user_id: Filtre par utilisateur (optionnel)
            limit: Nombre maximum de logs
            
        Returns:
            Liste des logs d'automatisation
        """
        logs = self.automation_logs
        
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]
        
        # Tri par date décroissante
        logs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return logs[:limit]
    
    def get_active_automations(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Récupère les automatisations actives"""
        automations = list(self.active_automations.values())
        
        if user_id:
            automations = [auto for auto in automations if auto.get("user_id") == user_id]
        
        return automations


# Instance singleton
automation_service = AutomationService()
