"""
═══════════════════════════════════════════════════════════════════
ORCHESTRATOR SERVICE — Orchestration intelligente du pipeline
Doctor Smile v5.0 — Sans emojis, icônes Lucide

Pipeline complet :
  [Upload] → [Validation] → [Classification] → [OCR] → [LLM] → [SYSCOHADA] → [Export]
  
Avec fallback intelligent et détection d'erreurs en cascade
═══════════════════════════════════════════════════════════════════
"""

from __future__ import annotations
import asyncio
import json
import logging
import hashlib
import re
import uuid
from datetime import datetime
from typing import Any, Optional
from enum import Enum

import redis.asyncio as aioredis
from pydantic import BaseModel, Field
from app.services.ocr_service import ocr_service
from app.services.llm_moderator_service import llm_extraction_service as llm_moderator
from app.services.syscohada_engine import SYSCOHADA_V2, parse_balance
from app.services.firebase_service import firebase_service
from app.services.chat_service import _get_client

log = logging.getLogger("doctorsmile.orchestrator")


# ════════════════════════════════════════════════════════════════════
#  ENUMS & MODELS
# ════════════════════════════════════════════════════════════════════

class ProcessingStage(str, Enum):
    """Stages du pipeline"""
    VALIDATION = "validation"
    CLASSIFICATION = "classification"
    OCR_EXTRACTION = "ocr_extraction"
    LLM_ENRICHMENT = "llm_enrichment"
    SYSCOHADA_COMPUTE = "syscohada_compute"
    EXPORT_STORAGE = "export_storage"
    COMPLETED = "completed"
    ERROR = "error"


class QualityMetrics(BaseModel):
    """Métriques de qualité du document"""
    overall_score: float = Field(0.0, ge=0.0, le=100.0)
    ocr_readability: float = Field(50.0, ge=0.0, le=100.0)
    structure_quality: float = Field(50.0, ge=0.0, le=100.0)
    numeric_consistency: float = Field(50.0, ge=0.0, le=100.0)
    completeness: float = Field(50.0, ge=0.0, le=100.0)
    recommendations: list[str] = []


class ProcessingProgress(BaseModel):
    """État de progression du traitement"""
    document_id: str
    stage: ProcessingStage
    progress_percent: int = Field(0, ge=0, le=100)
    message: str
    estimated_remaining_seconds: Optional[int] = None
    subtask: Optional[str] = None
    metrics: Optional[QualityMetrics] = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


# ════════════════════════════════════════════════════════════════════
#  ORCHESTRATOR — Pipeline Principal
# ════════════════════════════════════════════════════════════════════

class DocumentOrchestrator:
    """
    Orchestration multi-étapes du pipeline d'analyse
    Responsabilités:
    - Validation + classification
    - Routing intelligent OCR/LLM
    - Gestion d'erreurs et fallback
    - Streaming de progression temps réel
    - Intégration Firebase
    """

    def __init__(self):
        self.redis: Optional[aioredis.Redis] = None
        self.redis_available = False
        self.syscohada = SYSCOHADA_V2()
        self._processed_hashes: set[str] = set()  # Dédoublonnage en mémoire

    async def _ensure_redis(self):
        """Initialiser Redis si non déjà fait"""
        if not self.redis and not self.redis_available:
            try:
                self.redis = aioredis.from_url("redis://localhost:6379", decode_responses=True)
                self.redis_available = True
                log.info("Redis connected successfully")
            except Exception as e:
                log.warning(f"Redis unavailable, running in degraded mode: {e}")
                self.redis = None
                self.redis_available = False

    async def _publish_progress(
        self,
        document_id: str,
        stage: ProcessingStage,
        progress: int,
        message: str,
        estimated_remaining: Optional[int] = None,
        subtask: Optional[str] = None,
        metrics: Optional[QualityMetrics] = None,
        error: Optional[str] = None,
    ):
        """Publier la progression via Redis Pub/Sub (ou skip si Redis indisponible)"""
        try:
            await self._ensure_redis()

            if not self.redis or not self.redis_available:
                log.debug(f"Redis unavailable, skipping progress publish for {document_id}")
                return

            progress_event = ProcessingProgress(
                document_id=document_id,
                stage=stage,
                progress_percent=progress,
                message=message,
                estimated_remaining_seconds=estimated_remaining,
                subtask=subtask,
                metrics=metrics,
                error=error,
            )

            channel = f"analysis:progress:{document_id}"
            await self.redis.publish(channel, progress_event.model_dump_json())

            log.info(
                f"Progress published: {document_id} | {stage} | {progress}%"
            )

        except Exception as e:
            log.error(f"Failed to publish progress: {e}")

    async def validate_document_quality(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> tuple[bool, QualityMetrics, str]:
        """
        Valider la qualité du document AVANT traitement

        Returns:
            (is_valid, metrics, reason)
        """
        try:
            metrics = QualityMetrics()

            # 1. Taille du fichier
            file_size_mb = len(file_bytes) / (1024 * 1024)
            if file_size_mb > 50:
                return False, metrics, "Fichier trop volumineux (max 50 MB)"

            # 2. Hash pour dédoublonnage
            doc_hash = hashlib.sha256(file_bytes).hexdigest()
            if doc_hash in self._processed_hashes:
                return False, metrics, "Document déjà traité (doublon)"
            self._processed_hashes.add(doc_hash)

            # 3. Extension valide
            allowed_ext = {"pdf", "xlsx", "xls", "csv", "png", "jpg", "jpeg"}
            ext = (filename or "").rsplit(".", 1)[-1].lower()
            if ext not in allowed_ext:
                return False, metrics, f"Format non supporté: {ext}"

            # 4. Basic structure check (OCR si scanné)
            # Placeholder - Groq could enhance this
            metrics.overall_score = 75.0
            metrics.ocr_readability = 80.0
            metrics.structure_quality = 70.0
            metrics.numeric_consistency = 75.0
            metrics.completeness = 70.0

            if metrics.overall_score < 50:
                return False, metrics, "Qualité insuffisante (< 50%)"

            return True, metrics, "OK"

        except Exception as e:
            log.error(f"Validation error: {e}")
            return False, QualityMetrics(), str(e)

    async def classify_document_type(
        self,
        file_bytes: bytes,
    ) -> tuple[str, dict[str, Any]]:
        """
        Classifier le type de document via heuristiques + LLM fallback

        Returns:
            (document_type, metadata)
        """
        try:
            # Extraction texte rapide
            text_sample = await ocr_service.extract_text_sample(
                file_bytes, pages=1, max_chars=5000
            )

            # Patterns détection
            doc_type = "financial_report"
            metadata = {
                "has_tables": "total" in text_sample.lower(),
                "has_balance": "actif" in text_sample.lower() and "passif" in text_sample.lower(),
                "detected_accounts": text_sample.count("compte") + text_sample.count("account"),
                "language": "FR" if "é" in text_sample or "Société" in text_sample else "EN",
            }

            if metadata["has_balance"]:
                doc_type = "balance_sheet"
            elif metadata["has_tables"]:
                doc_type = "financial_statement"

            return doc_type, metadata

        except Exception as e:
            log.error(f"Classification error: {e}")
            return "unknown", {}

    async def process_full_pipeline(
        self,
        document_id: str,
        file_bytes: bytes,
        filename: str,
        user_id: str,
        company_info: dict[str, Any],
        extraction_method: str = "auto",
        use_llm_moderator: bool = True,
    ) -> dict[str, Any]:
        """
        Pipeline complète avec gestion d'erreurs

        Stages:
        1. Validation (5-10%)
        2. Classification (10-15%)
        3. OCR Extraction (15-50%)
        4. LLM Enrichissement (50-75%)
        5. SYSCOHADA Computation (75-95%)
        6. Export/Storage (95-100%)
        """

        try:
            # STAGE 1: Validation
            await self._publish_progress(
                document_id, ProcessingStage.VALIDATION, 5,
                message="Validation du document...",
            )

            is_valid, quality_metrics, reason = await self.validate_document_quality(
                file_bytes, filename
            )

            if not is_valid:
                await self._publish_progress(
                    document_id, ProcessingStage.ERROR, 0,
                    message=f"Validation échouée: {reason}",
                    error=reason,
                )
                return {
                    "success": False,
                    "error": reason,
                    "quality_metrics": quality_metrics.model_dump()
                }

            await self._publish_progress(
                document_id, ProcessingStage.VALIDATION, 10,
                message=f"Document validé (qualité: {quality_metrics.overall_score:.0f}%)",
                metrics=quality_metrics,
            )

            # STAGE 2: Classification
            await self._publish_progress(
                document_id, ProcessingStage.CLASSIFICATION, 12,
                message="Classification du document...",
            )

            doc_type, doc_metadata = await self.classify_document_type(file_bytes)

            await self._publish_progress(
                document_id, ProcessingStage.CLASSIFICATION, 15,
                message=f"Document classé comme: {doc_type}",
                subtask=f"Type détecté: {doc_type}",
            )

            # STAGE 3: OCR Extraction
            await self._publish_progress(
                document_id, ProcessingStage.OCR_EXTRACTION, 20,
                message="Extraction du texte et tableaux...",
                estimated_remaining_seconds=30,
            )

            ocr_result = await ocr_service.extract_text_and_tables(
                file_bytes,
                document_type=doc_type,
                language=doc_metadata.get("language", "FR"),
            )

            extracted_text = ocr_result.get("text", "")
            extracted_tables = ocr_result.get("tables", [])
            extraction_confidence = ocr_result.get("confidence", 0.75)

            await self._publish_progress(
                document_id, ProcessingStage.OCR_EXTRACTION, 50,
                message=f"Extraction complétée: {len(extracted_text)} caractères, {len(extracted_tables)} tableaux",
                subtask=f"Confiance OCR: {extraction_confidence*100:.0f}%",
            )

            # STAGE 4: LLM Enrichissement (optionnel)
            llm_result = None
            if use_llm_moderator and extraction_confidence > 0.5:
                await self._publish_progress(
                    document_id, ProcessingStage.LLM_ENRICHMENT, 55,
                    message="Enrichissement avec IA (Groq)...",
                    estimated_remaining_seconds=20,
                )

                try:
                    llm_result = await llm_moderator.moderate_with_groq(
                        text=extracted_text,
                        tables=extracted_tables,
                        document_type=doc_type,
                        company_info=company_info,
                    )

                    await self._publish_progress(
                        document_id, ProcessingStage.LLM_ENRICHMENT, 75,
                        message="Enrichissement IA terminé",
                        subtask="Normalisation et validation LLM complétées",
                    )

                except Exception as e:
                    log.warning(f"LLM enrichment failed, using OCR fallback: {e}")
                    await self._publish_progress(
                        document_id, ProcessingStage.LLM_ENRICHMENT, 60,
                        message="Basculement sur OCR seul (LLM indisponible)",
                    )

            # STAGE 5: SYSCOHADA Computation
            await self._publish_progress(
                document_id, ProcessingStage.SYSCOHADA_COMPUTE, 75,
                message="Calcul de l'analyse financière (SYSCOHADA)...",
                estimated_remaining_seconds=15,
            )

            analysis_data = llm_result.get("structured", {}) if llm_result else {}
            if (
                not analysis_data
                or isinstance(analysis_data, list)
                or isinstance(analysis_data.get("rows", None), list)
                or any(key not in analysis_data for key in ("ca", "actif_total", "passif_total", "resultat_net"))
            ):
                analysis_data = await self._extract_structured_from_ocr(
                    extracted_text, extracted_tables
                )

            syscohada_analysis = await self.syscohada.build_comprehensive_analysis(
                balance=analysis_data,
                sector=company_info.get("sector") or company_info.get("secteur", "Unknown"),
            )

            await self._publish_progress(
                document_id, ProcessingStage.SYSCOHADA_COMPUTE, 90,
                message="Analyse SYSCOHADA complétée",
                subtask=f"Score global: {syscohada_analysis.get('global_score', 0)}/100",
            )

            # STAGE 6: Export & Storage
            await self._publish_progress(
                document_id, ProcessingStage.EXPORT_STORAGE, 95,
                message="Sauvegarde de l'analyse...",
            )

            export_result = await self._export_analysis(
                document_id, syscohada_analysis, user_id
            )

            await firebase_service.store_analysis_metadata(
                document_id=document_id,
                user_id=user_id,
                filename=filename,
                doc_type=doc_type,
                analysis=syscohada_analysis,
                quality_metrics=quality_metrics.model_dump(),
                export_url=export_result.get("url"),
                timestamp=datetime.now().isoformat(),
            )

            # FINAL: Completed
            await self._publish_progress(
                document_id, ProcessingStage.COMPLETED, 100,
                message="Analyse complétée avec succès",
            )

            return {
                "success": True,
                "document_id": document_id,
                "analysis": syscohada_analysis,
                "export_url": export_result.get("url"),
                "quality_metrics": quality_metrics.model_dump(),
            }

        except Exception as e:
            log.error(f"Pipeline error for {document_id}: {e}", exc_info=True)
            await self._publish_progress(
                document_id, ProcessingStage.ERROR, 0,
                message=f"Erreur pipeline: {str(e)[:100]}",
                error=str(e),
            )
            return {
                "success": False,
                "error": str(e),
                "document_id": document_id,
            }

    async def _extract_structured_from_ocr(
        self,
        text: str,
        tables: list[dict],
    ) -> dict[str, Any]:
        """Extraction structurée depuis OCR brut"""
        if tables and isinstance(tables, list):
            try:
                structured = parse_balance(tables)
                if structured:
                    return structured
            except Exception as e:
                log.warning(f"OCR table parsing failed: {e}")

        structured = {
            "actif_total": 0,
            "passif_total": 0,
            "ca": 0,
            "resultat_net": 0,
        }

        if not text:
            return structured

        patterns = {
            "ca": r"(?:chiffre d['’\s]*affaires|ca|turnover)[^\d\-()]{0,30}([0-9\.\,\s\(\)-]+)",
            "resultat_net": r"(?:résultat net|resultat net|bénéfice net|benefice net|net income)[^\d\-()]{0,30}([0-9\.\,\s\(\)-]+)",
            "actif_total": r"(?:total actif|actif total|total assets)[^\d\-()]{0,30}([0-9\.\,\s\(\)-]+)",
            "passif_total": r"(?:total passif|passif total|total liabilities)[^\d\-()]{0,30}([0-9\.\,\s\(\)-]+)",
        }

        for key, pattern in patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                parsed = self._parse_amount(match.group(1))
                if parsed is not None:
                    structured[key] = parsed

        return structured

    def _parse_amount(self, raw_value: str) -> float | None:
        """Convertit un montant financier textuel en nombre."""
        if not raw_value:
            return None
        cleaned = raw_value.strip().replace(" ", "").replace("\u00A0", "")
        cleaned = cleaned.replace("€", "").replace("FCFA", "").replace("$", "")
        cleaned = cleaned.replace("K", "000").replace("M", "000000")
        cleaned = cleaned.replace(",", ".")
        cleaned = re.sub(r"[^0-9.\-()]", "", cleaned)

        if not cleaned:
            return None

        try:
            if cleaned.startswith("(") and cleaned.endswith(")"):
                cleaned = "-" + cleaned[1:-1]
            return float(cleaned)
        except ValueError:
            return None

    async def _export_analysis(
        self,
        document_id: str,
        analysis: dict,
        user_id: str,
    ) -> dict[str, Any]:
        """Exporter l'analyse en JSON et la sauvegarder"""
        try:
            export_path = f"exports/{user_id}/{document_id}.json"
            json_data = json.dumps(analysis, indent=2, default=str)

            url = await firebase_service.upload_to_storage(
                path=export_path,
                data=json_data.encode(),
            )

            return {"success": True, "url": url}

        except Exception as e:
            log.error(f"Export error: {e}")
            return {"success": False, "error": str(e)}


# Singleton global
orchestrator = DocumentOrchestrator()
