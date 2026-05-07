"""
==========================================
ROUTER — credit_score.py
DOCTOR SMILE Backend v2.0 · Phase 2
==========================================

Routes :
  POST /credit/score          → Calcul du score de crédit bankable
  POST /credit/generate-report → Génère le rapport PDF du dossier de crédit
  GET  /credit/banks          → Liste des banques et leurs critères (BICEC, Afriland…)
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel

log = logging.getLogger("doctorsmile.credit")

router = APIRouter(prefix="/credit", tags=["Credit Score"])

# ════════════════════════════════════════════════════════════════
#  RÉFÉRENTIEL BANQUES ZONE CEMAC / UEMOA
# ════════════════════════════════════════════════════════════════

BANKS = [
    {
        "code":    "BICEC",
        "name":    "Banque Internationale du Cameroun pour l'Épargne et le Crédit",
        "country": "Cameroun",
        "logo":    "🏦",
        "min_score": 45,
        "ratios_required": ["current_ratio","debt_equity","solvabilite","roa","net_margin"],
        "notes":   "COBAC — exige taux solvabilité ≥ 20% et couverture intérêts ≥ 1.5x",
    },
    {
        "code":    "AFRILAND",
        "name":    "Afriland First Bank",
        "country": "Cameroun",
        "logo":    "🏦",
        "min_score": 40,
        "ratios_required": ["current_ratio","debt_equity","roa","net_margin","rotation_actifs"],
        "notes":   "Focus PME africaines. Accepte garanties réelles en lieu de score.",
    },
    {
        "code":    "SGBC",
        "name":    "Société Générale Cameroun",
        "country": "Cameroun",
        "logo":    "🏦",
        "min_score": 55,
        "ratios_required": ["current_ratio","quick_ratio","debt_equity","solvabilite","roa","roe","net_margin","couverture_interets"],
        "notes":   "Critères Société Générale Groupe — scoring interne propriétaire.",
    },
    {
        "code":    "ECOBANK",
        "name":    "Ecobank Cameroun",
        "country": "Cameroun",
        "logo":    "🏦",
        "min_score": 45,
        "ratios_required": ["current_ratio","debt_equity","roa","net_margin"],
        "notes":   "Réseau panafricain. Critères harmonisés UEMOA/CEMAC.",
    },
    {
        "code":    "UBA",
        "name":    "United Bank for Africa",
        "country": "Multinational",
        "logo":    "🏦",
        "min_score": 42,
        "ratios_required": ["current_ratio","debt_equity","roa","net_margin"],
        "notes":   "Présent en 20 pays africains. Financement PME/TPE.",
    },
    {
        "code":    "BNP",
        "name":    "BNP Paribas / CIB",
        "country": "France/International",
        "logo":    "🏦",
        "min_score": 65,
        "ratios_required": ["current_ratio","quick_ratio","debt_equity","solvabilite","roa","roe","net_margin","couverture_interets","rotation_actifs"],
        "notes":   "Critères Bâle III. Exige audit externe et états financiers certifiés.",
    },
]

# Pondérations COBAC / BEAC (zone CEMAC)
BANK_RATIO_WEIGHTS: dict[str, dict] = {
    "current_ratio":       {"weight":15, "threshold":1.2, "inverse":False, "unit":""},
    "quick_ratio":         {"weight":8,  "threshold":0.9, "inverse":False, "unit":""},
    "debt_equity":         {"weight":22, "threshold":2.0, "inverse":True,  "unit":""},
    "solvabilite":         {"weight":20, "threshold":25,  "inverse":False, "unit":"%"},
    "roa":                 {"weight":12, "threshold":3.0, "inverse":False, "unit":"%"},
    "roe":                 {"weight":5,  "threshold":8.0, "inverse":False, "unit":"%"},
    "net_margin":          {"weight":8,  "threshold":3.0, "inverse":False, "unit":"%"},
    "couverture_interets": {"weight":8,  "threshold":2.0, "inverse":False, "unit":"x"},
    "rotation_actifs":     {"weight":2,  "threshold":0.8, "inverse":False, "unit":""},
}

RATING_BANDS = [
    {"min":85, "label":"AAA", "desc":"Excellent — Financement très probable",            "color":"#10b981"},
    {"min":70, "label":"AA",  "desc":"Très bon — Financement probable",                   "color":"#2DD4BF"},
    {"min":55, "label":"A",   "desc":"Bon — Favorable sous conditions standards",         "color":"#7DD3FC"},
    {"min":40, "label":"BBB", "desc":"Satisfaisant — Garanties supplémentaires requises", "color":"#f59e0b"},
    {"min":25, "label":"BB",  "desc":"Fragile — Restructuration conseillée avant prêt",   "color":"#f97316"},
    {"min":0,  "label":"B",   "desc":"Risqué — Refus probable sans plan de redressement", "color":"#ef4444"},
]

# ════════════════════════════════════════════════════════════════
#  SCHEMAS
# ════════════════════════════════════════════════════════════════

class CreditScoreRequest(BaseModel):
    analyse_id: str = ""
    ratios:     list[dict[str, Any]] = []
    score_ml:   int = 0
    entreprise: str = ""


class ReportRequest(BaseModel):
    analyse_id: str = ""
    entreprise: str = ""
    score:      int = 0
    band:       str = "BBB"
    ratios:     list[dict[str, Any]] = []


# ════════════════════════════════════════════════════════════════
#  CALCUL DU SCORE DE CRÉDIT
# ════════════════════════════════════════════════════════════════

def _compute_credit_score(ratios: list[dict]) -> dict:
    """
    Calcule un score de crédit pondéré sur 100 à partir des ratios.
    Retourne le score, la notation (AAA→B), le détail par ratio et
    la liste des banques compatibles.
    """
    ratio_map: dict[str, float] = {}
    for r in ratios:
        name = (r.get("name") or "").lower()
        val  = r.get("value")
        if val is None:
            continue
        for key in BANK_RATIO_WEIGHTS:
            keywords = {
                "current_ratio":        ["liquidit"],
                "quick_ratio":          ["immédia", "rapide"],
                "debt_equity":          ["endett"],
                "solvabilite":          ["solvab"],
                "roa":                  ["roa", "rentab actif"],
                "roe":                  ["roe", "rentab cap"],
                "net_margin":           ["marge net"],
                "couverture_interets":  ["couvert"],
                "rotation_actifs":      ["rotation"],
            }
            if any(kw in name for kw in keywords.get(key, [key])):
                ratio_map[key] = float(val)

    total_score  = 0.0
    total_weight = 0.0
    details      = []

    for key, cfg in BANK_RATIO_WEIGHTS.items():
        val = ratio_map.get(key)
        if val is None:
            details.append({**cfg, "key": key, "value": None, "pct": 0, "pts": 0})
            continue

        if cfg["inverse"]:
            pct = max(0, min(100, (1 - val / (cfg["threshold"] * 2.5)) * 100))
        else:
            pct = max(0, min(100, (val / cfg["threshold"]) * 80))

        pts           = (pct / 100) * cfg["weight"]
        total_score  += pts
        total_weight += cfg["weight"]

        details.append({
            **cfg,
            "key":   key,
            "value": round(val, 3),
            "pct":   round(pct),
            "pts":   round(pts, 1),
        })

    credit_score = round((total_score / total_weight) * 100) if total_weight > 0 else 0
    band = next((b for b in RATING_BANDS if credit_score >= b["min"]), RATING_BANDS[-1])

    # Banques compatibles avec ce score
    eligible_banks = [b for b in BANKS if credit_score >= b["min_score"]]

    # Points d'amélioration prioritaires
    improvements = sorted(
        [d for d in details if d["value"] is not None and d["pct"] < 60],
        key=lambda d: d["weight"],
        reverse=True,
    )[:3]

    return {
        "credit_score": credit_score,
        "band":         band,
        "details":      details,
        "eligible_banks":    [b["code"] for b in eligible_banks],
        "banks_count":       len(eligible_banks),
        "improvements":      improvements,
    }


# ════════════════════════════════════════════════════════════════
#  ROUTES
# ════════════════════════════════════════════════════════════════

@router.get("/banks")
async def get_banks():
    """Liste des banques et leurs critères d'éligibilité."""
    return {"status": "ok", "banks": BANKS, "rating_bands": RATING_BANDS}


@router.post("/score")
async def compute_credit(payload: CreditScoreRequest, request: Request):
    """
    Calcule le score de crédit bankable d'une entreprise.
    Les ratios peuvent être passés directement ou chargés via analyse_id.
    """
    ratios = payload.ratios

    # Charger depuis Firestore si analyse_id fourni
    if payload.analyse_id and not ratios:
        try:
            from app.services.firebase_service import firebase_service
            if firebase_service.available:
                snap = firebase_service.db.collection("analyses") \
                    .document(payload.analyse_id).get()
                if snap.exists:
                    data   = snap.to_dict()
                    ratios = data.get("ratios") or []
                    if not payload.entreprise:
                        payload.entreprise = data.get("entreprise", "")
        except Exception as e:
            log.warning("[Credit] Firestore load: %s", e)

    if not ratios:
        return {"status": "error", "message": "Aucun ratio fourni"}

    result = _compute_credit_score(ratios)

    # Sauvegarder dans Firestore
    if payload.analyse_id:
        try:
            from app.services.firebase_service import firebase_service
            if firebase_service.available:
                firebase_service.db.collection("credit_scores").add({
                    "analyseId":   payload.analyse_id,
                    "entreprise":  payload.entreprise,
                    "creditScore": result["credit_score"],
                    "band":        result["band"]["label"],
                    "eligibleBanks": result["eligible_banks"],
                    "createdAt":   datetime.now(timezone.utc),
                })
        except Exception as e:
            log.warning("[Credit] Save failed: %s", e)

    return {
        "status":    "ok",
        "entreprise": payload.entreprise,
        **result,
    }


@router.post("/generate-report")
async def generate_report(payload: ReportRequest):
    """
    Génère un rapport PDF du dossier de crédit.
    Retourne une URL de téléchargement.
    En mode dev : retourne un lien vers la page print.
    """
    # En production : générer avec WeasyPrint ou Puppeteer
    # Pour l'instant, on retourne l'URL de la vue dashboard en mode print
    app_url = os.getenv("APP_URL", "https://doctorsmile-d8d8f.web.app")
    report_data = {
        "status":      "ok",
        "entreprise":  payload.entreprise,
        "score":       payload.score,
        "band":        payload.band,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "url":         None,  # À implémenter avec WeasyPrint/Puppeteer
        "note":        "Utilisez le bouton Imprimer du dashboard pour générer le PDF",
        "print_url":   f"{app_url}/dashboard.html#credit",
    }

    # Tentative de sauvegarde Firestore
    if payload.analyse_id:
        try:
            from app.services.firebase_service import firebase_service
            if firebase_service.available:
                ref = firebase_service.db.collection("credit_reports").add({
                    "analyseId":  payload.analyse_id,
                    "entreprise": payload.entreprise,
                    "score":      payload.score,
                    "band":       payload.band,
                    "createdAt":  datetime.now(timezone.utc),
                })
                log.info("[Credit] Rapport sauvegardé: %s", ref[1].id)
        except Exception as e:
            log.warning("[Credit] Report save: %s", e)

    return report_data
