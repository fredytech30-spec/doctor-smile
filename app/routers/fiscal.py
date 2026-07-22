"""
ROUTER — fiscal.py
DOCTOR SMILE · Calendrier Fiscal DGI Cameroun
GET /fiscal/calendar      → Prochaines échéances fiscales
GET /fiscal/alerts        → Alertes actives (< 7 jours)
"""
from __future__ import annotations
import logging
from datetime import date, datetime, timedelta
from typing import Any
from fastapi import APIRouter, Depends
from app.middleware.firebase_verify import verify_token

log = logging.getLogger("doctorsmile.fiscal")
router = APIRouter(prefix="/fiscal", tags=["Calendrier Fiscal DGI"])


def _get_fiscal_calendar(year: int | None = None) -> list[dict[str, Any]]:
    """Retourne le calendrier fiscal DGI Cameroun pour l'année en cours."""
    y = year or date.today().year
    events = []

    # TVA mensuelle — 15 de chaque mois
    for month in range(1, 13):
        try:
            d = date(y, month, 15)
        except ValueError:
            d = date(y, month, 14)
        events.append({
            "id": f"tva-{y}-{month:02d}",
            "titre": f"Déclaration et paiement TVA — {d.strftime('%B %Y')}",
            "date": d.isoformat(),
            "type": "tva",
            "gravite": "haute",
            "penalite": "25% du montant dû + intérêts de retard (1.5%/mois)",
            "description": "Déclaration mensuelle de TVA à déposer à la DGI avec paiement simultané.",
            "action": "Préparer le journal de TVA collectée vs déductible et calculer le solde net."
        })

    # DSF — 15 mars
    events.append({
        "id": f"dsf-{y}",
        "titre": "Déclaration Statistique et Fiscale (DSF) annuelle",
        "date": date(y, 3, 15).isoformat(),
        "type": "dsf",
        "gravite": "critique",
        "penalite": "500 000 à 5 000 000 FCFA d'amende selon le chiffre d'affaires",
        "description": "Dépôt obligatoire des états financiers annuels (bilan, compte de résultat, TAFIRE) à la DGI.",
        "action": "Finaliser la clôture comptable et faire certifier les états par un expert ONECCA."
    })

    # Acompte IS — 15 avril
    events.append({
        "id": f"is-acompte-{y}",
        "titre": "Acompte Impôt sur les Sociétés (IS)",
        "date": date(y, 4, 15).isoformat(),
        "type": "is",
        "gravite": "haute",
        "penalite": "25% de majoration + 1.5%/mois de retard",
        "description": "Versement du premier acompte de l'IS basé sur le bénéfice de l'exercice précédent.",
        "action": "Calculer 1/3 de l'IS de l'exercice N-1 et virer à la DGI avant le 15 avril."
    })

    # 2ème acompte IS — 15 juin
    events.append({
        "id": f"is-acompte2-{y}",
        "titre": "2ème Acompte IS",
        "date": date(y, 6, 15).isoformat(),
        "type": "is",
        "gravite": "haute",
        "penalite": "25% de majoration",
        "description": "Deuxième versement d'acompte IS.",
        "action": "Verser le 2ème tiers de l'IS N-1 avant le 15 juin."
    })

    # 3ème acompte IS — 15 septembre  
    events.append({
        "id": f"is-acompte3-{y}",
        "titre": "3ème Acompte IS",
        "date": date(y, 9, 15).isoformat(),
        "type": "is",
        "gravite": "haute",
        "penalite": "25% de majoration",
        "description": "Troisième versement d'acompte IS.",
        "action": "Verser le dernier tiers de l'IS N-1 avant le 15 septembre."
    })

    # Patente annuelle — 31 mars
    events.append({
        "id": f"patente-{y}",
        "titre": "Déclaration et paiement de la Patente",
        "date": date(y, 3, 31).isoformat(),
        "type": "patente",
        "gravite": "moyenne",
        "penalite": "Majoration de 100% + poursuites",
        "description": "Taxe professionnelle annuelle due par toute entreprise commerciale ou artisanale.",
        "action": "Calculer la patente selon le chiffre d'affaires N-1 et payer à la recette des impôts."
    })

    # Trier par date
    events.sort(key=lambda e: e["date"])
    return events


def _get_days_until(date_str: str) -> int:
    """Nombre de jours jusqu'à une échéance."""
    try:
        target = date.fromisoformat(date_str)
        return (target - date.today()).days
    except Exception:
        return 999


@router.get("/calendar")
async def fiscal_calendar(year: int | None = None):
    """Retourne le calendrier fiscal DGI complet pour l'année."""
    events = _get_fiscal_calendar(year)
    today = date.today().isoformat()

    enriched = []
    for ev in events:
        days_left = _get_days_until(ev["date"])
        enriched.append({
            **ev,
            "jours_restants": days_left,
            "statut": (
                "passee" if days_left < 0 else
                "urgente" if days_left <= 3 else
                "proche" if days_left <= 7 else
                "a_venir"
            )
        })

    return {
        "date_consultation": today,
        "annee": year or date.today().year,
        "total_echeances": len(enriched),
        "echeances": enriched
    }


@router.get("/alerts")
async def fiscal_alerts():
    """Retourne uniquement les alertes actives (< 7 jours) et les 3 prochaines."""
    events = _get_fiscal_calendar()
    today = date.today()

    upcoming = []
    urgent = []

    for ev in events:
        days_left = _get_days_until(ev["date"])
        if days_left < 0:
            continue  # passée
        ev_enriched = {**ev, "jours_restants": days_left}
        if days_left <= 7:
            urgent.append(ev_enriched)
        elif len(upcoming) < 3:
            upcoming.append(ev_enriched)

    prochaine = urgent[0] if urgent else (upcoming[0] if upcoming else None)

    return {
        "alertes_urgentes": urgent,
        "prochaines_echeances": upcoming,
        "prochaine_echeance": prochaine,
        "nb_alertes": len(urgent)
    }
