"""
==========================================
ROUTER — forecasting.py
DOCTOR SMILE Backend v2.0 · Phase 2
==========================================

Routes :
  POST /forecasting/cash-flow    → Prévision trésorerie 12 mois (3 scénarios)
  GET  /forecasting/{analyse_id} → Récupérer une prévision sauvegardée
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone, date
from dateutil.relativedelta import relativedelta  # pip install python-dateutil

from fastapi import APIRouter
from pydantic import BaseModel

log = logging.getLogger("doctorsmile.forecasting")

router = APIRouter(prefix="/forecasting", tags=["Forecasting"])

# ════════════════════════════════════════════════════════════════
#  SCHEMAS
# ════════════════════════════════════════════════════════════════

class ForecastRequest(BaseModel):
    analyse_id:    str = ""
    # Ratios passés directement si on ne veut pas recharger depuis Firestore
    chiffre_affaires:       float | None = None
    tresorerie:             float | None = None
    marge_nette_pct:        float | None = None
    couverture_interets:    float | None = None
    bfr_ca_pct:             float | None = None
    annees_activite:        float | None = None
    score:                  int   | None = None


# ════════════════════════════════════════════════════════════════
#  MOTEUR DE PROJECTION (driver-based)
# ════════════════════════════════════════════════════════════════

def _monthly_forecast(
    ca:            float,
    treso_init:    float,
    marge_nette:   float,
    couv_int:      float,
    bfr_ca:        float,
    score:         int,
    scenario:      str,          # "optimistic" | "neutral" | "pessimistic"
    n_months:      int = 12,
) -> list[dict]:
    """
    Projette la trésorerie sur n_months mois.
    Modèle driver-based simplifié :
      - CA mensuel  = CA_annuel/12 * (1 + growth_rate)^mois
      - Charges     = CA_mensuel * (1 - marge_nette/100) * ratio_charges
      - Cash-flow   = (CA_mensuel - Charges) * couv_int_factor
      - Trésorerie  = tréso_init + Σ cash-flow
    """
    GROWTH = {
        "optimistic":  0.015,
        "neutral":     0.005,
        "pessimistic": -0.005,
    }
    CHARGE_FACTOR = {
        "optimistic":  0.85,
        "neutral":     0.90,
        "pessimistic": 0.98,
    }

    gr   = GROWTH[scenario]
    cf   = CHARGE_FACTOR[scenario]
    ca_m = ca / 12

    # Ajustement couverture intérêts
    couv_factor = 1.0 if couv_int >= 2 else max(0.5, couv_int / 2)

    today  = date.today()
    months = []
    cumul  = 0.0

    for i in range(n_months):
        month_date = today + relativedelta(months=i+1)
        label      = month_date.strftime("%b %y")   # e.g. "Jan 26"

        ca_i      = ca_m * ((1 + gr) ** (i + 1))
        charges_i = ca_i * (1 - marge_nette / 100) * cf
        cashflow_i= (ca_i - charges_i) * couv_factor
        cumul    += cashflow_i
        treso_i   = treso_init + cumul

        months.append({
            "label":    label,
            "ca":       round(ca_i),
            "charges":  round(charges_i),
            "cashflow": round(cashflow_i),
            "tresorie": round(treso_i),
        })

    return months


@router.post("/cash-flow")
async def forecast_cash_flow(payload: ForecastRequest):
    """
    Génère une prévision de trésorerie 12 mois en 3 scénarios.
    Les ratios peuvent être passés directement ou chargés depuis
    l'analyse Firestore via analyse_id.
    """
    # ── Charger l'analyse si analyse_id fourni ─────────────────
    ca, treso, marge_nette, couv_int, bfr_ca, score = (
        payload.chiffre_affaires or 5000,
        payload.tresorerie or 400,
        payload.marge_nette_pct or 4.0,
        payload.couverture_interets or 3.5,
        payload.bfr_ca_pct or 15.0,
        payload.score or 50,
    )

    if payload.analyse_id:
        try:
            from app.services.firebase_service import firebase_service
            if firebase_service.available:
                snap = firebase_service.db.collection("analyses") \
                    .document(payload.analyse_id).get()
                if snap.exists:
                    data   = snap.to_dict()
                    ratios = {r["name"]: r["value"] for r in (data.get("ratios") or []) if r.get("value") is not None}
                    ca     = data.get("chiffre_affaires") or ca
                    score  = data.get("score") or score

                    for rname, rval in ratios.items():
                        nl = rname.lower()
                        if "trésor" in nl or "cash" in nl:       treso      = rval
                        if "marge nette" in nl:                  marge_nette= rval
                        if "couverture" in nl:                   couv_int   = rval
                        if "bfr" in nl:                          bfr_ca     = rval
        except Exception as e:
            log.warning("[Forecast] Firestore load failed: %s", e)

    # ── Générer les 3 scénarios ───────────────────────────────
    scenarios = {}
    for sc in ("optimistic", "neutral", "pessimistic"):
        scenarios[sc] = _monthly_forecast(
            ca=ca, treso_init=treso, marge_nette=marge_nette,
            couv_int=couv_int, bfr_ca=bfr_ca, score=score, scenario=sc,
        )

    # ── Construire la réponse mensuelle unifiée ──────────────
    months = []
    for i in range(12):
        months.append({
            "label":       scenarios["neutral"][i]["label"],
            "optimistic":  scenarios["optimistic"][i],
            "neutral":     scenarios["neutral"][i],
            "pessimistic": scenarios["pessimistic"][i],
        })

    return {
        "status":     "ok",
        "analyse_id": payload.analyse_id,
        "horizon":    12,
        "currency":   "k€",
        "inputs": {
            "ca_annuel":  round(ca),
            "treso_init": round(treso),
            "marge_nette_pct": round(marge_nette, 2),
            "couv_int":   round(couv_int, 2),
            "score":      score,
        },
        "months": months,
        "summary": {
            "treso_6m": {
                "optimistic":  scenarios["optimistic"][5]["tresorie"],
                "neutral":     scenarios["neutral"][5]["tresorie"],
                "pessimistic": scenarios["pessimistic"][5]["tresorie"],
            },
            "treso_12m": {
                "optimistic":  scenarios["optimistic"][11]["tresorie"],
                "neutral":     scenarios["neutral"][11]["tresorie"],
                "pessimistic": scenarios["pessimistic"][11]["tresorie"],
            },
        },
    }


@router.get("/{analyse_id}")
async def get_forecast(analyse_id: str):
    """Récupère la dernière prévision sauvegardée pour une analyse."""
    try:
        from app.services.firebase_service import firebase_service
        if firebase_service.available:
            snap = firebase_service.db.collection("forecasts") \
                .where("analyseId", "==", analyse_id) \
                .order_by("createdAt", direction="DESCENDING") \
                .limit(1).get()
            if snap:
                return {"status": "ok", "forecast": snap[0].to_dict()}
    except Exception as e:
        log.warning("[Forecast] GET failed: %s", e)

    return {"status": "not_found", "forecast": None}
