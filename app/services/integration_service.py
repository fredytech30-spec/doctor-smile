
"""
Intégration Sage et Excel amélioré pour Doctor Smile
Permet d'importer directement les exports Sage et les fichiers Excel avec des templates prédéfinis
"""
import io
import logging
from typing import Any
import pandas as pd
from app.services.preprocessing_service import COL_ALIASES, preprocessing_service

log = logging.getLogger("doctorsmile.integration")

# Noms de colonnes spécifiques à Sage (français)
SAGE_COL_ALIASES: dict[str, str] = {
    # Bilan Sage
    "actifs_courants": "actif_courant",
    "actif_circulant": "actif_courant",
    "passifs_courants": "passif_courant",
    "passif_circulant": "passif_courant",
    "tresorerie_et_equivalents": "tresorerie",
    "stocks_marchandises": "stocks",
    "inventaire": "stocks",
    "chiffre_d_affaires": "chiffre_affaires",
    "ca_ht": "chiffre_affaires",
    "ca_ttc": "chiffre_affaires",
    "resultat_net_avant_impots": "resultat_net",
    "benefice_net": "resultat_net",
    "perte_nette": "resultat_net",
    "excedent_brut_d_exploitation": "ebitda",
    "ebit": "resultat_exploitation",
    "resultat_d_exploitation": "resultat_exploitation",
    "marge_sur_couts_variables": "marge_brute",
    "marge_brute_commerciale": "marge_brute",
    "interets_et_charges_assimilees": "charges_financieres",
    "charges_financieres": "charges_financieres",
    "resultats_reportes": "resultats_reportes",
    "actif_total": "actif_total",
    "total_actifs": "actif_total",
    "capitaux_propres": "capitaux_propres",
    "fonds_propres": "capitaux_propres",
    "equite": "capitaux_propres",
    "dettes_totales": "dettes_totales",
    "total_passifs": "dettes_totales",
    "dettes_a_long_terme": "dettes_lt",
    "dettes_lt": "dettes_lt",
    "besoin_en_fonds_de_roulement": "bfr",
    "bfr": "bfr",
    "creances_clients": "creances_clients",
    "clients": "creances_clients",
    "dettes_fournisseurs": "dettes_fournisseurs",
    "fournisseurs": "dettes_fournisseurs",
    # Ratios Sage
    "ratio_de_liquidite": "current_ratio",
    "ratio_liquidite_generale": "current_ratio",
    "ratio_liquidite_immediate": "quick_ratio",
    "ratio_de_tresorerie": "cash_ratio",
    "ratio_d_endettement": "debt_equity",
    "solvabilite": "solvabilite",
    "rentabilite_des_actifs": "roa",
    "roa": "roa",
    "rentabilite_des_capitaux_propres": "roe",
    "roe": "roe",
    "marge_ebitda": "ebitda_margin",
    "marge_nette": "net_margin",
    "marge_brute": "marge_brute_pct",
    "rotation_des_actifs": "rotation_actifs",
    "couverture_des_interets": "couverture_interets",
    "score_altman": "altman_z",
    # Meta
    "secteur_d_activite": "secteur",
    "secteur": "secteur",
    "taille_de_l_entreprise": "taille",
    "effectif": "effectif",
    "nombre_d_employes": "effectif",
    "pays": "pays",
    "age_de_l_entreprise": "annees_activite",
    "annees_d_activite": "annees_activite",
}


class IntegrationService:
    """
    Service pour intégrer Sage et Excel dans Doctor Smile
    - Import Sage: formats courants d'exports Sage
    - Excel amélioré: templates prédéfinis, détection multiple feuilles, etc.
    """

    _instance: "IntegrationService | None" = None

    def __new__(cls) -> "IntegrationService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def _normalize_sage_key(self, key: str) -> str:
        """Normalise un nom de colonne Sage vers le format interne"""
        import unicodedata
        k = str(key).lower().strip()
        k = unicodedata.normalize("NFD", k)
        k = "".join(c for c in k if unicodedata.category(c) != "Mn")
        k = k.replace(" ", "_").replace("'", "_").replace("-", "_")
        # Essayer d'abord Sage-specific, puis COL_ALIASES général
        if k in SAGE_COL_ALIASES:
            return SAGE_COL_ALIASES[k]
        if k in COL_ALIASES:
            return COL_ALIASES[k]
        return k

    def import_sage_export(
        self,
        file_bytes: bytes,
        filename: str,
    ) -> dict[str, Any]:
        """
        Importe un fichier d'export Sage (Excel ou CSV)
        """
        ext = filename.rsplit(".", 1)[-1].lower()

        try:
            if ext == "csv":
                # Essayer plusieurs encodages courants pour Sage
                for enc in ("cp1252", "latin-1", "utf-8", "utf-8-sig"):
                    try:
                        df = pd.read_csv(
                            io.BytesIO(file_bytes),
                            encoding=enc,
                            sep=None,
                            engine="python",
                            dtype=str
                        )
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Encodage CSV non supporté")
            elif ext in ("xlsx", "xls"):
                # Lire toutes les feuilles pour trouver celle avec données
                xl = pd.ExcelFile(io.BytesIO(file_bytes))
                df = None
                for sheet_name in xl.sheet_names:
                    temp_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, dtype=str)
                    if len(temp_df) > 0:
                        df = temp_df
                        break
                if df is None:
                    raise ValueError("Aucune feuille avec données trouvée")
            else:
                raise ValueError(f"Format non supporté pour Sage: {ext}")

            # Nettoyer le dataframe (supprimer les lignes vides, etc.)
            df = df.dropna(how="all")
            df = df.reset_index(drop=True)

            # Normaliser les noms de colonnes
            df.columns = [self._normalize_sage_key(col) for col in df.columns]

            # Convertir en enregistrements
            records = df.to_dict(orient="records")

            # Pré-traiter pour obtenir les features finales
            features = preprocessing_service._normalize_and_aggregate(records)
            final_features = preprocessing_service._compute_numeric_features(features)
            final_features = preprocessing_service._winsorize(final_features)

            # Détecter les colonnes reconnues
            cols_original = df.columns.tolist()
            cols_recognized = []
            cols_unknown = []
            for col in cols_original:
                normalized = self._normalize_sage_key(col)
                if normalized in COL_ALIASES.values():
                    cols_recognized.append(col)
                else:
                    cols_unknown.append(col)

            completeness = round(
                min(100.0, len(cols_recognized) / len(preprocessing_service._WINSOR_BOUNDS) * 100),
                1
            )

            return {
                "success": True,
                "filename": filename,
                "source": "sage",
                "row_count": len(records),
                "column_count": len(cols_original),
                "columns_original": cols_original,
                "columns_recognized": cols_recognized,
                "columns_unknown": cols_unknown,
                "completeness": completeness,
                "data": records,
                "preview": records[:5],
                "processed_features": final_features,
                "message": f"Import Sage réussi: {len(records)} lignes, {len(cols_recognized)} colonnes reconnues"
            }

        except Exception as e:
            log.error(f"Erreur import Sage: {e}", exc_info=True)
            return {
                "success": False,
                "filename": filename,
                "source": "sage",
                "error": str(e),
                "message": f"Échec de l'import Sage: {str(e)}"
            }

    def import_excel_enhanced(
        self,
        file_bytes: bytes,
        filename: str,
        sheet_name: str | None = None
    ) -> dict[str, Any]:
        """
        Importe un fichier Excel avec support amélioré :
        - Détection automatique de la feuille avec données
        - Support de plusieurs templates
        """
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext not in ("xlsx", "xls"):
            raise ValueError("Format doit être Excel (.xlsx ou .xls)")

        try:
            xl = pd.ExcelFile(io.BytesIO(file_bytes))
            available_sheets = xl.sheet_names
            df = None

            if sheet_name:
                if sheet_name not in available_sheets:
                    raise ValueError(f"Feuille '{sheet_name}' non trouvée. Disponibles: {available_sheets}")
                df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, dtype=str)
            else:
                # Trouver la feuille avec le plus de données
                best_sheet = None
                max_rows = 0
                for name in available_sheets:
                    temp_df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=name, dtype=str)
                    if len(temp_df) > max_rows:
                        max_rows = len(temp_df)
                        best_sheet = name
                        df = temp_df

                if df is None:
                    raise ValueError("Aucune feuille avec données trouvée")
                sheet_name = best_sheet

            # Nettoyer le dataframe
            df = df.dropna(how="all")
            df = df.reset_index(drop=True)

            # Normaliser les noms de colonnes
            df.columns = [preprocessing_service._normalize_key(col) for col in df.columns]

            # Convertir en enregistrements
            records = df.to_dict(orient="records")

            # Pré-traiter
            features = preprocessing_service._normalize_and_aggregate(records)
            final_features = preprocessing_service._compute_numeric_features(features)
            final_features = preprocessing_service._winsorize(final_features)

            # Détecter les colonnes reconnues
            cols_original = df.columns.tolist()
            cols_recognized = []
            cols_unknown = []
            for col in cols_original:
                normalized = preprocessing_service._normalize_key(col)
                if normalized in COL_ALIASES.values():
                    cols_recognized.append(col)
                else:
                    cols_unknown.append(col)

            completeness = round(
                min(100.0, len(cols_recognized) / len(preprocessing_service._WINSOR_BOUNDS) * 100),
                1
            )

            return {
                "success": True,
                "filename": filename,
                "source": "excel_enhanced",
                "sheet_used": sheet_name,
                "available_sheets": available_sheets,
                "row_count": len(records),
                "column_count": len(cols_original),
                "columns_original": cols_original,
                "columns_recognized": cols_recognized,
                "columns_unknown": cols_unknown,
                "completeness": completeness,
                "data": records,
                "preview": records[:5],
                "processed_features": final_features,
                "message": f"Import Excel amélioré réussi: {len(records)} lignes depuis la feuille '{sheet_name}'"
            }

        except Exception as e:
            log.error(f"Erreur import Excel amélioré: {e}", exc_info=True)
            return {
                "success": False,
                "filename": filename,
                "source": "excel_enhanced",
                "error": str(e),
                "message": f"Échec de l'import Excel: {str(e)}"
            }


# Instance singleton
integration_service = IntegrationService()

