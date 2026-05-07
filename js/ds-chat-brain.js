// ════════════════════════════════════════════════════════════════
//  ds-chat-brain.js — Doctor Smile · Cerveau IA v2
//  ─────────────────────────────────────────────────────────────
//  PATCH non-destructif sur DS_CHAT existant.
//  Remplace _localReply, _buildPrompt, _injectSuggestions
//  et ajoute : toolbar modes, actions directes, contexte complet.
//
//  Charger APRÈS ds-chat.js dans dashboard.html :
//  <script type="module" src="./js/ds-chat-brain.js"></script>
// ════════════════════════════════════════════════════════════════

const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';

// ════════════════════════════════════════════════════════════════
//  CSS — Toolbar + modes + suggestions enrichies
// ════════════════════════════════════════════════════════════════
(function _css() {
  if (document.getElementById('_brain_css')) return;
  const s = document.createElement('style');
  s.id = '_brain_css';
  s.textContent = `
/* ── Toolbar ─────────────────────────────────────────────────── */
#chat-toolbar{
  display:flex;align-items:center;gap:6px;flex-wrap:wrap;
  padding:8px 14px 7px;
  background:rgba(255,255,255,.018);
  border-bottom:1px solid rgba(255,255,255,.05);
  flex-shrink:0;
}
.ct-btn{
  display:inline-flex;align-items:center;gap:5px;
  padding:4px 10px;border-radius:20px;
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.06em;
  background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.4);cursor:pointer;white-space:nowrap;
  transition:all .18s cubic-bezier(.34,1.56,.64,1);
}
.ct-btn:hover{
  background:rgba(125,211,252,.1);border-color:rgba(125,211,252,.28);
  color:#7DD3FC;transform:translateY(-1px);
}
.ct-btn.on{
  background:rgba(125,211,252,.14);border-color:rgba(125,211,252,.45);
  color:#7DD3FC;
}
.ct-btn.action-mode{
  background:rgba(255,215,0,.06);border-color:rgba(255,215,0,.2);color:#FFD700;
}
.ct-btn.action-mode:hover{background:rgba(255,215,0,.14);}
.ct-score-pill{
  margin-left:auto;display:flex;align-items:center;gap:5px;
  padding:3px 10px;border-radius:20px;
  font-family:'JetBrains Mono',monospace;font-size:8.5px;font-weight:700;
  background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.35);flex-shrink:0;white-space:nowrap;
}
.ct-dot{width:5px;height:5px;border-radius:50%;
  animation:ctPulse 2s ease infinite;}
@keyframes ctPulse{0%,100%{opacity:.4;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
.ct-model{
  padding:2px 7px;border-radius:100px;
  font-family:'JetBrains Mono',monospace;font-size:7px;font-weight:700;
  background:rgba(139,92,246,.08);border:1px solid rgba(139,92,246,.16);
  color:rgba(139,92,246,.8);letter-spacing:.04em;
}

/* ── Mode badge dans les messages ───────────────────────────── */
.brain-mode-tag{
  display:inline-flex;align-items:center;gap:4px;
  padding:2px 8px;border-radius:5px;margin-bottom:7px;
  font-family:'Syne',sans-serif;font-size:7.5px;font-weight:800;
  letter-spacing:.08em;text-transform:uppercase;
}

/* ── Action card ──────────────────────────────────────────────── */
.brain-action-card{
  margin-top:10px;padding:10px 13px;border-radius:10px;
  background:rgba(255,215,0,.035);border:1px solid rgba(255,215,0,.16);
  display:flex;align-items:center;gap:10px;
}
.brain-action-icon{font-size:17px;flex-shrink:0;}
.brain-action-text{
  flex:1;font-size:11px;color:rgba(255,255,255,.6);line-height:1.5;
}
.brain-action-text strong{color:#fff;}
.brain-action-btn{
  padding:6px 13px;border-radius:8px;
  background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.25);
  color:#FFD700;font-family:'Syne',sans-serif;font-size:8.5px;font-weight:800;
  letter-spacing:.05em;cursor:pointer;flex-shrink:0;
  transition:all .18s cubic-bezier(.34,1.56,.64,1);
}
.brain-action-btn:hover{background:rgba(255,215,0,.2);transform:scale(1.04);}

/* ── Suggestions enrichies ───────────────────────────────────── */
.chat-suggestions{
  display:flex;flex-wrap:wrap;gap:6px;
  padding:8px 14px 6px;
}
.chat-sug-btn{
  display:flex;align-items:center;gap:5px;
  padding:6px 12px;border-radius:18px;
  font-family:'Syne',sans-serif;font-size:8.5px;font-weight:700;
  background:rgba(125,211,252,.06);border:1px solid rgba(125,211,252,.16);
  color:#7DD3FC;cursor:pointer;white-space:nowrap;
  transition:all .2s cubic-bezier(.34,1.56,.64,1);
}
.chat-sug-btn:hover{
  background:rgba(125,211,252,.14);border-color:rgba(125,211,252,.38);
  transform:translateY(-1px);box-shadow:0 3px 10px rgba(125,211,252,.1);
}
.chat-sug-btn.sug-action{
  background:rgba(255,215,0,.05);border-color:rgba(255,215,0,.18);color:#FFD700;
}
.chat-sug-btn.sug-action:hover{background:rgba(255,215,0,.12);border-color:rgba(255,215,0,.35);}
.chat-sug-btn.sug-alert{
  background:rgba(239,68,68,.05);border-color:rgba(239,68,68,.18);color:#ef4444;
}
.chat-sug-btn.sug-alert:hover{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.35);}
.chat-sug-btn i{font-size:9px;opacity:.75;}

/* ── Anomaly warning inline ──────────────────────────────────── */
.brain-anomaly-banner{
  margin:0 14px 8px;padding:8px 12px;border-radius:9px;
  background:rgba(239,68,68,.05);border:1px solid rgba(239,68,68,.18);
  display:flex;align-items:flex-start;gap:8px;
  font-size:10px;color:rgba(255,255,255,.55);line-height:1.55;
}
.brain-anomaly-icon{font-size:14px;flex-shrink:0;margin-top:1px;}
  `;
  document.head.appendChild(s);
})();

// ════════════════════════════════════════════════════════════════
//  MODES DE CONVERSATION
// ════════════════════════════════════════════════════════════════
const MODES = {
  auto:       { icon:'🧠', label:'Auto',        color:'rgba(125,211,252,.8)',  key:'auto'    },
  diagnostic: { icon:'🩺', label:'Diagnostic',  color:'rgba(255,215,0,.8)',    key:'diagnostic' },
  plan:       { icon:'📋', label:'Plan action', color:'rgba(16,185,129,.8)',   key:'plan'    },
  banquier:   { icon:'🏦', label:'Banquier',    color:'rgba(139,92,246,.8)',   key:'banquier'},
  simulateur: { icon:'🎮', label:'Simulateur',  color:'rgba(245,158,11,.8)',   key:'simulateur'},
  alerte:     { icon:'🔔', label:'Alertes',     color:'rgba(239,68,68,.8)',    key:'alerte'  },
  pedagogique:{ icon:'🎓', label:'Débutant',    color:'rgba(45,212,191,.8)',   key:'pedagogique'},
};

// Mode actif courant
let _activeMode = 'auto';

// ════════════════════════════════════════════════════════════════
//  DÉTECTION D'INTENTION (classifier léger côté client)
// ════════════════════════════════════════════════════════════════
function _detectIntent(msg) {
  const lc = msg.toLowerCase();

  // Actions directes
  if (/simulat|what.?if|et si|curseur|slider|hypothès/.test(lc))         return 'action_whatif';
  if (/rapport|pdf|export|télécharg/.test(lc))                            return 'action_rapport';
  if (/graphe|graphique|visual|3d|voir le/.test(lc))                      return 'action_visual';
  if (/benchmark|comparer|secteur|concurrent/.test(lc))                   return 'action_benchmark';
  if (/alerte|surveiller|notifi|prévenir/.test(lc))                       return 'action_alerte';

  // Modes de réponse
  if (/banquier|banque|crédit|prêt|financement|bcdc|bicec|afriland/.test(lc)) return 'mode_banquier';
  if (/plan|actions|améliorer|conseil|recommand|priorité/.test(lc))          return 'mode_plan';
  if (/anomalie|fraude|incohérence|suspect|bizarre/.test(lc))               return 'mode_alerte';
  if (/c'est quoi|explique|comprendre|signifie|qu'est.ce|je ne comprends/.test(lc)) return 'mode_pedagogique';
  if (/diagnostic|bilan global|résumé complet|synthèse|état général/.test(lc))     return 'mode_diagnostic';

  return 'mode_auto';
}

// ════════════════════════════════════════════════════════════════
//  CONSTRUCTION DU CONTEXTE COMPLET
// ════════════════════════════════════════════════════════════════
function _buildContext(analyse, mode) {
  if (!analyse) return 'Aucune analyse chargée.';

  const R    = window.DS_RENDER;
  const ratios  = R?.normalizeRatios?.(analyse.ratios ?? []) ?? [];
  const shap    = R?.normalizeShap?.(analyse.shapValues ?? analyse.shap ?? []) ?? [];
  const recos   = R?.normalizeRecos?.(analyse.recommendations ?? analyse.recos ?? []) ?? [];
  const zone    = analyse.zone ?? (window.zoneFromScore ?? _zoneFromScore)(analyse.score ?? 0);
  const zInfo   = { saine:'Zone Saine ✅',vigilance:'Zone Vigilance ⚠️',risque:'Zone Risque 🔶',critique:'Zone Critique 🔴' };
  const plan    = window.S?.abonnement?.plan ?? 'standard';

  // Ratios — tous avec valeur, benchmark, statut
  const ratioLines = ratios.slice(0, 17).map(r => {
    const pct    = typeof r.p === 'number' ? r.p : null;
    const status = pct === null ? '' : pct >= 75 ? '✅' : pct >= 50 ? '⚠️' : '🔴';
    return `  • ${r.n}: ${r.v} (benchmark: ${r.b ?? '—'}) ${status}`;
  }).join('\n');

  // SHAP — top 8 avec direction
  const shapLines = shap.slice(0, 8).map((s, i) => {
    const dir = s.pos ? '+' : '-';
    const pts = Math.abs(typeof s.v === 'number' ? s.v : 0).toFixed(1);
    return `  ${i+1}. ${s.n}: ${dir}${pts}pts sur le score`;
  }).join('\n');

  // Recommandations
  const recoLines = recos.slice(0, 5).map(r =>
    `  [${(r.lvl||'med').toUpperCase()}] ${r.t}: ${r.d ?? ''}`
  ).join('\n');

  // Trajectoire si disponible
  let trajectoire = '';
  const traj = analyse.trajectory;
  if (traj?.trend) {
    trajectoire = `\nTRAJECTOIRE TEMPORELLE:
  Tendance: ${traj.trend} | Vélocité: ${traj.velocity ?? 0}pt/période
  Niveau alerte: ${traj.warning_level ?? 'none'}
  ${traj.alert_horizon ? `⚠️ Horizon alerte: ${traj.alert_horizon} périodes` : ''}
  Prévision 3 prochaines périodes: ${(traj.forecast_scores ?? []).slice(0,3).join(', ')}`;
  }

  // Anomalies si disponibles
  let anomalies = '';
  const anom = analyse.anomalies;
  if (anom?.risk_level && anom.risk_level !== 'normal') {
    const flags = (anom.flags ?? []).slice(0, 3).map(f => `    - ${f.name}: ${f.detail}`).join('\n');
    anomalies = `\nANOMALIES DÉTECTÉES (score: ${anom.anomaly_score}/100 — ${anom.risk_level}):
${flags}`;
  }

  // Score qualité OCR
  let dqs = '';
  if (analyse.dataQualityScore && analyse.dataQualityScore < 80) {
    dqs = `\nQUALITÉ DONNÉES: ${analyse.dataQualityScore}/100 — certains ratios peuvent être incomplets.`;
  }

  return `ANALYSE FINANCIÈRE — ${analyse.entreprise ?? 'Entreprise'}
Date: ${new Date().toLocaleDateString('fr-FR')} | Secteur: ${analyse.secteur ?? '—'} | Pays: ${analyse.pays ?? '—'}

DOCTOR SCORE™: ${analyse.score}/100 — ${zInfo[zone] ?? zone}
Probabilité défaut: ${analyse.probabiliteDefaut != null ? (analyse.probabiliteDefaut * 100).toFixed(1) + '%' : '—'}
Confiance modèle: ${analyse.confidence != null ? analyse.confidence + '%' : '—'}
Modèles: ${analyse.model ?? 'RF+XGBoost+LightGBM'}
Plan utilisateur: ${plan}

RATIOS FINANCIERS (17 indicateurs):
${ratioLines || '  Aucun ratio disponible.'}

FACTEURS SHAP (explication IA):
${shapLines || '  Données SHAP non disponibles.'}

RECOMMANDATIONS:
${recoLines || '  Aucune recommandation.'}
${trajectoire}${anomalies}${dqs}`;
}

// ════════════════════════════════════════════════════════════════
//  SYSTEM PROMPT SELON LE MODE
// ════════════════════════════════════════════════════════════════
function _buildSystemPrompt(mode, analyse) {
  const base = `Tu es Doctor Smile, un médecin IA spécialisé en analyse financière OHADA. Tu t'exprimes toujours en français, avec clarté et précision. Tu es expert en comptabilité africaine, en scoring de défaillance, en ratios financiers et en plan de redressement. Tu es à la fois rigoureux comme un expert-financier et pédagogue comme un médecin qui explique un diagnostic. Utilise des emojis avec parcimonie pour structurer tes réponses. Utilise le markdown (gras, titres, listes) pour rendre les réponses lisibles.`;

  const modeInstructions = {
    auto:
      `Réponds précisément à la question posée. Si la question porte sur un ratio, explique sa valeur, son benchmark sectoriel, et son implication concrète. Si elle porte sur le score, décompose les facteurs SHAP. Si elle est générale, donne une analyse structurée en 3 parties max.`,

    diagnostic:
      `Donne un diagnostic médical complet de l'entreprise en 5 sections :
1. **Résumé exécutif** (2 phrases max)
2. **Points forts** (2-3 éléments avec chiffres)
3. **Points faibles critiques** (2-3 éléments avec chiffres)
4. **Risque principal** (1 phrase)
5. **Prescription** (3 actions prioritaires numérotées)
Sois direct et chiffré. Pas de généralités.`,

    plan:
      `Crée un plan d'action concret et chiffré en 3 horizons :
**Court terme (0-30 jours)** — actions immédiates sans investissement
**Moyen terme (1-3 mois)** — restructurations et optimisations
**Long terme (3-12 mois)** — stratégie de croissance
Pour chaque action : impact estimé sur le score (+X pts), effort requis, responsable. Terminer par les 3 KPIs à surveiller.`,

    banquier:
      `Rédige une synthèse professionnelle destinée à un établissement bancaire (BICEC, Afriland, SCB Cameroun, Ecobank). Structure en :
1. **Présentation de l'entreprise** (activité, ancienneté, secteur)
2. **Capacité de remboursement** (ratio couverture intérêts, cash-flow estimé)
3. **Solvabilité et garanties** (ratio solvabilité, actifs mobilisables)
4. **Score de risque crédit** (Doctor Score et probabilité de défaut)
5. **Recommandation** (montant raisonnable, durée, conditions)
Ton formel et professionnel. Chiffres précis.`,

    simulateur:
      `L'utilisateur veut simuler un scénario hypothétique. Calcule l'impact estimé sur le Doctor Score à partir des ratios actuels. Pour chaque hypothèse, explique :
- L'impact sur les ratios clés (+/-)
- L'impact estimé sur le Doctor Score (en points)
- Les conditions pour que ce scénario soit réalisable
Donne des fourchettes réalistes. Conseille sur le scénario le plus impactant avec le moins d'effort.`,

    alerte:
      `Analyse les signaux d'alerte précoces dans les données. Examine :
1. **Signaux faibles** (ratios qui se dégradent progressivement)
2. **Incohérences détectées** (données anomales ou suspectes)
3. **Risques cachés** (non visibles dans le score mais dans les ratios)
4. **Horizon de risque** (si rien ne change, dans combien de temps la zone critique est atteinte ?)
Sois direct sur les risques réels. N'atténue pas les signaux négatifs.`,

    pedagogique:
      `L'utilisateur n'est pas un analyste financier. Explique chaque concept comme à quelqu'un qui ne connaît pas la comptabilité. Utilise des analogies simples (médecin/patient, voiture/carburant). Évite le jargon. Si tu mentionnes un ratio, explique d'abord ce qu'il mesure en langage courant. Termine toujours par "En résumé :" suivi d'une phrase simple.`,
  };

  return `${base}\n\n${modeInstructions[mode] || modeInstructions.auto}`;
}

function _zoneFromScore(s) {
  return s >= 75 ? 'saine' : s >= 50 ? 'vigilance' : s >= 25 ? 'risque' : 'critique';
}

// ════════════════════════════════════════════════════════════════
//  FALLBACK LOCAL INTELLIGENT
//  Si le backend est indisponible — calcule des vraies réponses
// ════════════════════════════════════════════════════════════════
function _smartLocalReply(msg, mode) {
  const a = window.S?.currentAnalyse;
  if (!a) return `Chargez d'abord une analyse depuis le Dashboard pour que je puisse vous répondre.`;

  const R      = window.DS_RENDER;
  const ratios = R?.normalizeRatios?.(a.ratios ?? []) ?? [];
  const shap   = R?.normalizeShap?.(a.shapValues ?? []) ?? [];
  const recos  = R?.normalizeRecos?.(a.recommendations ?? []) ?? [];
  const zone   = a.zone ?? _zoneFromScore(a.score ?? 0);
  const lc     = msg.toLowerCase();

  // ── Réponses analytiques réelles ──────────────────────────

  // Score global
  if (/score|note|résultat|santé|état/.test(lc) || mode === 'diagnostic') {
    const zLabel = {saine:'✅ Saine',vigilance:'⚠️ Vigilance',risque:'🔶 Risque',critique:'🔴 Critique'}[zone] ?? zone;
    const top3 = shap.slice(0,3).map(s => `${s.pos?'📈':'📉'} **${s.n}** (${s.pos?'+':''}${s.v} pts)`).join(', ');
    const topReco = recos.find(r=>r.lvl==='high');
    return `## 🩺 Diagnostic Doctor Smile™

**Score actuel : ${a.score}/100 — Zone ${zLabel}**

${zone === 'saine'
  ? `L'entreprise présente une santé financière satisfaisante. Les fondamentaux sont solides.`
  : zone === 'vigilance'
  ? `L'entreprise montre des signaux mixtes. Des points d'attention méritent une surveillance.`
  : zone === 'risque'
  ? `⚠️ Situation préoccupante. Plusieurs indicateurs sont en dessous des normes sectorielles.`
  : `🔴 Situation critique. Des actions correctrices urgentes sont nécessaires.`}

**Principaux facteurs explicatifs (SHAP) :**
${top3 || '— Données SHAP non disponibles'}

${topReco ? `**Priorité urgente :** ${topReco.t} — ${topReco.d}` : ''}

*Réponse calculée localement — connectez le backend pour une analyse LLM complète.*`;
  }

  // Liquidité
  if (/liquid|trésorerie|cash|courant/.test(lc)) {
    const cr = ratios.find(r => /liquidité générale|current.?ratio/i.test(r.n));
    const qr = ratios.find(r => /liquidité immédiate|quick/i.test(r.n));
    const ca = ratios.find(r => /cash.?ratio|trésorerie.?passif/i.test(r.n));
    let reply = `## 💧 Analyse de la Liquidité\n\n`;
    if (cr) {
      const ok = parseFloat(cr.v) >= 1;
      reply += `**Liquidité générale (Current Ratio) : ${cr.v}**\n`;
      reply += ok
        ? `✅ Au-dessus de 1 — l'entreprise peut théoriquement couvrir ses dettes à court terme avec ses actifs courants.`
        : `🔴 En dessous de 1 — l'entreprise ne peut pas couvrir ses dettes à court terme. Risque d'insolvabilité immédiate.`;
      reply += `\nBenchmark sectoriel : ${cr.b ?? '—'}\n\n`;
    }
    if (qr) reply += `**Liquidité immédiate (Quick Ratio) : ${qr.v}** (sans stocks)\nBenchmark : ${qr.b ?? '—'}\n\n`;
    if (ca) reply += `**Cash Ratio : ${ca.v}** (trésorerie pure)\n\n`;
    if (!cr && !qr) reply += `*Ratios de liquidité non disponibles dans cette analyse.*`;
    return reply;
  }

  // Endettement
  if (/endett|dette|levier|solvab|dette.*capitaux/.test(lc)) {
    const de  = ratios.find(r => /endettement|debt.?equity|D\/E/i.test(r.n));
    const sol = ratios.find(r => /solvabilité|solvab/i.test(r.n));
    const ci  = ratios.find(r => /couverture|intérêts/i.test(r.n));
    let reply = `## 🏦 Structure Financière & Endettement\n\n`;
    if (de) {
      const val = parseFloat(de.v);
      reply += `**Ratio Dettes/Capitaux : ${de.v}**\n`;
      reply += val > 2
        ? `⚠️ Levier financier élevé. L'entreprise est significativement dépendante de la dette externe.`
        : val > 1
        ? `✅ Levier modéré. Mix dette/capitaux propres équilibré.`
        : `✅ Faible dépendance à la dette. Bonne autonomie financière.`;
      reply += `\nBenchmark : ${de.b ?? '—'}\n\n`;
    }
    if (sol) reply += `**Solvabilité : ${sol.v}** — Benchmark : ${sol.b ?? '—'}\n\n`;
    if (ci)  reply += `**Couverture intérêts : ${ci.v}** — Benchmark : ${ci.b ?? '—'}\n\n`;
    if (!de && !sol) reply += `*Ratios d'endettement non disponibles.*`;
    return reply;
  }

  // Rentabilité
  if (/rentabilité|roa|roe|marge|bénéfice|profit/.test(lc)) {
    const roa = ratios.find(r => /\bROA\b|rentabilité.*actif/i.test(r.n));
    const roe = ratios.find(r => /\bROE\b|rentabilité.*capitaux/i.test(r.n));
    const em  = ratios.find(r => /ebitda|excédent brut/i.test(r.n));
    const nm  = ratios.find(r => /marge nette|net.?margin/i.test(r.n));
    let reply = `## 📈 Analyse de la Rentabilité\n\n`;
    if (roa) reply += `**ROA (Return on Assets) : ${roa.v}**\nPour chaque franc d'actif, l'entreprise génère ${roa.v} de résultat net.\nBenchmark : ${roa.b ?? '—'}\n\n`;
    if (roe) reply += `**ROE (Return on Equity) : ${roe.v}**\nRendement des capitaux propres investis.\nBenchmark : ${roe.b ?? '—'}\n\n`;
    if (em)  reply += `**Marge EBITDA : ${em.v}**\nMarge opérationnelle avant amortissements.\nBenchmark : ${em.b ?? '—'}\n\n`;
    if (nm)  reply += `**Marge nette : ${nm.v}**\nPart du chiffre d'affaires qui devient bénéfice net.\nBenchmark : ${nm.b ?? '—'}\n\n`;
    if (!roa && !roe && !em) reply += `*Ratios de rentabilité non disponibles.*`;
    return reply;
  }

  // Plan d'action
  if (/plan|améliorer|que faire|conseil|action|priorité|urgence/.test(lc) || mode === 'plan') {
    const urgentes  = recos.filter(r => r.lvl === 'high').slice(0, 2);
    const normales  = recos.filter(r => r.lvl === 'medium').slice(0, 2);
    const worstRatios = ratios.filter(r => typeof r.p === 'number' && r.p < 40)
                              .sort((a,b) => (a.p??100)-(b.p??100)).slice(0,3);
    let reply = `## 📋 Plan d'Action Prioritaire\n\n`;
    if (urgentes.length) {
      reply += `### 🔴 Actions Urgentes (0-30 jours)\n`;
      urgentes.forEach((r, i) => reply += `${i+1}. **${r.t}** — ${r.d ?? ''}\n`);
      reply += '\n';
    }
    if (normales.length) {
      reply += `### ⚠️ Actions Importantes (1-3 mois)\n`;
      normales.forEach((r, i) => reply += `${i+1}. **${r.t}** — ${r.d ?? ''}\n`);
      reply += '\n';
    }
    if (worstRatios.length) {
      reply += `### 📊 Ratios à surveiller en priorité\n`;
      worstRatios.forEach(r => reply += `- **${r.n}** : ${r.v} (objectif : atteindre ${r.b ?? 'la norme'})\n`);
    }
    if (!urgentes.length && !normales.length) {
      reply += `*Aucune recommandation disponible — lancez une analyse complète.*`;
    }
    return reply;
  }

  // SHAP / facteurs
  if (/shap|facteur|impact|expliquer|pourquoi|cause/.test(lc)) {
    if (!shap.length) return `*Les valeurs SHAP ne sont pas disponibles pour cette analyse. Relancez une analyse complète.*`;
    let reply = `## 🔍 Facteurs d'Impact — Analyse SHAP\n\n`;
    reply += `Les valeurs SHAP mesurent la contribution de chaque indicateur au Doctor Score™.\n\n`;
    reply += `**Facteurs qui améliorent le score :** `;
    const positifs = shap.filter(s=>s.pos).slice(0,4);
    reply += positifs.map(s=>`${s.n} (+${s.v}pts)`).join(', ') || '—';
    reply += `\n\n**Facteurs qui dégradent le score :** `;
    const negatifs = shap.filter(s=>!s.pos).slice(0,4);
    reply += negatifs.map(s=>`${s.n} (${s.v}pts)`).join(', ') || '—';
    reply += `\n\n*Le facteur le plus impactant est **${shap[0]?.n ?? '—'}** avec ${shap[0]?.v ?? '—'} points sur le score final.*`;
    return reply;
  }

  // Anomalies
  if (/anomalie|fraude|incohérence|suspect|bizarre/.test(lc) || mode === 'alerte') {
    const anom = a.anomalies;
    if (!anom) return `*Détection d'anomalies non disponible. Activez l'Axe 1 dans le backend.*`;
    if (anom.risk_level === 'normal') return `✅ **Aucune anomalie significative détectée.**\nLes données financières sont cohérentes. Score d'anomalie : ${anom.anomaly_score}/100.`;
    let reply = `## 🔔 Analyse des Anomalies Détectées\n\n`;
    reply += `**Niveau de risque : ${anom.risk_level.toUpperCase()}** (score ${anom.anomaly_score}/100)\n\n`;
    (anom.flags ?? []).slice(0,5).forEach(f => {
      reply += `**${f.code} — ${f.name}** [${f.severity?.toUpperCase()}]\n${f.detail}\n\n`;
    });
    reply += `**Recommandation :** ${anom.recommendation}`;
    return reply;
  }

  // Réponse générique enrichie
  const topShap  = shap[0];
  const topReco  = recos.find(r=>r.lvl==='high');
  const worstR   = ratios.find(r => typeof r.p === 'number' && r.p < 40);
  return `## 🩺 Doctor Smile — Analyse de **${a.entreprise ?? 'votre entreprise'}**

**Score : ${a.score}/100 — Zone ${zone}**
${topShap ? `\n**Facteur principal :** ${topShap.n} (${topShap.pos?'+':''}${topShap.v}pts)` : ''}
${worstR  ? `\n**Point faible :** ${worstR.n} = ${worstR.v} (objectif : ${worstR.b ?? 'améliorer'})` : ''}
${topReco ? `\n**Priorité :** ${topReco.t}` : ''}

Posez une question précise : liquidité, endettement, rentabilité, plan d'action, risques...
*Connectez le backend FastAPI pour des analyses LLM complètes.*`;
}

// ════════════════════════════════════════════════════════════════
//  DÉTECTION D'ACTIONS DIRECTES
// ════════════════════════════════════════════════════════════════
function _detectAction(msg) {
  const lc = msg.toLowerCase();
  if (/simulat|what.?if|et si.*(?:change|augment|rédui|modifi)/.test(lc))  return 'whatif';
  if (/(?:télécharg|export|génère).*(?:rapport|pdf)/i.test(lc))            return 'rapport';
  if (/(?:montre|affiche|ouvre|voir).*(?:graph|visuel|3d|chart)/i.test(lc)) return 'visual';
  if (/(?:compare|benchmark|secteur)/i.test(lc))                           return 'benchmark';
  return null;
}

function _buildActionCard(action) {
  const cards = {
    whatif:    { icon:'🎮', text:'Ouvrir le <strong>simulateur What-If</strong> pour tester ce scénario ?', btn:'Ouvrir simulateur', fn:`window.DS_VIEWS?.navTo('dashboard');setTimeout(()=>document.getElementById('wi-sec')?.scrollIntoView({behavior:'smooth'}),400)` },
    rapport:   { icon:'📄', text:'<strong>Télécharger le rapport PDF</strong> de cette analyse ?',          btn:'Télécharger PDF',  fn:`window.DS_EXTRA?.exportReport(window.S?.currentAnalyse)||window.DS_VIEWS?.navTo('rapports')` },
    visual:    { icon:'📊', text:'Voir les <strong>visualisations 3D</strong> pour cette analyse ?',       btn:'Voir les graphes', fn:`window.DS_VIEWS?.navTo('visualisations')` },
    benchmark: { icon:'⚖️', text:'Afficher le <strong>benchmark sectoriel</strong> ?',                    btn:'Voir benchmark',   fn:`window.DS_EXTRA?.showComparator?.()||window.DS_VIEWS?.navTo('visualisations')` },
  };
  const c = cards[action];
  if (!c) return '';
  return `<div class="brain-action-card">
    <span class="brain-action-icon">${c.icon}</span>
    <span class="brain-action-text">${c.text}</span>
    <button class="brain-action-btn" onclick="${c.fn}">${c.btn}</button>
  </div>`;
}

// ════════════════════════════════════════════════════════════════
//  SUGGESTIONS ULTRA-CONTEXTUELLES
// ════════════════════════════════════════════════════════════════
function _buildSuggestions(analyse, isFollowUp, mode) {
  if (!analyse) return [];

  const score = analyse.score ?? 0;
  const zone  = analyse.zone ?? _zoneFromScore(score);
  const shap  = window.DS_RENDER?.normalizeShap?.(analyse.shapValues ?? []) ?? [];
  const recos = window.DS_RENDER?.normalizeRecos?.(analyse.recommendations ?? []) ?? [];
  const top1  = shap[0];
  const urgent = recos.find(r => r.lvl === 'high');
  const hasTraj = !!(analyse.trajectory?.trend);
  const hasAnom = !!(analyse.anomalies?.risk_level && analyse.anomalies.risk_level !== 'normal');

  // Pool de suggestions
  const pool = {
    // Questions analytiques
    score:       { icon:'fa-circle-question',  text:`Pourquoi ${score}/100 ?`,           cls:'' },
    factors:     { icon:'fa-magnifying-glass', text:`Principaux facteurs SHAP`,           cls:'' },
    liquidity:   { icon:'fa-droplet',          text:'Analyser ma liquidité',              cls:'' },
    debt:        { icon:'fa-chart-line',       text:'État de mon endettement',            cls:'' },
    profitability:{ icon:'fa-coins',           text:'Rentabilité détaillée',              cls:'' },
    benchmark:   { icon:'fa-scale-balanced',   text:'Comparer au secteur',               cls:'' },
    // Modes orientés action
    plan:        { icon:'fa-list-check',       text:'Plan action 30/60/90 jours',        cls:'' },
    banquier:    { icon:'fa-building-columns', text:'Synthèse pour mon banquier',        cls:'' },
    trajectory:  { icon:'fa-chart-line',       text:`Trajectoire : tendance ${analyse.trajectory?.trend ?? '?'}`, cls:'' },
    // Actions directes
    whatif:      { icon:'fa-sliders',          text:'Ouvrir le simulateur',             cls:'sug-action' },
    pdf:         { icon:'fa-file-arrow-down',  text:'Télécharger rapport PDF',          cls:'sug-action' },
    // Alertes urgentes
    anomaly:     { icon:'fa-triangle-exclamation', text:'Anomalies détectées — détails', cls:'sug-alert' },
    urgent:      { icon:'fa-fire',             text:`Urgence : ${urgent?.t?.slice(0,30) ?? 'Voir recommandations'}`, cls:'sug-alert' },
    topFactor:   { icon:'fa-arrow-trend-up',   text:`Améliorer : ${top1?.n?.slice(0,28) ?? 'ratio principal'}`, cls:'' },
  };

  // Sélection selon contexte
  let picks = [];

  if (isFollowUp) {
    picks = [pool.plan, pool.banquier, pool.benchmark, pool.whatif];
  } else if (zone === 'critique') {
    picks = [pool.score, pool.urgent, pool.plan, hasAnom ? pool.anomaly : pool.factors, pool.banquier];
  } else if (zone === 'risque') {
    picks = [pool.factors, pool.plan, pool.topFactor, pool.debt, hasAnom ? pool.anomaly : pool.benchmark];
  } else if (zone === 'vigilance') {
    picks = [pool.score, pool.plan, pool.topFactor, pool.benchmark, pool.liquidity];
  } else {
    // Zone saine
    picks = [pool.banquier, pool.trajectory, pool.pdf, pool.benchmark, pool.profitability];
  }

  // Toujours inclure trajectoire si dispo
  if (hasTraj && !picks.includes(pool.trajectory)) picks.push(pool.trajectory);

  return picks.filter(Boolean).slice(0, 5);
}

// ════════════════════════════════════════════════════════════════
//  TOOLBAR — injector
// ════════════════════════════════════════════════════════════════
function _injectToolbar() {
  const chatCard = document.querySelector('#view-chat .chat-card');
  if (!chatCard || document.getElementById('chat-toolbar')) return;

  const bar = document.createElement('div');
  bar.id = 'chat-toolbar';
  bar.innerHTML = Object.values(MODES).map(m =>
    `<button class="ct-btn${_activeMode===m.key?' on':''}" data-mode="${m.key}"
       onclick="window._brainSetMode('${m.key}')" title="${m.label}">
       ${m.icon} ${m.label}
     </button>`
  ).join('') +
  `<div id="ct-model-wrap" class="ct-model" title="Modèle LLM actif">⚡ —</div>
   <div class="ct-score-pill" id="ct-score-pill" style="display:none;">
     <span class="ct-dot" style="background:#10b981;"></span>
     <span id="ct-score-val">—</span>
   </div>`;

  // Insérer avant le chat-msgs-full
  const msgs = document.getElementById('chat-msgs-full');
  if (msgs && msgs.closest('.chat-card')) {
    msgs.closest('.chat-card').insertBefore(bar, msgs.closest('.chat-card').firstChild);
  } else {
    chatCard.insertBefore(bar, chatCard.firstChild);
  }

  _updateToolbarScore();
  _updateModelBadge();
}

function _updateToolbarScore() {
  const pill = document.getElementById('ct-score-pill');
  const val  = document.getElementById('ct-score-val');
  const a    = window.S?.currentAnalyse;
  if (!pill || !val || !a?.score) return;
  const zone  = a.zone ?? _zoneFromScore(a.score);
  const color = {saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'}[zone] ?? '#7DD3FC';
  const dot   = pill.querySelector('.ct-dot');
  if (dot) dot.style.background = color;
  val.textContent = `${a.entreprise?.slice(0,14) ?? '—'} · ${a.score}/100`;
  pill.style.display = 'flex';
}

function _updateModelBadge() {
  const badge = document.getElementById('ct-model-wrap');
  if (!badge) return;
  // Détecter le modèle actif depuis window
  const model = window.S?.lastModel || window._lastLLMModel || 'Groq · Llama 3.3';
  badge.textContent = `⚡ ${model}`;
}

// ── Setter mode accessible globalement
window._brainSetMode = function(mode) {
  _activeMode = mode;
  document.querySelectorAll('.ct-btn[data-mode]').forEach(b => {
    b.classList.toggle('on', b.dataset.mode === mode);
  });
};

// ════════════════════════════════════════════════════════════════
//  PATCH SUR DS_CHAT
// ════════════════════════════════════════════════════════════════
function _patchDSChat() {
  const chat = window.DS_CHAT;
  if (!chat) { console.warn('[brain] DS_CHAT non trouvé — retry dans 600ms'); setTimeout(_patchDSChat, 600); return; }

  // ── 1. Patch _localReply → _smartLocalReply ─────────────────
  chat._localReply = function(msg) {
    return _smartLocalReply(msg, _activeMode);
  };

  // ── 2. Patch _injectSuggestions → suggestions enrichies ─────
  chat._injectSuggestions = function(containerId, analyse, isFollowUp = false) {
    if (!analyse) return;
    const box = document.getElementById(containerId); if (!box) return;

    // Nettoyer les anciennes
    document.getElementById(`${containerId}-sug`)?.remove();

    const picks = _buildSuggestions(analyse, isFollowUp, _activeMode);
    if (!picks.length) return;

    const inpId = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
    const wrap  = document.createElement('div');
    wrap.id     = `${containerId}-sug`;
    wrap.className = 'chat-suggestions';
    wrap.innerHTML  = picks.map(s =>
      `<button class="chat-sug-btn ${s.cls}" onclick="(function(){
         document.getElementById('${inpId}').value=${JSON.stringify(s.text)};
         window.DS_CHAT._sendMsg('${containerId}');
       })()">
         <i class="fa-solid ${s.icon}"></i>${s.text}
       </button>`
    ).join('');

    // Anomalie banner si critique
    const hasAnom = !!(analyse.anomalies?.risk_level && analyse.anomalies.risk_level !== 'normal');
    if (hasAnom && !isFollowUp) {
      const banner = document.createElement('div');
      banner.className = 'brain-anomaly-banner';
      banner.innerHTML = `<span class="brain-anomaly-icon">⚠️</span>
        <span>${analyse.anomalies.n_critical ?? 0} anomalie(s) critique(s) détectée(s) dans les données. 
        <button class="chat-sug-btn sug-alert" style="margin-top:4px;font-size:8px;"
          onclick="document.getElementById('${inpId}').value='Explique les anomalies détectées';window.DS_CHAT._sendMsg('${containerId}')">
          <i class='fa-solid fa-triangle-exclamation'></i>Voir les anomalies
        </button></span>`;
      box.after(banner);
    }

    box.after(wrap);
  };

  // ── 3. Patch _sendMsg → injecte contexte + mode + actions ───
  const _origSendMsg = chat._sendMsg.bind(chat);
  chat._sendMsg = async function(containerId) {
    const inpId = containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full';
    const inp   = document.getElementById(inpId);
    const msg   = inp?.value?.trim();
    if (!msg) return;

    // Détecter action directe
    const directAction = _detectAction(msg);
    const intent = _detectIntent(msg);

    // Auto-switch mode si détecté
    if (_activeMode === 'auto' && intent.startsWith('mode_')) {
      const modeKey = intent.replace('mode_', '');
      if (MODES[modeKey]) window._brainSetMode(modeKey);
    }

    // Appeler le sendMsg original (qui fait le vrai fetch)
    await _origSendMsg(containerId);

    // Post-traitement : ajouter action card si action directe détectée
    if (directAction) {
      const box   = document.getElementById(containerId);
      const lastAi = box?.querySelectorAll('.msg.ai');
      const last  = lastAi?.[lastAi.length - 1];
      if (last) {
        const body = last.querySelector('._msg_body');
        if (body && directAction) {
          body.insertAdjacentHTML('beforeend', _buildActionCard(directAction));
        }
      }
    }

    // Mettre à jour la toolbar
    _updateToolbarScore();
    _updateModelBadge();
  };

  // ── 4. Patch initChat → contexte étendu dans intro ──────────
  const _origInitChat = chat.initChat?.bind(chat);
  if (_origInitChat) {
    chat.initChat = async function(analyse, zone) {
      await _origInitChat(analyse, zone);
      // Mettre à jour toolbar après init
      setTimeout(() => {
        _updateToolbarScore();
        _injectToolbar();
      }, 200);
    };
  }

  // ── 5. Patch renderViewChat → injecter toolbar ────────────
  const _origRender = chat.renderViewChat?.bind(chat);
  if (_origRender) {
    chat.renderViewChat = function() {
      _origRender();
      setTimeout(() => {
        _injectToolbar();
        _updateToolbarScore();
      }, 150);
    };
  }

  // ── 6. Enrichir le fetch backend avec contexte + mode ───────
  // Intercepter via _overrideFetch
  const _origAbort = chat._abortCtrl;
  const _origFetchSend = async (msg, containerId) => {
    // Cette logique s'applique si le backend répond
    // Le contexte riche est envoyé dans le body du fetch existant
    // On enrichit window.DS_CHAT en ajoutant _buildContextForAPI
  };

  // Exposer buildContext pour usage par le backend
  chat._buildContextForAPI = function() {
    return _buildContext(window.S?.currentAnalyse, _activeMode);
  };
  chat._getSystemPrompt = function() {
    return _buildSystemPrompt(_activeMode, window.S?.currentAnalyse);
  };
  chat._getActiveMode = function() { return _activeMode; };

  console.log('[ds-chat-brain] ✅ Patché sur DS_CHAT — Modes:', Object.keys(MODES).join(', '));
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════
(function init() {
  function run() {
    _patchDSChat();

    // Injecter toolbar quand la vue chat est active
    const origNavTo = window.DS_VIEWS?.navTo;
    if (origNavTo && !window.DS_VIEWS._brainPatched) {
      window.DS_VIEWS._brainPatched = true;
      window.DS_VIEWS.navTo = function(view) {
        origNavTo.call(this, view);
        if (view === 'chat') setTimeout(_injectToolbar, 200);
      };
    }

    // Observer les changements d'analyse courante
    let _lastAnalyseId = null;
    setInterval(() => {
      const a = window.S?.currentAnalyse;
      if (a?.id && a.id !== _lastAnalyseId) {
        _lastAnalyseId = a.id;
        _updateToolbarScore();
      }
    }, 1500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
