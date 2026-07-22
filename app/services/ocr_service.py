"""
==========================================
OCR SERVICE
DOCTOR SMILE — Extracteur OCR/IA pour documents financiers
==========================================

Pipeline :
  1. PDF → images (pdf2image / PyMuPDF)
  2. Images → texte OCR (Tesseract / pytesseract)
  3. Texte → structure IA (regex + heuristiques financières)
  4. Fallback : pdfplumber (tableaux natifs) si le PDF n'est pas scanné
  5. Validation des ratios extraits + complétion par médianes

Types de documents supportés :
  - Liasse fiscale (2050, 2051, 2052, 2053)
  - Bilan comptable FR (actif/passif)
  - Compte de résultat
  - Balance générale
  - Relevé bancaire (flux)
  - Export logiciel comptable (Sage, Cegid, QuickBooks)
  - Rapport financier libre

Dépendances :
  pip install pytesseract pdf2image pdfplumber pillow
  apt-get install tesseract-ocr tesseract-ocr-fra
  # ou via conda / brew

Fallback silencieux si Tesseract non installé → pdfplumber seul.
"""

from __future__ import annotations

import asyncio
import io
import json
import logging
import re
import unicodedata
from typing import Any

log = logging.getLogger("doctorsmile.ocr")

# ════════════════════════════════════════════════════════════════
#  MAPPING LABELS FINANCIERS → CLÉS INTERNES
#  Couvre : liasse fiscale FR, exports comptables, rapports libres
# ════════════════════════════════════════════════════════════════

FINANCIAL_PATTERNS: list[tuple[str, str]] = [
    # ── Actif ────────────────────────────────────────────────
    (r"actif\s*(circulant|courant)",          "actif_courant"),
    (r"total\s*actif\s*courant",              "actif_courant"),
    (r"current\s*assets",                     "actif_courant"),
    (r"actif\s*immobilis[eé]",               "actif_immobilise"),
    (r"total\s*(de\s*l['\s])?actif",         "actif_total"),
    (r"total\s*assets",                       "actif_total"),
    (r"bilan\s*total",                        "actif_total"),

    # ── Passif ───────────────────────────────────────────────
    (r"passif\s*(circulant|courant)",         "passif_courant"),
    (r"current\s*liabilities",               "passif_courant"),
    (r"dettes\s*(d['\s]exploitation|ct|court)", "passif_courant"),
    (r"capitaux\s*propres",                  "capitaux_propres"),
    (r"fonds\s*propres",                     "capitaux_propres"),
    (r"equity",                              "capitaux_propres"),
    (r"shareholders['\s]*equity",            "capitaux_propres"),
    (r"dettes\s*(financi[eè]res|totales|lt)", "dettes_totales"),
    (r"total\s*(des\s*)?dettes",             "dettes_totales"),
    (r"total\s*liabilities",                 "dettes_totales"),
    (r"emprunts?\s*(et\s*dettes\s*financi[eè]res)?", "dettes_totales"),

    # ── Résultat ──────────────────────────────────────────────
    (r"chiffre\s*d['\s]*affaires",           "chiffre_affaires"),
    (r"ca\s*net",                            "chiffre_affaires"),
    (r"ventes?\s*(nettes?)?",                "chiffre_affaires"),
    (r"(net\s*)?revenue",                    "chiffre_affaires"),
    (r"turnover",                            "chiffre_affaires"),
    (r"r[eé]sultat\s*(net|de\s*l['\s]exercice)", "resultat_net"),
    (r"b[eé]n[eé]fice\s*net",              "resultat_net"),
    (r"net\s*(income|profit|earnings)",      "resultat_net"),
    (r"r[eé]sultat\s*(d['\s])?exploitation", "resultat_exploitation"),
    (r"operating\s*(income|profit)",         "resultat_exploitation"),
    (r"ebit\b",                              "resultat_exploitation"),
    (r"ebitda",                              "ebitda"),
    (r"exc[eé]dent\s*brut\s*d['\s]exploitation", "ebitda"),
    (r"ebe\b",                               "ebitda"),
    (r"marge\s*brute",                       "marge_brute"),
    (r"gross\s*profit",                      "marge_brute"),
    (r"charges?\s*financi[eè]res",           "charges_financieres"),
    (r"int[eé]r[eê]ts?\s*(pay[eé]s?|d[eû]s?)?", "charges_financieres"),
    (r"interest\s*expense",                  "charges_financieres"),

    # ── Bilan complémentaire ──────────────────────────────────
    (r"tr[eé]sorerie\s*(et\s*[eé]quivalents?)?", "tresorerie"),
    (r"disponibilit[eé]s?",                  "tresorerie"),
    (r"cash(\s*and\s*cash\s*equivalents)?",  "tresorerie"),
    (r"stocks?\b",                           "stocks"),
    (r"inventori(es|e)",                     "stocks"),
    (r"cr[eé]ances?\s*clients?",             "creances_clients"),
    (r"accounts?\s*receivable",              "creances_clients"),
    (r"clients?\s*et\s*comptes?\s*rattach",  "creances_clients"),
    (r"dettes?\s*fournisseurs?",             "dettes_fournisseurs"),
    (r"accounts?\s*payable",                 "dettes_fournisseurs"),
    (r"bfr\b",                               "bfr"),
    (r"besoin\s*en\s*fonds\s*de\s*roulement", "bfr"),
    (r"working\s*capital",                   "bfr"),

    # ── Méta ─────────────────────────────────────────────────
    (r"ann[eé]es?\s*(d['\s])?activit[eé]",  "annees_activite"),
    (r"date\s*de\s*cr[eé]ation",             "_date_creation"),
    (r"secteur\s*d['\s]activit[eé]",         "secteur"),
    (r"effectif",                             "effectif"),
    (r"nombre\s*de\s*salari[eé]s?",          "effectif"),
    (r"pays\b",                              "pays"),
    (r"soci[eé]t[eé]|entreprise|raison\s*sociale", "_nom_entreprise"),
]

# Patterns valeur numérique — gère les formats FR et EN
# Exemples : "1 234 567" / "1.234.567" / "(1 234)" / "1 234 K€" / "-1.2M"
_NUM_RE = re.compile(
    r"([+-]?\s*(?:\d{1,3}(?:[\s.,]\d{3})+|\d+)(?:[.,]\d+)?\s*(?:[KMB€$£k])?)",
    re.IGNORECASE,
)

# ════════════════════════════════════════════════════════════════
#  CLASSE PRINCIPALE
# ════════════════════════════════════════════════════════════════

class OcrService:
    """
    Extrait les données financières depuis un document PDF.
    Stratégie en cascade :
      1. pdfplumber  → tableaux natifs (PDF numérique)
      2. PyMuPDF     → texte natif (si pdfplumber insuffisant)
      3. pytesseract → OCR sur images (PDF scanné)
    """

    # ── Point d'entrée principal ─────────────────────────────
    def extract(self, pdf_bytes: bytes, filename: str = "document.pdf") -> dict[str, Any]:
        """
        Retourne un dict avec :
          - rows: list[dict]  → données pour le pipeline ML
          - meta: dict        → nom entreprise, secteur, pays, méthode
          - confidence: float → 0-1, qualité de l'extraction
          - warnings: list[str]
        """
        log.info("[OCR] Traitement de %s (%d Ko)", filename, len(pdf_bytes) // 1024)
        warnings: list[str] = []

        # Stratégie 1 : pdfplumber (tableaux natifs)
        rows, method = self._try_pdfplumber(pdf_bytes, warnings)

        # Stratégie 2 : texte natif PyMuPDF
        if not rows or self._data_quality(rows) < 0.4:
            rows2, method2 = self._try_pymupdf_text(pdf_bytes, warnings)
            if rows2 and self._data_quality(rows2) > self._data_quality(rows):
                rows, method = rows2, method2

        # Stratégie 3 : OCR Tesseract
        if not rows or self._data_quality(rows) < 0.3:
            rows3, method3 = self._try_tesseract(pdf_bytes, warnings)
            if rows3 and self._data_quality(rows3) > self._data_quality(rows):
                rows, method = rows3, method3

        if not rows:
            warnings.append("Aucune donnée financière extraite. Vérifiez que le PDF contient des tableaux financiers.")
            rows = [{}]

        # Post-traitement
        rows = self._normalize_extracted(rows)
        meta = self._extract_meta(rows)
        confidence = self._data_quality(rows)

        log.info("[OCR] Méthode=%s rows=%d qualité=%.2f", method, len(rows), confidence)

        return {
            "rows":       rows,
            "meta":       meta,
            "confidence": round(confidence, 2),
            "method":     method,
            "warnings":   warnings,
        }

    async def extract_text_sample(
        self,
        pdf_bytes: bytes,
        pages: int = 1,
        max_chars: int = 5000,
    ) -> str:
        """Retourne un extrait textuel rapide pour la classification."""
        result = await asyncio.to_thread(self.extract, pdf_bytes)
        rows = result.get("rows", [])
        meta = result.get("meta", {})

        parts: list[str] = []
        if isinstance(meta, dict):
            parts.extend(str(v) for v in meta.values() if v)
        for row in rows[:pages * 3]:
            if isinstance(row, dict):
                parts.append(" ".join(str(v) for v in row.values() if v is not None))
            else:
                parts.append(str(row))

        sample = "\n".join(parts).strip()
        if len(sample) > max_chars:
            sample = sample[:max_chars]
        return sample

    async def extract_text_and_tables(
        self,
        pdf_bytes: bytes,
        document_type: str = "balance_sheet",
        language: str = "FR",
    ) -> dict[str, Any]:
        """Retourne le texte et les tableaux extraits pour le pipeline."""
        result = await asyncio.to_thread(self.extract, pdf_bytes)
        rows = result.get("rows", [])
        meta = result.get("meta", {})

        text_parts: list[str] = []
        if isinstance(meta, dict):
            text_parts.extend(str(v) for v in meta.values() if v)
        for row in rows:
            if isinstance(row, dict):
                text_parts.append(" ".join(str(v) for v in row.values() if v is not None))
            else:
                text_parts.append(str(row))

        return {
            "text": "\n".join(text_parts).strip(),
            "tables": rows,
            "confidence": result.get("confidence", 0.0),
            "method": result.get("method", "unknown"),
        }

    # ────────────────────────────────────────────────────────────
    #  STRATÉGIE 1 — pdfplumber (tableaux structurés)
    # ────────────────────────────────────────────────────────────
    def _try_pdfplumber(
        self, pdf_bytes: bytes, warnings: list[str]
    ) -> tuple[list[dict], str]:
        try:
            import pdfplumber
        except ImportError:
            warnings.append("pdfplumber non installé (pip install pdfplumber)")
            return [], "none"

        rows: list[dict] = []
        kv: dict[str, Any] = {}

        try:
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    # Extraction tableaux
                    for table in (page.extract_tables() or []):
                        if not table or len(table) < 2:
                            continue
                        headers = [str(h or "").strip() for h in table[0]]
                        if len(headers) < 2:
                            continue
                        for raw_row in table[1:]:
                            row = {
                                headers[i]: (str(raw_row[i]).strip()
                                             if i < len(raw_row) and raw_row[i] else "")
                                for i in range(len(headers))
                            }
                            if any(self._is_numeric(v) for v in row.values()):
                                rows.append(row)

                    # Extraction texte ligne par ligne (pour liasse 2050 etc.)
                    text = page.extract_text() or ""
                    kv.update(self._parse_text_lines(text))

        except Exception as exc:
            warnings.append(f"pdfplumber : {exc}")
            return [], "none"

        if kv:
            rows = self._merge_kv_into_rows(rows, kv)

        return rows, "pdfplumber"

    # ────────────────────────────────────────────────────────────
    #  STRATÉGIE 2 — PyMuPDF (texte natif haute qualité)
    # ────────────────────────────────────────────────────────────
    def _try_pymupdf_text(
        self, pdf_bytes: bytes, warnings: list[str]
    ) -> tuple[list[dict], str]:
        try:
            import fitz  # PyMuPDF
        except ImportError:
            return [], "none"

        kv: dict[str, Any] = {}
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            for page in doc:
                text = page.get_text("text")
                kv.update(self._parse_text_lines(text))
            doc.close()
        except Exception as exc:
            warnings.append(f"PyMuPDF : {exc}")
            return [], "none"

        if not kv:
            return [], "none"
        return [kv], "pymupdf"

    # ────────────────────────────────────────────────────────────
    #  STRATÉGIE 3 — Tesseract OCR (PDF scanné)
    # ────────────────────────────────────────────────────────────
    def _try_tesseract(
        self, pdf_bytes: bytes, warnings: list[str]
    ) -> tuple[list[dict], str]:
        try:
            import pytesseract
            from pdf2image import convert_from_bytes
            from PIL import Image
        except ImportError:
            warnings.append("OCR non disponible. Installez : pip install pytesseract pdf2image && apt-get install tesseract-ocr tesseract-ocr-fra")
            return [], "none"

        kv: dict[str, Any] = {}
        try:
            # Convertir PDF → images (300 DPI pour meilleure précision)
            images = convert_from_bytes(pdf_bytes, dpi=300, first_page=1, last_page=6)

            for img in images:
                # OCR avec config optimisée pour documents financiers
                config = "--oem 3 --psm 6 -l fra+eng"
                text = pytesseract.image_to_string(img, config=config)
                kv.update(self._parse_text_lines(text))

                # Essai avec tableaux (tsv)
                try:
                    data = pytesseract.image_to_data(img, config=config, output_type=pytesseract.Output.DICT)
                    kv.update(self._parse_tesseract_tsv(data))
                except Exception:
                    pass

        except Exception as exc:
            warnings.append(f"OCR Tesseract : {exc}")
            return [], "none"

        if not kv:
            # Fallback ligne par ligne pour les bilans contenant des comptes hors labels explicites
            rows = self._parse_account_rows_from_text(text)
            if rows:
                return rows, "tesseract_ocr_fallback"
            return [], "none"
        return [kv], "tesseract_ocr"

    def _try_tesseract_image(
        self, image_bytes: bytes, warnings: list[str]
    ) -> tuple[list[dict], str]:
        try:
            from PIL import Image
            import pytesseract
        except ImportError:
            warnings.append(
                "OCR image non disponible. Installez : pip install pytesseract pillow && apt-get install tesseract-ocr tesseract-ocr-fra"
            )
            return [], "none"

        kv: dict[str, Any] = {}
        try:
            text = "\n".join(text_parts).strip()
            if not text:
                try:
                    text = pdf_bytes.decode("utf-8", errors="ignore")
                except Exception:
                    text = ""
            image = Image.open(io.BytesIO(image_bytes))
            if image.mode != 'L':
                image = image.convert('L')
            image = image.resize((image.width * 2, image.height * 2), Image.LANCZOS)

            config = "--oem 3 --psm 6 -l fra+eng"
            text = pytesseract.image_to_string(image, config=config)
            kv.update(self._parse_text_lines(text))

            try:
                data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
                kv.update(self._parse_tesseract_tsv(data))
            except Exception:
                pass

        except Exception as exc:
            warnings.append(f"OCR image Tesseract : {exc}")
            return [], "none"

        if not kv:
            rows = self._parse_account_rows_from_text(text)
            if rows:
                return rows, "tesseract_image_fallback"
            return [], "none"
        return [kv], "tesseract_image"

    def extract_image(self, image_bytes: bytes, filename: str = "image.jpg") -> dict[str, Any]:
        """
        Extrait les données financières depuis une image.
        """
        log.info("[OCR] Traitement image %s (%d Ko)", filename, len(image_bytes) // 1024)
        warnings: list[str] = []

        rows, method = self._try_tesseract_image(image_bytes, warnings)
        if not rows:
            warnings.append("Aucune donnée financière extraite de l'image.")
            rows = [{}]

        rows = self._normalize_extracted(rows)
        meta = self._extract_meta(rows)
        confidence = self._data_quality(rows)

        log.info("[OCR] Méthode=%s rows=%d qualité=%.2f", method, len(rows), confidence)

        return {
            "rows": rows,
            "meta": meta,
            "confidence": round(confidence, 2),
            "method": method,
            "warnings": warnings,
        }

    # ────────────────────────────────────────────────────────────
    #  PARSING DU TEXTE LIGNE PAR LIGNE
    # ────────────────────────────────────────────────────────────
    def _parse_text_lines(self, text: str) -> dict[str, Any]:
        """
        Parcourt chaque ligne du texte OCR/natif et tente de matcher
        un label financier connu suivi d'une valeur numérique.
        """
        result: dict[str, Any] = {}
        lines = text.split("\n")

        for i, raw_line in enumerate(lines):
            line = self._normalize_str(raw_line)
            if not line:
                continue

            for pattern, key in FINANCIAL_PATTERNS:
                if re.search(pattern, line, re.IGNORECASE):
                    # Chercher le nombre sur cette ligne ou la suivante
                    val = self._extract_number_from_line(line)
                    if val is None and i + 1 < len(lines):
                        val = self._extract_number_from_line(
                            self._normalize_str(lines[i + 1])
                        )
                    if val is not None:
                        # Ne pas écraser une valeur déjà trouvée (priorité à la 1re occurrence)
                        if key not in result:
                            result[key] = val
                    break  # Une ligne = un match maximum

        return result

    # ────────────────────────────────────────────────────────────
    #  PARSING TESSERACT TSV (données structurées par bloc)
    # ────────────────────────────────────────────────────────────
    def _parse_tesseract_tsv(self, data: dict) -> dict[str, Any]:
        """Regroupe les blocs Tesseract en lignes et applique le parsing."""
        lines_by_block: dict[int, list[str]] = {}
        for i, text in enumerate(data.get("text", [])):
            if not text.strip():
                continue
            block = data["block_num"][i]
            lines_by_block.setdefault(block, []).append(text.strip())

        result: dict[str, Any] = {}
        for words in lines_by_block.values():
            fake_line = " ".join(words)
            result.update(self._parse_text_lines(fake_line))
        return result

    def _parse_account_rows_from_text(self, text: str) -> list[dict[str, Any]]:
        """Fallback simple pour extraire lignes compte/montant depuis du texte OCR."""
        rows: list[dict[str, Any]] = []
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line:
                continue

            account_match = re.search(r"\b([1-9][0-9]{1,7})\b", line)
            if not account_match:
                continue

            account_num = account_match.group(1)
            amounts = [
                self._parse_french_number(m)
                for m in _NUM_RE.findall(line)
                if self._parse_french_number(m) is not None
            ]
            if not amounts:
                continue

            amount = amounts[-1]
            rows.append({account_num: amount})

        return rows

    # ────────────────────────────────────────────────────────────
    #  NORMALISATION POST-EXTRACTION
    # ────────────────────────────────────────────────────────────
    def _normalize_extracted(self, rows: list[dict]) -> list[dict]:
        """
        Normalise les noms de colonnes et convertit les valeurs en float.
        Applique les alias du preprocessing_service.
        """
        from app.services.preprocessing_service import COL_ALIASES

        normalized: list[dict] = []
        for row in rows:
            new_row: dict[str, Any] = {}
            for k, v in row.items():
                k_norm = self._normalize_str(k)
                # Mapper via COL_ALIASES
                mapped = COL_ALIASES.get(k_norm, k_norm)
                # Convertir valeur
                if isinstance(v, str):
                    num = self._parse_french_number(v)
                    new_row[mapped] = num if num is not None else v
                else:
                    new_row[mapped] = v
            if any(isinstance(v, (int, float)) for v in new_row.values()):
                normalized.append(new_row)

        return normalized if normalized else rows

    # ────────────────────────────────────────────────────────────
    #  EXTRACTION MÉTA (nom entreprise, secteur, pays)
    # ────────────────────────────────────────────────────────────
    def _extract_meta(self, rows: list[dict]) -> dict[str, str]:
        meta: dict[str, str] = {}
        for row in rows:
            if "_nom_entreprise" in row and not meta.get("entreprise"):
                meta["entreprise"] = str(row.pop("_nom_entreprise", ""))
            if "_date_creation" in row and not meta.get("annees_activite"):
                val = row.pop("_date_creation", None)
                if val:
                    try:
                        import datetime
                        year = int(str(val)[:4])
                        meta["annees_activite"] = str(datetime.date.today().year - year)
                    except Exception:
                        pass
            for key in ("secteur", "pays", "effectif"):
                if key in row and not meta.get(key):
                    meta[key] = str(row.get(key, ""))
        return meta

    # ────────────────────────────────────────────────────────────
    #  QUALITÉ DES DONNÉES EXTRAITES
    # ────────────────────────────────────────────────────────────
    def _data_quality(self, rows: list[dict]) -> float:
        """Score 0-1 de qualité : proportion de clés financières clés présentes."""
        if not rows:
            return 0.0
        key_fields = {
            "actif_courant", "passif_courant", "chiffre_affaires",
            "resultat_net", "capitaux_propres", "actif_total",
            "dettes_totales", "ebitda", "resultats_reportes",
        }
        all_keys: set[str] = set()
        for r in rows:
            all_keys.update(r.keys())
        found = len(key_fields & all_keys)
        return found / len(key_fields)

    # ────────────────────────────────────────────────────────────
    #  HELPERS
    # ────────────────────────────────────────────────────────────
    def _normalize_str(self, s: str) -> str:
        """Minuscules + suppression diacritiques + nettoyage."""
        s = str(s or "").strip().lower()
        s = unicodedata.normalize("NFD", s)
        s = "".join(c for c in s if unicodedata.category(c) != "Mn")
        s = re.sub(r"\s+", " ", s)
        return s

    def _extract_number_from_line(self, line: str) -> float | None:
        """Extrait le premier nombre significatif d'une ligne."""
        # Supprimer le label (tout ce qui précède ":") pour chercher la valeur
        if ":" in line:
            line = line.split(":", 1)[1]
        matches = _NUM_RE.findall(line)
        for m in reversed(matches):  # Prendre le dernier nombre (= valeur)
            val = self._parse_french_number(m)
            if val is not None and abs(val) > 0:
                return val
        return None

    def _parse_french_number(self, s: str) -> float | None:
        """Convertit '1 234 567,89' ou '1.234.567' ou '(1 234)' en float."""
        if not s:
            return None
        s = str(s).strip()
        # Négatif entre parenthèses
        negative = s.startswith("(") and s.endswith(")")
        s = s.strip("()")
        # Nettoyage
        s = re.sub(r"[€$£\s]", "", s)
        # Multiplicateurs
        multiplier = 1.0
        if s.upper().endswith("K"):
            multiplier = 1_000; s = s[:-1]
        elif s.upper().endswith("M"):
            multiplier = 1_000_000; s = s[:-1]
        elif s.upper().endswith("B"):
            multiplier = 1_000_000_000; s = s[:-1]
        # Format FR : 1.234.567,89 → 1234567.89
        if re.match(r"^\d{1,3}(\.\d{3})+(,\d+)?$", s):
            s = s.replace(".", "").replace(",", ".")
        # Format EN : 1,234,567.89
        elif re.match(r"^\d{1,3}(,\d{3})+(\.\d+)?$", s):
            s = s.replace(",", "")
        else:
            s = s.replace(",", ".")
        try:
            val = float(s) * multiplier
            return -val if negative else val
        except (ValueError, TypeError):
            return None

    def _is_numeric(self, v: Any) -> bool:
        if isinstance(v, (int, float)):
            return True
        return self._parse_french_number(str(v or "")) is not None

    def _merge_kv_into_rows(
        self, rows: list[dict], kv: dict
    ) -> list[dict]:
        """Fusionne le dict kv dans la liste rows existante."""
        if not rows:
            return [kv] if kv else []
        # Enrichir le premier row avec les clés manquantes
        merged = {**kv, **rows[0]}
        return [merged] + rows[1:]

    # ────────────────────────────────────────────────────────────
    #  MÉTHODES SPÉCIFIQUES DOCTOR SMILE v4.0
    #  Extraction Balance OHADA et Grand Livre
    # ────────────────────────────────────────────────────────────
    def extract_balance(self, file_path: str, file_type: str) -> dict[str, Any]:
        """
        Extrait les données de la balance OHADA
        
        Args:
            file_path: Chemin vers le fichier
            file_type: Type de fichier (pdf, xlsx, csv, txt)
            
        Returns:
            Dict avec données de la balance
        """
        try:
            log.info(f"[OCR] Extraction balance OHADA: {file_path}")
            
            # Lecture du fichier
            if file_type == 'pdf':
                with open(file_path, 'rb') as f:
                    pdf_bytes = f.read()
                    result = self.extract(pdf_bytes, file_path)
                    rows = result.get('rows', [])
            elif file_type in ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif']:
                with open(file_path, 'rb') as f:
                    image_bytes = f.read()
                    result = self.extract_image(image_bytes, file_path)
                    rows = result.get('rows', [])
            elif file_type in ['xlsx', 'csv']:
                import pandas as pd
                if file_type == 'xlsx':
                    df = pd.read_excel(file_path)
                else:
                    df = pd.read_csv(file_path)
                rows = df.to_dict('records')
            elif file_type == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                # Parsing simple du texte
                rows = self._parse_text_balance(content)
            else:
                raise ValueError(f"Type non supporté: {file_type}")
            
            # Conversion vers format balance OHADA
            balance_data = self._convert_to_ohada_balance(rows)
            
            return {
                'accounts': balance_data.get('accounts', []),
                'total_debit': balance_data.get('total_debit', 0),
                'total_credit': balance_data.get('total_credit', 0),
                'is_balanced': balance_data.get('is_balanced', False),
                'confidence': 0.6  # Confiance OCR fallback
            }
            
        except Exception as e:
            log.error(f"[OCR] Erreur extraction balance: {e}")
            return {'error': str(e), 'accounts': [], 'total_debit': 0, 'total_credit': 0}
    
    def extract_general_ledger(self, file_path: str, file_type: str) -> dict[str, Any]:
        """
        Extrait les données du Grand Livre
        
        Args:
            file_path: Chemin vers le fichier
            file_type: Type de fichier
            
        Returns:
            Dict avec données du Grand Livre
        """
        try:
            log.info(f"[OCR] Extraction Grand Livre: {file_path}")
            
            # Lecture du fichier
            if file_type == 'pdf':
                with open(file_path, 'rb') as f:
                    pdf_bytes = f.read()
                    result = self.extract(pdf_bytes, file_path)
                    rows = result.get('rows', [])
            elif file_type in ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif']:
                with open(file_path, 'rb') as f:
                    image_bytes = f.read()
                    result = self.extract_image(image_bytes, file_path)
                    rows = result.get('rows', [])
            elif file_type in ['xlsx', 'csv']:
                import pandas as pd
                if file_type == 'xlsx':
                    df = pd.read_excel(file_path)
                else:
                    df = pd.read_csv(file_path)
                rows = df.to_dict('records')
            elif file_type == 'txt':
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                rows = self._parse_text_general_ledger(content)
            else:
                raise ValueError(f"Type non supporté: {file_type}")
            
            # Conversion vers format Grand Livre
            ledger_data = self._convert_to_general_ledger(rows)
            
            return {
                'auxiliary_accounts': ledger_data.get('auxiliary_accounts', []),
                'confidence': 0.6  # Confiance OCR fallback
            }
            
        except Exception as e:
            log.error(f"[OCR] Erreur extraction Grand Livre: {e}")
            return {'error': str(e), 'auxiliary_accounts': []}
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extrait le texte d'un PDF
        
        Args:
            file_path: Chemin vers le fichier PDF
            
        Returns:
            Texte extrait
        """
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    text += page.extract_text() + "\n"
            return text
        except ImportError:
            # Fallback PyMuPDF
            try:
                import fitz
                doc = fitz.open(file_path)
                text = ""
                for page in doc:
                    text += page.get_text()
                doc.close()
                return text
            except ImportError:
                log.error("[OCR] Ni pdfplumber ni PyMuPDF installés")
                return ""
    
    def _parse_text_balance(self, content: str) -> list[dict]:
        """Parse un texte de balance en lignes structurées"""
        lines = content.split('\n')
        rows = []
        
        for line in lines:
            # Recherche de patterns de comptes OHADA (2 chiffres minimum)
            if re.search(r'\b\d{2,}\b', line):
                # Extraction du numéro de compte et du montant
                account_match = re.search(r'(\d{2,})\s+(.+?)\s+(\d+[.,]\d+|\d+)', line)
                if account_match:
                    account_num = account_match.group(1)
                    account_name = account_match.group(2).strip()
                    amount = self._parse_french_number(account_match.group(3))
                    
                    rows.append({
                        'account_number': account_num,
                        'account_name': account_name,
                        'amount': amount or 0
                    })
        
        return rows
    
    def _parse_text_general_ledger(self, content: str) -> list[dict]:
        """Parse un texte de Grand Livre en lignes structurées"""
        lines = content.split('\n')
        rows = []
        
        for line in lines:
            # Recherche de patterns de comptes auxiliaires (6 chiffres)
            if re.search(r'\b\d{6}\b', line):
                # Extraction du numéro de compte, date, libellé et montant
                ledger_match = re.search(r'(\d{6})\s+(.+?)\s+(\d{4}-\d{2}-\d{2})?\s*(\d+[.,]\d+|\d+)', line)
                if ledger_match:
                    account_num = ledger_match.group(1)
                    description = ledger_match.group(2).strip()
                    date = ledger_match.group(3) if ledger_match.group(3) else ''
                    amount = self._parse_french_number(ledger_match.group(4))
                    
                    rows.append({
                        'account_number': account_num,
                        'description': description,
                        'date': date,
                        'amount': amount or 0
                    })
        
        return rows
    
    def _convert_to_ohada_balance(self, rows: list[dict]) -> dict[str, Any]:
        """Convertit les lignes extraites en format balance OHADA"""
        accounts = []
        total_debit = 0
        total_credit = 0
        
        for row in rows:
            account_num = row.get('account_number', '')
            if len(account_num) >= 2 and account_num.isdigit():
                amount = row.get('amount', 0)
                
                # Détermination débit/crédit (simplifié)
                debit_balance = amount if amount > 0 else 0
                credit_balance = abs(amount) if amount < 0 else 0
                
                accounts.append({
                    'account_number': account_num,
                    'account_name': row.get('account_name', f'Compte {account_num}'),
                    'debit_balance': debit_balance,
                    'credit_balance': credit_balance
                })
                
                total_debit += debit_balance
                total_credit += credit_balance
        
        return {
            'accounts': accounts,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'is_balanced': abs(total_debit - total_credit) < 100
        }
    
    def _convert_to_general_ledger(self, rows: list[dict]) -> dict[str, Any]:
        """Convertit les lignes extraites en format Grand Livre"""
        auxiliary_accounts = {}
        
        for row in rows:
            account_num = row.get('account_number', '')
            if len(account_num) == 6 and account_num.isdigit():
                if account_num not in auxiliary_accounts:
                    auxiliary_accounts[account_num] = {
                        'account_number': account_num,
                        'account_name': row.get('description', f'Compte {account_num}'),
                        'entries': [],
                        'balance': 0
                    }
                
                amount = row.get('amount', 0)
                auxiliary_accounts[account_num]['entries'].append({
                    'date': row.get('date', ''),
                    'description': row.get('description', ''),
                    'debit': amount if amount > 0 else 0,
                    'credit': abs(amount) if amount < 0 else 0
                })
                
                auxiliary_accounts[account_num]['balance'] += amount
        
        return {
            'auxiliary_accounts': list(auxiliary_accounts.values())
        }


# ── Singleton ──────────────────────────────────────────────────
ocr_service = OcrService()
