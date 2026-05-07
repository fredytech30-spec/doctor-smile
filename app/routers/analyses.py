"""
ROUTER — analyses.py  v3 — LLM Moderator intégré
DOCTOR SMILE
════════════════════════════════════════════════════════════════

POST /analyses              → pipeline ML (+ mode IA avancé optionnel)
POST /analyses/upload       → extraction PDF tableaux
POST /analyses/upload/ocr   → extraction PDF OCR/IA
POST /analyses/whatif       → simulation What-If
GET  /analyses/export/{token} → export JSON sécurisé
POST /analyses/export/generate → génération token

NOUVEAU v3 :
  - Paramètre `use_llm_moderator: bool = False` dans AnalyseRequest
  - Si True : passe par llm_moderator_service avant le pipeline ML
  - Retourne data_quality, synthese_llm, corrections dans le résultat
  - Seuil de confiance configurable (min 30% pour lancer le ML)
════════════════════════════════════════════════════════════════
"""
from __future__ import annotations
import base64, json, logging, math, uuid, os, time, hmac, hashlib
from typing import Any
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from firebase_admin import firestore as fs
from app.middleware.firebase_verify import verify_token
from app.services.analyse_service   import get_analyse_service
from app.services.firebase_service  import firebase_service

# ── LLM Moderator — import silencieux ────────────────────────
try:
    from app.services.llm_moderator_service import llm_moderator_service as _llm_mod
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

_EXPORT_SECRET = os.getenv("EXPORT_TOKEN_SECRET", "doctorsmile-export-secret-changeme")
_MIN_CONFIDENCE_FOR_ML = int(os.getenv("LLM_MIN_CONFIDENCE", "30"))  # 30% minimum

log    = logging.getLogger("doctorsmile.router.analyses")
router = APIRouter(prefix="/analyses", tags=["Analyses"])


# ── Schemas ──────────────────────────────────────────────────

class AnalyseRequest(BaseModel):
    filename:            str
    data:                list[dict[str, Any]]
    userId:              str
    plan:                str             = Field("standard", pattern="^(standard|premium|extra)$")
    entreprise:          dict[str, Any]  = {}
    use_llm_moderator:   bool            = False   # ← Mode IA avancé (optionnel)
    llm_context:         dict[str, Any]  = {}      # secteur, pays, devise pour le LLM


class WhatIfRequest(BaseModel):
    analyseId:      str
    ratioOverrides: dict[str, float]

class AnalyseResponse(BaseModel):
    analyseId:          str
    status:             str
    score:              int
    score_confiance:    int   = 100   # 100 = pas de modération LLM
    llm_used:           str   = ""    # "groq_llama3.3" | "gemini_flash" | ""
    synthese_llm:       str   = ""
    corrections_count:  int   = 0
    anomalies_count:    int   = 0

class WhatIfResponse(BaseModel):
    simulatedScore:    int
    zone:              str
    probabiliteDefaut: float
    delta:             float


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
    llm_meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Document Firestore analyses/{id}.
    Enrichi avec les métadonnées LLM si mode IA avancé activé.
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
        "zone":              result["zone"],
        "probabiliteDefaut": result["probabiliteDefaut"],
        "confidence":        result["confidence"],
        "confiance":         result["confiance"],
        "auc":               result["auc"],
        "processingMs":      result["processingMs"],
        "model":             result["model"],
        "shapValues":        result["shapValues"],
        "ratios":            result["ratios"],
        "radarDimensions":   result["radarDimensions"],
        "recommendations":   result["recommendations"],
        "scoreHistory":      result["scoreHistory"],
        "secteur":           body.entreprise.get("secteur", ""),
        "taille":            body.entreprise.get("taille", ""),
        "pays":              body.entreprise.get("pays", "Cameroun"),
        "whatifParams":      [],
        "modelProbs":        result.get("modelProbs", {}),
        "llm_moderator":     False,
    }

    # Enrichir avec les métadonnées LLM si disponibles
    if llm_meta:
        doc.update({
            "llm_moderator":    True,
            "llm_used":         llm_meta.get("llm_used", ""),
            "score_confiance":  llm_meta.get("score_confiance", 100),
            "synthese_llm":     llm_meta.get("synthese", ""),
            "data_quality":     llm_meta.get("qualite", {}),
            "data_corrections": llm_meta.get("corrections", []),
            "data_anomalies":   llm_meta.get("anomalies", []),
            "devise":           llm_meta.get("devise", "FCFA"),
            "secteur":          llm_meta.get("secteur", doc["secteur"]),
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
        body.entreprise.get("nom")
        or body.filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    )

    prev_scores = firebase_service.get_score_history(body.userId, entreprise_nom)
    service     = get_analyse_service(body.plan)

    # ══════════════════════════════════════════════════════════
    # MODE IA AVANCÉ — LLM Moderator
    # ══════════════════════════════════════════════════════════
    llm_meta: dict[str, Any] | None = None
    rows_to_predict = body.data

    if body.use_llm_moderator and _LLM_MOD_AVAILABLE and _llm_mod:
        try:
            import pandas as pd

            # Convertir les rows brutes en DataFrame pour le LLM
            raw_df = pd.DataFrame(body.data)

            # Contexte utilisateur pour le LLM
            ctx = body.llm_context or {}
            secteur = ctx.get("secteur") or body.entreprise.get("secteur") or "autre"
            pays    = ctx.get("pays")    or body.entreprise.get("pays")    or "Cameroun"
            devise  = ctx.get("devise")  or body.entreprise.get("devise")  or "FCFA"

            log.info("[LLM Moderator] Lancement pour %s — secteur=%s pays=%s",
                     entreprise_nom, secteur, pays)

            llm_result = await _llm_mod.moderate(
                raw_df     = raw_df,
                entreprise = entreprise_nom,
                secteur    = secteur,
                pays       = pays,
                devise     = devise,
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
                body.entreprise["secteur"] = llm_result["secteur"]
            if llm_result.get("pays"):
                body.entreprise["pays"] = llm_result["pays"]

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
    # PIPELINE ML (standard ou post-LLM)
    # ══════════════════════════════════════════════════════════
    try:
        result = service.predict(
            rows               = rows_to_predict,
            entreprise         = entreprise_nom,
            score_history_prev = prev_scores,
        )
    except Exception as exc:
        log.error("[POST /analyses] Pipeline ML: %s", exc, exc_info=True)
        raise HTTPException(500, f"Erreur pipeline ML : {type(exc).__name__}: {exc}")

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

    log.info("[POST /analyses] ✓ %s score=%d zone=%s ms=%d",
             analyse_id, result["score"], result["zone"], result["processingMs"])

    return AnalyseResponse(
        analyseId       = analyse_id,
        status          = "completed",
        score           = result["score"],
        score_confiance = llm_meta.get("score_confiance", 100) if llm_meta else 100,
        llm_used        = llm_meta.get("llm_used", "") if llm_meta else "",
        synthese_llm    = llm_meta.get("synthese", "") if llm_meta else "",
        corrections_count = len(llm_meta.get("corrections", [])) if llm_meta else 0,
        anomalies_count   = len(llm_meta.get("anomalies", [])) if llm_meta else 0,
    )


# ════════ POST /analyses/upload ═══════════════════════════════

@router.post("/upload", response_model=AnalyseResponse, status_code=200,
    summary="Analyser un PDF (extraction tableaux + pipeline ML)")
async def upload_pdf(
    file:               UploadFile = File(...),
    userId:             str        = Form(...),
    plan:               str        = Form("standard"),
    entreprise:         str        = Form("{}"),
    use_llm_moderator:  str        = Form("false"),
    token:              dict       = Depends(verify_token),
) -> AnalyseResponse:
    """Extrait les tableaux d'un PDF, puis pipeline ML (+ mode IA optionnel)."""
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(422, "Seuls les fichiers PDF sont acceptés ici.")
    try:
        import pdfplumber, io as _io
    except ImportError:
        raise HTTPException(501, "pdfplumber non installé — pip install pdfplumber")

    content = await file.read()
    if not content:
        raise HTTPException(422, "Fichier PDF vide.")

    rows: list[dict] = []
    try:
        with pdfplumber.open(_io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                for table in (page.extract_tables() or []):
                    if not table or len(table) < 2:
                        continue
                    headers = [str(h or "").strip() for h in table[0]]
                    if not any(headers):
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
        raise HTTPException(422, f"Extraction PDF échouée : {exc}")

    if not rows:
        raise HTTPException(422,
            "Aucune donnée numérique dans ce PDF. "
            "Le document doit contenir des tableaux financiers structurés.")

    try:
        ent_dict = json.loads(entreprise)
    except (json.JSONDecodeError, ValueError):
        ent_dict = {}

    use_llm = use_llm_moderator.lower() in ("true", "1", "yes")

    return await create_analyse(
        AnalyseRequest(
            filename=file.filename, data=rows,
            userId=userId, plan=plan, entreprise=ent_dict,
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
    if not fname.lower().endswith(".pdf"):
        raise HTTPException(422, "Format PDF uniquement pour l'extraction OCR.")

    try:
        ocr_result = _ocr_svc.extract(content, fname)
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
        result = service.predict(rows=[base], entreprise=analyse.get("entreprise", ""),
                                 score_history_prev=None)
    except Exception as exc:
        raise HTTPException(500, f"Erreur simulation : {exc}")

    delta = round(float(result["score"] - analyse.get("score", 0)), 1)
    return WhatIfResponse(
        simulatedScore=result["score"], zone=result["zone"],
        probabiliteDefaut=result["probabiliteDefaut"], delta=delta,
    )


# ════════ DELETE /analyses/{analyse_id} ══════════════════════

@router.delete("/{analyse_id}", status_code=200)
async def delete_analyse(
    analyse_id: str,
    token: dict = Depends(verify_token),
) -> dict:
    uid     = token.get("uid", "")
    analyse = firebase_service.get_analysis(analyse_id)
    if not analyse:
        raise HTTPException(404, f"Analyse {analyse_id!r} introuvable.")
    if uid and uid != "dev-uid-000" and analyse.get("userId") != uid:
        raise HTTPException(403, "Accès refusé — vous n'êtes pas le propriétaire.")

    if firebase_service.delete_analysis(analyse_id):
        firebase_service.log_event(uid, "analyse_deleted", {"analyseId": analyse_id})
        return {"status": "deleted", "analyseId": analyse_id}
    raise HTTPException(500, "Suppression Firestore échouée.")