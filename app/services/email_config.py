"""
═══ app/services/email_config.py ═══
Configuration centralisée pour l'envoi d'emails (Brevo/Resend/SendGrid).
"""

import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
from enum import Enum

# ════════════════════════════════════════════════════════════════
#  TYPES D'EMAILS
# ════════════════════════════════════════════════════════════════

class EmailType(str, Enum):
    WELCOME = "welcome"
    ANALYSE_READY = "analyse_ready"
    REMINDER = "reminder"
    AGENT_WEEKLY = "agent_weekly"
    VERIFICATION = "verification"
    RESET_PASSWORD = "reset_password"
    PAYMENT_CONFIRMATION = "payment_confirmation"
    REPORT_EXPORT = "report_export"
    CONTACT_FORM = "contact_form"

# ════════════════════════════════════════════════════════════════
#  TEMPLATE IDS BREVO (à créer dans le dashboard Brevo)
# ════════════════════════════════════════════════════════════════

class BrevoTemplateId:
    """IDs des templates à créer dans Brevo (transactional email templates)."""
    WELCOME = 1
    ANALYSE_READY = 2
    REMINDER = 3
    AGENT_WEEKLY = 4
    VERIFICATION = 5
    RESET_PASSWORD = 6
    PAYMENT_CONFIRMATION = 7
    REPORT_EXPORT = 8
    CONTACT_FORM = 9

# ════════════════════════════════════════════════════════════════
#  VARIABLES D'ENVIRONNEMENT
# ════════════════════════════════════════════════════════════════

# Brevo
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@doctorsmile.io")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Doctor Smile")
BREVO_REPLY_TO = os.getenv("BREVO_REPLY_TO", "contact@doctorsmile.io")

# Resend (fallback)
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")

# SendGrid (fallback final)
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")

# Configuration générale
FROM_EMAIL = os.getenv("EMAIL_FROM", "noreply@doctorsmile.io")
FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Doctor Smile")
APP_URL = os.getenv("APP_URL", "https://doctorsmile-d8d8f.web.app")

# ════════════════════════════════════════════════════════════════
#  FONCTIONS UTILITAIRES
# ════════════════════════════════════════════════════════════════

def is_brevo_configured() -> bool:
    """Vérifie si Brevo est correctement configuré."""
    return bool(BREVO_API_KEY and BREVO_SENDER_EMAIL)

def is_resend_configured() -> bool:
    """Vérifie si Resend est configuré (fallback)."""
    return bool(RESEND_API_KEY)

def is_sendgrid_configured() -> bool:
    """Vérifie si SendGrid est configuré (fallback final)."""
    return bool(SENDGRID_API_KEY)

# ════════════════════════════════════════════════════════════════
#  CONSTANTES DE BRANDING
# ════════════════════════════════════════════════════════════════

BRANDING = {
    "bg": "#02040B",
    "surface": "#070B14",
    "ice": "#8B7FF0",
    "gold": "#FFD700",
    "text": "#E2E8F0",
    "muted": "rgba(255,255,255,0.45)",
    "font": "Arial, Helvetica, sans-serif",
    "logo_url": "https://doctorsmile-d8d8f.web.app/assets/logo.png",
}
