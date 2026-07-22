"""
==========================================
FIREBASE SERVICE
DOCTOR SMILE — Firebase Admin SDK
==========================================

Corrections critiques vs version originale :
  1. Les méthodes sont SYNCHRONES (Firestore Admin SDK Python = sync)
     → suppression de tous les async/await inutiles
  2. Les analyses sont écrites dans la collection RACINE analyses/
     (pas dans users/{uid}/analyses/) pour correspondre à ce
     qu'écoute dashboard.js via listenUserAnalyses()
  3. Initialisation via variables d'env OU fichier serviceAccountKey.json
  4. Singleton propre (pas de double-init)
  5. Ajout de get_score_history() et save_conversation_message()
"""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore, storage as firebase_storage
from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("doctorsmile.firebase")

# ════════════════════════════════════════════════════════════════
#  INITIALISATION — une seule fois
# ════════════════════════════════════════════════════════════════

def _init_firebase() -> firestore.Client | None:
    """
    Initialise Firebase Admin SDK selon l'ordre de priorité :
      1. Fichier serviceAccountKey.json (dev local + prod simple)
      2. Variables d'environnement FIREBASE_* (prod CI/CD / Docker)
      3. Mode mock (aucune credential → logs d'avertissement)
    """
    # Déjà initialisé
    try:
        firebase_admin.get_app()
        return firestore.client()
    except ValueError:
        pass

    cred_path = os.getenv("FIREBASE_CRED_PATH", "serviceAccountKey.json")

    # Option 1 — fichier JSON
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        storage_bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
        if storage_bucket:
            firebase_admin.initialize_app(cred, {'storageBucket': storage_bucket})
        else:
            firebase_admin.initialize_app(cred)
        log.info("✅ Firebase initialisé depuis %s", cred_path)
        return firestore.client()

    # Option 2 — variables d'environnement
    project_id  = os.getenv("FIREBASE_PROJECT_ID")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")

    if project_id and private_key and client_email:
        cred_dict = {
            "type":                        "service_account",
            "project_id":                  project_id,
            "private_key_id":              os.getenv("FIREBASE_PRIVATE_KEY_ID", ""),
            "private_key":                 private_key,
            "client_email":                client_email,
            "client_id":                   os.getenv("FIREBASE_CLIENT_ID", ""),
            "auth_uri":                    "https://accounts.google.com/o/oauth2/auth",
            "token_uri":                   "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url":        os.getenv("FIREBASE_CLIENT_X509_CERT_URL", ""),
        }
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
        log.info("✅ Firebase initialisé depuis les variables d'environnement")
        return firestore.client()

    # Option 3 — mode mock
    log.warning(
        "⚠️  Firebase non configuré (ni %s ni variables FIREBASE_*). "
        "Mode mock activé — aucune donnée persistée.",
        cred_path,
    )
    return None


_DB: firestore.Client | None = _init_firebase()


class FirebaseService:
    """
    Toutes les opérations Firestore pour Doctor Smile.
    Méthodes SYNCHRONES — le Firestore Admin SDK Python n'est pas async.
    Pour un usage async dans FastAPI, utiliser run_in_executor() si nécessaire.
    """

    def __init__(self) -> None:
        self._db = _DB

    @property
    def db(self) -> firestore.Client:
        if self._db is None:
            raise RuntimeError(
                "Firebase non initialisé. "
                "Vérifiez FIREBASE_CRED_PATH ou les variables FIREBASE_*."
            )
        return self._db

    @property
    def available(self) -> bool:
        return self._db is not None

    # ════════════════════════════════════════════════════════════
    #  ANALYSES — collection RACINE analyses/
    #  ⚠️  Ne PAS utiliser users/{uid}/analyses/ → le frontend
    #      écoute analyses/ avec .where("userId","==", uid)
    # ════════════════════════════════════════════════════════════

    def save_analysis(self, analyse_id: str, doc: dict[str, Any]) -> str | None:
        """
        Écrit une analyse dans analyses/{analyse_id}.
        Retourne l'ID si succès, None si erreur.
        """
        if not self.available:
            log.warning("save_analysis skipped (mock mode)")
            return analyse_id

        try:
            self.db.collection("analyses").document(analyse_id).set(doc)
            log.info("✅ Analyse sauvegardée → analyses/%s  score=%s",
                     analyse_id, doc.get("score"))
            return analyse_id
        except Exception as exc:
            log.error("save_analysis error: %s", exc)
            return None

    def upload_to_storage(self, path: str, data: bytes) -> str | None:
        """Upload des données JSON vers Firebase Storage et retour de l'URL publique."""
        if not self.available:
            log.warning("upload_to_storage skipped (mock mode)")
            return None

        try:
            bucket = firebase_storage.bucket()
            if bucket is None:
                log.warning("Firebase storage bucket non configuré.")
                return None

            blob = bucket.blob(path)
            blob.upload_from_string(data, content_type="application/json")
            try:
                blob.make_public()
            except Exception:
                pass

            return blob.public_url or f"gs://{bucket.name}/{path}"
        except Exception as exc:
            log.error("upload_to_storage error: %s", exc)
            return None

    def store_analysis_metadata(
        self,
        document_id: str,
        user_id: str,
        filename: str,
        doc_type: str,
        analysis: dict[str, Any],
        quality_metrics: dict[str, Any],
        export_url: str | None = None,
        timestamp: str | None = None,
    ) -> bool:
        """Stocke les métadonnées d'une analyse dans Firestore."""
        if not self.available:
            log.warning("store_analysis_metadata skipped (mock mode)")
            return True

        timestamp = timestamp or str(datetime.utcnow().isoformat())
        doc = {
            'id': document_id,
            'userId': user_id,
            'filename': filename,
            'doc_type': doc_type,
            'status': 'completed',
            'analysis': analysis,
            'quality_metrics': quality_metrics,
            'export_url': export_url,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP,
            'timestamp': timestamp,
        }

        if export_url:
            doc['export_url'] = export_url

        result = self.save_analysis(document_id, doc)
        return result is not None

    def store_feedback(self, feedback_entry: dict[str, Any]) -> bool:
        """Stocke un feedback utilisateur lié à une analyse."""
        if not self.available:
            log.warning("store_feedback skipped (mock mode)")
            return True

        try:
            self.db.collection('analysis_feedback').add({
                **feedback_entry,
                'createdAt': firestore.SERVER_TIMESTAMP,
            })
            return True
        except Exception as exc:
            log.error("store_feedback error: %s", exc)
            return False

    def get_analysis(self, analyse_id: str) -> dict[str, Any] | None:
        """Retourne une analyse par ID depuis analyses/{analyse_id}."""
        if not self.available:
            return None
        try:
            doc = self.db.collection("analyses").document(analyse_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            log.error("get_analysis error: %s", exc)
            return None

    def get_analyses_for_user(
        self, user_id: str, limit: int = 20
    ) -> list[dict[str, Any]]:
        """
        Retourne les analyses d'un utilisateur triées par date desc.
        Utilisé par GET /scores pour la sidebar.
        """
        if not self.available:
            return []
        try:
            # Try with orderBy first (requires composite index)
            try:
                docs = (
                    self.db.collection("analyses")
                    .where("userId", "==", user_id)
                    .order_by("createdAt", direction=firestore.Query.DESCENDING)
                    .limit(limit)
                    .stream()
                )
                result = []
                for d in docs:
                    data = d.to_dict()
                    data["id"] = d.id
                    result.append(data)
                return result
            except Exception as index_error:
                # Fallback: fetch without orderBy and sort client-side
                if "index" in str(index_error).lower():
                    log.warning("Firestore index missing, using client-side sorting fallback")
                    docs = (
                        self.db.collection("analyses")
                        .where("userId", "==", user_id)
                        .limit(limit * 2)  # Fetch more to account for sorting
                        .stream()
                    )
                    result = []
                    for d in docs:
                        data = d.to_dict()
                        data["id"] = d.id
                        result.append(data)
                    # Sort client-side by createdAt
                    result.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
                    return result[:limit]
                else:
                    raise
        except Exception as exc:
            log.error("get_analyses_for_user error: %s", exc)
            return []

    def get_score_history(
        self, user_id: str, entreprise: str, limit: int = 6
    ) -> list[int]:
        """
        Retourne les N derniers scores pour (user_id, entreprise).
        Utilisé pour construire scoreHistory (timeline dashboard).
        """
        if not self.available:
            return []
        try:
            # Requête sans order_by pour éviter l'index composite Firestore
            # (l'index doit être créé manuellement dans la console Firebase).
            # On trie côté Python sur createdAt.
            docs = (
                self.db.collection("analyses")
                .where("userId",     "==", user_id)
                .where("entreprise", "==", entreprise)
                .limit(limit * 3)   # marge pour le tri Python
                .stream()
            )
            results = []
            for d in docs:
                data = d.to_dict()
                score = data.get("score")
                if isinstance(score, (int, float)):
                    ts = data.get("createdAt")
                    results.append((ts, score))

            # Tri décroissant par date côté Python
            def _ts_sort_key(item):
                ts = item[0]
                if ts is None: return 0
                if hasattr(ts, "timestamp"): return ts.timestamp()
                return 0

            results.sort(key=_ts_sort_key, reverse=True)
            scores = [s for (_, s) in results[:limit]]
            return list(reversed(scores))   # ordre chronologique pour la timeline
        except Exception as exc:
            log.warning("get_score_history error: %s", exc)
            return []

    def log_event(self, user_id: str, event_type: str, data: dict[str, Any]) -> bool:
        """Enregistre un événement dans la collection events/{id}."""
        if not self.available: return True
        try:
            doc = {
                "userId":    user_id,
                "type":      event_type,
                "data":      data,
                "createdAt": firestore.SERVER_TIMESTAMP,
            }
            self.db.collection("events").add(doc)
            return True
        except Exception as exc:
            log.error("log_event error: %s", exc)
            return False

    def delete_analysis(self, analyse_id: str) -> bool:
        """Supprime une analyse par son ID."""
        if not self.available: return True
        try:
            self.db.collection("analyses").document(analyse_id).delete()
            log.info("✅ Analyse supprimée : %s", analyse_id)
            return True
        except Exception as exc:
            log.error("delete_analysis error: %s", exc)
            return False

    # ════════════════════════════════════════════════════════════
    #  UTILISATEURS — collection users/
    # ════════════════════════════════════════════════════════════

    def get_user(self, user_id: str) -> dict[str, Any] | None:
        if not self.available:
            return None
        try:
            doc = self.db.collection("users").document(user_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            log.error("get_user error: %s", exc)
            return None

    def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        """
        Retourne le profil utilisateur simplifié pour l'usage dans le chat.
        Cherche dans `users/{user_id}` et renvoie le dict si présent.
        """
        if not self.available:
            return None
        try:
            doc = self.db.collection("users").document(user_id).get()
            if not doc.exists:
                return None
            data = doc.to_dict()
            # Normaliser les clés fréquemment utilisées par le router/chat
            profile = {
                "email":  data.get("email") or data.get("mail") or None,
                "prenom": data.get("prenom") or data.get("firstName") or data.get("first_name") or "",
                "nom":    data.get("nom") or data.get("lastName") or data.get("last_name") or "",
                **{k: v for k, v in data.items() if k not in ("email", "prenom", "nom")},
            }
            return profile
        except Exception as exc:
            log.error("get_user_profile error: %s", exc)
            return None

    def save_user(self, user_id: str, data: dict[str, Any]) -> bool:
        """Upsert partiel du profil utilisateur."""
        if not self.available:
            return False
        try:
            self.db.collection("users").document(user_id).set(
                {**data, "updatedAt": firestore.SERVER_TIMESTAMP},
                merge=True,
            )
            return True
        except Exception as exc:
            log.error("save_user error: %s", exc)
            return False

    # ════════════════════════════════════════════════════════════
    #  CONVERSATIONS — collection conversations/
    # ════════════════════════════════════════════════════════════

    def save_conversation_message(
        self, conv_id: str, role: str, content: str
    ) -> bool:
        """Ajoute un message à conversations/{conv_id}/messages/."""
        if not self.available:
            return False
        try:
            self.db.collection("conversations") \
                   .document(conv_id) \
                   .collection("messages") \
                   .add({
                       "role":      role,
                       "content":   content,
                       "createdAt": firestore.SERVER_TIMESTAMP,
                   })
            return True
        except Exception as exc:
            log.warning("save_conversation_message error: %s", exc)
            return False

    def get_user_analyses(self, user_id: str) -> list[dict[str, Any]]:
        """Récupère les analyses d'un utilisateur (alias de get_analyses_for_user)."""
        return self.get_analyses_for_user(user_id, limit=50)

    def get_user_conversations(self, user_id: str) -> list[dict[str, Any]]:
        """Récupère les métadonnées des conversations de l'utilisateur."""
        if not self.available:
            return []
        try:
            # Query standard sur la collection racine conversations/
            docs = (
                self.db.collection("conversations")
                .where("userId", "==", user_id)
                .stream()
            )
            result = []
            for d in docs:
                data = d.to_dict()
                data["id"] = d.id
                result.append(data)
            
            # Trier par createdAt localement pour éviter d'imposer un index composite
            def _get_time(doc):
                ts = doc.get("createdAt")
                if ts is None: return 0
                if hasattr(ts, "timestamp"): return ts.timestamp()
                return 0
            
            result.sort(key=_get_time, reverse=True)
            return result
        except Exception as exc:
            log.error("get_user_conversations error: %s", exc)
            return []

    # ── Fin de classe ──

# ── Singleton ──────────────────────────────────────────────────
firebase_service = FirebaseService()