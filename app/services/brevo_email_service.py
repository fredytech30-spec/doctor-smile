"""
══════════════════════════════════════════════════════════════════
  app/services/brevo_email_service.py — Doctor Smile · Brevo Email Service
══════════════════════════════════════════════════════════════════

Fournisseur principal : Brevo (ex-Sendinblue)
  pip install sib-api-v3-sdk
  Variable d'env : BREVO_API_KEY

Templates :
  - Bienvenue
  - Analyse prête
  - Relance inactivité
  - Rapport hebdomadaire Agent IA
  - Vérification email
  - Réinitialisation mot de passe
  - Confirmation paiement
  - Rapport PDF exporté
"""

from __future__ import annotations

import logging
import os
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
import json

# Brevo SDK
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

log = logging.getLogger("doctorsmile.brevo_email_service")

# ════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ════════════════════════════════════════════════════════════════

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@doctorsmile.io")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Doctor Smile")
BREVO_REPLY_TO = os.getenv("BREVO_REPLY_TO", "contact@doctorsmile.io")

# IDs des templates Brevo (à créer dans le dashboard)
class BrevoTemplate(Enum):
    WELCOME = 1                    # Template de bienvenue
    ANALYSE_READY = 2              # Analyse prête
    REMINDER = 3                   # Relance inactivité
    AGENT_WEEKLY = 4               # Rapport hebdo Agent IA
    VERIFICATION = 5               # Vérification email
    RESET_PASSWORD = 6             # Réinitialisation mot de passe
    PAYMENT_CONFIRMATION = 7       # Confirmation paiement
    REPORT_EXPORT = 8              # Rapport PDF exporté
    CONTACT_FORM = 9               # Formulaire de contact


# ════════════════════════════════════════════════════════════════
#  CLIENT BREVO
# ════════════════════════════════════════════════════════════════

class BrevoEmailService:
    """Service d'envoi d'emails via Brevo (ex-Sendinblue)."""
    
    def __init__(self):
        self._configure_client()
        self._contacts_api = None
        self._webhooks_api = None
        
    def _configure_client(self):
        """Configure le client Brevo."""
        if not BREVO_API_KEY:
            log.warning("BREVO_API_KEY non définie — mode développement (pas d'envoi)")
            self._client = None
            self._api_instance = None
            return
            
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = BREVO_API_KEY
        self._client = sib_api_v3_sdk.ApiClient(configuration)
        self._api_instance = sib_api_v3_sdk.TransactionalEmailsApi(self._client)
        self._contacts_api = sib_api_v3_sdk.ContactsApi(self._client)
        self._webhooks_api = sib_api_v3_sdk.WebhooksApi(self._client)
        log.info("Service Brevo initialisé")
    
    def _is_available(self) -> bool:
        """Vérifie si le service est disponible."""
        return self._api_instance is not None
    
    # ════════════════════════════════════════════════════════════════
    #  ENVOI D'EMAILS TRANSACTIONNELS
    # ════════════════════════════════════════════════════════════════
    
    def send_email(
        self,
        to_email: str,
        to_name: str,
        template_id: int,
        params: Dict[str, Any],
        subject: Optional[str] = None,
        attachment: Optional[Dict[str, str]] = None,
        cc: Optional[List[Dict[str, str]]] = None,
        bcc: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Envoie un email transactionnel via Brevo.
        
        Args:
            to_email: Email du destinataire
            to_name: Nom du destinataire
            template_id: ID du template Brevo
            params: Paramètres pour le template
            subject: Sujet (optionnel, sinon celui du template)
            attachment: Pièce jointe {'name': 'file.pdf', 'content': 'base64'}
            cc: Liste des emails en copie
            bcc: Liste des emails en copie cachée
        """
        if not self._is_available():
            log.info(f"MODE DEV: email à {to_email} - template {template_id}")
            return {"success": True, "mode": "dev", "to": to_email}
        
        try:
            # Construction de l'email
            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                to=[{"email": to_email, "name": to_name}],
                template_id=template_id,
                params=params,
                sender={"email": BREVO_SENDER_EMAIL, "name": BREVO_SENDER_NAME},
                reply_to={"email": BREVO_REPLY_TO, "name": "Doctor Smile Support"},
            )
            
            if subject:
                send_smtp_email.subject = subject
            
            if cc:
                send_smtp_email.cc = cc
            if bcc:
                send_smtp_email.bcc = bcc
            if attachment:
                send_smtp_email.attachment = [attachment]
            
            # Envoi
            response = self._api_instance.send_transac_email(send_smtp_email)
            message_id = response.message_id
            
            log.info(f"Email envoyé à {to_email} - message_id: {message_id}")
            return {
                "success": True,
                "message_id": message_id,
                "to": to_email,
                "template": template_id
            }
            
        except ApiException as e:
            log.error(f"Erreur Brevo API: {e}")
            return {
                "success": False,
                "error": str(e),
                "to": to_email
            }
    
    # ════════════════════════════════════════════════════════════════
    #  MÉTHODES SPÉCIFIQUES PAR TYPE D'EMAIL
    # ════════════════════════════════════════════════════════════════
    
    def send_welcome_email(self, email: str, name: str, company: Optional[str] = None) -> Dict[str, Any]:
        """Envoie l'email de bienvenue."""
        params = {
            "name": name,
            "company": company or "votre entreprise",
            "dashboard_url": "https://doctorsmile-d8d8f.web.app/dashboard.html",
            "current_year": datetime.now().year
        }
        
        # Ajout du contact à Brevo
        self.add_or_update_contact(email, name)
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.WELCOME.value,
            params=params,
            subject=f"Bienvenue sur Doctor Smile, {name} 🎉"
        )
    
    def send_analyse_ready_email(
        self,
        email: str,
        name: str,
        entreprise: str,
        score: int,
        zone_label: str,
        zone_color: str,
        zone_emoji: str,
        analyse_id: str,
        ratios: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """Envoie l'email 'analyse prête'."""
        params = {
            "name": name,
            "entreprise": entreprise,
            "score": score,
            "zone_label": zone_label,
            "zone_color": zone_color,
            "zone_emoji": zone_emoji,
            "analyse_id": analyse_id,
            "dashboard_url": f"https://doctorsmile-d8d8f.web.app/dashboard.html#analyse-{analyse_id}",
            "current_year": datetime.now().year
        }
        
        # Ajout des ratios si fournis
        if ratios:
            params["ratios"] = ratios
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.ANALYSE_READY.value,
            params=params,
            subject=f"{zone_emoji} Analyse de {entreprise} — Score {score}/100"
        )
    
    def send_reminder_email(self, email: str, name: str, inactive_days: int) -> Dict[str, Any]:
        """Envoie l'email de relance après inactivité."""
        params = {
            "name": name,
            "inactive_days": inactive_days,
            "dashboard_url": "https://doctorsmile-d8d8f.web.app/dashboard.html",
            "current_year": datetime.now().year
        }
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.REMINDER.value,
            params=params,
            subject=f"Doctor Smile : un bilan mensuel s'impose 📊"
        )
    
    def send_agent_weekly_report(
        self,
        email: str,
        name: str,
        score: int,
        delta: int,
        analyses_cnt: int,
        zone_label: str,
        zone_color: str,
        zone_emoji: str,
        summary: str,
        top_recos: List[str]
    ) -> Dict[str, Any]:
        """Envoie le rapport hebdomadaire de l'Agent IA."""
        params = {
            "name": name,
            "score": score,
            "delta": delta,
            "analyses_cnt": analyses_cnt,
            "zone_label": zone_label,
            "zone_color": zone_color,
            "zone_emoji": zone_emoji,
            "summary": summary,
            "top_recos": top_recos[:3] if top_recos else [],
            "dashboard_url": "https://doctorsmile-d8d8f.web.app/dashboard.html",
            "current_year": datetime.now().year
        }
        
        delta_str = f"+{delta}" if delta > 0 else str(delta)
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.AGENT_WEEKLY.value,
            params=params,
            subject=f"📊 Rapport Hebdo : Score {score}/100 ({delta_str})"
        )
    
    def send_verification_email(self, email: str, name: str, verification_code: str) -> Dict[str, Any]:
        """Envoie l'email de vérification d'email."""
        params = {
            "name": name,
            "verification_code": verification_code,
            "verify_url": f"https://doctorsmile-d8d8f.web.app/verify.html?code={verification_code}",
            "current_year": datetime.now().year
        }
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.VERIFICATION.value,
            params=params,
            subject="Vérifiez votre adresse email — Doctor Smile"
        )
    
    def send_reset_password_email(self, email: str, name: str, reset_token: str) -> Dict[str, Any]:
        """Envoie l'email de réinitialisation de mot de passe."""
        params = {
            "name": name,
            "reset_link": f"https://doctorsmile-d8d8f.web.app/reset-password.html?token={reset_token}",
            "token_validity": "60 minutes",
            "current_year": datetime.now().year
        }
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.RESET_PASSWORD.value,
            params=params,
            subject="Réinitialisation de votre mot de passe — Doctor Smile"
        )
    
    def send_payment_confirmation(
        self,
        email: str,
        name: str,
        plan_name: str,
        amount: float,
        invoice_url: str
    ) -> Dict[str, Any]:
        """Envoie la confirmation de paiement."""
        params = {
            "name": name,
            "plan_name": plan_name,
            "amount": amount,
            "invoice_url": invoice_url,
            "dashboard_url": "https://doctorsmile-d8d8f.web.app/dashboard.html",
            "current_year": datetime.now().year
        }
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.PAYMENT_CONFIRMATION.value,
            params=params,
            subject=f"✅ Paiement confirmé — {plan_name}"
        )
    
    def send_report_export_email(
        self,
        email: str,
        name: str,
        report_name: str,
        download_url: str,
        expiry_days: int = 7
    ) -> Dict[str, Any]:
        """Envoie l'email avec le lien de téléchargement du rapport PDF."""
        params = {
            "name": name,
            "report_name": report_name,
            "download_url": download_url,
            "expiry_days": expiry_days,
            "current_year": datetime.now().year
        }
        
        return self.send_email(
            to_email=email,
            to_name=name,
            template_id=BrevoTemplate.REPORT_EXPORT.value,
            params=params,
            subject=f"📄 Votre rapport {report_name} est prêt"
        )
    
    # ════════════════════════════════════════════════════════════════
    #  GESTION DES CONTACTS
    # ════════════════════════════════════════════════════════════════
    
    def add_or_update_contact(
        self,
        email: str,
        name: str,
        attributes: Optional[Dict[str, Any]] = None,
        list_ids: Optional[List[int]] = None
    ) -> bool:
        """Ajoute ou met à jour un contact dans Brevo."""
        if not self._contacts_api:
            log.warning("Contacts API non disponible")
            return False
        
        try:
            contact_data = {
                "email": email,
                "attributes": {
                    "FIRSTNAME": name.split()[0] if name else "",
                    "LASTNAME": " ".join(name.split()[1:]) if len(name.split()) > 1 else "",
                    **(attributes or {})
                },
                "listIds": list_ids or [],
                "updateEnabled": True
            }
            
            self._contacts_api.create_contact(
                sib_api_v3_sdk.CreateContact(**contact_data)
            )
            log.info(f"Contact {email} ajouté/mis à jour dans Brevo")
            return True
            
        except ApiException as e:
            log.error(f"Erreur création contact: {e}")
            return False
    
    def add_to_list(self, email: str, list_id: int) -> bool:
        """Ajoute un contact à une liste Brevo."""
        if not self._contacts_api:
            return False
        
        try:
            self._contacts_api.add_contact_to_list(list_id, sib_api_v3_sdk.AddContactToList(emails=[email]))
            log.info(f"Contact {email} ajouté à la liste {list_id}")
            return True
        except ApiException as e:
            log.error(f"Erreur ajout à la liste: {e}")
            return False
    
    # ════════════════════════════════════════════════════════════════
    #  STATISTIQUES ET MONITORING
    # ════════════════════════════════════════════════════════════════
    
    def get_email_stats(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Récupère les statistiques des emails envoyés."""
        if not self._api_instance:
            return []
        
        try:
            # Récupère l'historique des emails transactionnels
            response = self._api_instance.get_transac_email_events(limit=limit)
            return [
                {
                    "email": event.email,
                    "event": event.event,  # delivered, opened, clicked, etc.
                    "timestamp": event.date,
                    "message_id": event.message_id
                }
                for event in response.events
            ]
        except ApiException as e:
            log.error(f"Erreur récupération stats: {e}")
            return []
    
    def get_contact_info(self, email: str) -> Optional[Dict[str, Any]]:
        """Récupère les informations d'un contact."""
        if not self._contacts_api:
            return None
        
        try:
            contact = self._contacts_api.get_contact_info(email)
            return {
                "email": contact.email,
                "name": f"{contact.attributes.get('FIRSTNAME', '')} {contact.attributes.get('LASTNAME', '')}".strip(),
                "created_at": contact.created_at,
                "lists": contact.list_ids
            }
        except ApiException:
            return None


# ════════════════════════════════════════════════════════════════
#  INSTANCE GLOBALE
# ════════════════════════════════════════════════════════════════

brevo_email_service = BrevoEmailService()
