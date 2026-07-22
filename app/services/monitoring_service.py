"""
Monitoring Service - Doctor Smile v4.0
Surveillance continue du système et des performances
Alertes proactives sur anomalies et dégradations
"""

from typing import Dict, List, Optional, Any
import logging
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Sévérité des alertes"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MonitoringService:
    """Service de surveillance continue"""
    
    def __init__(self):
        self.metrics = {}  # metric_name -> value_history
        self.alerts = []   # Historique des alertes
        self.thresholds = {
            "response_time_ms": 1000,
            "error_rate_percent": 5,
            "cpu_usage_percent": 80,
            "memory_usage_percent": 85,
            "disk_usage_percent": 90
        }
    
    def record_metric(
        self,
        metric_name: str,
        value: float,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Enregistre une métrique de performance
        
        Args:
            metric_name: Nom de la métrique
            value: Valeur de la métrique
            timestamp: Timestamp optionnel
            
        Returns:
            Dict avec statut d'enregistrement
        """
        try:
            if timestamp is None:
                timestamp = datetime.utcnow().isoformat()
            
            if metric_name not in self.metrics:
                self.metrics[metric_name] = []
            
            self.metrics[metric_name].append({
                "value": value,
                "timestamp": timestamp
            })
            
            # Garder seulement les 1000 dernières valeurs
            if len(self.metrics[metric_name]) > 1000:
                self.metrics[metric_name] = self.metrics[metric_name][-1000:]
            
            # Vérification des seuils
            self._check_thresholds(metric_name, value)
            
            return {
                "metric_name": metric_name,
                "value": value,
                "timestamp": timestamp,
                "status": "recorded"
            }
            
        except Exception as e:
            logger.error(f"[Monitoring] Erreur enregistrement métrique: {e}")
            return {
                "error": str(e),
                "status": "error"
            }
    
    def _check_thresholds(self, metric_name: str, value: float):
        """Vérifie si la métrique dépasse les seuils d'alerte"""
        if metric_name in self.thresholds:
            threshold = self.thresholds[metric_name]
            
            if value >= threshold:
                severity = AlertSeverity.CRITICAL if value >= threshold * 1.2 else AlertSeverity.WARNING
                self._create_alert(
                    metric_name,
                    f"{metric_name} dépasse le seuil: {value} > {threshold}",
                    severity
                )
    
    def _create_alert(
        self,
        metric_name: str,
        message: str,
        severity: AlertSeverity
    ):
        """Crée une alerte"""
        alert = {
            "alert_id": f"ALERT_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "metric_name": metric_name,
            "message": message,
            "severity": severity.value,
            "created_at": datetime.utcnow().isoformat(),
            "resolved": False
        }
        
        self.alerts.append(alert)
        logger.warning(f"[Monitoring] Alert: {message}")
    
    def get_metrics(
        self,
        metric_name: Optional[str] = None,
        hours: int = 24
    ) -> Dict[str, Any]:
        """
        Récupère les métriques
        
        Args:
            metric_name: Nom de la métrique (optionnel)
            hours: Période en heures
            
        Returns:
            Dict avec métriques demandées
        """
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            if metric_name:
                if metric_name not in self.metrics:
                    return {"error": "Métrique introuvable"}
                
                filtered = [
                    m for m in self.metrics[metric_name]
                    if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
                ]
                
                return {
                    "metric_name": metric_name,
                    "values": filtered,
                    "count": len(filtered),
                    "avg": sum(m["value"] for m in filtered) / len(filtered) if filtered else 0
                }
            else:
                result = {}
                for name, values in self.metrics.items():
                    filtered = [
                        m for m in values
                        if datetime.fromisoformat(m["timestamp"]) >= cutoff_time
                    ]
                    result[name] = {
                        "count": len(filtered),
                        "avg": sum(m["value"] for m in filtered) / len(filtered) if filtered else 0
                    }
                
                return result
                
        except Exception as e:
            logger.error(f"[Monitoring] Erreur récupération métriques: {e}")
            return {"error": str(e)}
    
    def get_alerts(
        self,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Récupère les alertes
        
        Args:
            severity: Filtre par sévérité (optionnel)
            resolved: Filtre par statut résolu (optionnel)
            limit: Nombre maximum d'alertes
            
        Returns:
            Liste des alertes
        """
        alerts = self.alerts
        
        if severity:
            alerts = [a for a in alerts if a["severity"] == severity]
        
        if resolved is not None:
            alerts = [a for a in alerts if a["resolved"] == resolved]
        
        # Tri par date décroissante
        alerts.sort(key=lambda x: x["created_at"], reverse=True)
        
        return alerts[:limit]
    
    def resolve_alert(self, alert_id: str) -> Dict[str, Any]:
        """
        Marque une alerte comme résolue
        
        Args:
            alert_id: ID de l'alerte
            
        Returns:
            Dict avec statut de résolution
        """
        try:
            for alert in self.alerts:
                if alert["alert_id"] == alert_id:
                    alert["resolved"] = True
                    alert["resolved_at"] = datetime.utcnow().isoformat()
                    return alert
            
            return {"error": "Alerte introuvable"}
            
        except Exception as e:
            logger.error(f"[Monitoring] Erreur résolution alerte: {e}")
            return {"error": str(e)}
    
    def get_system_health(self) -> Dict[str, Any]:
        """Récupère l'état de santé global du système"""
        try:
            # Calcul des métriques récentes
            recent_metrics = self.get_metrics(hours=1)
            
            # Comptage des alertes non résolues
            unresolved_alerts = len([a for a in self.alerts if not a["resolved"]])
            critical_alerts = len([a for a in self.alerts if not a["resolved"] and a["severity"] == AlertSeverity.CRITICAL.value])
            
            # Détermination du statut global
            if critical_alerts > 0:
                health_status = "critical"
            elif unresolved_alerts > 5:
                health_status = "warning"
            else:
                health_status = "healthy"
            
            return {
                "status": health_status,
                "unresolved_alerts": unresolved_alerts,
                "critical_alerts": critical_alerts,
                "metrics": recent_metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[Monitoring] Erreur health check: {e}")
            return {
                "status": "error",
                "error": str(e)
            }


# Instance singleton
monitoring_service = MonitoringService()
