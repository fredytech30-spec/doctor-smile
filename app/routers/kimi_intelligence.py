
"""
ROUTER — Kimi Intelligence
Expose Kimi-powered intelligence features via API
"""

from __future__ import annotations
import logging
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.firebase_verify import verify_token
from app.services.kimi_intelligence_service import kimi_intelligence_service

log = logging.getLogger("doctorsmile.router.kimi_intelligence")
router = APIRouter(prefix="/kimi-intelligence", tags=["Kimi Intelligence"])


# ==================== Pydantic Models ====================

class FinancialDataRequest(BaseModel):
    financial_data: dict[str, Any] = Field(..., description="Financial data to analyze")
    sector: Optional[str] = Field("default", description="Industry sector")
    historical_data: Optional[list[dict[str, Any]]] = Field(None, description="Historical data for comparison")

class WorkflowGenerationRequest(BaseModel):
    goal: str = Field(..., description="Automation goal")
    context: dict[str, Any] = Field(..., description="Context for workflow generation")

class DecisionSuggestionRequest(BaseModel):
    decision_context: dict[str, Any] = Field(..., description="Decision context")

class DataReconciliationRequest(BaseModel):
    data_sources: list[dict[str, Any]] = Field(..., description="Multiple data sources to reconcile")


# ==================== API Endpoints ====================

@router.post("/detect-anomalies", status_code=200,
    summary="Detect financial anomalies and risks")
async def detect_anomalies(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Detect financial anomalies proactively"""
    try:
        result = await kimi_intelligence_service.detect_anomalies(
            financial_data=body.financial_data,
            historical_data=body.historical_data
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Anomaly detection error: {e}")
        raise HTTPException(500, f"Erreur lors de la détection d'anomalies: {str(e)}")


@router.post("/generate-alerts", status_code=200,
    summary="Generate preventive alerts")
async def generate_alerts(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Generate proactive preventive alerts"""
    try:
        alerts = await kimi_intelligence_service.generate_preventive_alerts(
            financial_data=body.financial_data
        )
        return {
            "success": True,
            "alerts": alerts,
            "count": len(alerts),
            "generated_at": await kimi_intelligence_service._generate_executive_summary({"dummy": "data"})
        }
    except Exception as e:
        log.error(f"[Kimi] Alert generation error: {e}")
        raise HTTPException(500, f"Erreur lors de la génération d'alertes: {str(e)}")


@router.post("/analyze-health", status_code=200,
    summary="Comprehensive financial health analysis")
async def analyze_health(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Deep financial health analysis"""
    try:
        result = await kimi_intelligence_service.analyze_financial_health(
            financial_data=body.financial_data,
            sector=body.sector
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Health analysis error: {e}")
        raise HTTPException(500, f"Erreur lors de l'analyse de santé: {str(e)}")


@router.post("/forecast-trends", status_code=200,
    summary="Forecast financial trends")
async def forecast_trends(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Forecast financial trends"""
    try:
        result = await kimi_intelligence_service.forecast_trends(
            financial_data=body.financial_data
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Trend forecasting error: {e}")
        raise HTTPException(500, f"Erreur lors des prévisions: {str(e)}")


@router.post("/validate-correct", status_code=200,
    summary="Validate and correct financial data")
async def validate_correct_data(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Validate data and suggest corrections"""
    try:
        is_valid, issues, corrected = await kimi_intelligence_service.validate_and_correct_data(
            financial_data=body.financial_data
        )
        return {
            "success": True,
            "is_valid": is_valid,
            "issues": issues,
            "corrected_data": corrected
        }
    except Exception as e:
        log.error(f"[Kimi] Data validation error: {e}")
        raise HTTPException(500, f"Erreur lors de la validation: {str(e)}")


@router.post("/reconcile-data", status_code=200,
    summary="Reconcile data from multiple sources")
async def reconcile_data(
    body: DataReconciliationRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Reconcile multiple data sources"""
    try:
        result = await kimi_intelligence_service.reconcile_inconsistencies(
            data_sources=body.data_sources
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Reconciliation error: {e}")
        raise HTTPException(500, f"Erreur lors de la réconciliation: {str(e)}")


@router.post("/generate-workflow", status_code=200,
    summary="Generate intelligent automation workflow")
async def generate_workflow(
    body: WorkflowGenerationRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Generate automation workflow"""
    try:
        result = await kimi_intelligence_service.generate_workflow(
            goal=body.goal,
            context=body.context
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Workflow generation error: {e}")
        raise HTTPException(500, f"Erreur lors de la génération de workflow: {str(e)}")


@router.post("/suggest-decisions", status_code=200,
    summary="Suggest data-driven decisions")
async def suggest_decisions(
    body: DecisionSuggestionRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Suggest strategic decisions"""
    try:
        result = await kimi_intelligence_service.suggest_decisions(
            decision_context=body.decision_context
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Decision suggestion error: {e}")
        raise HTTPException(500, f"Erreur lors des suggestions: {str(e)}")


@router.post("/full-analysis", status_code=200,
    summary="Complete intelligence analysis pipeline")
async def full_analysis(
    body: FinancialDataRequest,
    token: dict = Depends(verify_token),
) -> dict[str, Any]:
    """Run complete intelligence analysis pipeline"""
    try:
        result = await kimi_intelligence_service.full_intelligence_analysis(
            financial_data=body.financial_data,
            sector=body.sector
        )
        return result
    except Exception as e:
        log.error(f"[Kimi] Full analysis error: {e}")
        raise HTTPException(500, f"Erreur lors de l'analyse complète: {str(e)}")


@router.get("/status", status_code=200,
    summary="Check Kimi service availability")
async def check_status() -> dict[str, Any]:
    """Check if Kimi is available and configured"""
    return {
        "available": kimi_intelligence_service.use_kimi,
        "model": kimi_intelligence_service.model,
        "features": [
            "anomaly_detection",
            "health_analysis",
            "trend_forecasting",
            "data_validation",
            "data_reconciliation",
            "workflow_generation",
            "decision_support"
        ]
    }

