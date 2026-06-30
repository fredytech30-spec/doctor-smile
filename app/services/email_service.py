"""
══════════════════════════════════════════════════════════════════
  app/services/email_service.py — Doctor Smile · Email Service
══════════════════════════════════════════════════════════════════

Fournisseur principal : Brevo (ex-Sendinblue) — HTML direct, aucun
  template ID requis. pip install sib-api-v3-sdk
  Variable d'env : BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME

Fournisseur de secours 1 : Resend
  pip install resend   |   Variable : RESEND_API_KEY

Fournisseur de secours 2 : SendGrid
  pip install sendgrid |   Variable : SENDGRID_API_KEY

Si aucune clé n'est fournie → mode dev (log uniquement, pas d'envoi).

Emails gérés (tous via HTML inline — pas de template Brevo requis) :
  - Bienvenue             send_welcome()
  - Analyse prête         send_analyse_ready()
  - Relance inactivité    send_relance()
  - Rapport hebdomadaire  send_agent_weekly()
  - Alerte agent          send_agent_alert()
  - Co-signature          send_cosign_request()
  - Confirmation paiement send_payment_confirmation()
  - Rapport PDF           send_report_pdf()
  - OTP 2FA               send_otp()
  - Reset mot de passe    send_reset_password()
"""

from __future__ import annotations

import logging
import os
import base64
from typing import Optional, Dict, Any, List, Tuple
from enum import Enum
from datetime import datetime

# Brevo (ex-Sendinblue) - Provider principal
try:
    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException
    BREVO_AVAILABLE = True
except ImportError:
    BREVO_AVAILABLE = False
    sib_api_v3_sdk = None
    ApiException = None

# Resend (fallback uniquement)
import resend

# SendGrid (fallback final)
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

# ── Configuration Brevo depuis .env ─────────────────────────────
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
BREVO_SENDER_EMAIL = os.getenv("BREVO_SENDER_EMAIL", "noreply@doctorsmile.io")
BREVO_SENDER_NAME = os.getenv("BREVO_SENDER_NAME", "Doctor Smile")
BREVO_REPLY_TO = os.getenv("BREVO_REPLY_TO", "contact@doctorsmile.io")

# NOTE:
# dotenv n'est pas forcément installé dans tous les environnements.
# On évite donc une dépendance obligatoire ici.

log = logging.getLogger("doctorsmile.email_service")

# ── Couleurs & branding Doctor Smile ─────────────────────────────
_BG        = "#02040B"
_SURFACE   = "#070B14"
_ICE       = "#8B7FF0"
_GOLD      = "#FFD700"
_TEXT      = "#E2E8F0"
_MUTED     = "rgba(255,255,255,0.45)"
_FONT      = "Arial, Helvetica, sans-serif"
_LOGO_URL  = "https://doctorsmile-d8d8f.web.app/assets/logo.png"   # ajuster si nécessaire
_APP_URL   = "https://doctorsmile-d8d8f.web.app/dashboard.html"
_FROM_EMAIL = os.getenv("EMAIL_FROM", "noreply@doctorsmile.io")
_FROM_NAME  = os.getenv("EMAIL_FROM_NAME", "Doctor Smile")


# ════════════════════════════════════════════════════════════════
#  TEMPLATES HTML
# ════════════════════════════════════════════════════════════════

def _base_template(title: str, body_html: str, preheader: str = "") -> str:
    """Template de base premium pour tous les emails Doctor Smile."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,600;14..32,700;14..32,800&display=swap" rel="stylesheet">
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    body {{ margin:0; padding:0; background:linear-gradient(135deg, #02040B 0%, #0A1628 100%); font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }}
    a {{ color:{_ICE}; text-decoration:none; transition:all 0.2s ease; }}
    a:hover {{ color:#fff; text-decoration:none; }}
    .container {{ max-width:600px; margin:0 auto; padding:40px 20px; }}
    .card {{ background:rgba(7,11,20,0.85); backdrop-filter:blur(10px); border:1px solid rgba(139,127,240,0.15);
             border-radius:24px; overflow:hidden; margin:16px 0; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5); }}
    .header {{ background:linear-gradient(135deg, rgba(10,22,40,0.95) 0%, rgba(7,17,31,0.95) 100%);
               padding:40px 40px 32px; border-bottom:1px solid rgba(139,127,240,0.2); text-align:center; }}
    .logo {{ font-size:28px; font-weight:800; background:linear-gradient(135deg, #fff 0%, {_ICE} 100%);
             -webkit-background-clip:text; background-clip:text; color:transparent; letter-spacing:-0.02em; }}
    .logo span {{ color:{_ICE}; background:none; -webkit-background-clip:unset; background-clip:unset; }}
    .badge {{ display:inline-block; margin-top:12px; padding:6px 14px; background:rgba(139,127,240,0.1);
              border:1px solid rgba(139,127,240,0.2); border-radius:100px; font-size:11px; font-weight:600;
              letter-spacing:0.08em; color:{_ICE}; text-transform:uppercase; }}
    .body {{ padding:40px 40px 32px; }}
    .greeting {{ font-size:22px; font-weight:700; color:#fff; margin-bottom:16px; letter-spacing:-0.01em; }}
    .text {{ font-size:15px; color:rgba(255,255,255,0.75); line-height:1.6; margin-bottom:24px; }}
    .text-muted {{ font-size:12px; color:rgba(255,255,255,0.4); line-height:1.6; }}
    .btn {{ display:inline-block; padding:14px 32px; border-radius:12px;
            background:linear-gradient(135deg, rgba(139,127,240,0.15) 0%, rgba(139,127,240,0.05) 100%);
            border:1px solid rgba(139,127,240,0.3); color:{_ICE}; font-size:14px; font-weight:600;
            letter-spacing:0.02em; text-decoration:none; margin:12px 0; transition:all 0.3s ease;
            backdrop-filter:blur(4px); }}
    .btn:hover {{ background:linear-gradient(135deg, rgba(139,127,240,0.25) 0%, rgba(139,127,240,0.1) 100%);
                  border-color:{_ICE}; transform:translateY(-2px); box-shadow:0 10px 20px -5px rgba(139,127,240,0.2); }}
    .btn-gold {{ background:linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.05) 100%);
                 border-color:rgba(255,215,0,0.3); color:{_GOLD}; }}
    .btn-gold:hover {{ background:linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0.1) 100%);
                       border-color:{_GOLD}; box-shadow:0 10px 20px -5px rgba(255,215,0,0.2); }}
    .divider {{ height:1px; background:linear-gradient(90deg, transparent, rgba(139,127,240,0.2), transparent); margin:24px 0; }}
    .footer {{ padding:24px 40px 32px; text-align:center; background:rgba(0,0,0,0.2); }}
    .footer p {{ font-size:11px; color:rgba(255,255,255,0.25); line-height:1.6; margin:4px 0; }}
    .footer a {{ color:rgba(255,255,255,0.4); transition:color 0.2s; }}
    .footer a:hover {{ color:{_ICE}; }}
    .score-ring {{ text-align:center; padding:20px 0; }}
    .score-number {{ font-size:64px; font-weight:800; letter-spacing:-0.02em; background:linear-gradient(135deg, #fff 0%, {_ICE} 100%);
                     -webkit-background-clip:text; background-clip:text; color:transparent; }}
    .zone-badge {{ display:inline-block; padding:6px 18px; border-radius:100px;
                   font-size:12px; font-weight:700; letter-spacing:0.08em;
                   text-transform:uppercase; margin-top:12px; backdrop-filter:blur(4px); }}
    .stat-row {{ display:flex; gap:16px; margin:24px 0; }}
    .stat-box {{ flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08);
                 border-radius:16px; padding:16px; text-align:center; transition:all 0.2s; }}
    .stat-box:hover {{ background:rgba(255,255,255,0.05); border-color:rgba(139,127,240,0.2); }}
    .stat-val {{ font-size:24px; font-weight:800; color:#fff; }}
    .stat-lbl {{ font-size:10px; color:rgba(255,255,255,0.45); letter-spacing:0.08em;
                 text-transform:uppercase; margin-top:6px; }}
    @media (max-width: 480px) {{
      .header {{ padding:32px 24px; }}
      .body {{ padding:32px 24px; }}
      .footer {{ padding:24px 24px; }}
      .stat-row {{ flex-direction:column; gap:12px; }}
    }}
  </style>
</head>
<body>
  {'<div style="display:none;max-height:0;overflow:hidden;">'+preheader+'</div>' if preheader else ''}
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">Doctor<span>Smile</span></div>
        <div class="badge">ANALYSE FINANCIÈRE INTELLIGENTE</div>
      </div>
      <div class="body">
        {body_html}
      </div>
      <div class="footer">
        <div class="divider"></div>
        <p>Doctor Smile · Analyse financière propulsée par IA</p>
        <p>
          <a href="{_APP_URL}">Accéder à la plateforme</a> ·
          <a href="https://doctorsmile-d8d8f.web.app/privacy.html">Confidentialité</a> ·
          <a href="{_APP_URL}#unsubscribe">Se désabonner</a>
        </p>
        <p style="margin-top:8px;">© 2025 Doctor Smile. Tous droits réservés.</p>
      </div>
    </div>
  </div>
</body>
</html>"""


def _welcome_html(name: str) -> tuple[str, str]:
    """Template email de bienvenue."""
    subject = f"Bienvenue sur Doctor Smile, {name} 🎉"
    body    = f"""
      <div class="greeting">Bonjour {name} 👋</div>
      <p class="text">
        Votre compte Doctor Smile est prêt. Vous pouvez dès maintenant analyser
        la santé financière de votre entreprise grâce à notre pipeline ML
        RF&nbsp;+&nbsp;XGBoost&nbsp;+&nbsp;LightGBM.
      </p>

      <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                  border-radius:12px;padding:20px;margin:20px 0;">
        <div style="font-size:12px;font-weight:800;color:{_ICE};letter-spacing:0.08em;
                    text-transform:uppercase;margin-bottom:14px;">Ce que vous pouvez faire</div>
        {"".join([
            f'<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">'
            f'<span style="font-size:18px;">{icon}</span>'
            f'<div><div style="font-size:12px;font-weight:700;color:#fff;">{t}</div>'
            f'<div style="font-size:10px;color:rgba(255,255,255,0.35);margin-top:2px;">{d}</div></div>'
            f'</div>'
            for icon, t, d in [
                ("📊", "Analyser un bilan financier", "Excel, CSV, PDF — notre IA extrait et analyse"),
                ("🤖", "Obtenir des recommandations IA", "Plan d'action personnalisé selon votre zone"),
                ("📈", "Simuler des scénarios What-If", "Voyez l'impact de chaque décision financière"),
                ("📄", "Exporter un rapport PDF", "Rapport complet à partager avec votre banque"),
            ]
        ])}
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="{_APP_URL}" class="btn">
          🚀 Lancer ma première analyse →
        </a>
      </div>

      <p class="text-muted">
        Vous recevez cet email car vous venez de créer un compte sur Doctor Smile.
        Si ce n'était pas vous, ignorez ce message.
      </p>
    """
    return subject, _base_template(subject, body, f"Bienvenue {name} — commencez votre première analyse financière")


def _analyse_ready_html(
    name: str, entreprise: str, score: int,
    zone_label: str, zone_color: str, zone_emoji: str, analyse_id: str
) -> tuple[str, str]:
    """Template email 'votre analyse est prête'."""
    subject = f"{zone_emoji} Analyse de {entreprise} — Score {score}/100"

    # Recommandation selon la zone
    reco_map = {
        "Zone Saine":     ("Votre entreprise est en bonne santé financière.", _ICE),
        "Zone Vigilance": ("Quelques points d'attention à surveiller.", "#f59e0b"),
        "Zone Risque":    ("Des actions correctives sont recommandées rapidement.", "#f97316"),
        "Zone Critique":  ("Une intervention urgente est nécessaire.", "#ef4444"),
    }
    reco_text, reco_color = reco_map.get(zone_label, ("Consultez votre tableau de bord.", _ICE))

    body = f"""
      <div class="greeting">Bonjour {name},</div>
      <p class="text">Votre analyse financière de <strong style="color:#fff;">{entreprise}</strong> est prête.</p>

      <div class="score-ring">
        <div class="score-number" style="color:{zone_color};">{score}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:-4px;">/100</div>
        <div class="zone-badge" style="background:{zone_color}22;color:{zone_color};
             border:1px solid {zone_color}44;margin-top:10px;">
          {zone_emoji} {zone_label}
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                  border-radius:10px;padding:16px;margin:16px 0;display:flex;
                  align-items:flex-start;gap:12px;">
        <span style="font-size:18px;flex-shrink:0;">💡</span>
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.6);line-height:1.65;">
          {reco_text} Consultez votre tableau de bord pour voir les ratios détaillés,
          les facteurs SHAP et les recommandations personnalisées.
        </p>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="{_APP_URL}{'#analyse-'+analyse_id if analyse_id else ''}" class="btn">
          📊 Voir l'analyse complète →
        </a>
      </div>
    """
    return subject, _base_template(subject, body, f"Score {score}/100 pour {entreprise}")


def _relance_html(name: str, inactive_days: int) -> tuple[str, str]:
    """Template email de relance après inactivité."""
    subject = f"Doctor Smile : un bilan mensuel s'impose 📊"
    body    = f"""
      <div class="greeting">Bonjour {name},</div>
      <p class="text">
        Cela fait <strong style="color:{_GOLD};">{inactive_days} jours</strong> que vous n'avez
        pas analysé vos finances. Or la santé financière d'une entreprise évolue vite.
      </p>

      <div style="background:rgba(255,215,0,0.04);border:1px solid rgba(255,215,0,0.15);
                  border-radius:12px;padding:20px;margin:16px 0;">
        <div style="font-size:12px;font-weight:800;color:{_GOLD};letter-spacing:0.08em;
                    text-transform:uppercase;margin-bottom:10px;">Pourquoi analyser régulièrement ?</div>
        {"".join([
            f'<div style="font-size:12px;color:rgba(255,255,255,0.6);'
            f'padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">'
            f'<span style="color:{_GOLD};margin-right:8px;">→</span>{text}</div>'
            for text in [
                "Détecter les signaux faibles avant qu'ils deviennent critiques",
                "Suivre l'évolution de vos ratios mois après mois",
                "Préparer vos dossiers bancaires en avance",
                "Ajuster votre BFR et votre trésorerie proactivement",
            ]
        ])}
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="{_APP_URL}" class="btn btn-gold">
          📂 Lancer une nouvelle analyse →
        </a>
      </div>

      <p class="text-muted">
        Vous recevez ce rappel car vous êtes inscrit sur Doctor Smile.
        <a href="{_APP_URL}#unsubscribe">Se désabonner des rappels</a>
      </p>
    """
    return subject, _base_template(subject, body, "Votre bilan financier mensuel vous attend")


def _agent_weekly_html(
    name: str, score: int, delta: int, analyses_cnt: int,
    zone_label: str, zone_color: str, zone_emoji: str, summary: str
) -> tuple[str, str]:
    """Template email rapport hebdomadaire Agent IA."""
    subject = f"📊 Rapport Hebdo : Score {score}/100 ({'+' if delta>=0 else ''}{delta})"
    
    delta_html = f'<span style="color:#10b981;">+{delta} pts</span>' if delta > 0 else \
                 f'<span style="color:#ef4444;">{delta} pts</span>' if delta < 0 else \
                 '<span style="color:rgba(255,255,255,0.4);">stable</span>'

    body = f"""
      <div class="greeting">Bonjour {name},</div>
      <p class="text">Voici votre récapitulatif financier de la semaine.</p>

      <div class="stat-row">
        <div class="stat-box">
          <div class="stat-val">{score}</div>
          <div class="stat-lbl">Score Actuel</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">{delta_html}</div>
          <div class="stat-lbl">Évolution</div>
        </div>
        <div class="stat-box">
          <div class="stat-val">{analyses_cnt}</div>
          <div class="stat-lbl">Analyses</div>
        </div>
      </div>

      <div style="text-align:center;margin:10px 0 20px;">
        <div class="zone-badge" style="background:{zone_color}22;color:{zone_color};
             border:1px solid {zone_color}44;">
          {zone_emoji} {zone_label}
        </div>
      </div>

      <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                  border-radius:12px;padding:20px;margin:20px 0;">
        <div style="font-size:12px;font-weight:800;color:{_ICE};letter-spacing:0.08em;
                    text-transform:uppercase;margin-bottom:12px;">Résumé de l'Agent IA</div>
        <div class="text" style="font-style:italic;color:rgba(255,255,255,0.7);">{summary}</div>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="{_APP_URL}" class="btn">
          📊 Ouvrir le Dashboard →
        </a>
      </div>
    """
    return subject, _base_template(subject, body, f"Rapport hebdo : {score}/100")


def _agent_alert_html(name: str, rule: str, metric: str, value: float) -> tuple[str, str]:
    """Template email alerte personnalisée Agent IA."""
    subject = f"⚠️ Alerte Doctor Smile : {rule}"
    body = f"""
      <div class="greeting">Alerte Déclenchée ⚠️</div>
      <p class="text">Bonjour {name}, votre agent IA a détecté un franchissement de seuil sur une de vos règles de gestion.</p>

      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.2);
                  border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
        <div style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;
                    letter-spacing:0.1em;margin-bottom:8px;">Règle</div>
        <div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:16px;">{rule}</div>
        
        <div style="display:inline-block;padding:8px 16px;background:rgba(239,68,68,0.1);
                    border-radius:8px;color:#ef4444;font-family:{_FONT};font-weight:700;">
          {metric} : {value}
        </div>
      </div>

      <p class="text">
        Nous vous recommandons de vérifier vos derniers flux de trésorerie ou bilans 
        pour comprendre l'origine de cette variation.
      </p>

      <div style="text-align:center;margin:24px 0;">
        <a href="{_APP_URL}" class="btn" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.3);color:#ef4444;">
          🔎 Examiner l'alerte →
        </a>
      </div>
    """
    return subject, _base_template(subject, body, f"Alerte : {rule}")


# ════════════════════════════════════════════════════════════════
#  SERVICE D'ENVOI
# ════════════════════════════════════════════════════════════════

def _load_env_file_minimal(env_path: str = ".env") -> None:
    """
    Charge un fichier .env de façon minimale (sans dépendance python-dotenv).

    Objectif: corriger le cas où .env existe mais os.getenv ne le voit pas
    (typiquement quand l'app est lancée sans `dotenv` côté processus).
    """
    try:
        p = os.path.join(os.getcwd(), env_path)
        if not os.path.exists(p):
            return

        for raw_line in open(p, "r", encoding="utf-8"):
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            # support KEY=VALUE
            if "=" not in line:
                continue

            k, v = line.split("=", 1)
            key = k.strip()
            val = v.strip()

            # enlever quotes simples/doubles si présents
            if (len(val) >= 2) and ((val[0] == val[-1]) and val[0] in ("'", '"')):
                val = val[1:-1]

            # Ne pas écraser si déjà défini dans l'environnement process
            if os.getenv(key) is None:
                os.environ[key] = val
    except Exception:
        # on évite de casser le service email si chargement env échoue
        pass


class EmailService:

    def __init__(self):
        # Ne pas figer les clés/provider à l'import.
        # Les variables d'env peuvent changer (ou ne pas être chargées au bon moment).
        self._from_email = _FROM_EMAIL
        self._from_name  = _FROM_NAME

    async def run_diagnostics(self) -> dict:
      """Vérifie la configuration email actuelle et teste la connexion SMTP si nécessaire.

      Retourne un dict contenant l'état des providers et, pour SMTP, un test de login.
      """
      provider = self._get_provider()
      chosen = provider
      # list available providers
      available = []
      if os.getenv("RESEND_API_KEY"):
        available.append("resend")
      if os.getenv("SENDGRID_API_KEY"):
        available.append("sendgrid")
      if os.getenv("MAILTRAP_SMTP_USER") and os.getenv("MAILTRAP_SMTP_PASSWORD"):
        available.append("mailtrap")

      result: dict = {"provider": provider, "chosen_provider": chosen, "available_providers": available, "checks": {}}

      # Résumé des clés présentes
      result["checks"]["resend_key"] = bool(os.getenv("RESEND_API_KEY"))
      result["checks"]["sendgrid_key"] = bool(os.getenv("SENDGRID_API_KEY"))
      result["checks"]["mailtrap_user"] = bool(os.getenv("MAILTRAP_SMTP_USER"))
      result["checks"]["mailtrap_pwd"] = bool(os.getenv("MAILTRAP_SMTP_PASSWORD"))

      # Si provider mailtrap, tester la connexion SMTP
      if provider == "mailtrap":
        host = os.getenv("MAILTRAP_SMTP_HOST", "smtp.mailtrap.io")
        port = int(os.getenv("MAILTRAP_SMTP_PORT", "587"))
        user = (os.getenv("MAILTRAP_SMTP_USER") or "").strip()
        pwd = (os.getenv("MAILTRAP_SMTP_PASSWORD") or "").strip()

        if not user or not pwd:
          result["checks"]["smtp_connect"] = False
          result["checks"]["smtp_error"] = "missing credentials"
        else:
          # Test de connexion SMTP en arrière-plan
          def _sync_smtp_test():
            import smtplib, ssl
            try:
              ctx = ssl.create_default_context()
              with smtplib.SMTP(host, port, timeout=10) as s:
                s.starttls(context=ctx)
                s.login(user, pwd)
                s.noop()
              return {"ok": True}
            except Exception as e:
              return {"ok": False, "error": str(e)}

          import asyncio
          loop = asyncio.get_running_loop()
          smtp_res = await loop.run_in_executor(None, _sync_smtp_test)
          result["checks"]["smtp_connect"] = smtp_res.get("ok", False)
          if not smtp_res.get("ok", False):
            result["checks"]["smtp_error"] = smtp_res.get("error")

      # Pour resend/sendgrid on vérifie la présence des clés uniquement (test API plus poussé optionnel)
      return result

    def _get_provider(self) -> str:
        # 1) Charger/rafraîchir via python-dotenv si dispo
        try:
            from dotenv import load_dotenv  # type: ignore
            load_dotenv(override=False)
        except ModuleNotFoundError:
            pass

        # 2) Fallback sans dépendance : loader minimal .env
        _load_env_file_minimal(".env")

        # 🔥 FORCER BREVO en priorité absolue si la clé existe
        brevo_key = (os.getenv("BREVO_API_KEY") or "").strip()
        if brevo_key and brevo_key.startswith("xkeysib-"):
            return "brevo"

        # Fallback sur Resend
        resend_key = (os.getenv("RESEND_API_KEY") or "").strip()
        if resend_key:
            return "resend"

        # Fallback sur SendGrid
        sendgrid_key = (os.getenv("SENDGRID_API_KEY") or "").strip()
        if sendgrid_key:
            return "sendgrid"

        # Mailtrap SMTP
        mailtrap_user = (os.getenv("MAILTRAP_SMTP_USER") or "").strip()
        mailtrap_pwd  = (os.getenv("MAILTRAP_SMTP_PASSWORD") or "").strip()
        if mailtrap_user and mailtrap_pwd:
            return "mailtrap"

        return "dev_log"

    async def _send(self, to_email: str, subject: str, html: str) -> bool:
        """Dispatche vers le bon provider."""
        if not to_email or "@" not in to_email:
            log.warning("[EmailService] Email invalide : %s", to_email)
            return False

        provider = self._get_provider()
        log.info("[EmailService] provider=%s to=%s subject=%s", provider, to_email, subject[:60])

        if provider == "brevo":
            ok = await self._send_brevo(to_email, subject, html)
            if not ok:
                log.warning("[EmailService] Brevo KO — tentative fallback SMTP")
                ok = await self._send_smtp_fallback(to_email, subject, html)
            return ok
        if provider == "resend":
            return await self._send_resend(to_email, subject, html)
        if provider == "sendgrid":
            return await self._send_sendgrid(to_email, subject, html)
        if provider == "mailtrap":
            return await self._send_mailtrap(to_email, subject, html)

        log.info("[EmailService/dev] Pas de provider configuré — log uniquement. TO=%s | SUBJECT=%s", to_email, subject)
        return True  # mode dev : ne pas bloquer la logique

    # ── Brevo (provider principal) ───────────────────────────────
    async def _send_brevo(self, to_email: str, subject: str, html: str) -> bool:
        """Envoi via Brevo — exécuté dans un thread pour ne pas bloquer la boucle async."""
        if not BREVO_AVAILABLE:
            log.warning("[Brevo] SDK sib_api_v3_sdk non installé")
            return False

        brevo_key = os.getenv("BREVO_API_KEY", "").strip()
        if not brevo_key:
            log.warning("[Brevo] BREVO_API_KEY absent")
            return False

        sender_email = BREVO_SENDER_EMAIL
        sender_name  = BREVO_SENDER_NAME

        def _sync_send():
            try:
                configuration = sib_api_v3_sdk.Configuration()
                configuration.api_key["api-key"] = brevo_key
                api_client   = sib_api_v3_sdk.ApiClient(configuration)
                api_instance = sib_api_v3_sdk.TransactionalEmailsApi(api_client)

                send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                    to=[{"email": to_email, "name": to_email.split("@")[0]}],
                    subject=subject,
                    html_content=html,
                    sender={"email": sender_email, "name": sender_name},
                    reply_to={"email": BREVO_REPLY_TO, "name": "Doctor Smile Support"},
                )
                response = api_instance.send_transac_email(send_smtp_email)
                log.info("[Brevo] ✅ envoyé à %s — message_id: %s", to_email, response.message_id)
                return True
            except ApiException as e:
                log.error("[Brevo] ApiException: status=%s body=%s", e.status, e.body)
                return False
            except Exception as e:
                log.error("[Brevo] Erreur inattendue: %s", e)
                return False

        import asyncio
        try:
            return await asyncio.to_thread(_sync_send)
        except Exception as e:
            log.error("[Brevo] to_thread error: %s", e)
            return False

    # ── SMTP fallback (Gmail/autre) ──────────────────────────────
    async def _send_smtp_fallback(self, to_email: str, subject: str, html: str) -> bool:
        """
        Fallback SMTP si Brevo échoue.
        Utilise les variables SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
        Compatible Gmail (smtp.gmail.com:587) et autres.
        """
        host = os.getenv("SMTP_HOST", "smtp.gmail.com")
        port = int(os.getenv("SMTP_PORT", "587"))
        user = os.getenv("SMTP_USER", "").strip()
        pwd  = os.getenv("SMTP_PASS", "").strip()

        if not user or not pwd:
            log.warning("[SMTP_FALLBACK] SMTP_USER/SMTP_PASS non configurés — pas de fallback")
            return False

        def _sync():
            import smtplib, ssl
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"]    = f"Doctor Smile <{user}>"
            msg["To"]      = to_email
            msg.attach(MIMEText(html, "html", "utf-8"))
            try:
                ctx = ssl.create_default_context()
                with smtplib.SMTP(host, port, timeout=15) as s:
                    s.ehlo()
                    s.starttls(context=ctx)
                    s.login(user, pwd)
                    s.sendmail(user, [to_email], msg.as_string())
                log.info("[SMTP_FALLBACK] ✅ email envoyé à %s via %s:%s", to_email, host, port)
                return True
            except Exception as e:
                log.error("[SMTP_FALLBACK] Erreur: %s", e)
                return False

        import asyncio
        try:
            return await asyncio.to_thread(_sync)
        except Exception as e:
            log.error("[SMTP_FALLBACK] to_thread error: %s", e)
            return False

    # ── Resend ───────────────────────────────────────────────────
    async def _send_resend(self, to_email: str, subject: str, html: str) -> bool:

      # Première tentative : utiliser le client officiel `Resend` si présent
      try:
        from resend import Resend  # type: ignore
        resend_key = os.getenv("RESEND_API_KEY", "").strip()
        if not resend_key:
          log.warning("[Resend] RESEND_API_KEY absent")
          return False

        client = Resend(resend_key)
        from_addr = f"{self._from_name} <{self._from_email}>"

        # Le client officiel attend souvent des listes pour `to`.
        payload = {
          "from": from_addr,
          "to": [to_email],
          "subject": subject,
          "html": html,
        }

        resp = client.emails.send(payload)
        # resp peut être un dict ou un objet; on loggue l'id si présent
        message_id = None
        try:
          if isinstance(resp, dict):
            message_id = resp.get("id")
          else:
            message_id = getattr(resp, "id", None)
        except Exception:
          message_id = None

        log.info("[Resend] ✓ sent id=%s to=%s", message_id, to_email)
        return True

      except ImportError:
        # Fallback vers l'ancienne implémentation (lib différente/legacy)
        log.debug("[Resend] client officiel introuvable, fallback legacy import")
        try:
          import resend
          resend_key = os.getenv("RESEND_API_KEY", "").strip()
          if not resend_key:
            log.warning("[Resend] RESEND_API_KEY absent")
            return False

          resend.api_key = resend_key
          from_addr = f"{self._from_name} <{self._from_email}>"
          params = {
            "from": from_addr,
            "to": to_email,
            "subject": subject,
            "html": html,
          }
          r = resend.Emails.send(params)
          try:
            mid = r.get("id") if isinstance(r, dict) else None
          except Exception:
            mid = None
          log.info("[Resend/legacy] ✓ id=%s to=%s", mid, to_email)
          return True
        except Exception as e:
          log.error("[Resend] Erreur d'envoi (fallback) : %s", e, exc_info=True)
          return False
      except Exception as e:
        log.error("[Resend] Erreur d'envoi : %s", e, exc_info=True)
        return False

    # ── SendGrid ─────────────────────────────────────────────────
    async def _send_sendgrid(self, to_email: str, subject: str, html: str) -> bool:
        try:
            from sendgrid import SendGridAPIClient  # pip install sendgrid
            from sendgrid.helpers.mail import Mail
            sendgrid_key = os.getenv("SENDGRID_API_KEY", "").strip()
            if not sendgrid_key:
                log.warning("[SendGrid] SENDGRID_API_KEY absent au moment de l'envoi")
                return False

            msg = Mail(
                from_email=self._from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html,
            )
            sg = SendGridAPIClient(sendgrid_key)
            resp = sg.send(msg)
            log.info("[SendGrid] ✓ status=%d to=%s", resp.status_code, to_email)
            return resp.status_code in (200, 202)
        except Exception as e:
            log.error("[SendGrid] Erreur : %s", e, exc_info=True)
            return False

    # ── Mailtrap SMTP ─────────────────────────────────────────────
    async def _send_mailtrap(self, to_email: str, subject: str, html: str) -> bool:
        """Envoi via Mailtrap SMTP (dev/test). Utilise les vars MAILTRAP_SMTP_*.

        Variables attendues dans l'environnement:
          - MAILTRAP_SMTP_HOST (par défaut smtp.mailtrap.io)
          - MAILTRAP_SMTP_PORT (par défaut 587)
          - MAILTRAP_SMTP_USER
          - MAILTRAP_SMTP_PASSWORD
        """
        try:
            host = os.getenv("MAILTRAP_SMTP_HOST", "smtp.mailtrap.io")
            port = int(os.getenv("MAILTRAP_SMTP_PORT", "587"))
            user = (os.getenv("MAILTRAP_SMTP_USER") or "").strip()
            pwd = (os.getenv("MAILTRAP_SMTP_PASSWORD") or "").strip()

            if not user or not pwd:
                log.warning("[Mailtrap] Credentials SMTP absents")
                return False

            # Construction du message MIME
            from email.message import EmailMessage
            msg = EmailMessage()
            msg["From"] = f"{self._from_name} <{self._from_email}>"
            msg["To"] = to_email
            msg["Subject"] = subject
            msg.set_content("This is an HTML email. Please view in an HTML-capable client.")
            msg.add_alternative(html, subtype="html")

            # Envoi SMTP bloquant dans un thread pour ne pas bloquer l'event-loop
            def _sync_send():
                import smtplib, ssl
                context = ssl.create_default_context()
                with smtplib.SMTP(host, port, timeout=20) as s:
                    s.starttls(context=context)
                    s.login(user, pwd)
                    s.send_message(msg)

            import asyncio
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, _sync_send)

            log.info("[Mailtrap] ✓ message envoyé à=%s via %s:%s user=%s...", to_email, host, port, user[:6])
            return True

        except Exception as e:
            log.error("[Mailtrap] Erreur d'envoi : %s", e, exc_info=True)
            return False


    async def send_report_pdf(self, email: str, name: str, entreprise: str, pdf_bytes: bytes) -> bool:
        """Envoie le rapport PDF généré par email."""
        subject = f"📊 Votre Rapport d'Analyse : {entreprise}"
        body_html = f"""
          <div class="greeting">Bonjour {name},</div>
          <p class="text">
            Veuillez trouver ci-joint votre rapport d'analyse financière détaillé pour l'entreprise <strong>{entreprise}</strong>.
          </p>
          <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                      border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <div style="font-size:18px;margin-bottom:8px;">📄</div>
            <div style="font-size:13px;font-weight:700;color:#fff;">Rapport PDF disponible</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">Généré avec précision par Doctor Smile IA</div>
          </div>
          <p class="text">
            Ce document contient vos ratios clés, votre score de santé et nos recommandations stratégiques.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="{_APP_URL}" class="btn">
              📊 Retourner au Dashboard →
            </a>
          </div>
        """
        html = _base_template(subject, body_html, f"Rapport PDF — {entreprise}")
        
        provider = self._get_provider()
        if provider == "brevo":
            # Brevo ne supporte pas encore les pièces jointes dans cette implémentation
            # À implémenter avec l'API avancée si nécessaire
            return await self._send_brevo(email, subject, html)
        if provider == "resend":
            return await self._send_resend_with_attachment(email, subject, html, pdf_bytes, f"Rapport_{entreprise}.pdf")
        
        # Fallback sans pièce jointe si provider non compatible (pour l'instant)
        return await self._send(email, subject, html)

    async def _send_resend_with_attachment(self, to_email: str, subject: str, html: str, pdf_bytes: bytes, filename: str) -> bool:
        try:
            import resend
            import base64
            resend_key = os.getenv("RESEND_API_KEY", "").strip()
            if not resend_key: return False
            resend.api_key = resend_key
            
            params = {
                "from": f"{self._from_name} <{self._from_email}>",
                "to": to_email,
                "subject": subject,
                "html": html,
                "attachments": [
                    {
                        "filename": filename,
                        "content": list(pdf_bytes) # Resend attend parfois un format spécifique
                    }
                ]
            }
            resend.Emails.send(params)
            return True
        except Exception as e:
            log.error(f"[Resend/Attachment] Erreur: {e}")
            return False

    async def send_welcome(self, email: str, name: str) -> bool:
        """Envoie l'email de bienvenue."""
        subject, html = _welcome_html(name)
        # Priorité absolue à Brevo
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_analyse_ready(
        self,
        email:      str,
        name:       str,
        entreprise: str,
        score:      int,
        zone_label: str,
        zone_color: str,
        zone_emoji: str,
        analyse_id: str = "",
    ) -> bool:
        subject, html = _analyse_ready_html(
            name, entreprise, score, zone_label, zone_color, zone_emoji, analyse_id
        )
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_relance(self, email: str, name: str, inactive_days: int = 7) -> bool:
        subject, html = _relance_html(name, inactive_days)
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_agent_weekly(
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
    ) -> bool:
        subject, html = _agent_weekly_html(
            name, score, delta, analyses_cnt, zone_label, zone_color, zone_emoji, summary
        )
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_agent_alert(self, email: str, name: str, rule: str, metric: str, value: float) -> bool:
        subject, html = _agent_alert_html(name, rule, metric, value)
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_cosign_request(
        self,
        to_email: str,
        expert_name: str,
        entreprise: str,
        score: int,
        zone: str,
        message: str,
    ) -> bool:
        subject = f"[Co-signature] Nouvelle demande — {entreprise}"
        body_html = f"""
          <div class="greeting">Bonjour {expert_name},</div>

          <p class="text">
            Une nouvelle demande de co-signature vient d'arriver :
          </p>

          <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                      border-radius:12px;padding:20px;margin:20px 0;">
            <div style="font-size:12px;font-weight:800;color:{_ICE};letter-spacing:0.08em;
                        text-transform:uppercase;margin-bottom:10px;">
              Détails de la demande
            </div>

            <ul style="margin:0; padding-left:18px; color:{_TEXT}; line-height:1.7;">
              <li>Entreprise : <strong style="color:#fff;">{entreprise}</strong></li>
              <li>Score ML : <strong style="color:#fff;">{score}/100</strong></li>
              <li>Zone : <strong style="color:#fff;">{zone}</strong></li>
            </ul>
          </div>

          <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
                      border-radius:12px;padding:16px;margin:16px 0;">
            <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-bottom:8px;">Message</div>
            <div style="font-size:14px; color:#fff; line-height:1.7;">{message}</div>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="{os.getenv('APP_URL','https://doctorsmile-d8d8f.web.app')}/dashboard.html" class="btn">
              Voir la demande dans Doctor Smile →
            </a>
          </div>
        """
        html = _base_template(subject, body_html, f"Co-signature — {entreprise}")
        if self._get_provider() == "brevo":
            return await self._send_brevo(to_email, subject, html)
        return await self._send(to_email, subject, html)

    async def send_payment_confirmation(self, email: str, name: str, plan: str, amount: int) -> bool:
        """Envoie un email de confirmation de paiement."""
        plan_display = "Premium" if plan == "premium" else "Extra"
        subject = f"✅ Paiement confirmé — Doctor Smile {plan_display}"
        body_html = f"""
          <div class="greeting">Bonjour {name},</div>
          <p class="text">
            Nous vous confirmons que votre paiement pour le plan <strong>{plan_display}</strong> a bien été reçu.
          </p>
          
          <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                      border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">💳</div>
            <div style="font-size:16px;font-weight:700;color:#fff;">{amount:,} FCFA</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:4px;">Montant total</div>
          </div>
          
          <p class="text">
            Vous avez désormais accès à toutes les fonctionnalités de votre abonnement.
            Connectez-vous à votre espace pour profiter de vos analyses illimitées et de vos rapports PDF.
          </p>
          
          <div style="text-align:center;margin:24px 0;">
            <a href="{_APP_URL}" class="btn">
              🚀 Accéder à mon espace →
            </a>
          </div>
          
          <p class="text-muted">
            Besoin d'aide ? Contactez-nous à <a href="mailto:support@doctorsmile.io">support@doctorsmile.io</a>
          </p>
        """
        html = _base_template(subject, body_html, f"Paiement confirmé — {plan_display}")
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)

    async def send_otp(self, email: str, name: str, otp_code: str) -> bool:
        """Envoie un code OTP pour la double authentification."""
        log.info("="*60)
        log.info(f"[EmailService] 📤 PREPARATION EMAIL OTP")
        log.info(f"[EmailService] To: {email}")
        log.info(f"[EmailService] Name: {name}")
        log.info(f"[EmailService] Provider: {self._get_provider()}")
        
        subject = "🔐 Votre code de vérification Doctor Smile"
        body_html = f"""
          <div class="greeting">Bonjour {name},</div>
          <p class="text">
            Voici votre code de vérification à usage unique :
          </p>
          <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.12);
                      border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
            <div style="font-size:36px;font-weight:800;letter-spacing:8px;color:{_ICE};">
              {otp_code}
            </div>
            <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:8px;">
              Ce code expire dans 5 minutes
            </div>
          </div>
          <p class="text-muted">
            Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
        """
        html = _base_template(subject, body_html, "Votre code de vérification")
        
        log.info(f"[EmailService] 📤 Envoi en cours...")
        if self._get_provider() == "brevo":
            result = await self._send_brevo(email, subject, html)
        else:
            result = await self._send(email, subject, html)
            
        if result:
            log.info(f"[EmailService] ✅ EMAIL OTP ENVOYÉ AVEC SUCCÈS !")
        else:
            log.error(f"[EmailService] ❌ ÉCHEC DE L'ENVOI DE L'EMAIL OTP")
        log.info("="*60)
        return result

    async def send_reset_password(
        self,
        email: str,
        name: str,
        reset_url: str,
        expires_h: int = 1,
    ) -> bool:
        """Envoie l'email de réinitialisation de mot de passe via Brevo (HTML direct)."""
        subject = "🔑 Réinitialisation de votre mot de passe Doctor Smile"
        body_html = f"""
          <div class="greeting">Bonjour {name},</div>

          <p class="text">
            Vous avez demandé la réinitialisation de votre mot de passe Doctor Smile.
            Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="{reset_url}" class="btn" style="
              background:linear-gradient(135deg,rgba(139,127,240,0.2) 0%,rgba(59,130,246,0.15) 100%);
              border:1px solid rgba(139,127,240,0.4);color:{_ICE};
              padding:16px 36px;border-radius:14px;font-size:15px;font-weight:700;
              display:inline-block;letter-spacing:0.02em;
              box-shadow:0 8px 24px -4px rgba(139,127,240,0.2);
            ">
              🔐 Réinitialiser mon mot de passe
            </a>
          </div>

          <div style="background:rgba(139,127,240,0.04);border:1px solid rgba(139,127,240,0.1);
                      border-radius:12px;padding:16px;margin:16px 0;">
            <div style="font-size:11px;font-weight:700;color:{_ICE};letter-spacing:0.08em;
                        text-transform:uppercase;margin-bottom:8px;">⏱ Informations importantes</div>
            <ul style="margin:0;padding-left:18px;color:rgba(255,255,255,0.55);font-size:12px;line-height:1.7;">
              <li>Ce lien est valable pendant <strong style="color:#fff;">{expires_h} heure{"s" if expires_h > 1 else ""}</strong></li>
              <li>Il ne peut être utilisé qu'une seule fois</li>
              <li>Si vous n'avez pas fait cette demande, ignorez cet email</li>
            </ul>
          </div>

          <p class="text-muted">
            Pour des raisons de sécurité, si vous n'avez pas demandé cette réinitialisation,
            votre mot de passe reste inchangé. Contactez-nous si vous soupçonnez une activité suspecte :
            <a href="mailto:support@doctorsmile.io">support@doctorsmile.io</a>
          </p>
        """
        html = _base_template(subject, body_html, "Réinitialisez votre mot de passe Doctor Smile")
        if self._get_provider() == "brevo":
            return await self._send_brevo(email, subject, html)
        return await self._send(email, subject, html)


# ── Singleton ─────────────────────────────────────────────────────
# Fournisseur actif : Brevo (BREVO_API_KEY dans .env)
# Fallback : Resend, SendGrid, Mailtrap SMTP
email_service = EmailService()
