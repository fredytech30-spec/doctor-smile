# 🚀 IMPLEMENTATION ROADMAP — Semaines 1-2
## Quick Wins + Foundation Solide

---

## 📌 SEMAINE 1 : PREPROCESSING LAYER (Jours 1-5)

### Jour 1-2 : Document Classification + Validation

```python
# app/services/document_classifier.py (NEW)

import hashlib
from enum import Enum
from pydantic import BaseModel

class DocumentType(str, Enum):
    LIASSE_FISCALE = "liasse_fiscale"          # 2050, 2051 formes aggr
    BALANCE_GENERALE = "balance_generale"      # Compte × Débit/Crédit
    COMPTE_RESULTAT = "compte_resultat"        # P&L, revenues et charges
    RELEVE_BANCAIRE = "releve_bancaire"        # Transactions/flux
    EXPORT_COMPTABLE = "export_comptable"      # Sage, Cegid, QB
    RAPPORT_FINANCIER = "rapport_financier"    # Libre forme, narrative

class DocumentQualityScore(BaseModel):
    """
    Évalue qualité du document fourni AVANT traitement
    """
    overall_score: float  # 0-100
    ocr_readability: float
    table_structure_quality: float
    numeric_consistency: float
    document_completeness: float
    recommendations: list[str]

class DocumentClassifier:
    
    async def classify_and_validate(
        self,
        file_bytes: bytes,
        filename: str
    ) -> dict:
        """
        Returns: {
            type: DocumentType,
            quality: DocumentQualityScore,
            hash: str,
            is_duplicate: bool,
            action: 'PROCESS' | 'REVIEW_QUALITY' | 'REQUEST_REUPLOAD'
        }
        """
        
        # Étape 1: Filetype basic check
        file_type = self._detect_file_type(file_bytes, filename)
        if file_type not in ['pdf', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']:
            return {'error': f'Type non supporté: {file_type}'}
        
        # Étape 2: Normalization (tous en PDF)
        if file_type in ['xlsx', 'xls']:
            pdf_bytes = await self._convert_excel_to_pdf(file_bytes)
        elif file_type in ['png', 'jpg', 'jpeg']:
            pdf_bytes = await self._convert_image_to_pdf(file_bytes)
        else:
            pdf_bytes = file_bytes
        
        # Étape 3: Hash pour dédoublonnage
        doc_hash = hashlib.sha256(pdf_bytes).hexdigest()
        is_duplicate = await self._check_duplicate(doc_hash)
        if is_duplicate:
            return {'error': 'Document déjà traité (duplicate)'}
        
        # Étape 4: Classification via pattern matching + miniature Groq
        document_type = await self._classify_document_type(pdf_bytes)
        
        # Étape 5: Quality assessment multidimensionnel
        quality = await self._assess_quality(pdf_bytes, document_type)
        
        # Étape 6: Decision logic
        if quality.overall_score >= 75:
            action = 'PROCESS'
        elif quality.overall_score >= 50:
            action = 'REVIEW_QUALITY'
        else:
            action = 'REQUEST_REUPLOAD'
        
        return {
            'type': document_type,
            'quality': quality,
            'hash': doc_hash,
            'is_duplicate': False,
            'action': action,
            'pdf_bytes': pdf_bytes
        }
    
    async def _assess_quality(
        self,
        pdf_bytes: bytes,
        doc_type: DocumentType
    ) -> DocumentQualityScore:
        """
        Multi-dimensional quality check
        """
        
        metrics = {}
        
        # 1. OCR readability (test sur 1ère page)
        first_page_text = extract_text_tesseract(pdf_bytes, page=0)
        metrics['ocr_readability'] = self._score_ocr_readability(first_page_text)
        # Heuristic: ratio alphanum/spaces
        
        # 2. Table structure quality (détecte tableaux)
        tables = extract_tables_pdfplumber(pdf_bytes)
        metrics['table_structure_quality'] = (
            100 if len(tables) > 0 else
            50  # Scanné, pas de tableaux natifs
        )
        
        # 3. Numeric consistency (chiffres extraits vs attendus)
        numbers_extracted = extract_all_numbers(first_page_text)
        metrics['numeric_consistency'] = (
            100 if len(numbers_extracted) > 10 else
            50 if len(numbers_extracted) > 3 else
            30
        )
        
        # 4. Document completeness (selon type)
        completeness_check = {
            DocumentType.BALANCE_GENERALE: {
                'actif_found': 'actif' in first_page_text.lower(),
                'passif_found': 'passif' in first_page_text.lower(),
                'score_if_both': 100,
                'score_if_one': 50,
                'score_if_none': 20,
            },
            DocumentType.RELEVE_BANCAIRE: {
                'transactions_found': 'solde' in first_page_text.lower(),
                'score': 80 if 'solde' in first_page_text.lower() else 40,
            },
        }[doc_type]
        metrics['document_completeness'] = completeness_check.get('score', 60)
        
        # Score global
        overall = np.mean([
            metrics['ocr_readability'] * 0.3,
            metrics['table_structure_quality'] * 0.2,
            metrics['numeric_consistency'] * 0.3,
            metrics['document_completeness'] * 0.2,
        ])
        
        recommendations = []
        if metrics['ocr_readability'] < 60:
            recommendations.append("Qualité OCR faible. Image trop petite ou floue?")
        if metrics['table_structure_quality'] < 50:
            recommendations.append("Aucun tableau détecté. Document scanné or libre-forme?")
        if overall < 60:
            recommendations.append("Recommander upload par formulaire manuel")
        
        return DocumentQualityScore(
            overall_score=overall,
            ocr_readability=metrics['ocr_readability'],
            table_structure_quality=metrics['table_structure_quality'],
            numeric_consistency=metrics['numeric_consistency'],
            document_completeness=metrics['document_completeness'],
            recommendations=recommendations
        )
    
    async def _classify_document_type(
        self,
        pdf_bytes: bytes
    ) -> DocumentType:
        """
        Classify via keywords + pattern + LLM fallback
        """
        
        full_text = extract_all_text(pdf_bytes)
        
        # Pattern matching (fast, heuristic)
        patterns = {
            DocumentType.LIASSE_FISCALE: r'(2050|2051|2052|liasse\s*fiscale)',
            DocumentType.BALANCE_GENERALE: r'(balance\s*générale|actif.*passif)',
            DocumentType.COMPTE_RESULTAT: r'(compte.*résultat|p\s*[&/]\s*l|revenue|charges)',
            DocumentType.RELEVE_BANCAIRE: r'(relevé\s*bancaire|transactions|solde)',
            DocumentType.EXPORT_COMPTABLE: r'(sage|cegid|quickbooks|export)',
        }
        
        for doc_type, pattern in patterns.items():
            if re.search(pattern, full_text, re.IGNORECASE):
                return doc_type
        
        # LLM fallback (si pattern matching échoue)
        prompt = f"""
        Document text (first 2000 chars):
        {full_text[:2000]}
        
        Classify as ONE of:
        - liasse_fiscale (French tax forms 2050/2051)
        - balance_generale (Chart of accounts with debit/credit)
        - compte_resultat (Income statement, P&L)
        - releve_bancaire (Bank statement)
        - export_comptable (Accounting software export)
        - rapport_financier (Free-form financial report)
        
        RESPOND WITH SINGLE WORD ONLY.
        """
        
        response = await groq_api.complete(prompt)
        return DocumentType(response.strip().lower())


# ════════════════════════════════════════════════════════════════
# app/routers/analyses.py — UPDATE POST /analyses/upload
# ════════════════════════════════════════════════════════════════

@router.post("/analyses/upload")
async def upload_analysis_with_validation(
    file: UploadFile = File(...),
    user_id: str = Depends(verify_token),
):
    """
    NEW: Validate + Classify before processing
    """
    
    classifier = DocumentClassifier()
    file_bytes = await file.read()
    
    # Classification + Quality assessment
    validation_result = await classifier.classify_and_validate(
        file_bytes,
        file.filename
    )
    
    if 'error' in validation_result:
        raise HTTPException(status_code=400, detail=validation_result['error'])
    
    quality = validation_result['quality']
    action = validation_result['action']
    pdf_bytes = validation_result['pdf_bytes']
    doc_hash = validation_result['hash']
    
    # Log quality attempt
    logger.info({
        'message': 'document_validated',
        'quality_score': quality.overall_score,
        'action': action,
        'recommendations': quality.recommendations
    })
    
    # Store in Firestore for audit trail
    await firebase_service.store_document_metadata(
        user_id=user_id,
        filename=file.filename,
        quality_score=quality.overall_score,
        doc_type=validation_result['type'],
        hash=doc_hash,
        timestamp=datetime.now()
    )
    
    if action == 'PROCESS':
        # Proceed to OCR + LLM pipeline
        document_id = str(uuid.uuid4())
        
        # Trigger async orchestrator
        await orchestrator.process_document_full_pipeline(
            document_id=document_id,
            file_data=pdf_bytes,
            user_id=user_id
        )
        
        return {
            'status': 'processing',
            'document_id': document_id,
            'quality_score': quality.overall_score,
            'message': 'Document accepté. Traitement en cours...'
        }
    
    elif action == 'REVIEW_QUALITY':
        return {
            'status': 'review_required',
            'quality_score': quality.overall_score,
            'reasons': quality.recommendations,
            'suggestion': 'Voulez-vous continuer malgré qualité moyenne?',
            'next_action': 'Afficher bouton "Continuer" en UI'
        }
    
    else:  # REQUEST_REUPLOAD
        return {
            'status': 'quality_too_low',
            'quality_score': quality.overall_score,
            'reasons': quality.recommendations,
            'suggestion': 'Veuillez télécharger un document de meilleure qualité',
            'next_action': 'Afficher formulaire manuel ou nouveau upload en UI'
        }
```

### Jour 3-4 : WebSocket Progress Streaming

```python
# app/routers/realtime.py (NEW)

from fastapi import WebSocket
from apps.services.orchestrator_service import DocumentOrchestrator
import aioredis

orchestrator = DocumentOrchestrator()

@router.websocket("/ws/analysis/{document_id}")
async def websocket_analysis_progress(
    websocket: WebSocket,
    document_id: str
):
    """
    Client se connecte et reçoit updates temps réel:
    {
        "stage": "validation_started",  # ou ocr_processing, llm_enrichment, etc
        "progress": 0,                   # 0-100
        "message": "Extracting tables..."
        "estimated_remaining_seconds": 45
    }
    
    À completion:
    {
        "stage": "completed",
        "progress": 100,
        "data": { full_analysis_output }
    }
    """
    
    await websocket.accept()
    redis = aioredis.from_url("redis://localhost")
    
    channel = f"analysis_progress:{document_id}"
    psub = await redis.subscribe(channel)
    
    try:
        async for message in psub.iter():
            if message['type'] == 'message':
                progress_event = json.loads(message['data'])
                await websocket.send_json(progress_event)
                
                if progress_event['stage'] == 'completed':
                    break
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await websocket.close()
        await redis.close()


# ════════════════════════════════════════════════════════════════
# app/services/orchestrator_service.py (NEW)
# ════════════════════════════════════════════════════════════════

import aioredis
from app.services.ocr_service import ocr_service
from app.services.llm_moderator_service import llm_moderator
from app.services.syscohada_engine import compute_analysis

class DocumentOrchestrator:
    """
    Orchestre full pipeline avec progress publishing
    """
    
    def __init__(self):
        self.redis = None
    
    async def _init_redis(self):
        if not self.redis:
            self.redis = aioredis.from_url("redis://localhost")
    
    async def _publish_progress(
        self,
        document_id: str,
        stage: str,
        progress: int,
        message: str,
        estimated_remaining: int = None
    ):
        """Publish progress to Redis channel"""
        
        await self._init_redis()
        
        event = {
            'stage': stage,
            'progress': progress,
            'message': message,
            'estimated_remaining_seconds': estimated_remaining,
            'timestamp': datetime.now().isoformat()
        }
        
        await self.redis.publish(
            f"analysis_progress:{document_id}",
            json.dumps(event)
        )
    
    async def process_document_full_pipeline(
        self,
        document_id: str,
        file_data: bytes,
        user_id: str,
        document_type: str = None
    ):
        """
        Full orchestration with progress events
        """
        
        try:
            # Stage 1: OCR Extraction (20% progress)
            await self._publish_progress(
                document_id, 'ocr_processing', 5,
                message='Initialisation extraction...'
            )
            
            ocr_result = await ocr_service.extract_text_and_tables(
                file_data,
                document_type=document_type
            )
            
            await self._publish_progress(
                document_id, 'ocr_processing', 20,
                message=f'✅ Extraction complétée ({len(ocr_result["text"])} chars)'
            )
            
            # Stage 2: LLM Enrichment & Validation (50% progress)
            await self._publish_progress(
                document_id, 'llm_enrichment', 25,
                message='Analyse sémantique avec IA en cours...'
            )
            
            llm_result = await llm_moderator.moderate(
                text=ocr_result['text'],
                tables=ocr_result['tables'],
                document_type=document_type
            )
            
            await self._publish_progress(
                document_id, 'llm_enrichment', 50,
                message='✅ Enrichissement LLM terminé'
            )
            
            # Stage 3: SYSCOHADA Analysis (70% progress)
            await self._publish_progress(
                document_id, 'syscohada_computation', 55,
                message='Calcul ratios financiers...'
            )
            
            analysis = await compute_analysis(
                extracted_data=llm_result['structured'],
                document_type=document_type
            )
            
            await self._publish_progress(
                document_id, 'syscohada_computation', 75,
                message='✅ Analyse SYSCOHADA complétée'
            )
            
            # Stage 4: Export & Storage (90% progress)
            await self._publish_progress(
                document_id, 'export_storage', 80,
                message='Génération rapport...'
            )
            
            export_result = await self._generate_export(
                document_id, analysis, user_id
            )
            
            await self._publish_progress(
                document_id, 'export_storage', 95,
                message='Sauvegarde sécurisée...'
            )
            
            # Store in Firestore
            await firebase_service.store_analysis(
                document_id=document_id,
                user_id=user_id,
                analysis=analysis,
                export_url=export_result['url']
            )
            
            # Stage: Completed (100%)
            await self._publish_progress(
                document_id, 'completed', 100,
                message='✅ Analyse complète!',
                data=analysis
            )
            
        except Exception as e:
            logger.error(f"Pipeline error for {document_id}: {e}")
            await self._publish_progress(
                document_id, 'error', 0,
                message=f'❌ Erreur: {str(e)}'
            )
            raise
    
    async def _generate_export(self, document_id, analysis, user_id):
        """Generate export (JSON + PDF option)"""
        
        # Store as JSON first (fast)
        export_url = f"exports/{user_id}/{document_id}.json"
        
        json_data = json.dumps(analysis, indent=2, default=str)
        await firebase_service.upload_to_storage(
            path=export_url,
            data=json_data.encode()
        )
        
        return {'url': export_url, 'format': 'json'}
```

### Jour 5 : Frontend WebSocket Integration

```typescript
// src/hooks/useAnalysisProgress.ts

import { useEffect, useState, useCallback } from 'react';

interface ProgressEvent {
  stage: string;
  progress: number;
  message: string;
  estimated_remaining_seconds?: number;
  data?: any;
}

export const useAnalysisProgress = (documentId: string | null) => {
  const [progressEvent, setProgressEvent] = useState<ProgressEvent | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;

    // Determine WS protocol based on current protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/analysis/${documentId}`;

    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setProgressEvent(data);
        setError(null);

        if (data.stage === 'completed') {
          setIsComplete(true);
        } else if (data.stage === 'error') {
          setError(data.message);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        setError('Connexion perdue');
      };

      ws.onclose = () => {
        console.log('WebSocket fermée');
      };
    } catch (e) {
      setError('Impossible de se connecter au serveur');
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [documentId]);

  return {
    progress: progressEvent?.progress ?? 0,
    stage: progressEvent?.stage ?? 'idle',
    message: progressEvent?.message ?? '',
    estimatedRemaining: progressEvent?.estimated_remaining_seconds,
    isComplete,
    error,
    data: progressEvent?.data,
  };
};


// src/components/analysis/AnalysisProgressBar.tsx

export const AnalysisProgressBar = ({ documentId }: { documentId: string }) => {
  const { progress, stage, message, estimatedRemaining, isComplete, error } =
    useAnalysisProgress(documentId);

  const stageLabels: Record<string, string> = {
    ocr_processing: '📄 Extraction OCR',
    llm_enrichment: '🧠 Analyse IA',
    syscohada_computation: '📊 Calcul ratios',
    export_storage: '💾 Sauvegarde',
    completed: '✅ Terminé',
    error: '❌ Erreur',
  };

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-semibold">Erreur: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage label + percentage */}
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">
          {stageLabels[stage] || stage}
        </span>
        <span className="text-sm font-bold text-blue-600">{progress}%</span>
      </div>

      {/* Current message */}
      <p className="text-sm text-gray-600 italic">{message}</p>

      {/* Estimated remaining time */}
      {estimatedRemaining && estimatedRemaining > 0 && (
        <p className="text-xs text-gray-500">
          Temps estimé: {Math.ceil(estimatedRemaining)}s
        </p>
      )}

      {/* Success state */}
      {isComplete && (
        <button
          onClick={() => window.location.href = `/analysis/${documentId}`}
          className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
        >
          📊 Voir l'analyse complète
        </button>
      )}
    </div>
  );
};
```

---

## 📌 SEMAINE 2 : SYSCOHADA² CORE (Jours 6-10)

### Jour 6-7 : 7-Axis Analysis Framework

```python
# app/services/syscohada_v2.py (NEW)

class SYSCOHADA_V2:
    """
    Moteur diagnostic 360° — 7 axes
    """
    
    async def build_comprehensive_analysis(
        self,
        balance: dict,
        historical_balances: list[dict] = None,
        sector: str = None
    ) -> dict:
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'document_id': balance.get('document_id'),
            'company_info': {
                'name': balance.get('name'),
                'sector': sector,
                'fiscal_year': balance.get('year'),
            },
            # 7 AXES
            'solidite': await self._compute_solidite(balance),
            'liquidite': await self._compute_liquidite(balance),
            'rentabilite': await self._compute_rentabilite(balance, historical_balances),
            'efficacite': await self._compute_efficacite(balance),
            'secteur_contexte': await self._compute_sector_context(balance, sector),
            'risques_aigus': await self._compute_acute_risks(balance),
            'plan_action': await self._generate_action_plan(balance),
            
            # Aggregate indicators
            'global_score': None,  # Calculated below
            'health_rating': None,
            'default_risk_12m': None,
        }
        
        # Global scoring
        results['global_score'] = self._aggregate_score(results)
        results['health_rating'] = self._rate_health(results['global_score'])
        results['default_risk_12m'] = await self._predict_default(balance)
        
        return results
    
    async def _compute_solidite(self, balance: dict) -> dict:
        """
        Axe 1: Financial Solidity (Structure)
        """
        
        try:
            dettes = balance.get('dettes_totales', 0)
            capitaux = balance.get('capitaux_propres', 10)  # Avoid division by 0
            dettes_lt = balance.get('dettes_lt', 0)
            immobilisations = balance.get('actif_immobilise', 0)
            
            ratings = {
                'autonomie_financiere': dettes / capitaux if capitaux > 0 else 999,
                'solvabilite': capitaux / dettes if dettes > 0 else 0,
                'couverture_immo': (capitaux + dettes_lt) / immobilisations if immobilisations > 0 else 0,
            }
            
            # Scoring logic
            score = 0
            if ratings['autonomie_financiere'] < 1.0:
                score += 33  # ✅ Bonne autonomie
            elif ratings['autonomie_financiere'] < 1.5:
                score += 20  # ⚠️ Acceptable
            else:
                score += 5   # 🔴 Risqué
            
            if ratings['solvabilite'] > 0.5:
                score += 33  # ✅
            elif ratings['solvabilite'] > 0.25:
                score += 20
            else:
                score += 5
            
            if ratings['couverture_immo'] > 0.8:
                score += 34  # ✅
            else:
                score += 17  # ⚠️
            
            verdict = (
                'SOLIDE' if score >= 85 else
                'À_SURVEILLER' if score >= 50 else
                'EN_RISQUE'
            )
            
            return {
                'score': score,
                'ratios': ratings,
                'verdict': verdict,
                'explanation': f"Autonomie: {ratings['autonomie_financiere']:.2f}x (< 1 idéal)"
            }
            
        except Exception as e:
            logger.warning(f"Solidité calculation error: {e}")
            return {'score': 0, 'error': str(e)}
    
    async def _compute_liquidite(self, balance: dict) -> dict:
        """
        Axe 2: Liquidity & Cash Runway
        """
        
        try:
            actif_courant = balance.get('actif_courant', 0)
            passif_courant = balance.get('passif_courant', 1)
            stocks = balance.get('stocks', 0)
            cash = balance.get('cash', 0)
            monthly_burn = balance.get('monthly_burn_rate', None)
            
            ratios = {
                'liquidite_generale': actif_courant / passif_courant if passif_courant > 0 else 0,
                'liquidite_reduite': (actif_courant - stocks) / passif_courant if passif_courant > 0 else 0,
                'tresorerie_nette': cash - balance.get('dettes_ct', 0),
            }
            
            # Cash runway
            if monthly_burn and monthly_burn > 0:
                ratios['cash_runway_months'] = cash / monthly_burn
            else:
                ratios['cash_runway_months'] = None
            
            score = 0
            if ratios['liquidite_generale'] >= 1.2:
                score += 50  # ✅ Excellent
            elif ratios['liquidite_generale'] >= 0.9:
                score += 30  # ⚠️ OK
            else:
                score += 10  # 🔴 Critique
            
            if ratios['tresorerie_nette'] > 0:
                score += 50  # ✅
            else:
                score += 10  # 🔴
            
            warning = (
                'RISQUE_DEFAUT' if ratios.get('cash_runway_months', 999) < 3 else
                'A_SURVEILLER' if ratios.get('cash_runway_months', 999) < 6 else
                'OK'
            )
            
            return {
                'score': score,
                'ratios': ratios,
                'warning': warning,
                'explanation': f"Ratio courant: {ratios['liquidite_generale']:.2f} (1.0-1.5 idéal)"
            }
            
        except Exception as e:
            logger.warning(f"Liquidité calculation error: {e}")
            return {'score': 0, 'error': str(e)}
    
    async def _compute_rentabilite(
        self,
        balance: dict,
        historical_balances: list[dict] = None
    ) -> dict:
        """
        Axe 3: Profitability & Growth
        """
        
        try:
            resultat_net = balance.get('resultat_net', 0)
            ca = balance.get('ca', 1)
            capitaux = balance.get('capitaux_propres', 1)
            actif_total = balance.get('actif_total', 1)
            
            ratios = {
                'roe': resultat_net / capitaux if capitaux > 0 else 0,
                'roa': resultat_net / actif_total if actif_total > 0 else 0,
                'marge_nette': resultat_net / ca if ca > 0 else 0,
            }
            
            # Growth trajectory
            trend = 'STABLE'
            if historical_balances and len(historical_balances) > 1:
                ca_growth = (balance['ca'] - historical_balances[0]['ca']) / historical_balances[0]['ca']
                if ca_growth > 0.20:
                    trend = 'ACCELERANT'
                elif ca_growth < -0.10:
                    trend = 'DECLINANT'
            
            ratios['growth_trajectory'] = trend
            
            score = 0
            if ratios['roe'] > 0.15:
                score += 50  # ✅ Excellent
            elif ratios['roe'] > 0.05:
                score += 30
            else:
                score += 10
            
            if ratios['roa'] > 0.08:
                score += 50
            else:
                score += 25 if ratios['roa'] > 0 else 5
            
            return {
                'score': score,
                'ratios': ratios,
                'trend': trend,
                'explanation': f"ROE: {ratios['roe']*100:.1f}% (> 10% idéal)"
            }
            
        except Exception as e:
            logger.warning(f"Rentabilité calculation error: {e}")
            return {'score': 0, 'error': str(e)}
    
    async def _compute_efficacite(self, balance: dict) -> dict:
        """
        Axe 4: Operational Efficiency
        """
        # (rotation_actif, rotation_stocks, working_capital_cycle)
        # ...similar pattern to above
        return {'score': 75, 'ratios': {}}  # Placeholder
    
    async def _compute_sector_context(self, balance: dict, sector: str) -> dict:
        """
        Axe 5: Sector Benchmarks & Context
        """
        # Compare to sector medians
        return {'sector': sector, 'percentile_vs_peers': 65}  # Placeholder
    
    async def _compute_acute_risks(self, balance: dict) -> dict:
        """
        Axe 6: Acute Risks (receivables, concentration, etc.)
        """
        # Doubtful receivables, payables aging, concentration
        return {'risks': []}  # Placeholder
    
    async def _generate_action_plan(self, balance: dict) -> list[dict]:
        """
        Axe 7: Contextual Action Plan (via Groq)
        """
        # Generate 3-5 prioritized actions based on scores
        return []  # Placeholder
    
    def _aggregate_score(self, results: dict) -> float:
        """Combine 7 axes into 0-100 score"""
        scores = [
            results['solidite'].get('score', 50),
            results['liquidite'].get('score', 50),
            results['rentabilite'].get('score', 50),
            results['efficacite'].get('score', 50),
            # Sector/risks/actions are contextual, not scored
        ]
        return np.mean(scores)
    
    def _rate_health(self, score: float) -> str:
        """Convert score to health rating"""
        return (
            'EXCELLENT' if score >= 80 else
            'BON' if score >= 65 else
            'ACCEPTABLE' if score >= 50 else
            'PROBLÉMATIQUE' if score >= 35 else
            'CRITIQUE'
        )
    
    async def _predict_default(self, balance: dict) -> dict:
        """Predict 12-month default probability"""
        # (Logistic regression coefficient model)
        return {'probability': 0.05, 'risk_level': 'LOW'}
```

### Jour 8-9 : Feedback Integration + Auto-Recalibration Seeds

```python
# app/services/feedback_service.py (NEW)

class FeedbackLearning:
    """
    Capture user feedback → Auto-improve model weights by sector
    """
    
    async def capture_feedback(
        self,
        document_id: str,
        user_id: str,
        feedback: dict  # {axis: 'liquidite', accuracy: 0.8, comment: '...'}
    ):
        """
        User feedback on analysis accuracy
        """
        
        feedback_entry = {
            'document_id': document_id,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'feedback': feedback,
            'analysis_id': get_analysis_id(document_id),
        }
        
        # Store in Firestore
        await firebase.collection('feedback').add(feedback_entry)
        
        # If enough feedback accrued, trigger recalibration
        sector = get_company_sector(document_id)
        feedback_count = count_feedback_for_sector(sector)
        
        if feedback_count >= 50:  # Threshold
            logger.info(f"Triggering recalibration for sector {sector}")
            await self._recalibrate_weights_by_sector(sector)
    
    async def _recalibrate_weights_by_sector(self, sector: str):
        """
        Query all feedback for sector, optimize SYSCOHADA weights
        """
        
        feedback_data = query_feedback_by_sector(sector, limit=500)
        
        if len(feedback_data) >= 50:
            # Simple: compute average accuracy per axis
            accuracies = defaultdict(list)
            
            for fb in feedback_data:
                axis = fb['feedback'].get('axis')
                accuracy = fb['feedback'].get('accuracy', 0.5)
                accuracies[axis].append(accuracy)
            
            # Compute new weights (axes with high accuracy → higher weight)
            new_weights = {}
            for axis, scores in accuracies.items():
                avg_accuracy = np.mean(scores)
                new_weights[axis] = avg_accuracy  # 0-1, maps to coefficient
            
            # Deploy
            SECTOR_WEIGHTS[sector] = new_weights
            
            logger.info(f"Updated weights for {sector}: {new_weights}")
            
            # Log experiment
            await firebase.collection('experiments').add({
                'sector': sector,
                'old_weights': get_old_weights(sector),
                'new_weights': new_weights,
                'feedback_count': len(feedback_data),
                'avg_accuracy': np.mean([a for scores in accuracies.values() for a in scores]),
                'timestamp': datetime.now().isoformat(),
            })


# ════════════════════════════════════════════════════════════════
# app/routers/analyses.py — ADD Feedback endpoint
# ════════════════════════════════════════════════════════════════

@router.post("/analyses/{document_id}/feedback")
async def submit_analysis_feedback(
    document_id: str,
    feedback: dict,  # {axis: str, accuracy: float, comment: str}
    user_id: str = Depends(verify_token)
):
    """
    User submits feedback on analysis accuracy
    Triggers auto-recalibration if threshold reached
    """
    
    await feedback_service.capture_feedback(
        document_id=document_id,
        user_id=user_id,
        feedback=feedback
    )
    
    return {'status': 'feedback_recorded', 'message': 'Merci pour votre retour!'}
```

### Jour 10 : Testing + Deployment

```bash
# Test preprocessing pipeline
pytest app/services/document_classifier.py -v

# Test orchestrator
pytest app/services/orchestrator_service.py -v

# Test SYSCOHADA v2
pytest app/services/syscohada_v2.py -v

# Integration test: Full pipeline
python -m pytest tests/integration/full_pipeline_test.py -v
```

---

## 🎯 Success Metrics Week 1-2

| Métrique | Baseline | Target | Timeline |
|----------|----------|--------|----------|
| Upload quality score | N/A | > 0.7 | W1E |
| WebSocket latency | N/A | < 500ms | W1E |
| SYSCOHADA² time-to-first-byte | N/A | < 5s | W2E |
| User feedback capture | 0 | > 50 entries | W2E |

