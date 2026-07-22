"""
ROUTER — analyses.py  v4.0 — Pipeline Balance OHADA
DOCTOR SMILE
════════════════════════════════════════════════════════════════

POST /analyses              → pipeline balance OHADA + SYSCOHADA Engine
POST /analyses/upload       → extraction PDF/Excel balance
POST /analyses/upload/ocr   → extraction OCR/LLM balance
POST /analyses/upload/ledger → extraction Grand Livre (optionnel)
GET  /analyses/{id}         → récupérer analyse
GET  /analyses/export/{token} → export JSON sécurisé

NOUVEAU v4.0 :
  - Pipeline simplifié : Balance OHADA → LLM Extraction → SYSCOHADA Engine
  - Support Grand Livre optionnel pour actions avancées
  - Suppression ML models (XGBoost, LightGBM, Random Forest)
  - Moteur déterministe SYSCOHADA uniquement
  - Template recommandations "Chiffre→Conséquence→Action"
════════════════════════════════════════════════════════════════
"""
from __future__ import annotations
import asyncio
import base64, json, logging, math, uuid, os, time, hmac, hashlib
from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from firebase_admin import firestore as fs
from app.middleware.firebase_verify import verify_token
from app.services.analyse_service   import get_analyse_service
from app.services.firebase_service  import firebase_service
from app.services.email_service     import email_service
from app.routers.email import _get_user_email
from app.services.chat_service import _get_client, chat_service as elite_chat_service

# ── LLM Extraction Service — import silencieux ──────────────────
try:
    from app.services.llm_moderator_service import llm_extraction_service as _llm_mod
    _LLM_MOD_AVAILABLE = True
except ImportError:
    _LLM_MOD_AVAILABLE = False
    _llm_mod = None

# ── OCR service — import silencieux ──────────────────────────
try:
    from app.services.ocr_service import ocr_service as _ocr_svc
    _OCR_AVAILABLE = True
except ImportError:
    _OCR_AVAILABLE = False
    _ocr_svc = None

# ── SYSCOHADA Engine — import des fonctions nécessaires ─────────────────
from app.services.syscohada_engine import (
    parse_balance,
    compute_ratios,
    score_risk,
    compute_cash_burn_runway,
    generate_early_warnings,
    compute_sector_benchmark,
    generate_third_party_report,
    generate_action_plan,
    format_analysis_history,
    format_conversation_history,
    simulate_financing_impact
)

_EXPORT_SECRET = os.getenv("EXPORT_TOKEN_SECRET", "doctorsmile-export-secret-changeme")

log    = logging.getLogger("doctorsmile.router.analyses")
router = APIRouter(prefix="/analyses", tags=["Analyses"])

# Seuil minimal de confiance (%) pour accepter la normalisation LLM
_MIN_CONFIDENCE_FOR_ML = int(os.getenv("MIN_CONFIDENCE_FOR_ML", "50"))


# ── Schemas ──────────────────────────────────────────────────

class EntrepriseInfo(BaseModel):
    nom:        str | None = None
    secteur:    str | None = None
    pays:       str | None = "Cameroun"
    taille:     str | None = None
    devise:     str | None = "FCFA"

class AnalyseRequest(BaseModel):
    filename:            str = Field(..., min_length=1, max_length=255)
    data:                list[dict[str, Any]] = Field(..., min_items=1)
    userId:              str = Field(..., min_length=5)
    plan:                str = Field("standard", pattern="^(standard|premium|extra)$")
    entreprise:          EntrepriseInfo = EntrepriseInfo()
    extraction_method:   str = Field("auto", pattern="^(auto|llm|ocr)$")
    include_ledger:      bool = False  # Optionnel : inclure Grand Livre
    use_llm_moderator:   bool = False
    llm_context:         dict[str, Any] | None = None

class AnalyseResponse(BaseModel):
    analyseId:          str
    status:             str
    score:              int
    score_confidence:    int = 100
    extraction_method:   str = ""
    recommendations:     list[dict] = []
    risk_level:         str = ""
    processingMs:       int = 0
    llm_used:          str = ""
    synthese_llm:      str = ""
    corrections_count: int = 0
    anomalies_count:   int = 0

class WhatIfRequest(BaseModel):
    analyseId: str = Field(..., min_length=1)
    ratioOverrides: dict[str, float] = Field(default_factory=dict)

class WhatIfResponse(BaseModel):
    simulatedScore: int
    zone: str
    deltaScore: float


# ── Mapping noms FR → clés internes ──────────────────────────
_FR_TO_KEY: dict[str, str] = {
    "Liquidite generale":         "current_ratio",
    "Liquidite immediate":        "quick_ratio",
    "Ratio de tresorerie":        "cash_ratio",
    "Ratio d endettement":        "debt_equity",
    "Solvabilite":                "solvabilite",
    "ROA (rentabilite actifs)":   "roa",
    "ROE (rentabilite capitaux)": "roe",
    "Marge EBITDA":               "ebitda_margin",
    "Marge nette":                "net_margin",
    "Marge brute":                "marge_brute_pct",
    "Rotation des actifs":        "rotation_actifs",
    "BFR / CA":                   "bfr_ca",
    "Couverture des interets":    "couverture_interets",
    "Anciennete":                 "annees_activite",
}

def _fr_to_key(name: str) -> str | None:
    import unicodedata
    n = unicodedata.normalize("NFD", name)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn").lower().strip()
    return _FR_TO_KEY.get(n)

def _is_numeric(v) -> bool:
    try:
        float(str(v or "").replace(",", ".").replace(" ", "").replace("%", ""))
        return True
    except (ValueError, TypeError):
        return False

def _build_doc(
    analyse_id: str,
    body: AnalyseRequest,
    entreprise_nom: str,
    result: dict[str, Any],
    extraction_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Document Firestore analyses/{id}.
    Pipeline v4.0 : Balance OHADA → LLM Extraction → SYSCOHADA Engine
    """
    doc = {
        "id":                analyse_id,
        "userId":            body.userId,
        "entreprise":        entreprise_nom,
        "filename":          body.filename,
        "plan":              body.plan,
        "status":            "completed",
        "createdAt":         fs.SERVER_TIMESTAMP,
        "score":             result["score"],
        "risk_level":        result["risk_level"],
        "confidence":        result["confidence"],
        "processingMs":      result["processingMs"],
        "extraction_method": result["extraction_method"],
        "ratios":            result["ratios"],
        "recommendations":   result["recommendations"],
        "secteur":           (body.entreprise.secteur or ""),
        "taille":            (body.entreprise.taille or ""),
        "pays":              (body.entreprise.pays or "Cameroun"),
        "include_ledger":    body.include_ledger,
    }

    # Enrichir avec les métadonnées d'extraction si disponibles
    if extraction_meta:
        doc.update({
            "extraction_confidence": extraction_meta.get("confidence", 0.5),
            "extraction_method": extraction_meta.get("extraction_method", "unknown"),
            "score_confiance":  extraction_meta.get("score_confiance", 100),
            "synthese_llm":     extraction_meta.get("synthese", ""),
            "data_quality":     extraction_meta.get("qualite", {}),
            "data_corrections": extraction_meta.get("corrections", []),
            "data_anomalies":   extraction_meta.get("anomalies", []),
            "devise":           extraction_meta.get("devise", "FCFA"),
            "secteur":          extraction_meta.get("secteur", doc["secteur"]),
        })

    return doc


# ════════ POST /analyses ══════════════════════════════════════

@router.post("", response_model=AnalyseResponse, status_code=200,
    summary="Pipeline ML complet (mode IA avancé optionnel via use_llm_moderator)")
async def create_analyse(
    body:  AnalyseRequest,
    token: dict = Depends(verify_token),
) -> AnalyseResponse:
    """
    Pipeline standard (use_llm_moderator=False) :
      Données brutes → preprocessing_service → ML → score

    Mode IA avancé (use_llm_moderator=True) :
      Données brutes → LLM Moderator (Groq/llama-3.3-70b)
                     → features normalisées + rapport qualité
                     → preprocessing_service → ML → score enrichi

    Le frontend active le mode IA via le toggle dans ds-upload.js.
    """
    uid = token.get("uid", "")
    if uid and uid != "dev-uid-000" and uid != body.userId:
        raise HTTPException(403, "userId du payload ne correspond pas au token Firebase.")
    if not body.data:
        raise HTTPException(422, "Le champ data est vide.")

    log.info("[POST /analyses] user=%s plan=%s rows=%d file=%s llm=%s",
             body.userId, body.plan, len(body.data), body.filename,
             body.use_llm_moderator)

    entreprise_nom = (
        body.entreprise.nom
        or body.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    )

    prev_scores = firebase_service.get_score_history(body.userId, entreprise_nom)
    service     = get_analyse_service(body.plan)

    # ══════════════════════════════════════════════════════════
    # MODE IA AVANCÉ — LLM Moderator
    # ══════════════════════════════════════════════════════════
    llm_meta: dict[str, Any] | None = None
    rows_to_predict = body.data

    if body.use_llm_moderator and _LLM_MOD_AVAILABLE and _llm_mod and hasattr(_llm_mod, "moderate"):
        try:
            import pandas as pd

            # Convertir les rows brutes en DataFrame pour le LLM
            raw_df = pd.DataFrame(body.data)

            # Contexte utilisateur pour le LLM
            ctx = body.llm_context or {}
            secteur = ctx.get("secteur") or body.entreprise.secteur or "autre"
            pays    = ctx.get("pays")    or body.entreprise.pays    or "Cameroun"
            devise  = ctx.get("devise")  or body.entreprise.devise  or "FCFA"

            log.info("[LLM Moderator] Lancement pour %s — secteur=%s pays=%s",
                     entreprise_nom, secteur, pays)

            # Préparer un adaptateur LLM si Groq est disponible
            llm_client = None
            client_data = _get_client("groq")
            if client_data:
                async def _generate_via_elite(prompt: str) -> str:
                    text, model = await elite_chat_service._chat_with_elite_llm(
                        prompt, [], {}, "auto", "groq", None
                    )
                    return text

                class _Adapter:
                    async def generate(self, prompt: str) -> str:
                        return await _generate_via_elite(prompt)

                llm_client = _Adapter()

            llm_result = await _llm_mod.moderate(
                raw_df     = raw_df,
                entreprise = entreprise_nom,
                secteur    = secteur,
                pays       = pays,
                devise     = devise,
                llm_client = llm_client,
            )

            score_confiance = llm_result.get("score_confiance", 0)
            llm_meta = llm_result

            # Vérifier le seuil de confiance minimal
            if score_confiance < _MIN_CONFIDENCE_FOR_ML:
                log.warning("[LLM Moderator] Confiance trop faible (%d%%) — retour 422",
                            score_confiance)
                return JSONResponse(
                    status_code=422,
                    content={
                        "error":    "données_insuffisantes",
                        "message":  (
                            f"Les données semblent insuffisantes pour une analyse fiable "
                            f"(confiance {score_confiance}%). "
                            f"Vérifiez que votre fichier contient bien un bilan comptable "
                            f"ou un compte de résultat."
                        ),
                        "score_confiance": score_confiance,
                        "qualite": llm_result.get("qualite", {}),
                        "synthese": llm_result.get("synthese", ""),
                        "action": (
                            "Champs manquants : "
                            + ", ".join(
                                llm_result.get("qualite", {}).get("features_manquantes", [])[:5]
                            )
                        ),
                    },
                )

            # Utiliser les données normalisées par le LLM
            rows_to_predict = llm_result["rows_for_preprocessing"]

            # Enrichir l'entreprise avec les infos détectées par le LLM
            if llm_result.get("entreprise") and llm_result["entreprise"] != "Inconnue":
                entreprise_nom = llm_result["entreprise"]
            if llm_result.get("secteur"):
                body.entreprise.secteur = llm_result["secteur"]
            if llm_result.get("pays"):
                body.entreprise.pays = llm_result["pays"]

            log.info("[LLM Moderator] ✓ confiance=%d%% llm=%s corrections=%d anomalies=%d",
                     score_confiance,
                     llm_result.get("llm_used", "?"),
                     len(llm_result.get("corrections", [])),
                     len(llm_result.get("anomalies", [])))

        except Exception as exc:
            # Si le LLM échoue, on continue avec les données brutes
            log.warning("[LLM Moderator] Erreur non bloquante (%s) — pipeline standard", exc)
            llm_meta = None
            rows_to_predict = body.data

    # ══════════════════════════════════════════════════════════
    # PIPELINE DÉTERMINISTE SYSCOHADA
    # ══════════════════════════════════════════════════════════
    try:
        result = service.analyse(
            rows               = rows_to_predict,
            entreprise         = entreprise_nom,
            score_history_prev = prev_scores,
        )
    except Exception as exc:
        log.error("[POST /analyses] Pipeline SYSCOHADA: %s", exc, exc_info=True)
        raise HTTPException(500, f"Erreur pipeline SYSCOHADA : {type(exc).__name__}: {exc}")

    # Sauvegarder
    analyse_id = str(uuid.uuid4())
    doc        = _build_doc(analyse_id, body, entreprise_nom, result, llm_meta)

    if firebase_service.save_analysis(analyse_id, doc) is None:
        raise HTTPException(500, "Sauvegarde Firestore échouée.")

    firebase_service.log_event(body.userId, "analyse_created", {
        "analyseId":       analyse_id,
        "score":           result["score"],
        "zone":            result["zone"],
        "plan":            body.plan,
        "llm_moderator":   body.use_llm_moderator,
        "score_confiance": llm_meta.get("score_confiance", 100) if llm_meta else 100,
    })

    # Envoi de l'email "Analyse prête" via Brevo
    try:
        # Récupérer les infos utilisateur
        user_profile = firebase_service.get_user_profile(body.userId)
        user_email = user_profile.get("email") if user_profile else None
        user_name = user_profile.get("prenom") or user_profile.get("displayName") or "Cher client" if user_profile else "Cher client"
        
        # Mapping zone → couleur, emoji
        zone_config = {
            "Zone Saine":     ("#10b981", "🟢"),
            "Zone Vigilance": ("#f59e0b", "🟡"),
            "Zone Risque":    ("#f97316", "🟠"),
            "Zone Critique":  ("#ef4444", "🔴"),
        }
        zone_color, zone_emoji = zone_config.get(result["zone"], ("#8B7FF0", "🔵"))
        
        if user_email:
            asyncio.create_task(email_service.send_analyse_ready(
                email=user_email,
                name=user_name,
                entreprise=entreprise_nom,
                score=result["score"],
                zone_label=result["zone"],
                zone_color=zone_color,
                zone_emoji=zone_emoji,
                analyse_id=analyse_id
            ))
            log.info(f"📧 Email 'Analyse prête' programmé pour {user_email}")
        else:
            log.warning(f"⚠️ Aucun email trouvé pour l'utilisateur {body.userId}")
    except Exception as e:
        log.error(f"❌ Erreur lors de l'envoi de l'email 'Analyse prête': {e}")

    log.info("[POST /analyses] ✓ %s score=%d zone=%s ms=%d",
             analyse_id, result["score"], result["zone"], result["processingMs"])

    return AnalyseResponse(
        analyseId       = analyse_id,
        status          = "completed",
        score           = result["score"],
        score_confidence = llm_meta.get("score_confiance", 100) if llm_meta else 100,
        extraction_method = result.get("extraction_method", "auto") or "auto",
        recommendations = result.get("recommendations", []),
        risk_level      = result.get("risk_level", ""),
        llm_used        = llm_meta.get("llm_used", "") if llm_meta else "",
        synthese_llm    = llm_meta.get("synthese", "") if llm_meta else "",
        corrections_count = len(llm_meta.get("corrections", [])) if llm_meta else 0,
        anomalies_count   = len(llm_meta.get("anomalies", [])) if llm_meta else 0,
        processingMs      = result.get("processingMs", 0),
    )


# ════════ POST /analyses/upload ═══════════════════════════════

@router.post("/upload", response_model=AnalyseResponse, status_code=200,
    summary="Analyser un PDF avec détection automatique du meilleur mode d'extraction (tableaux ou OCR)")
async def upload_pdf(
    file:               UploadFile = File(...),
    userId:             str        = Form(...),
    plan:               str        = Form("standard"),
    entreprise:         str        = Form("{}"),
    use_llm_moderator:  str        = Form("false"),
    token:              dict       = Depends(verify_token),
) -> AnalyseResponse:
    """Extrait automatiquement les données d'un PDF puis exécute le pipeline.

    Ce routeur tente d'abord l'extraction native par tableau, puis bascule
    vers l'OCR / IA si le PDF semble scanné ou si les données tabulaires sont
    insuffisantes.
    """
    filename = file.filename or "document.pdf"
    extension = filename.lower().rsplit('.', 1)[-1]
    supported_image_ext = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"}
    if extension not in {"pdf"} | supported_image_ext:
        raise HTTPException(422, "Seuls les fichiers PDF et les images sont acceptés ici.")

    content = await file.read()
    if not content:
        raise HTTPException(422, f"Fichier {extension.upper()} vide.")

    rows: list[dict] = []
    extraction_method = "pdfplumber"
    ocr_warnings: list[str] = []

    if extension == "pdf":
        try:
            import pdfplumber, io as _io
        except ImportError:
            pdfplumber = None  # type: ignore

        if pdfplumber is not None:
            try:
                with pdfplumber.open(_io.BytesIO(content)) as pdf:
                    for page in pdf.pages:
                        for table in (page.extract_tables() or []):
                            if not table or len(table) < 2:
                                continue
                            headers = [str(h or "").strip() for h in table[0]]
                            if len(headers) < 2:
                                continue
                            for raw_row in table[1:]:
                                row_dict = {
                                    headers[i]: (str(raw_row[i]).strip()
                                                 if i < len(raw_row) and raw_row[i] else None)
                                    for i in range(len(headers))
                                }
                                if any(_is_numeric(v) for v in row_dict.values()):
                                    rows.append(row_dict)
            except Exception as exc:
                log.warning("[PDF] Extraction par pdfplumber échouée : %s", exc)

        if not rows:
            if _OCR_AVAILABLE and _ocr_svc is not None:
                log.info("[PDF] Aucun tableau natif détecté ou données insuffisantes, fallback OCR/IA activé")
                ocr_result = _ocr_svc.extract(content, filename)
                rows = ocr_result.get("rows", [])
                extraction_method = ocr_result.get("method", "ocr")
                ocr_warnings = ocr_result.get("warnings", [])
            else:
                raise HTTPException(422,
                    "Aucune donnée numérique détectée dans le PDF. "
                    "Le document doit contenir des tableaux financiers ou être analysable par OCR.")

    else:
        if not _OCR_AVAILABLE or _ocr_svc is None:
            raise HTTPException(501,
                "Service OCR non disponible. "
                "pip install pytesseract pdf2image pdfplumber pillow pymupdf")
        try:
            log.info("[IMAGE] Extraction OCR automatique pour %s", filename)
            ocr_result = _ocr_svc.extract_image(content, filename)
            rows = ocr_result.get("rows", [])
            extraction_method = ocr_result.get("method", "tesseract_image")
            ocr_warnings = ocr_result.get("warnings", [])
        except Exception as exc:
            raise HTTPException(422, f"Extraction image échouée : {exc}")

    if not rows:
        raise HTTPException(422,
            "Aucune donnée numérique extraite de ce document. "
            "Essayez un autre document ou vérifiez que le format est correctement lisible.")

    try:
        ent_dict = json.loads(entreprise)
    except (json.JSONDecodeError, ValueError):
        ent_dict = {}

    use_llm = use_llm_moderator.lower() in ("true", "1", "yes")
    if ocr_warnings:
        log.info("[PDF] OCR warnings: %s", " | ".join(ocr_warnings))

    return await create_analyse(
        AnalyseRequest(
            filename=file.filename,
            data=rows,
            userId=userId,
            plan=plan,
            entreprise=ent_dict,
            extraction_method="ocr" if extraction_method != "pdfplumber" else "auto",
            use_llm_moderator=use_llm,
        ),
        token,
    )


# ════════ POST /analyses/upload/ocr ═════════════════════════

@router.post("/upload/ocr", response_model=AnalyseResponse, status_code=200,
    summary="Extraction OCR/IA depuis PDF scanné (liasse fiscale, bilan manuscrit…)")
async def upload_ocr(
    file:               UploadFile = File(...),
    userId:             str        = Form(...),
    plan:               str        = Form("standard"),
    entreprise:         str        = Form("{}"),
    use_llm_moderator:  str        = Form("true"),  # ← Activé par défaut pour l'OCR
    token:              dict       = Depends(verify_token),
) -> AnalyseResponse:
    """
    Pipeline OCR en cascade + LLM Moderator (activé par défaut pour l'OCR).
    Le LLM interprète le texte OCR et normalise les données.
    """
    if not _OCR_AVAILABLE or _ocr_svc is None:
        raise HTTPException(501,
            "Service OCR non disponible. "
            "pip install pytesseract pdf2image pdfplumber pillow pymupdf")

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier vide.")

    fname = file.filename or "document.pdf"
    extension = fname.lower().rsplit('.', 1)[-1]
    supported_image_ext = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "tif"}
    if extension not in {"pdf"} | supported_image_ext:
        raise HTTPException(422, "Format PDF ou image uniquement pour l'extraction OCR.")

    try:
        if extension == "pdf":
            ocr_result = _ocr_svc.extract(content, fname)
        else:
            ocr_result = _ocr_svc.extract_image(content, fname)
    except Exception as exc:
        raise HTTPException(500, f"Erreur OCR : {exc}")

    rows   = ocr_result.get("rows", [])
    meta   = ocr_result.get("meta", {})
    method = ocr_result.get("method", "unknown")

    if not rows or not any(rows):
        raise HTTPException(422,
            "OCR : aucune donnée financière extraite. "
            "Vérifiez que le PDF contient un bilan ou un compte de résultat.")

    try:
        ent_dict = json.loads(entreprise)
    except (json.JSONDecodeError, ValueError):
        ent_dict = {}

    if meta.get("entreprise") and not ent_dict.get("nom"):
        ent_dict["nom"] = meta["entreprise"]
    if meta.get("secteur") and not ent_dict.get("secteur"):
        ent_dict["secteur"] = meta["secteur"]
    if meta.get("pays") and not ent_dict.get("pays"):
        ent_dict["pays"] = meta["pays"]

    if meta.get("annees_activite"):
        for r in rows:
            r.setdefault("annees_activite", meta["annees_activite"])

    # Pour l'OCR, le LLM Moderator est activé par défaut
    use_llm = use_llm_moderator.lower() not in ("false", "0", "no")

    result_response = await create_analyse(
        AnalyseRequest(
            filename=fname, data=rows,
            userId=userId, plan=plan, entreprise=ent_dict,
            use_llm_moderator=use_llm,
        ),
        token,
    )

    return AnalyseResponse(
        analyseId       = result_response.analyseId,
        status          = f"completed_ocr_{method}",
        score           = result_response.score,
        score_confiance = result_response.score_confiance,
        llm_used        = result_response.llm_used,
        synthese_llm    = result_response.synthese_llm,
        corrections_count = result_response.corrections_count,
        anomalies_count   = result_response.anomalies_count,
    )


# ════════ POST /analyses/whatif ═══════════════════════════════

@router.post("/whatif", response_model=WhatIfResponse, status_code=200,
    summary="Simuler l'impact des modifications de ratios (sliders What-If)")
async def whatif(
    body:  WhatIfRequest,
    token: dict = Depends(verify_token),
) -> WhatIfResponse:
    analyse = firebase_service.get_analysis(body.analyseId)
    if not analyse:
        raise HTTPException(404, f"Analyse {body.analyseId!r} introuvable.")

    uid = token.get("uid", "")
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès refusé à cette analyse.")

    clean: dict[str, float] = {
        k: float(v) for k, v in body.ratioOverrides.items()
        if isinstance(v, (int, float)) and math.isfinite(float(v))
    }
    if not clean:
        raise HTTPException(422, "Aucun override valide fourni.")

    base: dict[str, float] = {}
    for r in (analyse.get("ratios") or []):
        key = r.get("feature_key") or _fr_to_key(r.get("name", ""))
        if key:
            try:
                base[key] = float(r["value"])
            except (TypeError, ValueError, KeyError):
                pass
    base.update(clean)

    service = get_analyse_service(analyse.get("plan", "standard"))
    try:
        result = service.analyse(rows=[base], entreprise=analyse.get("entreprise", ""),
                                 score_history_prev=None)
    except Exception as exc:
        raise HTTPException(500, f"Erreur simulation : {exc}")

    delta = round(float(result["score"] - analyse.get("score", 0)), 1)
    return WhatIfResponse(
        simulatedScore=result["score"], zone=result["zone"],
        deltaScore=delta,
    )


from fastapi.responses import JSONResponse, StreamingResponse, Response
import io
from app.services.pdf_service import pdf_service

# ... (reste des imports)

@router.get("/{analyse_id}/export")
async def export_analyse(
    analyse_id: str,
    format: str = "json", 
    token: dict = Depends(verify_token),
):
    uid     = token.get("uid", "")
    analyse = firebase_service.get_analysis(analyse_id)
    if not analyse:
        raise HTTPException(404, "Analyse introuvable")
    
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès non autorisé")

    # Normaliser le format (supporte "analyse", "risque" comme alias de "json")
    format_lower = format.lower()
    if format_lower in ["analyse", "risque", "json"]:
        actual_format = "json"
    elif format_lower == "pdf":
        actual_format = "pdf"
    else:
        raise HTTPException(400, f"Format d'export non supporté: {format}. Formats supportés: json, pdf, analyse, risque")

    # Préparation des données d'export communes
    export_data = {
        "metadata": {
            "id": analyse_id,
            "entreprise": analyse.get("entreprise"),
            "date": str(analyse.get("createdAt")),
            "score": analyse.get("score"),
            "zone": analyse.get("zone"),
            "confidence": analyse.get("confidence")
        },
        "ratios": analyse.get("ratios", []),
        "recommandations": analyse.get("recommendations", []),
        "radarDimensions": analyse.get("radarDimensions", []),
        "scoreHistory": analyse.get("scoreHistory", [])
    }

    if actual_format == "json":
        return JSONResponse(
            content=export_data,
            headers={"Content-Disposition": f"attachment; filename=doctor_smile_{analyse_id}.json"}
        )
    
    if actual_format == "pdf":
        try:
            pdf_bytes = pdf_service.generate_report(export_data)
            
            # Action WOW : Envoyer aussi par email si demandé
            email, name = await _get_user_email(uid)
            if email:
                import asyncio
                # On lance l'envoi en arrière-plan pour ne pas bloquer le téléchargement
                asyncio.create_task(email_service.send_report_pdf(email, name, export_data["metadata"]["entreprise"], pdf_bytes))
                log.info(f"🚀 Email de rapport PDF programmé pour {email}")

            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename=doctor_smile_{analyse_id}.pdf"}
            )
        except Exception as e:
            log.error(f"Erreur génération PDF: {e}")
            raise HTTPException(500, "Erreur lors de la génération du rapport PDF")
    
    raise HTTPException(400, "Format d'export non supporté")


# ── F2: Simulateur de Financement & Capacité d'Emprunt ─────────────
class FinancingSimulationRequest(BaseModel):
    analyse_id: str = Field(..., min_length=1)
    montant_credit: float = Field(..., gt=0, description="Montant du crédit souhaité en XAF")
    duree_mois: int = Field(12, ge=1, le=120, description="Durée du crédit en mois")


@router.post("/simulate-financing", status_code=200)
async def simulate_financing(
    body: FinancingSimulationRequest,
    token: dict = Depends(verify_token),
) -> dict:
    """
    Simule l'impact d'un financement sur la capacité d'emprunt et le score (F2).
    """
    uid = token.get("uid", "")
    
    # Récupérer l'analyse existante
    analyse = firebase_service.get_analysis(body.analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {body.analyse_id!r} introuvable.")
    
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès non autorisé à cette analyse.")
    
    try:
        # Extraire les comptes et ratios de l'analyse
        comptes_extraits = analyse.get("comptes_extraits", {})
        ratios_bruts = analyse.get("ratios_bruts", {})
        
        # Simuler l'impact
        simulation = simulate_financing_impact(
            comptes=comptes_extraits,
            ratios=ratios_bruts,
            montant_credit=body.montant_credit,
            duree_mois=body.duree_mois
        )
        
        log.info(f"[POST /analyses/simulate-financing] Simulation pour analyse {body.analyse_id}: {body.montant_credit} XAF")
        
        return {
            "status": "success",
            "simulation": simulation
        }
        
    except Exception as exc:
        log.error(f"[POST /analyses/simulate-financing] Erreur simulation: {exc}", exc_info=True)
        raise HTTPException(500, f"Erreur lors de la simulation: {exc}")


# ── F5: Générateur de Rapports Destinés aux Tiers ───────────────────
class ReportGenerationRequest(BaseModel):
    analyse_id: str = Field(..., min_length=1)
    rapport_type: str = Field("bancaire", pattern="^(bancaire|investisseur|partenaire)$", description="Type de rapport")


@router.post("/generate-report", status_code=200)
async def generate_report(
    body: ReportGenerationRequest,
    token: dict = Depends(verify_token),
) -> dict:
    """
    Génère un rapport structuré pour les tiers (F5).
    """
    uid = token.get("uid", "")
    
    # Récupérer l'analyse existante
    analyse = firebase_service.get_analysis(body.analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {body.analyse_id!r} introuvable.")
    
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès non autorisé à cette analyse.")
    
    try:
        # Générer le rapport
        rapport = generate_third_party_report(analyse, body.rapport_type)
        
        log.info(f"[POST /analyses/generate-report] Rapport {body.rapport_type} généré pour analyse {body.analyse_id}")
        
        return {
            "status": "success",
            "rapport": rapport
        }
        
    except Exception as exc:
        log.error(f"[POST /analyses/generate-report] Erreur génération rapport: {exc}", exc_info=True)
        raise HTTPException(500, f"Erreur lors de la génération du rapport: {exc}")


# ── F7: Gestion Historiques (Analyses + Conversations IA) ─────────────
@router.get("/history/analyses", status_code=200)
async def get_analyses_history(
    limit: int = Query(10, ge=1, le=50),
    token: dict = Depends(verify_token),
) -> dict:
    """
    Récupère l'historique des analyses de l'utilisateur (F7).
    """
    uid = token.get("uid", "")
    
    try:
        # Récupérer les analyses de l'utilisateur de manière non-bloquante
        analyses = await asyncio.to_thread(firebase_service.get_user_analyses, uid)
        
        # Formater l'historique
        formatted_history = format_analysis_history(analyses[:limit])
        
        log.info(f"[GET /analyses/history/analyses] {len(formatted_history)} analyses récupérées pour utilisateur {uid}")
        
        return {
            "status": "success",
            "history": formatted_history,
            "total": len(analyses)
        }
        
    except Exception as exc:
        log.error(f"[GET /analyses/history/analyses] Erreur récupération historique: {exc}", exc_info=True)
        raise HTTPException(500, f"Erreur lors de la récupération de l'historique: {exc}")


@router.get("/history/conversations", status_code=200)
async def get_conversations_history(
    limit: int = Query(10, ge=1, le=50),
    token: dict = Depends(verify_token),
) -> dict:
    """
    Récupère l'historique des conversations IA de l'utilisateur (F7).
    """
    uid = token.get("uid", "")
    
    try:
        # Récupérer les conversations de l'utilisateur de manière non-bloquante
        conversations = await asyncio.to_thread(firebase_service.get_user_conversations, uid)
        
        # Formater l'historique
        formatted_history = format_conversation_history(conversations[:limit])
        
        log.info(f"[GET /analyses/history/conversations] {len(formatted_history)} conversations récupérées pour utilisateur {uid}")
        
        return {
            "status": "success",
            "history": formatted_history,
            "total": len(conversations)
        }
        
    except Exception as exc:
        log.error(f"[GET /analyses/history/conversations] Erreur récupération historique: {exc}", exc_info=True)
        raise HTTPException(500, f"Erreur lors de la récupération de l'historique: {exc}")


@router.delete("/{analyse_id}", status_code=200)
async def delete_analyse(
    analyse_id: str,
    token: dict = Depends(verify_token),
) -> dict:
    uid     = token.get("uid", "")
    analyse = await asyncio.to_thread(firebase_service.get_analysis, analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {analyse_id!r} introuvable.")
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès refusé — vous n'êtes pas le propriétaire.")

    success = await asyncio.to_thread(firebase_service.delete_analysis, analyse_id)
    if success:
        await asyncio.to_thread(firebase_service.log_event, uid, "analyse_deleted", {"analyseId": analyse_id})
        return {"status": "deleted", "analyseId": analyse_id}
    raise HTTPException(500, "Suppression Firestore échouée.")


