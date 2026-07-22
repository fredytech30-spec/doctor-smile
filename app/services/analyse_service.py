"""
==========================================
ANALYSE SERVICE
DOCTOR SMILE — Hybrid/Deterministic Pipeline
==========================================
This service routes all financial analysis to the new syscohada_engine
which performs deterministic accounting calculations and OHADA/Cameroun risk scoring.
"""

from __future__ import annotations
import logging
from typing import Any
from app.services.syscohada_engine import analyse_balance

log = logging.getLogger("doctorsmile.analyse")

class AnalyseService:
    """
    Orchestrates the analysis pipeline.
    Decoupled from ML models, delegating to syscohada_engine.
    """

    _instances: dict[str, "AnalyseService"] = {}

    def __new__(cls, plan: str = "standard") -> "AnalyseService":
        if plan not in cls._instances:
            obj = super().__new__(cls)
            obj._plan   = plan
            obj._loaded = False
            cls._instances[plan] = obj
        return cls._instances[plan]

    def initialize_engine(self, base_path: str | None = None) -> bool:
        """
        Initialize the SYSCOHADA deterministic engine.
        """
        log.info("Moteur Déterministe SYSCOHADA initialisé pour le plan : %s", self._plan)
        self._loaded = True
        return True

    def analyse(
        self,
        rows:               list[dict[str, Any]],
        entreprise:         str = "Entreprise",
        score_history_prev: list[int] | None = None,
    ) -> dict[str, Any]:
        """
        Executes SYSCOHADA analysis.
        """
        log.info("[%s] Lancement de l'analyse déterministe pour : %s", self._plan, entreprise)
        
        # Route directly to the deterministic SYSCOHADA scoring engine
        return analyse_balance(
            rows=rows,
            entreprise=entreprise,
            score_history_prev=score_history_prev,
        )


analyse_service_standard = AnalyseService("standard")
analyse_service_premium  = AnalyseService("premium")
analyse_service_extra    = AnalyseService("extra")


def get_analyse_service(plan: str) -> AnalyseService:
    return {
        "premium": analyse_service_premium,
        "extra":   analyse_service_extra,
    }.get(plan, analyse_service_standard)
