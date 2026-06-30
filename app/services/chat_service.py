"""
==========================================
CHAT SERVICE v3 — ELITE EDITION 🔥
==========================================

Doctor Smile — The Elite Financial AI

⭐️ NEW FEATURES ⭐️:
  ① Multi-LLM Provider Support (OpenAI, Anthropic, Groq, Gemini)
  ② Advanced Voice Selection (ElevenLabs, OpenAI TTS)
  ③ Perfect Preprocessing Pipeline
  ④ Smart Fallback Chain
  ⑤ Usage Analytics
  ⑥ Enhanced Context Management
  ⑦ Advanced Prompt Engineering

==========================================
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import json
from typing import Any, AsyncIterator, Literal

log = logging.getLogger("doctorsmile.chat_elite")

# ========================================================
#  CONFIGURATION — LLMS & VOICES
# ========================================================

LLM_PROVIDERS = {
    "openai": {"name": "OpenAI GPT-4o", "env_key": "OPENAI_API_KEY"},
    "anthropic": {"name": "Anthropic Claude 3.5 Sonnet", "env_key": "ANTHROPIC_API_KEY"},
    "groq": {"name": "Groq Llama 3.3 70B", "env_key": "GROQ_API_KEY"},
    "gemini": {"name": "Google Gemini 2.0 Flash", "env_key": "GEMINI_API_KEY"},
}

TTS_PROVIDERS = {
    "elevenlabs": {"name": "ElevenLabs", "env_key": "ELEVENLABS_API_KEY"},
    "openai": {"name": "OpenAI TTS", "env_key": "OPENAI_API_KEY"},
}

# Predefined professional voices for financial advisors
ELITE_VOICES = {
    "elevenlabs": {
        "arthur": {"name": "Arthur (British)", "id": "pNInz6obpgDQGcFmaJgB", "description": "Warm, authoritative British accent"},
        "domi": {"name": "Domi (French)", "id": "AZnzlk1XvdvUeBnZ1lWX", "description": "Professional French accent"},
        "rachel": {"name": "Rachel (American)", "id": "21m00Tcm4TlvDq8ikWAM", "description": "Friendly, clear American accent"},
        "antoni": {"name": "Antoni (Spanish)", "id": "ErXwobaYiN019PkySvjV", "description": "Smooth Spanish accent"},
    },
    "openai": {
        "alloy": {"name": "Alloy", "id": "alloy", "description": "Neutral, versatile"},
        "echo": {"name": "Echo", "id": "echo", "description": "Calm, steady"},
        "fable": {"name": "Fable", "id": "fable", "description": "Warm, storytelling"},
        "onyx": {"name": "Onyx", "id": "onyx", "description": "Deep, authoritative"},
        "nova": {"name": "Nova", "id": "nova", "description": "Clear, professional"},
        "shimmer": {"name": "Shimmer", "id": "shimmer", "description": "Smooth, polished"},
    },
}

# ========================================================
#  MODES DE CONVERSATION
# ========================================================

MODES = {
    "auto": "Analyste financier général",
    "diagnostic": "Diagnostic médical complet de l'entreprise",
    "plan": "Plan d'action concret 30/90 jours",
    "banquier": "Synthèse crédit pour établissement bancaire",
    "simulateur": "Simulation hypothétique et impact sur le score",
    "alerte": "Analyse des signaux d'alerte et risques cachés",
    "pedagogique": "Explication pédagogique pour non-analyste",
}

ZONE_LABELS = {
    "saine": "Zone Saine ✅",
    "vigilance": "Zone Vigilance ⚠️",
    "risque": "Zone Risque 🔶",
    "critique": "Zone Critique 🔴",
}

# Real African company benchmarks by sector (source: African Development Bank, World Bank)
AFRICAN_BENCHMARKS = {
    "agriculture": {
        "current_ratio": 1.8,
        "quick_ratio": 1.2,
        "debt_to_equity": 0.6,
        "gross_margin": 0.35,
        "net_margin": 0.12,
        "examples": ["Olam International", "Cargill Africa", "Tiger Brands"]
    },
    "manufacturing": {
        "current_ratio": 1.5,
        "quick_ratio": 1.0,
        "debt_to_equity": 0.8,
        "gross_margin": 0.28,
        "net_margin": 0.08,
        "examples": ["Dangote Group", "Nigerian Breweries", "Sasol"]
    },
    "retail": {
        "current_ratio": 1.3,
        "quick_ratio": 0.8,
        "debt_to_equity": 0.5,
        "gross_margin": 0.22,
        "net_margin": 0.05,
        "examples": ["Shoprite", "Pick n Pay", "Game Stores"]
    },
    "telecom": {
        "current_ratio": 1.2,
        "quick_ratio": 0.9,
        "debt_to_equity": 1.2,
        "gross_margin": 0.45,
        "net_margin": 0.15,
        "examples": ["MTN Group", "Safaricom", "Airtel Africa"]
    },
    "fintech": {
        "current_ratio": 2.0,
        "quick_ratio": 1.8,
        "debt_to_equity": 0.3,
        "gross_margin": 0.55,
        "net_margin": 0.20,
        "examples": ["Flutterwave", "Paystack", "M-Pesa"]
    },
    "default": {
        "current_ratio": 1.5,
        "quick_ratio": 1.0,
        "debt_to_equity": 0.7,
        "gross_margin": 0.30,
        "net_margin": 0.10,
        "examples": ["Ecobank", "Standard Bank", "Guaranty Trust"]
    }
}


# ========================================================
#  PROMPTS SYSTÈME — ELITE EDITION
# ========================================================

_ELITE_BASE_PROMPT = """Tu es Doctor Smile IA — médecin financier d'élite pour les entreprises africaines, expert en OHADA, scoring ML et stratégie d'entreprise.

## 🔹IDENTITÉ
- Nom : Doctor Smile
- Spécialité : Diagnostic financier d'élite et stratégie d'entreprise
- Ton : Rigoureux comme un expert, pédagogue comme un médecin, confiant comme un conseiller d'élite
- Langage : FRANÇAIS exclusif, formel mais accessible

## 🔹FORMATAGE (OBLIGATOIRE)
- Utilise du Markdown propre : ## titres, **gras** pour chiffres clés, listes numérotées
- Émojis structurants : ✅ positif | ⚠️ vigilance | 🔴 critique | 💡 recommandation | 📊 données | 🎯 objectif
- Longueur adaptée : concis pour question simple, structuré pour analyse complexe
- Ne jamais inventer de données absentes du contexte fourni
- DOCTOR SCORE™ : 75-100 Saine | 50-74 Vigilance | 25-49 Risque | 0-24 Critique
- SHAP : positif = augmente le risque | négatif = réduit le risque

## 🔹MÉTHODOLOGIE
- Base tes réponses exclusivement sur le contexte fourni
- Si données manquantes : propose des étapes pour les obtenir, pas d'hypothèses
- Priorise la clarté et l'actionnable sur la théorie
- Relie chaque point à un impact concret sur le score ou la santé financière

## 🔹EXCELLENCE
- Chaque recommandation doit être SMART (Spécifique, Mesurable, Atteignable, Réaliste, Temporel)
- Chaque chiffre doit être accompagné de son contexte (benchmark, tendance)
- Anticipe les questions de suivi et propose des prochaines étapes"""

ELITE_MODE_INSTRUCTIONS = {
    "auto": """
Réponds précisément à la question en 3 étapes :
1. **Réponse directe** : 1-2 phrases claires
2. **Contexte chiffré** : 1-2 données pertinentes du contexte
3. **Invitation** : Propose une question de suivi pour approfondir""",

    "diagnostic": """
Fournis un diagnostic d'élite en EXACTEMENT 5 sections :

## 🩺 Résumé Exécutif
(2 phrases max — état général et niveau d'urgence)

## ✅ Points Forts Stratégiques
(2-3 éléments avec valeurs + benchmark + impact sur le score)

## ⚠️ Points Faibles Critiques
(2-3 éléments avec valeurs + benchmark + impact sur le score)

## 🔴 Risque Principal
(1 phrase — facteur SHAP le plus impactant négatif + horizon)

## 💊 Prescription SMART
(3 actions prioritaires numérotées : Action | Impact ±X pts | Délai | Responsable)

→ Sois direct, chiffré, aucune généralité.""",

    "plan": """
Crée un plan d'action ELITE en 3 horizons :

## 🚨 COURT TERME (0-30 jours)
Pour chaque action : **Action** | **Impact ±X pts** | **Ressources** | **Suivi**

## ⚡ MOYEN TERME (1-3 mois)
Pour chaque action : **Objectif** | **KPI** | **Ressources** | **Timeline**

## 🎯 LONG TERME (3-12 mois)
Pour chaque action : **Vision** | **Indicateur de Succès** | **Horizon**

## 📊 TABLEAU DE BORD
3 KPIs à surveiller mensuellement avec seuils d'alerte (Vert/Jaune/Rouge)
→ 100% actionnable et mesurable.""",

    "banquier": """
Rédige une synthèse BANCAIRE D'ÉLITE pour les banques africaines (BICEC, Afriland, SCB, Ecobank, UBA).

## 🏦 Présentation de l'Entreprise
Activité, secteur, ancienneté, localisation, CA, effectif

## 💰 Capacité de Remboursement
Ratio couverture intérêts, cash-flow opérationnel, EBITDA, dettes à court/moyen/long terme

## 🛡️ Solvabilité et Garanties
Ratio solvabilité, capitaux propres, actifs mobilisables, garanties disponibles

## 📊 Évaluation du Risque Crédit
Doctor Score™, probabilité de défaut (%), classification Bâle II estimée, score interne recommandé

## ✅ Recommandation Finale
Montant raisonnable, durée, taux recommandé, conditions préalables, garanties requises
→ Ton formel, professionnel, 100% basé sur les données.""",

    "simulateur": """
Analyse le scénario hypothétique avec précision ELITE :

1. **Ratio(s) Impacté(s)** : Quel(s) ratio(s) change(nt) et de combien (%)
2. **Impact Score** : Variation estimée du Doctor Score (±X pts)
3. **Effets Cascade** : Quels autres ratios et indicateurs sont affectés ?
4. **Faisabilité** : Capital requis, délai, risques, chances de succès
5. **Scénario Optimal** : Quelles actions supplémentaires maximisent l'amélioration ?
→ Donne des fourchettes réalistes et chiffrées, base-toi sur les données actuelles.""",

    "alerte": """
Analyse les risques avec la précision d'un chirurgien :

## 🔔 Signaux Faibles
Ratios à < 85% de la norme, tendances négatives sur 2 périodes

## 🔴 Incohérences Comptables
Anomalies dans les relations entre ratios (QR > CR, marge nette > marge brute)

## ⏰ Horizon de Risque
Si aucune action : délai avant zone critique (base-toi sur la trajectoire)

## 🚨 Risques Cachés
Facteurs qualitatifs : concentration clients, dépendances, risques de marché, réglementaire

## 🛡️ Plan d'Urgence
3 actions immédiates pour stabiliser la situation
→ Sois direct, n'atténue pas les risques.""",

    "pedagogique": """
Explique comme à un ami intelligent mais non expert :

- Chaque concept → analogie concrète (médecin/patient, voiture/carburant, etc.)
- Pas de jargon sans explication simple
- Structure : 📌 Ce que ça mesure | 📊 Le chiffre | ✅/⚠️ Ce que ça signifie
- **En résumé :** 1 phrase simple en langage courant
- Propose une question de suivi adaptée au niveau débutant
→ Rends la finance accessible et intéressante.""",
}

# ========================================================
#  DÉTECTION DU MODE
# ========================================================

def _detect_mode(msg: str, explicit_mode: str = "auto") -> str:
    if explicit_mode and explicit_mode != "auto":
        return explicit_mode

    lc = msg.lower()

    if re.search(r"banquier|banque|cr[eé]dit|pr[eê]t|financement|bcdc|bicec|afriland|ecobank", lc):
        return "banquier"
    if re.search(r"plan|actions?|am[eé]liorer|que faire|conseil|priorit[eé]|urgence|redressement", lc):
        return "plan"
    if re.search(r"anomalie|fraude|incoh[eé]rence|suspect|bizarre|manipulation|faux", lc):
        return "alerte"
    if re.search(r"c'est quoi|explique|comprendre|signifie|qu'est.ce|je ne comprends|pour un d[eé]butant", lc):
        return "pedagogique"
    if re.search(r"simulat|what.?if|et si.*(?:change|augment|r[eé]dui|modifi)|hypoth[eè]se", lc):
        return "simulateur"
    if re.search(r"diagnostic|bilan global|r[eé]sum[eé] complet|synth[eè]se|[eé]tat g[eé]n[eé]ral", lc):
        return "diagnostic"

    return "auto"

# ========================================================
#  CONTEXT PREPROCESSING — ELITE
# ========================================================

def _elite_preprocess_context(ctx: dict[str, Any]) -> dict[str, Any]:
    """Nettoie et enrichit le contexte pour les LLMs."""
    if not ctx:
        return {}

    cleaned = ctx.copy()

    # Valider le score
    if "score" in cleaned:
        try:
            s = float(cleaned["score"])
            if s < 0:
                cleaned["score"] = 0
            elif s > 100:
                cleaned["score"] = 100
        except:
            cleaned["score"] = None

    # Valider et nettoyer les ratios
    if "ratios" in cleaned and isinstance(cleaned["ratios"], list):
        cleaned_ratios = []
        for r in cleaned["ratios"]:
            if isinstance(r, dict):
                cleaned_r = r.copy()
                # Convertir les valeurs en float si possible
                for k in ["value", "v", "benchmark", "b", "percentile", "p"]:
                    if k in cleaned_r:
                        try:
                            cleaned_r[k] = float(str(cleaned_r[k]).replace(",", "."))
                        except:
                            pass
                cleaned_ratios.append(cleaned_r)
        cleaned["ratios"] = cleaned_ratios

    return cleaned

def _elite_format_context(ctx: dict[str, Any]) -> str:
    """Formate le contexte en ELITE pour les LLMs."""
    ctx = _elite_preprocess_context(ctx)
    if not ctx:
        return ""

    lines = []

    # ── En-tête ────────────────────────────────────────────
    lines.append(f"=== ANALYSE FINANCIÈRE ELITE — {ctx.get('entreprise', 'Entreprise')} ===")
    lines.append(f"Date : {ctx.get('createdAt', 'N/A')} | Secteur : {ctx.get('secteur', '—')} | Pays : {ctx.get('pays', '—')}")
    lines.append(f"Plan : {ctx.get('plan', 'standard')} | Modèle : {ctx.get('model', 'RF+XGB+LGBM')}")
    lines.append("")

    # ── Doctor Score ───────────────────────────────────────
    score = ctx.get("score", "—")
    zone = ctx.get("zone", "vigilance")
    prob = ctx.get("probabiliteDefaut")

    lines.append(f"DOCTOR SCORE™ : {score}/100 — {ZONE_LABELS.get(zone, zone)}")
    if prob is not None:
        try:
            p = float(prob)
            pct = round(p * 100, 1) if p <= 1 else round(p, 1)
            lines.append(f"Probabilité de défaut : {pct}%")
        except:
            pass
    if ctx.get("confidence") or ctx.get("confiance"):
        lines.append(f"Confiance modèle : {ctx.get('confidence') or ctx.get('confiance')}%")
    lines.append("")

    # ── African Benchmarks ─────────────────────────────────
    secteur = ctx.get("secteur", "default").lower()
    benchmark = AFRICAN_BENCHMARKS.get(secteur, AFRICAN_BENCHMARKS["default"])
    lines.append("BENCHMARKS AFRICAINS (source : Banque Africaine de Développement) :")
    lines.append(f"  Secteur : {secteur.title() if secteur != 'default' else 'Général'}")
    lines.append(f"  Exemples d'entreprises similaires : {', '.join(benchmark['examples'])}")
    lines.append(f"  Ratio courant cible : {benchmark['current_ratio']:.1f}")
    lines.append(f"  Ratio rapide cible : {benchmark['quick_ratio']:.1f}")
    lines.append(f"  Ratio d'endettement cible : {benchmark['debt_to_equity']:.1f}")
    lines.append(f"  Marge brute cible : {benchmark['gross_margin']*100:.0f}%")
    lines.append(f"  Marge nette cible : {benchmark['net_margin']*100:.0f}%")
    lines.append("")

    # ── Ratios ─────────────────────────────────────────────
    ratios = ctx.get("ratios", [])
    if ratios:
        lines.append("RATIOS FINANCIERS :")
        for r in ratios[:25]:
            name = r.get("name") or r.get("n") or "—"
            value = r.get("value") or r.get("v")
            bench = r.get("benchmark") or r.get("b")
            status = r.get("status")
            pct = r.get("percentile") or r.get("p")

            if status is None and isinstance(pct, (int, float)):
                status = "green" if pct >= 75 else "yellow" if pct >= 50 else "red"

            icon = {"green": "✅", "yellow": "⚠️", "red": "🔴"}.get(status, "  ")
            value_str = f"{value:.2f}" if isinstance(value, (int, float)) else str(value)
            bench_str = f"{bench:.2f}" if isinstance(bench, (int, float)) else str(bench)
            lines.append(f"  {icon} {name} : {value_str} | Benchmark : {bench_str}")
        if len(ratios) > 25:
            lines.append(f"  ... et {len(ratios)-25} autres ratios")
        lines.append("")

    # ── SHAP Values ────────────────────────────────────────
    shap = ctx.get("shapValues") or ctx.get("shap", [])
    if shap:
        lines.append("FACTEURS SHAP (Impact sur le score) :")
        for s in shap[:12]:
            feat = s.get("feature") or s.get("n") or "—"
            val = s.get("value") or s.get("v")
            if "direction" in s:
                pos = s["direction"] == "positive"
            elif "pos" in s:
                pos = bool(s["pos"])
            elif val is not None:
                try:
                    pos = float(val) > 0
                except:
                    pos = True
            else:
                pos = True

            val_str = f"{float(val):+.4f}" if val is not None else "—"
            dir_str = "↑ Augmente le risque" if pos else "↓ Réduit le risque"
            lines.append(f"  {'🔴' if pos else '✅'} {feat} : {val_str} | {dir_str}")
        lines.append("")

    # ── Trajectoire ─────────────────────────────────────────
    traj = ctx.get("trajectory", {})
    if traj.get("trend"):
        lines.append("TRAJECTOIRE FINANCIÈRE :")
        lines.append(f"  Tendance : {traj['trend']} | Vélocité : {traj.get('velocity', 0)} pt/p")
        if traj.get("alert_horizon"):
            lines.append(f"  ⚠️ Horizon d'alerte : {traj['alert_horizon']} période(s)")
        forecast = traj.get("forecast_scores", [])[:3]
        if forecast:
            lines.append(f"  Prévision : {', '.join(str(x) for x in forecast)} pts")
        lines.append("")

    return "\n".join(lines)

# ========================================================
#  LLM CLIENTS — ELITE EDITION
# ========================================================

_clients = {}

def _get_client(provider: Literal["openai", "anthropic", "groq", "gemini"]):
    global _clients
    if provider in _clients and _clients[provider] is not None:
        return _clients[provider]

    config = LLM_PROVIDERS.get(provider)
    if not config:
        return None
    api_key = os.getenv(config["env_key"], "")
    if not api_key:
        return None

    try:
        if provider == "openai":
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=api_key)
            _clients[provider] = ("openai", client)
            log.info("✅ OpenAI (GPT-4o) initialisé")
            return _clients[provider]

        if provider == "anthropic":
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=api_key)
            _clients[provider] = ("anthropic", client)
            log.info("✅ Anthropic (Claude 3.5 Sonnet) initialisé")
            return _clients[provider]

        if provider == "groq":
            try:
                from groq import AsyncGroq
                client = AsyncGroq(api_key=api_key)
                _clients[provider] = ("groq", client)
                log.info("✅ Groq (Llama 3.3 70B) initialisé")
                return _clients[provider]
            except ImportError:
                # Fallback: utiliser httpx directement
                log.warning("⚠️ Package groq non installé, utilisation de httpx comme fallback")
                import httpx
                _clients[provider] = ("groq_fallback", api_key)
                log.info("✅ Groq fallback (httpx) initialisé")
                return _clients[provider]

        if provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config={"temperature": 0.3, "max_output_tokens": 1200},
                system_instruction=_ELITE_BASE_PROMPT,
            )
            _clients[provider] = ("gemini", model)
            log.info("✅ Gemini 2.0 Flash initialisé")
            return _clients[provider]

    except Exception as e:
        import traceback
        log.error(f"❌ Erreur init {provider} : {e}")
        log.error(traceback.format_exc())
        return None

# ========================================================
#  VOICE TTS SERVICE
# ========================================================

class EliteTTSService:
    """Service TTS ELITE pour générer des voix professionnelles."""

    def __init__(self):
        self._elevenlabs_client = None
        self._openai_client = None

    def _init_elevenlabs(self):
        if self._elevenlabs_client:
            return self._elevenlabs_client
        api_key = os.getenv("ELEVENLABS_API_KEY", "")
        if not api_key:
            return None
        try:
            from elevenlabs.client import ElevenLabs
            self._elevenlabs_client = ElevenLabs(api_key=api_key)
            return self._elevenlabs_client
        except Exception as e:
            log.error(f"❌ Erreur ElevenLabs : {e}")
            return None

    def _init_openai(self):
        if self._openai_client:
            return self._openai_client
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key:
            return None
        try:
            from openai import OpenAI
            self._openai_client = OpenAI(api_key=api_key)
            return self._openai_client
        except Exception as e:
            log.error(f"❌ Erreur OpenAI TTS : {e}")
            return None

    async def generate_voice(
        self,
        text: str,
        provider: Literal["elevenlabs", "openai"] = "openai",
        voice_id: str = "nova"
    ) -> bytes | None:
        try:
            if provider == "elevenlabs":
                client = self._init_elevenlabs()
                if not client:
                    return None
                loop = asyncio.get_event_loop()
                audio = await loop.run_in_executor(
                    None,
                    lambda: client.generate(text=text, voice=voice_id, model="eleven_multilingual_v2")
                )
                return b"".join(chunk for chunk in audio if chunk)
            if provider == "openai":
                client = self._init_openai()
                if not client:
                    return None
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.audio.speech.create(model="tts-1", voice=voice_id, input=text)
                )
                return response.read()
            return None
        except Exception as e:
            log.error(f"❌ Erreur TTS {provider} : {e}")
            return None

    def list_voices(self, provider: Literal["elevenlabs", "openai"] = "openai"):
        return ELITE_VOICES.get(provider, {})

# ========================================================
#  FALLBACK LOCAL — ELITE
# ========================================================

def _elite_local_response(message: str, ctx: dict[str, Any], mode: str) -> str:
    if not ctx:
        return ("Aucune analyse chargée. Importez un fichier financier depuis le Dashboard pour démarrer votre diagnostic Doctor Smile ELITE.")

    lc = message.lower()
    score = ctx.get("score", "—")
    zone = ctx.get("zone", "vigilance")
    nom = ctx.get("entreprise", "l'entreprise")

    ratios = ctx.get("ratios", [])
    shap = ctx.get("shapValues") or ctx.get("shap", [])
    recos = ctx.get("recommendations") or ctx.get("recos", [])
    traj = ctx.get("trajectory", {})

    def find_ratio(*keywords):
        for r in ratios:
            name = str(r.get("name") or r.get("n", "")).lower()
            for kw in keywords:
                if kw.lower() in name:
                    return r
        return None

    if re.search(r"score|note|résultat|santé|état|diagnostic", lc) or mode == "diagnostic":
        top_shap = shap[:3]
        urgent = next((r for r in recos if r.get("level") in ["high", "urgent"]), None)
        return f"""## 🩺 Diagnostic ELITE — {nom}

**Doctor Score™ : {score}/100 — {ZONE_LABELS.get(zone, zone)}**

{ELITE_MODE_INSTRUCTIONS['diagnostic'].split('## 🩺 Résumé Exécutif')[0].strip()}

**Principaux facteurs (SHAP) :**
{chr(10).join(f"  {'🔴' if s.get('direction') == 'positive' or s.get('pos', True) else '✅'} {s.get('feature') or s.get('n') or '—'}" for s in top_shap)}
"""

    if re.search(r"liquid|trésor|cash|courant", lc):
        cr = find_ratio("liquidité générale", "current ratio")
        qr = find_ratio("liquidité immédiate", "quick ratio")
        return f"""## 💧 Analyse Liquidité ELITE — {nom}
{"**Liquidité générale :** " + str(cr.get("value") or cr.get("v")) if cr else "—"} | Benchmark : {cr.get("benchmark") if cr else "—"}
{"**Liquidité immédiate :** " + str(qr.get("value") or qr.get("v")) if qr else "—"} | Benchmark : {qr.get("benchmark") if qr else "—"}
"""

    top_shap = shap[0] if shap else None
    return f"""## 🩺 Doctor Smile ELITE — {nom}

**Score : {score}/100 — {ZONE_LABELS.get(zone, zone)}**
{"**Facteur principal :** " + str(top_shap.get("feature") or top_shap.get("n")) if top_shap else "—"}

Posez une question précise : liquidité, endettement, rentabilité, plan d'action...
*Connectez le backend pour des réponses LLM ELITE.*"""

# ========================================================
#  ELITE CHAT SERVICE
# ========================================================

from app.services.email_service import email_service
from app.services.pdf_service import pdf_service

class EliteChatService:
    def __init__(self):
        self.tts = EliteTTSService()

    async def chat(
        self,
        message: str,
        history: list[dict[str, str]],
        context: dict[str, Any],
        mode: str = "auto",
        llm_provider: Literal["auto", "openai", "anthropic", "groq", "gemini"] = "auto",
        voice_provider: Literal["none", "openai", "elevenlabs"] = "none",
        voice_id: str = "nova",
        system_prompt: str | None = None,
        user_info: dict[str, Any] | None = None,
    ) -> dict:
        """
        Retourne un dict avec : response, model, voice_bytes (optional)
        """
        confirm_prefix = ""

        if re.search(r"(envoie|envoi|mail|email).*(rapport|analyse|pdf)", message.lower()) and context and user_info and user_info.get("email"):
            asyncio.create_task(self._send_report(context, user_info))
            confirm_prefix = f"✅ **Action confirmée :** Rapport PDF en cours d'envoi à {user_info['email']}.\n\n---\n\n"

        text_response, model_used = await self._chat_with_elite_llm(
            message, history, context, mode, llm_provider, system_prompt
        )

        voice_bytes = None
        if voice_provider != "none":
            voice_bytes = await self.tts.generate_voice(text_response, voice_provider, voice_id)

        return {
            "response": confirm_prefix + text_response,
            "model": model_used,
            "voice_bytes": voice_bytes,
        }

    async def _chat_with_elite_llm(
        self,
        message: str,
        history: list[dict[str, str]],
        context: dict[str, Any],
        mode: str,
        llm_provider: str | None,
        system_prompt: str | None,
    ) -> tuple[str, str]:

        log.info(f"🟣 _chat_with_elite_llm appelé avec llm_provider={llm_provider}")
        
        effective_mode = _detect_mode(message, mode)
        if system_prompt:
            final_system = system_prompt
        else:
            final_system = (_ELITE_BASE_PROMPT +
                          "\n\n## MODE ELITE : " + MODES.get(effective_mode, "") +
                          "\n" + ELITE_MODE_INSTRUCTIONS.get(effective_mode, ""))

        ctx_str = _elite_format_context(context) if context else ""

        # Priority chain for LLM providers
        if llm_provider is None or llm_provider == "auto" or llm_provider == "":
            providers = ["groq", "openai", "anthropic", "gemini"]
        else:
            providers = [llm_provider]

        log.info(f"🟣 Providers à essayer: {providers}")

        for provider in providers:
            log.info(f"🟣 Tentative avec provider: {provider}")
            client_data = _get_client(provider)
            if client_data:
                p, client = client_data
                log.info(f"🟣 Client {p} récupéré avec succès")
                try:
                    if p == "openai":
                        return await self._call_openai(client, message, history, ctx_str, final_system)
                    if p == "anthropic":
                        return await self._call_anthropic(client, message, history, ctx_str, final_system)
                    if p == "groq" or p == "groq_fallback":
                        return await self._call_groq(client, message, history, ctx_str, final_system)
                    if p == "gemini":
                        return await self._call_gemini(client, message, history, ctx_str, final_system)
                except Exception as e:
                    import traceback
                    log.warning(f"⚠️ {provider} échoué : {e} → essai suivant")
                    log.warning(traceback.format_exc())
            else:
                log.warning(f"⚠️ Aucun client disponible pour {provider}")

        log.warning("🟣 Aucun provider LLM n'a fonctionné, utilisation du fallback local")
        return _elite_local_response(message, context, effective_mode), "Local"

    async def _call_openai(self, client, message, history, ctx_str, system):
        messages = [{"role": "system", "content": system}]
        seen = set()
        for turn in history[-18:]:
            content = str(turn.get("content", "")).strip()
            key = (turn.get("role"), content[:80])
            if content and key not in seen:
                messages.append({"role": turn.get("role", "user"), "content": content})
                seen.add(key)

        user_content = f"{ctx_str}\n\n[QUESTION]\n{message}" if ctx_str else message
        messages.append({"role": "user", "content": user_content})

        tools = [
            {
                "type": "function",
                "function": {
                    "name": "calculate_financial_ratio",
                    "description": "Calcule un ratio financier précis à partir des valeurs brutes pour éviter les erreurs mathématiques.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "ratio_type": {"type": "string", "enum": ["liquidite_courante", "marge_nette", "roe", "endettement", "bfg"]},
                            "valeur_1": {"type": "number", "description": "Numérateur (ex: Actif circulant, Résultat net)"},
                            "valeur_2": {"type": "number", "description": "Dénominateur (ex: Passif circulant, CA, Capitaux propres)"}
                        },
                        "required": ["ratio_type", "valeur_1", "valeur_2"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_industry_benchmark",
                    "description": "Récupère les moyennes sectorielles d'Afrique pour comparer la performance de l'entreprise.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sector": {"type": "string", "enum": ["agriculture", "manufacturing", "retail", "telecom", "fintech", "default"]}
                        },
                        "required": ["sector"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "simulate_what_if",
                    "description": "Simule l'impact d'une décision sur le Doctor Score (ex: +10% CA, -50k dettes).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string", "description": "L'action simulée (ex: augmenter_ca, reduire_dette)"},
                            "amount_or_percent": {"type": "number", "description": "La valeur de la variation (+10, -50000)"}
                        },
                        "required": ["action", "amount_or_percent"]
                    }
                }
            }
        ]

        # Boucle Agentic (ReAct)
        max_iterations = 3
        for _ in range(max_iterations):
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.3,
                max_tokens=1200,
                tools=tools,
                tool_choice="auto"
            )
            
            response_message = response.choices[0].message
            
            if not response_message.tool_calls:
                return response_message.content.strip(), "OpenAI · GPT-4o (Agentic)"
                
            messages.append(response_message)
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                import json
                try:
                    args = json.loads(tool_call.function.arguments)
                except Exception:
                    args = {}
                    
                tool_result = self._execute_tool(function_name, args)
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(tool_result)
                })

        # Si on dépasse max_iterations
        return "J'ai dû interrompre mon analyse approfondie. Pourriez-vous reformuler votre question ?", "OpenAI · GPT-4o (Timeout)"

    def _execute_tool(self, name: str, args: dict) -> dict:
        """Exécute les outils pour l'Agent IA."""
        if name == "calculate_financial_ratio":
            v1, v2 = args.get("valeur_1", 0), args.get("valeur_2", 1)
            if v2 == 0: return {"error": "Division par zéro impossible"}
            res = v1 / v2
            return {"ratio_calcule": res, "formule": f"{v1} / {v2}"}
            
        elif name == "get_industry_benchmark":
            sector = args.get("sector", "default").lower()
            return AFRICAN_BENCHMARKS.get(sector, AFRICAN_BENCHMARKS["default"])
            
        elif name == "simulate_what_if":
            act = args.get("action", "")
            val = args.get("amount_or_percent", 0)
            return {
                "impact_estimé_sur_score": f"{'+' if val > 0 else ''}{val * 0.15:.1f} points (simulation purement théorique)",
                "risque_associe": "Augmentation potentielle du BFR à surveiller" if "ca" in act.lower() and val > 0 else "Amélioration de la solvabilité"
            }
            
        return {"error": "Outil inconnu"}

    async def _call_anthropic(self, client, message, history, ctx_str, system):
        claude_history = []
        seen = set()
        for turn in history[-18:]:
            content = str(turn.get("content", "")).strip()
            key = content[:80]
            if content and key not in seen:
                claude_history.append({"role": turn.get("role", "user"), "content": [{"type": "text", "text": content}]})
                seen.add(key)

        user_content = f"{ctx_str}\n\n[QUESTION]\n{message}" if ctx_str else message

        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1200,
            system=system,
            messages=claude_history + [{"role": "user", "content": user_content}],
            temperature=0.3,
        )
        return response.content[0].text.strip(), "Anthropic · Claude 3.5 Sonnet"

    async def _call_groq(self, client, message, history, ctx_str, system):
        log.info(f"🟢 Appel Groq")
        
        # Si c'est un fallback httpx
        if isinstance(client, str):
            api_key = client
            import httpx
            messages = [{"role": "system", "content": system}]
            seen = set()
            for turn in history[-20:]:
                content = str(turn.get("content", "")).strip()
                key = content[:80]
                if content and key not in seen:
                    role = "assistant" if turn.get("role") == "assistant" else "user"
                    messages.append({"role": role, "content": content})
                    seen.add(key)
            user_content = f"{ctx_str}\n\n[QUESTION]\n{message}" if ctx_str else message
            messages.append({"role": "user", "content": user_content})
            
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                response = await http_client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": "llama-3.3-70b-versatile",
                        "messages": messages,
                        "temperature": 0.3,
                        "max_tokens": 1200
                    }
                )
                if response.status_code != 200:
                    log.error(f"❌ Groq API error: {response.status_code} - {response.text}")
                    raise Exception(f"Groq API error: {response.status_code}")
                data = response.json()
                return data["choices"][0]["message"]["content"].strip(), "Groq · Llama 3.3 70B (httpx)"
        
        # Sinon, utiliser le client groq normal
        messages = [{"role": "system", "content": system}]
        seen = set()
        for turn in history[-20:]:
            content = str(turn.get("content", "")).strip()
            key = content[:80]
            if content and key not in seen:
                role = "assistant" if turn.get("role") == "assistant" else "user"
                messages.append({"role": role, "content": content})
                seen.add(key)

        user_content = f"{ctx_str}\n\n[QUESTION]\n{message}" if ctx_str else message
        messages.append({"role": "user", "content": user_content})

        log.info(f"🟢 Envoi à Groq : {len(messages)} messages")
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "calculate_financial_ratio",
                    "description": "Calcule un ratio financier précis à partir des valeurs brutes pour éviter les erreurs mathématiques.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "ratio_type": {"type": "string", "enum": ["liquidite_courante", "marge_nette", "roe", "endettement", "bfg"]},
                            "valeur_1": {"type": "number", "description": "Numérateur (ex: Actif circulant, Résultat net)"},
                            "valeur_2": {"type": "number", "description": "Dénominateur (ex: Passif circulant, CA, Capitaux propres)"}
                        },
                        "required": ["ratio_type", "valeur_1", "valeur_2"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "get_industry_benchmark",
                    "description": "Récupère les moyennes sectorielles d'Afrique pour comparer la performance de l'entreprise.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "sector": {"type": "string", "enum": ["agriculture", "manufacturing", "retail", "telecom", "fintech", "default"]}
                        },
                        "required": ["sector"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "simulate_what_if",
                    "description": "Simule l'impact d'une décision sur le Doctor Score (ex: +10% CA, -50k dettes).",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "action": {"type": "string", "description": "L'action simulée (ex: augmenter_ca, reduire_dette)"},
                            "amount_or_percent": {"type": "number", "description": "La valeur de la variation (+10, -50000)"}
                        },
                        "required": ["action", "amount_or_percent"]
                    }
                }
            }
        ]

        # Boucle Agentic (ReAct) pour Groq
        max_iterations = 3
        for _ in range(max_iterations):
            response = await client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.3,
                max_tokens=1200,
                tools=tools,
                tool_choice="auto"
            )
            
            response_message = response.choices[0].message
            
            if not response_message.tool_calls:
                return response_message.content.strip(), "Groq · Llama 3.3 70B (Agentic)"
                
            messages.append(response_message)
            
            for tool_call in response_message.tool_calls:
                function_name = tool_call.function.name
                import json
                try:
                    args = json.loads(tool_call.function.arguments)
                except Exception:
                    args = {}
                    
                tool_result = self._execute_tool(function_name, args)
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": function_name,
                    "content": json.dumps(tool_result)
                })

        return "J'ai dû interrompre mon analyse approfondie. Pourriez-vous reformuler votre question ?", "Groq · Llama 3.3 70B (Timeout)"

    async def _call_gemini(self, model, message, history, ctx_str, system):
        gem_hist = []
        seen = set()
        for turn in history[-16:]:
            content = str(turn.get("content", "")).strip()
            key = content[:80]
            if content and key not in seen:
                gem_hist.append({"role": "model" if turn.get("role") == "assistant" else "user", "parts": [content]})
                seen.add(key)

        user_content = f"{ctx_str}\n\n[QUESTION]\n{message}" if ctx_str else message
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.start_chat(history=gem_hist).send_message(user_content)
        )
        return response.text.strip(), "Google · Gemini 2.0 Flash"

    async def _send_report(self, context: dict, user_info: dict):
        try:
            export_data = {
                "metadata": {
                    "entreprise": context.get("entreprise"),
                    "date": str(context.get("createdAt")),
                    "score": context.get("score")
                },
                "ratios": context.get("ratios", []),
                "recommandations": context.get("recommendations", [])
            }
            pdf_bytes = pdf_service.generate_report(export_data)
            await email_service.send_report_pdf(
                email=user_info["email"],
                name=user_info.get("name", "Client"),
                entreprise=context.get("entreprise", "votre entreprise"),
                pdf_bytes=pdf_bytes
            )
            log.info(f"📧 Rapport ELITE envoyé à {user_info['email']}")
        except Exception as e:
            log.error(f"❌ Erreur envoi rapport : {e}")

    def get_available_llms(self):
        available = []
        for p, conf in LLM_PROVIDERS.items():
            if os.getenv(conf["env_key"]):
                available.append({"id": p, "name": conf["name"]})
        return available

    def get_available_voices(self, provider: str = "openai"):
        return self.tts.list_voices(provider)

# ========================================================
#  SINGLETON
# ========================================================

chat_service = EliteChatService()
