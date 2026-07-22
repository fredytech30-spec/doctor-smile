"""
LLM Moderator Service - Doctor Smile v4.0
Orchestrateur d'extraction de données comptables via LLM
Support : Balance OHADA + Grand Livre + Journal
Approche : Extraction robuste avec fallback OCR
"""

from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

from app.services.syscohada_engine import parse_balance

logger = logging.getLogger(__name__)


class LLMExtractionService:
    """Service d'extraction de données comptables via LLM"""
    
    def __init__(self):
        self.supported_formats = ['pdf', 'xlsx', 'csv', 'txt']
        self.extraction_confidence_threshold = 0.7
        
    async def extract_balance_data(
        self, 
        file_path: str, 
        file_type: str,
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Extrait les données de la balance OHADA via LLM
        
        Args:
            file_path: Chemin vers le fichier
            file_type: Type de fichier (pdf, xlsx, csv, txt)
            llm_client: Client LLM (OpenAI, Anthropic, etc.)
            
        Returns:
            Dict contenant les données extraites et métadonnées
        """
        try:
            logger.info(f"[LLM] Extraction balance OHADA: {file_path}")
            
            # Validation du format
            if file_type not in self.supported_formats:
                raise ValueError(f"Format non supporté: {file_type}")
            
            # Extraction via LLM
            if llm_client:
                extracted_data = await self._extract_with_llm(
                    file_path, 
                    file_type, 
                    llm_client,
                    extraction_type='balance'
                )
            else:
                # Fallback vers OCR traditionnel
                extracted_data = await self._extract_with_ocr_fallback(
                    file_path,
                    file_type,
                    extraction_type='balance'
                )
            
            # Validation des données extraites
            validated_data = self._validate_balance_data(extracted_data)
            
            return {
                'success': True,
                'data': validated_data,
                'confidence': extracted_data.get('confidence', 0.5),
                'extraction_method': extracted_data.get('method', 'ocr_fallback'),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[LLM] Erreur extraction balance: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'confidence': 0.0
            }

    async def moderate(
        self,
        raw_df,
        entreprise: str | None = None,
        secteur: str | None = None,
        pays: str | None = None,
        devise: str | None = None,
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Interface simple utilisée par les routeurs : normalise le DataFrame
        et optionnellement appelle le LLM pour enrichissement/corrections.
        Retourne une structure compatible avec l'API attendue par le router.
        """
        try:
            import pandas as pd

            # Transforme en liste de dicts pour le pipeline de preprocessing
            rows = raw_df.to_dict(orient='records') if hasattr(raw_df, 'to_dict') else list(raw_df)

            llm_used = None
            synthese = "Extraction directe depuis les données fournies"
            confidence = 0.8
            corrections = []
            anomalies = []

            # Si un client LLM est fourni, tenter un enrichissement léger
            if llm_client:
                try:
                    file_content = raw_df.to_string(index=False) if hasattr(raw_df, 'to_string') else str(raw_df)
                    prompt = self._build_balance_extraction_prompt(file_content)
                    response = await llm_client.generate(prompt)
                    parsed = self._parse_llm_response(response, 'balance')

                    # Si le LLM renvoie des comptes, on laisse l'original mais signale la synthèse
                    if parsed and isinstance(parsed, dict):
                        llm_used = parsed.get('llm_used', 'llm') or 'llm'
                        synthese = parsed.get('synthese', 'Extraction LLM réalisée')
                        confidence = self._calculate_confidence(parsed)
                        # Tentative d'extraction de corrections/anomalies
                        corrections = parsed.get('corrections', []) if isinstance(parsed.get('corrections', []), list) else []
                        anomalies = parsed.get('anomalies', []) if isinstance(parsed.get('anomalies', []), list) else []
                except Exception as e:
                    logger.warning(f"[LLM Moderator] Enrichissement LLM échoué: {e}")

            return {
                'rows_for_preprocessing': rows,
                'score_confiance': int(confidence * 100),
                'corrections': corrections,
                'anomalies': anomalies,
                'llm_used': llm_used or 'none',
                'synthese': synthese,
                'qualite': {},
            }

        except Exception as e:
            logger.error(f"[LLM Moderator] Erreur moderate: {e}")
            return {
                'rows_for_preprocessing': raw_df.to_dict(orient='records') if hasattr(raw_df, 'to_dict') else list(raw_df),
                'score_confiance': 0,
                'corrections': [],
                'anomalies': [],
                'llm_used': 'none',
                'synthese': 'Erreur interne LLM Moderator',
                'qualite': {},
            }

    async def moderate_with_groq(
        self,
        text: str,
        tables: list[dict[str, Any]] | None = None,
        document_type: str = 'financial_report',
        company_info: dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        """
        Enrichissement IA / Groq fallback.
        Retourne une structure compatible avec le pipeline SYSCOHADA.
        """
        try:
            logger.info(f"[LLM] moderate_with_groq document_type={document_type}")
            structured: dict[str, Any] = {}
            if tables:
                structured = parse_balance(tables)
                structured.update({
                    'document_type': document_type,
                    'company_info': company_info or {},
                    'rows': tables,
                })
            else:
                structured = {
                    'document_type': document_type,
                    'company_info': company_info or {},
                    'text_summary': text[:4000],
                }

            return {
                'success': True,
                'structured': structured,
                'method': 'fallback',
                'confidence': 0.8,
            }

        except Exception as e:
            logger.error(f"[LLM] moderate_with_groq error: {e}")
            return {
                'success': False,
                'structured': {},
                'error': str(e),
            }

    async def extract_general_ledger_data(
        self,
        file_path: str,
        file_type: str,
        llm_client: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Extrait les données du Grand Livre via LLM
        
        Args:
            file_path: Chemin vers le fichier
            file_type: Type de fichier
            llm_client: Client LLM
            
        Returns:
            Dict contenant les données du Grand Livre
        """
        try:
            logger.info(f"[LLM] Extraction Grand Livre: {file_path}")
            
            if file_type not in self.supported_formats:
                raise ValueError(f"Format non supporté: {file_type}")
            
            if llm_client:
                extracted_data = await self._extract_with_llm(
                    file_path,
                    file_type,
                    llm_client,
                    extraction_type='general_ledger'
                )
            else:
                extracted_data = await self._extract_with_ocr_fallback(
                    file_path,
                    file_type,
                    extraction_type='general_ledger'
                )
            
            validated_data = self._validate_general_ledger_data(extracted_data)
            
            return {
                'success': True,
                'data': validated_data,
                'confidence': extracted_data.get('confidence', 0.5),
                'extraction_method': extracted_data.get('method', 'ocr_fallback'),
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"[LLM] Erreur extraction Grand Livre: {e}")
            return {
                'success': False,
                'error': str(e),
                'data': None,
                'confidence': 0.0
            }
    
    async def _extract_with_llm(
        self,
        file_path: str,
        file_type: str,
        llm_client: Any,
        extraction_type: str
    ) -> Dict[str, Any]:
        """
        Extrait les données via LLM avec prompt structuré
        
        Args:
            file_path: Chemin du fichier
            file_type: Type de fichier
            llm_client: Client LLM
            extraction_type: Type d'extraction (balance, general_ledger)
            
        Returns:
            Dict avec données extraites et score de confiance
        """
        try:
            # Lecture du fichier
            file_content = self._read_file(file_path, file_type)
            
            # Construction du prompt selon le type d'extraction
            if extraction_type == 'balance':
                prompt = self._build_balance_extraction_prompt(file_content)
            elif extraction_type == 'general_ledger':
                prompt = self._build_general_ledger_extraction_prompt(file_content)
            else:
                raise ValueError(f"Type d'extraction inconnu: {extraction_type}")
            
            # Appel au LLM
            response = await llm_client.generate(prompt)
            
            # Parsing de la réponse
            extracted_data = self._parse_llm_response(response, extraction_type)
            
            extracted_data['method'] = 'llm'
            extracted_data['confidence'] = self._calculate_confidence(extracted_data)
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"[LLM] Erreur extraction LLM: {e}")
            raise
    
    async def _extract_with_ocr_fallback(
        self,
        file_path: str,
        file_type: str,
        extraction_type: str
    ) -> Dict[str, Any]:
        """
        Fallback OCR traditionnel si LLM non disponible
        
        Args:
            file_path: Chemin du fichier
            file_type: Type de fichier
            extraction_type: Type d'extraction
            
        Returns:
            Dict avec données extraites via OCR
        """
        try:
            from app.services.ocr_service import OCRService
            
            ocr_service = OCRService()
            
            if extraction_type == 'balance':
                extracted_data = ocr_service.extract_balance(file_path, file_type)
            elif extraction_type == 'general_ledger':
                extracted_data = ocr_service.extract_general_ledger(file_path, file_type)
            else:
                raise ValueError(f"Type d'extraction inconnu: {extraction_type}")
            
            extracted_data['method'] = 'ocr_fallback'
            extracted_data['confidence'] = 0.6  # Confiance plus faible pour OCR
            
            return extracted_data
            
        except Exception as e:
            logger.error(f"[LLM] Erreur fallback OCR: {e}")
            raise
    
    def _read_file(self, file_path: str, file_type: str) -> str:
        """Lit le fichier selon son type"""
        if file_type == 'txt':
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        elif file_type in ['xlsx', 'csv']:
            # Pour Excel/CSV, conversion en texte structuré
            import pandas as pd
            if file_type == 'xlsx':
                df = pd.read_excel(file_path)
            else:
                df = pd.read_csv(file_path)
            return df.to_string(index=False)
        elif file_type == 'pdf':
            # Pour PDF, extraction texte
            from app.services.ocr_service import OCRService
            ocr = OCRService()
            return ocr.extract_text_from_pdf(file_path)
        else:
            raise ValueError(f"Type de fichier non supporté: {file_type}")
    
    def _build_balance_extraction_prompt(self, file_content: str) -> str:
        """Construit le prompt pour extraction balance OHADA"""
        return f"""
Tu es un expert comptable OHADA spécialisé dans l'extraction de données de bilans.

Analyse le contenu suivant et extrait les informations de la balance OHADA:

{file_content}

Extrais et retourne UNIQUEMENT les données suivantes au format JSON:
- Comptes OHADA (numéro de compte à 2 chiffres minimum)
- Soldes débiteurs
- Soldes créditeurs
- Total débit
- Total crédit

Format JSON attendu:
{{
  "accounts": [
    {{
      "account_number": "411",
      "account_name": "Clients",
      "debit_balance": 15000000,
      "credit_balance": 0
    }}
  ],
  "total_debit": 50000000,
  "total_credit": 50000000,
  "is_balanced": true
}}

Ne retourne QUE le JSON, sans aucun texte additionnel.
"""
    
    def _build_general_ledger_extraction_prompt(self, file_content: str) -> str:
        """Construit le prompt pour extraction Grand Livre"""
        return f"""
Tu es un expert comptable OHADA spécialisé dans l'extraction de données de Grand Livre.

Analyse le contenu suivant et extrait les informations du Grand Livre:

{file_content}

Extrais et retourne UNIQUEMENT les données suivantes au format JSON:
- Comptes auxiliaires (411xxx pour clients, 401xxx pour fournisseurs)
- Détails des écritures (date, libellé, montant débit/crédit)
- Soldes par compte auxiliaire

Format JSON attendu:
{{
  "auxiliary_accounts": [
    {{
      "account_number": "411001",
      "account_name": "Client ETS BAPA",
      "entries": [
        {{
          "date": "2024-01-15",
          "description": "Facture N°42",
          "debit": 5000000,
          "credit": 0
        }}
      ],
      "balance": 5000000
    }}
  ]
}}

Ne retourne QUE le JSON, sans aucun texte additionnel.
"""
    
    def _parse_llm_response(self, response: str, extraction_type: str) -> Dict[str, Any]:
        """Parse la réponse du LLM"""
        import json
        import re
        
        try:
            # Extraction du JSON de la réponse
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                raise ValueError("Aucun JSON trouvé dans la réponse LLM")
        except json.JSONDecodeError as e:
            logger.error(f"[LLM] Erreur parsing JSON: {e}")
            return {'error': 'Invalid JSON response', 'raw_response': response}
    
    def _calculate_confidence(self, extracted_data: Dict) -> float:
        """Calcule un score de confiance pour les données extraites"""
        if 'error' in extracted_data:
            return 0.0
        
        # Heuristiques simples de confiance
        confidence = 0.7
        
        # Vérification de la balance équilibrée
        if extracted_data.get('is_balanced', False):
            confidence += 0.2
        
        # Vérification du nombre de comptes
        accounts_count = len(extracted_data.get('accounts', []))
        if accounts_count > 10:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    def _validate_balance_data(self, data: Dict) -> Dict:
        """Valide les données de balance OHADA"""
        if 'error' in data:
            return data
        
        # Vérification des comptes OHADA (2 chiffres minimum)
        validated_accounts = []
        for account in data.get('accounts', []):
            account_number = account.get('account_number', '')
            if len(account_number) >= 2 and account_number.isdigit():
                validated_accounts.append(account)
        
        data['accounts'] = validated_accounts
        
        # Vérification de l'équilibre
        total_debit = data.get('total_debit', 0)
        total_credit = data.get('total_credit', 0)
        data['is_balanced'] = abs(total_debit - total_credit) < 100  # Tolérance de 100 FCFA
        
        return data
    
    def _validate_general_ledger_data(self, data: Dict) -> Dict:
        """Valide les données du Grand Livre"""
        if 'error' in data:
            return data
        
        # Vérification des comptes auxiliaires (6 chiffres pour OHADA)
        validated_accounts = []
        for account in data.get('auxiliary_accounts', []):
            account_number = account.get('account_number', '')
            if len(account_number) == 6 and account_number.isdigit():
                validated_accounts.append(account)
        
        data['auxiliary_accounts'] = validated_accounts
        
        return data


# Instance singleton
llm_extraction_service = LLMExtractionService()
llm_moderator = llm_extraction_service
