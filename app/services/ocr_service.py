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

        # Fusionner kv dans rows si rows insuffisant
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
            return [], "none"
        return [kv], "tesseract_ocr"

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
            "dettes_totales", "ebitda",
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


# ── Singleton ──────────────────────────────────────────────────
ocr_service = OcrService()
