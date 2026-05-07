"""
══════════════════════════════════════════════════════════════════
  app/services/email_service.py — Doctor Smile · Email Service
══════════════════════════════════════════════════════════════════

Fournisseur principal : Resend (resend.com)
  pip install resend
  Variable d'env : RESEND_API_KEY

Fournisseur de secours : SendGrid
  pip install sendgrid
  Variable d'env : SENDGRID_API_KEY

Si aucune clé n'est fournie → mode dev (log uniquement, pas d'envoi).

Expéditeur par défaut : noreply@doctorsmile.io
  → Configurer le domaine dans le dashboard Resend/SendGrid

Templates HTML inline (pas de fichiers externes requis).
"""

from __future__ import annotations

import logging
import os
from typing import Optional

log = logging.getLogger("doctorsmile.email_service")

# ── Couleurs & branding Doctor Smile ─────────────────────────────
_BG        = "#02040B"
_SURFACE   = "#070B14"
_ICE       = "#7DD3FC"
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
    """Template de base commun à tous les emails Doctor Smile."""
    return f"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{title}</title>
  <style>
    body {{ margin:0; padding:0; background:{_BG}; font-family:{_FONT}; }}
    a {{ color:{_ICE}; text-decoration:none; }}
    .container {{ max-width:580px; margin:0 auto; padding:20px 0; }}
    .card {{ background:{_SURFACE}; border:1px solid rgba(125,211,252,0.12);
             border-radius:16px; overflow:hidden; margin:16px 0; }}
    .header {{ background:linear-gradient(135deg,#0A1628 0%,#07111F 100%);
               padding:32px 40px 28px; border-bottom:1px solid rgba(125,211,252,0.1); }}
    .logo {{ font-family:{_FONT}; font-size:22px; font-weight:900;
             color:#fff; letter-spacing:-0.03em; }}
    .logo span {{ color:{_ICE}; }}
    .body {{ padding:32px 40px; }}
    .greeting {{ font-size:18px; font-weight:700; color:#fff; margin-bottom:8px; }}
    .text {{ font-size:14px; color:{_TEXT}; line-height:1.7; margin-bottom:16px; }}
    .text-muted {{ font-size:12px; color:rgba(255,255,255,0.4); line-height:1.6; }}
    .btn {{ display:inline-block; padding:14px 28px; border-radius:10px;
            background:rgba(125,211,252,0.1); border:1px solid rgba(125,211,252,0.3);
            color:{_ICE}; font-size:13px; font-weight:700;
            letter-spacing:0.04em; text-decoration:none; margin:8px 0; }}
    .btn-gold {{ background:rgba(255,215,0,0.1); border-color:rgba(255,215,0,0.3); color:{_GOLD}; }}
    .divider {{ height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }}
    .footer {{ padding:20px 40px; text-align:center; }}
    .footer p {{ font-size:11px; color:rgba(255,255,255,0.2); line-height:1.6; margin:4px 0; }}
    .score-ring {{ text-align:center; padding:20px 0; }}
    .score-number {{ font-size:56px; font-weight:900; letter-spacing:-0.04em; }}
    .zone-badge {{ display:inline-block; padding:4px 14px; border-radius:100px;
                   font-size:11px; font-weight:800; letter-spacing:0.1em;
                   text-transform:uppercase; margin-top:6px; }}
    .stat-row {{ display:flex; gap:12px; margin:16px 0; }}
    .stat-box {{ flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
                 border-radius:10px; padding:14px; text-align:center; }}
    .stat-val {{ font-size:20px; font-weight:800; color:#fff; }}
    .stat-lbl {{ font-size:9px; color:rgba(255,255,255,0.35); letter-spacing:0.06em;
                 text-transform:uppercase; margin-top:4px; }}
  </style>
</head>
<body>
  {'<div style="display:none;max-height:0;overflow:hidden;">'+preheader+'</div>' if preheader else ''}
  <div class="container">
    <div class="card">
      <!-- HEADER -->
      <div class="header">
        <div class="logo">Doctor<span>Smile</span></div>
        <div style="font-size:11px;color:rgba(125,211,252,0.5);margin-top:4px;
                    letter-spacing:0.08em;">ANALYSE FINANCIÈRE INTELLIGENTE</div>
      </div>
      <!-- BODY -->
      <div class="body">
        {body_html}
      </div>
      <!-- FOOTER -->
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

      <div style="background:rgba(125,211,252,0.04);border:1px solid rgba(125,211,252,0.12);
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

      <div style="background:rgba(125,211,252,0.04);border:1px solid rgba(125,211,252,0.12);
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

class EmailService:

    def __init__(self):
        self._resend_key    = os.getenv("RESEND_API_KEY", "")
        self._sendgrid_key  = os.getenv("SENDGRID_API_KEY", "")
        self._from_email    = _FROM_EMAIL
        self._from_name     = _FROM_NAME

        if self._resend_key:
            self.provider_name = "resend"
            log.info("[EmailService] Fournisseur : Resend ✓")
        elif self._sendgrid_key:
            self.provider_name = "sendgrid"
            log.info("[EmailService] Fournisseur : SendGrid ✓")
        else:
            self.provider_name = "dev_log"
            log.warning("[EmailService] Aucune clé API — mode dev (log uniquement). "
                        "Définir RESEND_API_KEY ou SENDGRID_API_KEY dans .env")

    # ── Dispatcher principal ──────────────────────────────────────
    async def _send(self, to_email: str, subject: str, html: str) -> bool:
        if self.provider_name == "resend":
            return await self._send_resend(to_email, subject, html)
        elif self.provider_name == "sendgrid":
            return await self._send_sendgrid(to_email, subject, html)
        else:
            # Mode dev : log uniquement
            log.info("[EmailService/dev] TO=%s | SUBJECT=%s", to_email, subject)
            return True   # Simuler succès en dev

    # ── Resend ───────────────────────────────────────────────────
    async def _send_resend(self, to_email: str, subject: str, html: str) -> bool:
        try:
            import resend  # pip install resend
            resend.api_key = self._resend_key
            resp = resend.Emails.send({
                "from": f"{self._from_name} <{self._from_email}>",
                "to": [to_email],
                "subject": subject,
                "html": html,
            })
            log.info("[Resend] ✓ id=%s to=%s", resp.get("id"), to_email)
            return True
        except Exception as e:
            log.error("[Resend] Erreur : %s", e)
            return False

    # ── SendGrid ─────────────────────────────────────────────────
    async def _send_sendgrid(self, to_email: str, subject: str, html: str) -> bool:
        try:
            from sendgrid import SendGridAPIClient  # pip install sendgrid
            from sendgrid.helpers.mail import Mail
            msg    = Mail(
                from_email = self._from_email,
                to_emails  = to_email,
                subject    = subject,
                html_content = html,
            )
            sg   = SendGridAPIClient(self._sendgrid_key)
            resp = sg.send(msg)
            log.info("[SendGrid] ✓ status=%d to=%s", resp.status_code, to_email)
            return resp.status_code in (200, 202)
        except Exception as e:
            log.error("[SendGrid] Erreur : %s", e)
            return False

    # ── API publique ──────────────────────────────────────────────

    async def send_welcome(self, email: str, name: str) -> bool:
        subject, html = _welcome_html(name)
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
        return await self._send(email, subject, html)

    async def send_relance(self, email: str, name: str, inactive_days: int = 7) -> bool:
        subject, html = _relance_html(name, inactive_days)
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
        return await self._send(email, subject, html)

    async def send_agent_alert(self, email: str, name: str, rule: str, metric: str, value: float) -> bool:
        subject, html = _agent_alert_html(name, rule, metric, value)
        return await self._send(email, subject, html)


# ── Singleton ─────────────────────────────────────────────────────
email_service = EmailService()