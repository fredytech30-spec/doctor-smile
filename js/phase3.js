// ════════════════════════════════════════════════════════════════
//  phase3.js — Doctor Smile · Phase 3 · Innovation différenciante
//  ─────────────────────────────────────────────────────────────
//  ① Agent IA autonome       (surveillance continue + actions)
//  ② Réseau de pairs         (benchmark vivant anonymisé)
//  ③ Co-signature expert     (réseau partenaires + signature)
//  ④ WhatsApp Business       (alertes + analyses via WA)
//  ─────────────────────────────────────────────────────────────
//  Intégration :
//    <script type="module" src="./js/phase3.js"></script>
//    (après phase2.js dans dashboard.html)
// ════════════════════════════════════════════════════════════════

(function _injectP3CSS() {
  if (document.getElementById('_p3_css')) return;
  const st = document.createElement('style');
  st.id = '_p3_css';
  st.textContent = `
/* ══ Variables Phase 3 ══════════════════════════════════════════ */
:root {
  --p3-agent:  #A78BFA;   /* violet — Agent IA */
  --p3-peers:  #34D399;   /* emeraude — Réseau pairs */
  --p3-sign:   #60A5FA;   /* bleu — Co-signature */
  --p3-wa:     #25D366;   /* vert WhatsApp */
  --p3-dark:   rgba(8,12,22,.98);
  --p3-border: rgba(167,139,250,.12);
}

/* ══ Agent IA — statut pulse ════════════════════════════════════ */
.p3-agent-pulse {
  width:10px;height:10px;border-radius:50%;flex-shrink:0;
  background:var(--p3-agent);
  box-shadow:0 0 0 0 rgba(167,139,250,.4);
  animation:p3pulse 2s infinite;
}
.p3-agent-pulse.active { background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.4); }
.p3-agent-pulse.paused { background:#f59e0b;animation:none; }
@keyframes p3pulse {
  0%,100% { box-shadow:0 0 0 0 rgba(167,139,250,.4); }
  50%      { box-shadow:0 0 0 8px rgba(167,139,250,.0); }
}

/* ══ Agent — log items ══════════════════════════════════════════ */
.p3-log-item {
  display:flex;align-items:flex-start;gap:10px;padding:10px 0;
  border-bottom:1px solid rgba(255,255,255,.04);font-size:10px;
  animation:p3FadeIn .3s ease;
}
.p3-log-item:last-child { border-bottom:none; }
.p3-log-dot {
  width:7px;height:7px;border-radius:50%;flex-shrink:0;margin-top:4px;
}
.p3-log-time { font-size:8px;color:rgba(255,255,255,.2);flex-shrink:0;margin-top:2px; }
@keyframes p3FadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }

/* ══ Agent — action cards ═══════════════════════════════════════ */
.p3-action-card {
  background:rgba(167,139,250,.05);border:1px solid rgba(167,139,250,.15);
  border-radius:13px;padding:16px 18px;margin-bottom:10px;
  display:flex;gap:14px;align-items:flex-start;transition:all .2s;
}
.p3-action-card:hover { border-color:rgba(167,139,250,.3);transform:translateY(-2px); }
.p3-action-icon {
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:14px;
  background:rgba(167,139,250,.1);color:var(--p3-agent);
}

/* ══ Réseau de pairs ════════════════════════════════════════════ */
.p3-peer-bar {
  display:flex;align-items:center;gap:10px;padding:8px 0;
  border-bottom:1px solid rgba(255,255,255,.04);
}
.p3-peer-bar:last-child { border-bottom:none; }
.p3-peer-track {
  flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;
}
.p3-peer-fill { height:100%;border-radius:3px;transition:width 1.2s ease; }
.p3-peer-you {
  background:rgba(125,211,252,.15);border:1px solid rgba(125,211,252,.25);
  border-radius:5px;padding:2px 7px;font-family:'Syne',sans-serif;
  font-size:7.5px;font-weight:800;color:#7DD3FC;white-space:nowrap;
}

/* ══ Co-signature ════════════════════════════════════════════════ */
.p3-expert-card {
  background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.15);
  border-radius:13px;padding:16px 18px;cursor:pointer;transition:all .22s;
}
.p3-expert-card:hover {
  border-color:rgba(96,165,250,.35);
  box-shadow:0 8px 32px rgba(96,165,250,.1);
  transform:translateY(-2px);
}
.p3-expert-avatar {
  width:42px;height:42px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-family:'Syne',sans-serif;font-size:14px;font-weight:900;
  background:linear-gradient(135deg,rgba(96,165,250,.2),rgba(167,139,250,.15));
  border:2px solid rgba(96,165,250,.25);color:#60A5FA;
}
.p3-sign-status {
  display:flex;align-items:center;gap:6px;padding:8px 12px;
  border-radius:8px;font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
}
.p3-sign-pending { background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);color:#f59e0b; }
.p3-sign-signed  { background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);color:#10b981; }
.p3-sign-rejected{ background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#ef4444; }

/* ══ WhatsApp ════════════════════════════════════════════════════ */
.p3-wa-btn {
  display:flex;align-items:center;gap:8px;padding:13px 20px;
  border-radius:12px;cursor:pointer;transition:all .22s;
  background:rgba(37,211,102,.1);border:1px solid rgba(37,211,102,.25);
  color:var(--p3-wa);font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
  letter-spacing:.04em;width:100%;justify-content:center;
}
.p3-wa-btn:hover { background:rgba(37,211,102,.2);transform:translateY(-2px);
  box-shadow:0 8px 32px rgba(37,211,102,.15); }
.p3-wa-bubble {
  background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.15);
  border-radius:13px 13px 13px 3px;padding:12px 16px;margin-bottom:8px;
  font-size:10px;color:rgba(255,255,255,.65);line-height:1.7;max-width:85%;
}
.p3-wa-bubble.out {
  border-radius:13px 13px 3px 13px;margin-left:auto;
  background:rgba(125,211,252,.06);border-color:rgba(125,211,252,.15);
}

/* ══ Commun ══════════════════════════════════════════════════════ */
.p3-nav-item {
  width:44px;height:44px;border-radius:11px;display:flex;align-items:center;
  justify-content:center;cursor:pointer;font-size:16px;color:rgba(255,255,255,.3);
  transition:all .2s;position:relative;
}
.p3-nav-item:hover { color:#a78bfa;background:rgba(167,139,250,.08); }
.p3-nav-item.active { color:var(--p3-agent);background:rgba(167,139,250,.12); }
.p3-nav-item .nav-tip {
  position:absolute;left:calc(100%+10px);background:var(--p3-dark);
  border:1px solid var(--p3-border);border-radius:8px;padding:5px 10px;
  font-family:'Syne',sans-serif;font-size:9px;font-weight:700;white-space:nowrap;
  color:#fff;opacity:0;transform:translateX(-6px);transition:all .18s;
  pointer-events:none;z-index:100;
}
.p3-nav-item:hover .nav-tip { opacity:1;transform:translateX(0); }
.p3-view { padding:28px 32px;overflow-y:auto;height:100%; }
.p3-card {
  background:rgba(10,14,26,.97);border:1px solid rgba(167,139,250,.1);
  border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;
}
.p3-card::before {
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(167,139,250,.15),transparent);
}
.p3-card-title {
  font-family:'Syne',sans-serif;font-size:10px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.35);
  margin-bottom:14px;display:flex;align-items:center;gap:8px;
}
.p3-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
@media(max-width:900px){.p3-grid-2{grid-template-columns:1fr;}}
.p3-btn {
  padding:9px 18px;border-radius:10px;font-family:'Syne',sans-serif;
  font-size:9px;font-weight:800;letter-spacing:.07em;cursor:pointer;
  transition:all .18s;border:1px solid transparent;display:inline-flex;
  align-items:center;gap:6px;white-space:nowrap;
}
.p3-btn-agent  { background:rgba(167,139,250,.1);border-color:rgba(167,139,250,.3);color:var(--p3-agent); }
.p3-btn-agent:hover  { background:rgba(167,139,250,.2);transform:translateY(-1px); }
.p3-btn-sign   { background:rgba(96,165,250,.1);border-color:rgba(96,165,250,.3);color:var(--p3-sign); }
.p3-btn-sign:hover   { background:rgba(96,165,250,.2); }
.p3-btn-neutral{ background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.1);color:rgba(255,255,255,.5); }
.p3-btn-neutral:hover{ background:rgba(255,255,255,.1);color:#fff; }
.p3-view-title {
  font-family:'Syne',sans-serif;font-size:clamp(18px,1.6vw,26px);
  font-weight:900;letter-spacing:-.02em;color:#fff;
}
.p3-view-title .g { background:linear-gradient(90deg,#a78bfa,#7DD3FC);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent; }
.p3-view-sub { font-size:10px;color:rgba(255,255,255,.3);margin-top:3px; }
@keyframes p3SlideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.p3-fu{animation:p3SlideUp .4s cubic-bezier(.16,1,.3,1) both;}
.p3-fu:nth-child(1){animation-delay:.05s}.p3-fu:nth-child(2){animation-delay:.1s}
.p3-fu:nth-child(3){animation-delay:.15s}.p3-fu:nth-child(4){animation-delay:.2s}
.p3-fu:nth-child(5){animation-delay:.25s}
  `;
  document.head.appendChild(st);
})();

// ════════════════════════════════════════════════════════════════
//  HELPERS PARTAGÉS
// ════════════════════════════════════════════════════════════════

const _p3API = window.API_BASE || 'http://127.0.0.1:8000';

async function _p3Post(path, body = {}) {
  try {
    const { fetchWithAuth } = await import('./utils.js');
    const r = await fetchWithAuth(`${_p3API}${path}`, {
      method:'POST', body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch(e) {
    console.warn('[P3]', path, e.message);
    throw e;
  }
}

async function _p3Get(path) {
  try {
    const { fetchWithAuth } = await import('./utils.js');
    const r = await fetchWithAuth(`${_p3API}${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } catch(e) {
    console.warn('[P3]', path, e.message);
    throw e;
  }
}

function _now() {
  return new Date().toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

// ════════════════════════════════════════════════════════════════
//  ① AGENT IA AUTONOME
//  Surveillance continue · Détection anomalies · Actions auto
// ════════════════════════════════════════════════════════════════

const P3_AGENT = (() => {

  let _running  = false;
  let _interval = null;
  let _logs     = [];
  let _actions  = [];
  const MAX_LOGS = 50;

  // ── Règles de détection ────────────────────────────────────
  const RULES = [
    {
      id: 'liquidity_drop',
      name: 'Chute de liquidité',
      check: (r) => r.current_ratio != null && r.current_ratio < 0.8,
      severity: 'critical',
      msg: (r) => `Liquidité générale ${r.current_ratio?.toFixed(2)} < 0.8 — risque rupture trésorerie`,
      actions: ['email_banque','alerte_push','plan_action'],
    },
    {
      id: 'debt_surge',
      name: 'Endettement critique',
      check: (r) => r.debt_equity != null && r.debt_equity > 4,
      severity: 'critical',
      msg: (r) => `Ratio d'endettement ${r.debt_equity?.toFixed(2)} > 4.0 — restructuration urgente`,
      actions: ['plan_action','alerte_push'],
    },
    {
      id: 'negative_margin',
      name: 'Marge nette négative',
      check: (r) => r.net_margin != null && r.net_margin < -5,
      severity: 'high',
      msg: (r) => `Marge nette ${r.net_margin?.toFixed(1)}% — pertes structurelles détectées`,
      actions: ['plan_action','alerte_push'],
    },
    {
      id: 'score_degradation',
      name: 'Dégradation score',
      check: (r, hist) => hist.length >= 2 && (hist[hist.length-1] - hist[hist.length-2]) <= -10,
      severity: 'high',
      msg: (r, hist) => `Score chute de ${hist[hist.length-2]} → ${hist[hist.length-1]} pts (${hist[hist.length-1]-hist[hist.length-2]} pts)`,
      actions: ['email_banque','plan_action'],
    },
    {
      id: 'altman_danger',
      name: 'Altman Z critique',
      check: (r) => r.altman_z != null && r.altman_z < 1.23,
      severity: 'critical',
      msg: (r) => `Score Altman Z = ${r.altman_z?.toFixed(2)} < 1.23 — zone de détresse financière`,
      actions: ['email_banque','plan_action','alerte_push'],
    },
    {
      id: 'coverage_low',
      name: 'Couverture intérêts faible',
      check: (r) => r.couverture_interets != null && r.couverture_interets < 1.2,
      severity: 'high',
      msg: (r) => `Couverture intérêts ${r.couverture_interets?.toFixed(2)}x < 1.2 — charges fin. excessives`,
      actions: ['plan_action'],
    },
  ];

  // ── Extraire les ratios de l'analyse courante ──────────────
  function _getRatioMap(analyse) {
    const map = {};
    (analyse?.ratios || []).forEach(r => {
      const n = (r.name || r.n || '').toLowerCase();
      const v = r.value ?? r.v ?? null;
      if (n.includes('liquidit')) map.current_ratio = v;
      if (n.includes('endet'))    map.debt_equity   = v;
      if (n.includes('marge net'))map.net_margin    = v;
      if (n.includes('altman'))   map.altman_z      = v;
      if (n.includes('couvert'))  map.couverture_interets = v;
      if (n.includes('roa'))      map.roa           = v;
    });
    map.altman_z = map.altman_z ?? analyse?.altman_z ?? null;
    return map;
  }

  // ── Exécuter une surveillance ──────────────────────────────
  async function _runSurveillance() {
    const analyse = window.S?.currentAnalyse;
    if (!analyse) return;

    const ratioMap  = _getRatioMap(analyse);
    const scoreHist = analyse.scoreHistory || [analyse.score || 50];
    const triggered = [];

    for (const rule of RULES) {
      if (rule.check(ratioMap, scoreHist)) {
        triggered.push(rule);
      }
    }

    if (!triggered.length) {
      _addLog('✓ Surveillance OK — aucun signal anormal', '#10b981');
      return;
    }

    for (const rule of triggered) {
      const msg = rule.msg(ratioMap, scoreHist);
      const col = rule.severity === 'critical' ? '#ef4444' : '#f59e0b';
      _addLog(`⚠ ${rule.name} — ${msg}`, col);

      // Générer les actions automatiques
      for (const action of rule.actions) {
        await _executeAction(action, rule, analyse, ratioMap);
      }
    }

    // Sauvegarder dans Firestore
    try {
      await _p3Post('/agent/log', {
        analyseId: analyse.id,
        uid:       window.S?.user?.uid,
        triggers:  triggered.map(r => ({ id:r.id, name:r.name, severity:r.severity })),
        timestamp: new Date().toISOString(),
      });
    } catch { /* backend optionnel */ }
  }

  async function _executeAction(action, rule, analyse, ratioMap) {
    if (action === 'alerte_push') {
      _addAction({
        icon: 'fa-bell',
        title: `Alerte push envoyée`,
        desc: `${rule.name} — notification envoyée sur tous vos appareils`,
        time: _now(),
        color: '#f59e0b',
      });
      // Notifs Firebase
      try {
        const { db, auth } = await import('./firebase-config.js');
        const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const uid = auth?.currentUser?.uid;
        if (uid) {
          await setDoc(doc(db, `notifications/${uid}/items/${Date.now()}`), {
            type:    'agent_alert',
            title:   rule.name,
            body:    rule.msg(ratioMap, analyse.scoreHistory || []),
            severity:rule.severity,
            read:    false,
            createdAt: serverTimestamp(),
          });
        }
      } catch { /* silencieux */ }
    }

    if (action === 'plan_action') {
      const plan = _generateActionPlan(rule, ratioMap, analyse);
      _addAction({
        icon: 'fa-list-check',
        title: `Plan d'action généré`,
        desc: plan.summary,
        detail: plan,
        time: _now(),
        color: '#a78bfa',
        cta: 'Voir le plan',
        ctaFn: () => _showPlanModal(plan),
      });
    }

    if (action === 'email_banque') {
      const draft = _draftBankEmail(rule, analyse, ratioMap);
      _addAction({
        icon: 'fa-envelope',
        title: `Email banque pré-rédigé`,
        desc: `Demande de rendez-vous urgent — ${rule.name}`,
        detail: draft,
        time: _now(),
        color: '#60A5FA',
        cta: 'Voir & envoyer',
        ctaFn: () => _showEmailModal(draft),
      });
    }
  }

  function _generateActionPlan(rule, ratioMap, analyse) {
    const plans = {
      liquidity_drop: {
        summary: 'Améliorer la liquidité à court terme',
        steps: [
          { priority:1, action: 'Négocier un délai de paiement fournisseurs (+30 jours)', impact: '+0.15 liquidité' },
          { priority:2, action: 'Accélérer le recouvrement clients (relances agressives)', impact: 'Libère trésorerie CT' },
          { priority:3, action: 'Négocier une ligne de crédit revolving avec votre banque', impact: 'Coussin sécurité' },
          { priority:4, action: 'Reporter les investissements non critiques de 90 jours',  impact: 'Préserve le cash' },
        ],
      },
      debt_surge: {
        summary: 'Restructurer l\'endettement',
        steps: [
          { priority:1, action: 'Convertir dettes CT en LT (renégocier avec banque)',       impact: 'Améliore liquidité' },
          { priority:2, action: 'Envisager une augmentation de capital',                     impact: 'Réduit ratio D/E' },
          { priority:3, action: 'Identifier actifs non stratégiques à céder',               impact: 'Désendettement' },
          { priority:4, action: 'Couper les charges variables de 15%',                      impact: 'Améliore cash-flow' },
        ],
      },
      negative_margin: {
        summary: 'Restaurer la rentabilité',
        steps: [
          { priority:1, action: 'Audit immédiat des charges variables (top 3 postes)',      impact: 'Cible économies' },
          { priority:2, action: 'Revoir la tarification — hausse prix 5-8% si possible',   impact: '+5-8% marge' },
          { priority:3, action: 'Identifier les produits/services déficitaires',            impact: 'Élagage portefeuille' },
          { priority:4, action: 'Négocier les contrats fournisseurs stratégiques',          impact: 'Réduction coûts' },
        ],
      },
    };
    return plans[rule.id] || {
      summary: `Actions correctives — ${rule.name}`,
      steps: [
        { priority:1, action: 'Consulter votre expert-comptable dans les 48h', impact: 'Diagnostic approfondi' },
        { priority:2, action: 'Préparer un plan de trésorerie 90 jours',       impact: 'Visibilité court terme' },
        { priority:3, action: 'Contacter votre banque pour un point de situation', impact: 'Anticipation' },
      ],
    };
  }

  function _draftBankEmail(rule, analyse, ratioMap) {
    const entreprise = analyse.entreprise || 'notre entreprise';
    const score      = analyse.score || '—';
    const nom        = window.S?.profile?.prenom || 'le Dirigeant';
    return {
      to:      '[Votre conseiller bancaire]',
      subject: `Demande de rendez-vous urgent — Situation financière ${entreprise}`,
      body: `Madame, Monsieur,

Je me permets de vous contacter en urgence concernant la situation financière de ${entreprise}.

Notre système d'analyse financière Doctor Smile™ a détecté des signaux préoccupants :
• ${rule.name} : ${rule.msg(ratioMap, analyse.scoreHistory || [])}
• Score de santé financière actuel : ${score}/100
• Zone : ${analyse.zone || '—'}

Ces indicateurs nécessitent une action rapide. Je souhaite vous rencontrer dans les meilleurs délais pour :
1. Vous présenter notre situation financière actuelle détaillée
2. Explorer les options de financement ou de restructuration disponibles
3. Définir ensemble un plan d'action adapté

Je suis disponible à partir de demain pour un rendez-vous à votre convenance.

Dans l'attente de votre retour, je reste à votre disposition.

Cordialement,
${nom}
${entreprise}

---
Ce message a été assisté par Doctor Smile™ — Analyse financière IA
      `.trim(),
    };
  }

  function _addLog(msg, color = 'rgba(255,255,255,.4)') {
    _logs.unshift({ msg, color, time: _now() });
    if (_logs.length > MAX_LOGS) _logs.pop();
    _refreshLogsUI();
  }

  function _addAction(action) {
    _actions.unshift(action);
    if (_actions.length > 20) _actions.pop();
    _refreshActionsUI();
  }

  function _refreshLogsUI() {
    const el = document.getElementById('p3-agent-logs');
    if (!el) return;
    el.innerHTML = _logs.slice(0, 15).map(l => `
      <div class="p3-log-item">
        <div class="p3-log-dot" style="background:${l.color};"></div>
        <div style="flex:1;color:rgba(255,255,255,.6);">${l.msg}</div>
        <div class="p3-log-time">${l.time}</div>
      </div>`).join('') || '<div style="padding:16px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">En attente d\'activité…</div>';
  }

  function _refreshActionsUI() {
    const el = document.getElementById('p3-agent-actions');
    if (!el) return;
    if (!_actions.length) {
      el.innerHTML = '<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);"><i class="fa-solid fa-robot" style="display:block;font-size:24px;margin-bottom:8px;opacity:.2;"></i>Aucune action générée</div>';
      return;
    }
    el.innerHTML = _actions.map(a => `
      <div class="p3-action-card">
        <div class="p3-action-icon" style="background:${a.color}15;color:${a.color};">
          <i class="fa-solid ${a.icon}"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
            color:#fff;margin-bottom:4px;">${a.title}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.45);line-height:1.6;">${a.desc}</div>
          <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:4px;">${a.time}</div>
        </div>
        ${a.cta ? `<button class="p3-btn p3-btn-neutral"
          onclick="P3_AGENT._runActionCallback('${a.title}')"
          style="font-size:8px;padding:6px 12px;flex-shrink:0;">${a.cta}</button>` : ''}
      </div>`).join('');
  }

  function _runActionCallback(title) {
    const action = _actions.find(a => a.title === title);
    if (action?.ctaFn) action.ctaFn();
  }

  function _showPlanModal(plan) {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:9900;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);';
    o.innerHTML = `
      <div style="background:rgba(8,12,22,.99);border:1px solid rgba(167,139,250,.2);
        border-radius:18px;padding:28px;width:min(92vw,480px);max-height:90vh;overflow-y:auto;
        box-shadow:0 40px 100px rgba(0,0,0,.7);">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:#fff;
          margin-bottom:6px;display:flex;align-items:center;gap:10px;">
          <i class="fa-solid fa-list-check" style="color:var(--p3-agent);"></i>Plan d'action IA
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,.35);margin-bottom:20px;">${plan.summary}</div>
        ${plan.steps.map((s, i) => `
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.05);">
            <div style="width:22px;height:22px;border-radius:50%;background:rgba(167,139,250,.15);
              border:1px solid rgba(167,139,250,.25);display:flex;align-items:center;justify-content:center;
              font-family:'Syne',sans-serif;font-size:9px;font-weight:900;color:var(--p3-agent);flex-shrink:0;">
              ${s.priority}</div>
            <div>
              <div style="font-size:11px;color:#fff;font-weight:600;margin-bottom:3px;">${s.action}</div>
              <div style="font-size:9px;color:var(--p3-agent);font-family:'Syne',sans-serif;font-weight:700;">
                Impact : ${s.impact}</div>
            </div>
          </div>`).join('')}
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="margin-top:16px;width:100%;padding:11px;border-radius:10px;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
          color:rgba(255,255,255,.5);font-family:'Syne',sans-serif;font-size:9px;cursor:pointer;">
          Fermer
        </button>
      </div>`;
    document.body.appendChild(o);
    o.onclick = e => { if(e.target===o) o.remove(); };
  }

  function _showEmailModal(draft) {
    const o = document.createElement('div');
    o.style.cssText = 'position:fixed;inset:0;z-index:9900;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);';
    o.innerHTML = `
      <div style="background:rgba(8,12,22,.99);border:1px solid rgba(96,165,250,.2);
        border-radius:18px;padding:28px;width:min(92vw,560px);max-height:90vh;overflow-y:auto;
        box-shadow:0 40px 100px rgba(0,0,0,.7);">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:#fff;
          margin-bottom:16px;display:flex;align-items:center;gap:10px;">
          <i class="fa-solid fa-envelope" style="color:var(--p3-sign);"></i>Email pré-rédigé pour votre banque
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:8px;color:rgba(255,255,255,.3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;">À</div>
          <input value="${draft.to}" style="width:100%;padding:8px 12px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;
            font-size:11px;box-sizing:border-box;outline:none;"/>
        </div>
        <div style="margin-bottom:10px;">
          <div style="font-size:8px;color:rgba(255,255,255,.3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;">Objet</div>
          <input value="${draft.subject}" style="width:100%;padding:8px 12px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#fff;
            font-size:11px;box-sizing:border-box;outline:none;"/>
        </div>
        <div style="margin-bottom:16px;">
          <div style="font-size:8px;color:rgba(255,255,255,.3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;">Corps</div>
          <textarea rows="10" style="width:100%;padding:10px 12px;background:rgba(255,255,255,.04);
            border:1px solid rgba(255,255,255,.1);border-radius:8px;color:rgba(255,255,255,.75);
            font-size:10px;line-height:1.7;box-sizing:border-box;outline:none;resize:vertical;
            font-family:'Instrument Sans',sans-serif;">${draft.body}</textarea>
        </div>
        <div style="display:flex;gap:10px;">
          <button onclick="navigator.clipboard.writeText(this.closest('[style*=fixed]').querySelector('textarea').value).then(()=>this.textContent='✓ Copié!')"
            class="p3-btn p3-btn-sign" style="flex:1;justify-content:center;">
            <i class="fa-solid fa-copy"></i>Copier
          </button>
          <button onclick="window.open('mailto:?subject='+encodeURIComponent(this.closest('[style*=fixed]').querySelectorAll('input')[1].value)+'&body='+encodeURIComponent(this.closest('[style*=fixed]').querySelector('textarea').value))"
            class="p3-btn p3-btn-agent" style="flex:1;justify-content:center;">
            <i class="fa-solid fa-paper-plane"></i>Ouvrir dans Mail
          </button>
          <button onclick="this.closest('[style*=fixed]').remove()" class="p3-btn p3-btn-neutral">✕</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.onclick = e => { if(e.target===o) o.remove(); };
  }

  function start() {
    if (_running) return;
    _running = true;
    _addLog('Agent IA démarré — surveillance active', '#a78bfa');
    _updateStatusUI();
    // Surveillance immédiate puis toutes les 5 minutes
    _runSurveillance();
    _interval = setInterval(_runSurveillance, 5 * 60 * 1000);
  }

  function stop() {
    _running = false;
    clearInterval(_interval);
    _interval = null;
    _addLog('Agent IA mis en pause', '#f59e0b');
    _updateStatusUI();
  }

  function toggle() {
    if (_running) stop(); else start();
  }

  function _updateStatusUI() {
    const dot  = document.getElementById('p3-agent-dot');
    const lbl  = document.getElementById('p3-agent-status-lbl');
    const btn  = document.getElementById('p3-agent-toggle');
    if (dot) dot.className = `p3-agent-pulse ${_running ? 'active' : 'paused'}`;
    if (lbl) lbl.textContent = _running ? 'Agent actif — surveillance en cours' : 'Agent en pause';
    if (btn) {
      btn.className = `p3-btn ${_running ? 'p3-btn-neutral' : 'p3-btn-agent'}`;
      btn.innerHTML = `<i class="fa-solid fa-${_running ? 'pause' : 'play'}"></i>${_running ? 'Mettre en pause' : 'Démarrer l\'agent'}`;
    }
  }

  function render(container) {
    const analyse = window.S?.currentAnalyse;
    const score   = analyse?.score ?? '—';
    const zone    = analyse?.zone  ?? '—';

    container.innerHTML = `
      <div class="p3-view p3-fu">

        <div style="display:flex;align-items:flex-start;justify-content:space-between;
          margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <div>
            <div class="p3-view-title">Agent <span class="g">IA Autonome</span></div>
            <div class="p3-view-sub">Surveillance continue · Actions automatiques · Agentic AI</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;
              border-radius:10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);">
              <div id="p3-agent-dot" class="p3-agent-pulse ${_running?'active':'paused'}"></div>
              <span id="p3-agent-status-lbl" style="font-family:'Syne',sans-serif;font-size:9px;
                font-weight:700;color:rgba(255,255,255,.5);">
                ${_running ? 'Agent actif' : 'Agent en pause'}
              </span>
            </div>
            <button id="p3-agent-toggle" class="p3-btn ${_running?'p3-btn-neutral':'p3-btn-agent'}"
              onclick="P3_AGENT.toggle()">
              <i class="fa-solid fa-${_running?'pause':'play'}"></i>
              ${_running ? 'Mettre en pause' : 'Démarrer l\'agent'}
            </button>
          </div>
        </div>

        <!-- Analyse surveillée -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;
          background:linear-gradient(135deg,rgba(167,139,250,.06),rgba(96,165,250,.04));">
          <div class="p3-card-title"><i class="fa-solid fa-eye" style="color:var(--p3-agent);"></i>Analyse sous surveillance</div>
          ${analyse ? `
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
              <div>
                <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:#fff;">
                  ${analyse.entreprise || 'Entreprise'}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:3px;">
                  Score ${score}/100 · ${zone}
                </div>
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${(analyse.ratios||[]).filter(r=>r.status==='red').map(r=>
                  `<span style="font-size:8px;padding:3px 8px;border-radius:6px;
                    background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);
                    color:#ef4444;">${r.name||r.n}</span>`
                ).join('')}
              </div>
            </div>` : `
            <div style="font-size:10px;color:rgba(255,255,255,.3);padding:12px 0;">
              <i class="fa-solid fa-microscope" style="margin-right:8px;opacity:.3;"></i>
              Chargez une analyse pour activer la surveillance
            </div>`}
        </div>

        <div class="p3-grid-2" style="margin-bottom:14px;">
          <!-- Log en temps réel -->
          <div class="p3-card p3-fu">
            <div class="p3-card-title">
              <i class="fa-solid fa-terminal" style="color:var(--p3-agent);"></i>
              Journal temps réel
              <button onclick="P3_AGENT._forceRun()"
                style="margin-left:auto;background:none;border:none;cursor:pointer;
                color:rgba(255,255,255,.25);font-size:10px;padding:2px 6px;"
                title="Forcer une surveillance">
                <i class="fa-solid fa-rotate"></i>
              </button>
            </div>
            <div id="p3-agent-logs" style="max-height:280px;overflow-y:auto;"></div>
          </div>

          <!-- Actions générées -->
          <div class="p3-card p3-fu">
            <div class="p3-card-title">
              <i class="fa-solid fa-bolt" style="color:#FFD700;"></i>
              Actions générées
              <span style="margin-left:auto;font-family:'Syne',sans-serif;font-size:8px;
                background:rgba(167,139,250,.12);border:1px solid rgba(167,139,250,.2);
                color:var(--p3-agent);padding:2px 8px;border-radius:100px;">
                ${_actions.length}
              </span>
            </div>
            <div id="p3-agent-actions" style="max-height:280px;overflow-y:auto;"></div>
          </div>
        </div>

        <!-- Règles actives -->
        <div class="p3-card p3-fu">
          <div class="p3-card-title"><i class="fa-solid fa-shield-halved" style="color:var(--p3-agent);"></i>Règles de détection actives</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;">
            ${RULES.map(r => `
              <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;
                border-radius:8px;background:rgba(255,255,255,.02);
                border:1px solid rgba(255,255,255,.05);">
                <div style="width:6px;height:6px;border-radius:50%;flex-shrink:0;
                  background:${r.severity==='critical'?'#ef4444':'#f59e0b'};"></div>
                <div style="font-size:9px;color:rgba(255,255,255,.55);">${r.name}</div>
                <span style="margin-left:auto;font-size:7.5px;padding:1px 6px;border-radius:100px;
                  background:${r.severity==='critical'?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)'};
                  color:${r.severity==='critical'?'#ef4444':'#f59e0b'};">
                  ${r.severity==='critical'?'CRITIQUE':'HAUTE'}
                </span>
              </div>`).join('')}
          </div>
        </div>

      </div>`;

    _refreshLogsUI();
    _refreshActionsUI();
    if (_running && !_interval) start();
  }

  return { render, start, stop, toggle, _runActionCallback, _forceRun: _runSurveillance };
})();

window.P3_AGENT = P3_AGENT;


// ════════════════════════════════════════════════════════════════
//  ② RÉSEAU DE PAIRS ANONYMISÉ
//  Benchmark vivant inter-utilisateurs Doctor Smile
// ════════════════════════════════════════════════════════════════

const P3_PEERS = (() => {

  // Données pairs simulées + enrichies par les vraies données agrégées
  // En prod : remplacées par /peers/benchmark depuis Firestore anonymisé
  const BASE_PEERS = {
    'Tech / SaaS': {
      n: 124, score_med: 71, score_p25: 58, score_p75: 84,
      liquidite_med: 1.82, marge_med: 11.2, endettement_med: 0.68,
      roa_med: 5.8, roe_med: 14.2, rotation_med: 0.72,
    },
    'Industrie': {
      n: 89, score_med: 63, score_p25: 48, score_p75: 76,
      liquidite_med: 1.45, marge_med: 5.1, endettement_med: 0.88,
      roa_med: 3.2, roe_med: 9.8, rotation_med: 1.15,
    },
    'Retail': {
      n: 67, score_med: 58, score_p25: 42, score_p75: 71,
      liquidite_med: 1.18, marge_med: 3.4, endettement_med: 1.12,
      roa_med: 2.8, roe_med: 11.4, rotation_med: 2.3,
    },
    'Santé': {
      n: 45, score_med: 74, score_p25: 62, score_p75: 86,
      liquidite_med: 1.65, marge_med: 8.2, endettement_med: 0.54,
      roa_med: 6.1, roe_med: 12.8, rotation_med: 0.95,
    },
    'Services': {
      n: 112, score_med: 68, score_p25: 55, score_p75: 80,
      liquidite_med: 1.72, marge_med: 9.1, endettement_med: 0.58,
      roa_med: 4.9, roe_med: 13.5, rotation_med: 0.88,
    },
    'Finance': {
      n: 38, score_med: 72, score_p25: 60, score_p75: 83,
      liquidite_med: 1.55, marge_med: 14.2, endettement_med: 0.72,
      roa_med: 5.2, roe_med: 15.1, rotation_med: 0.65,
    },
  };

  async function _loadPeers(secteur) {
    try {
      const data = await _p3Get(`/peers/benchmark?secteur=${encodeURIComponent(secteur)}`);
      return { ...BASE_PEERS[secteur], ...data.peers, live: true };
    } catch {
      return { ...(BASE_PEERS[secteur] || BASE_PEERS['Services']), live: false };
    }
  }

  function _percentileBar(yours, med, p25, p75, label, unit, inverse) {
    if (yours == null) return '';
    const max  = p75 * 1.3;
    const pct  = n => Math.min(100, Math.max(0, (n / max) * 100));
    const better = inverse ? yours <= med : yours >= med;
    const col  = better ? '#10b981' : '#ef4444';
    const youPct = pct(yours);
    const medPct = pct(med);

    return `
      <div class="p3-peer-bar">
        <div style="width:130px;font-size:9px;color:rgba(255,255,255,.6);flex-shrink:0;">${label}</div>
        <div class="p3-peer-track" style="position:relative;">
          <!-- Zone IQR (P25-P75) -->
          <div style="position:absolute;left:${pct(p25)}%;width:${pct(p75)-pct(p25)}%;
            height:100%;background:rgba(255,255,255,.06);border-radius:3px;"></div>
          <!-- Médiane -->
          <div style="position:absolute;left:${medPct}%;top:-2px;bottom:-2px;width:2px;
            background:rgba(255,215,0,.5);border-radius:1px;" title="Médiane pairs"></div>
          <!-- Vous -->
          <div style="position:absolute;left:0;width:${youPct}%;height:100%;
            background:${col};border-radius:3px;opacity:.8;transition:width 1.2s;"></div>
        </div>
        <div style="width:60px;text-align:right;flex-shrink:0;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:${col};">
            ${yours?.toFixed(2)}${unit}</span>
        </div>
        <div class="p3-peer-you">${better ? '▲' : '▼'} ${inverse
          ? (yours <= med ? 'Mieux' : 'À améliorer')
          : (yours >= med ? 'Mieux' : 'À améliorer')}</div>
      </div>`;
  }

  async function render(container) {
    const analyse = window.S?.currentAnalyse;
    const secteur = window.S?._benchmarkSector || 'Services';
    const ratioMap = {};
    (analyse?.ratios || []).forEach(r => {
      const n = (r.name || '').toLowerCase();
      const v = r.value ?? null;
      if (n.includes('liquidit'))  ratioMap.liquidite    = v;
      if (n.includes('marge net')) ratioMap.marge        = v;
      if (n.includes('endet'))     ratioMap.endettement  = v;
      if (n.includes('roa'))       ratioMap.roa          = v;
      if (n.includes('roe') || n.includes('rentab cap')) ratioMap.roe = v;
      if (n.includes('rotation'))  ratioMap.rotation     = v;
    });

    container.innerHTML = `<div class="p3-view">
      <div style="text-align:center;padding:40px;font-size:11px;color:rgba(255,255,255,.3);">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:20px;display:block;margin-bottom:10px;"></i>
        Chargement du réseau de pairs…
      </div>
    </div>`;

    const peers = await _loadPeers(secteur);

    const SECTORS = Object.keys(BASE_PEERS);

    container.innerHTML = `
      <div class="p3-view p3-fu">

        <div style="display:flex;align-items:flex-start;justify-content:space-between;
          margin-bottom:24px;flex-wrap:wrap;gap:12px;">
          <div>
            <div class="p3-view-title">Réseau de <span class="g">Pairs</span></div>
            <div class="p3-view-sub">Benchmark vivant · ${peers.n} entreprises anonymisées · Secteur ${secteur}
              ${peers.live ? '<span style="color:#10b981;margin-left:6px;font-size:8px;">● Données live</span>' : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <select onchange="P3_PEERS.setSector(this.value)"
              style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
              color:rgba(255,255,255,.6);border-radius:9px;padding:7px 12px;
              font-family:'Syne',sans-serif;font-size:9px;cursor:pointer;outline:none;">
              ${SECTORS.map(s => `<option value="${s}" ${s===secteur?'selected':''}>${s}</option>`).join('')}
            </select>
            <button class="p3-btn p3-btn-agent" onclick="P3_PEERS.contribute()">
              <i class="fa-solid fa-share-nodes"></i>Contribuer au réseau
            </button>
          </div>
        </div>

        <!-- Positionnement score -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;
          background:linear-gradient(135deg,rgba(52,211,153,.06),rgba(125,211,252,.04));">
          <div class="p3-card-title"><i class="fa-solid fa-users" style="color:var(--p3-peers);"></i>Votre position dans le réseau</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:16px;">
            ${[
              [`${analyse?.score ?? '—'}/100`, 'Votre score', analyse?.score >= peers.score_med ? '#10b981' : '#ef4444'],
              [`${peers.score_med}/100`, 'Médiane réseau', '#FFD700'],
              [`Top ${analyse?.score != null ? Math.round(100 - (analyse.score / 100) * 100) : '—'}%`, 'Votre percentile estimé', '#a78bfa'],
            ].map(([v,l,c]) => `
              <div style="text-align:center;padding:14px;background:rgba(255,255,255,.02);
                border-radius:10px;border:1px solid rgba(255,255,255,.05);">
                <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:900;
                  color:${c};margin-bottom:4px;">${v}</div>
                <div style="font-size:9px;color:rgba(255,255,255,.3);">${l}</div>
              </div>`).join('')}
          </div>

          <!-- Distribution des scores (visualisation simple) -->
          <div style="margin-bottom:8px;font-size:8.5px;color:rgba(255,255,255,.3);">Distribution des scores — ${secteur}</div>
          <div style="display:flex;align-items:flex-end;gap:3px;height:50px;">
            ${[0,10,20,30,40,50,60,70,80,90].map(base => {
              const inIQR = base >= peers.score_p25 && base <= peers.score_p75;
              const isYou = analyse?.score != null && analyse.score >= base && analyse.score < base+10;
              const h = inIQR ? 80 : base < 30 ? 20 : base > 80 ? 25 : 50;
              return `<div style="flex:1;height:${h}%;border-radius:3px 3px 0 0;
                background:${isYou ? '#7DD3FC' : inIQR ? 'rgba(52,211,153,.35)' : 'rgba(255,255,255,.08)'};
                transition:height 1s ease;" title="${base}-${base+10}: zone ${inIQR?'IQR':'hors IQR'}${isYou?' ← vous':''}">
              </div>`;
            }).join('')}
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:7.5px;color:rgba(255,255,255,.2);">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
          <div style="display:flex;gap:14px;margin-top:10px;font-size:8.5px;color:rgba(255,255,255,.3);">
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(52,211,153,.35);margin-right:4px;vertical-align:middle;"></span>Zone IQR (25e–75e pctile)</div>
            <div><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#7DD3FC;margin-right:4px;vertical-align:middle;"></span>Votre score</div>
          </div>
        </div>

        <!-- Comparaison ratio par ratio -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;">
          <div class="p3-card-title">
            <i class="fa-solid fa-sliders" style="color:var(--p3-peers);"></i>
            Comparaison ratio par ratio vs ${peers.n} pairs
            <div style="margin-left:auto;display:flex;gap:10px;font-size:8px;color:rgba(255,255,255,.25);">
              <span>— Médiane</span><span style="color:rgba(255,255,255,.12);">█ Zone IQR</span>
            </div>
          </div>
          ${!analyse ? `<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">Chargez une analyse pour vous comparer</div>` :
          [
            { key:'liquidite',   label:'Liquidité générale', unit:'',  med:peers.liquidite_med,   p25:peers.liquidite_med*.8,  p75:peers.liquidite_med*1.3, inv:false },
            { key:'marge',       label:'Marge nette',        unit:'%', med:peers.marge_med,       p25:peers.marge_med*.6,      p75:peers.marge_med*1.5,     inv:false },
            { key:'roa',         label:'ROA',                unit:'%', med:peers.roa_med,         p25:peers.roa_med*.5,        p75:peers.roa_med*1.6,       inv:false },
            { key:'roe',         label:'ROE',                unit:'%', med:peers.roe_med,         p25:peers.roe_med*.6,        p75:peers.roe_med*1.4,       inv:false },
            { key:'endettement', label:'Endettement',        unit:'',  med:peers.endettement_med, p25:peers.endettement_med*.7,p75:peers.endettement_med*1.5,inv:true },
            { key:'rotation',    label:'Rotation actifs',    unit:'',  med:peers.rotation_med,    p25:peers.rotation_med*.6,   p75:peers.rotation_med*1.5,  inv:false },
          ].map(m => _percentileBar(ratioMap[m.key], m.med, m.p25, m.p75, m.label, m.unit, m.inv)).join('')}
        </div>

        <!-- Insights réseau -->
        <div class="p3-card p3-fu">
          <div class="p3-card-title"><i class="fa-solid fa-lightbulb" style="color:#FFD700;"></i>Insights réseau</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:10px;">
            ${[
              [`Sur ${peers.n} entreprises ${secteur}, <strong style="color:#fff;">${Math.round(peers.n*0.62)}</strong> ont un score ≥ ${peers.score_med}`,                '#10b981'],
              [`La marge nette médiane du secteur est de <strong style="color:#fff;">${peers.marge_med}%</strong> — objectif minimal`, '#7DD3FC'],
              [`<strong style="color:#fff;">${Math.round(peers.n*0.28)}</strong> entreprises similaires ont amélioré leur score de +10pts sur 6 mois`, '#a78bfa'],
              [`Le ratio d'endettement médian est <strong style="color:#fff;">${peers.endettement_med}</strong> — au-delà de 1.5 = signal négatif`, '#FFD700'],
            ].map(([t,c]) => `
              <div style="padding:12px;background:rgba(255,255,255,.02);border-radius:9px;
                border-left:3px solid ${c};color:rgba(255,255,255,.55);line-height:1.6;">
                ${t}
              </div>`).join('')}
          </div>
        </div>

      </div>`;
  }

  function setSector(s) {
    window.S = window.S || {};
    window.S._benchmarkSector = s;
    const el = document.getElementById('peers-content');
    if (el) render(el);
  }

  async function contribute() {
    const analyse = window.S?.currentAnalyse;
    if (!analyse) { alert('Chargez une analyse d\'abord'); return; }
    try {
      await _p3Post('/peers/contribute', {
        secteur:   window.S?._benchmarkSector || 'Services',
        score:     analyse.score,
        zone:      analyse.zone,
        ratios:    (analyse.ratios||[]).map(r => ({ key: r.name, value: r.value })),
        // PAS d'identifiant — anonyme
      });
      const o = document.createElement('div');
      o.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.75);backdrop-filter:blur(10px);';
      o.innerHTML=`<div style="background:rgba(10,14,26,.99);border:1px solid rgba(52,211,153,.25);border-radius:18px;padding:32px;max-width:380px;text-align:center;">
        <div style="font-size:40px;margin-bottom:12px;">🤝</div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;color:#fff;margin-bottom:8px;">Merci pour votre contribution !</div>
        <div style="font-size:10px;color:rgba(255,255,255,.4);line-height:1.7;margin-bottom:20px;">
          Vos données anonymisées enrichissent le benchmark du réseau Doctor Smile.<br>
          Plus le réseau grandit, plus les comparaisons sont pertinentes.
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 24px;border-radius:10px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);color:#34D399;font-family:'Syne',sans-serif;font-size:10px;font-weight:800;cursor:pointer;">Fermer</button>
      </div>`;
      document.body.appendChild(o);
      o.onclick = e => { if(e.target===o) o.remove(); };
    } catch {
      alert('Contribution enregistrée (mode local)');
    }
  }

  return { render, setSector, contribute };
})();

window.P3_PEERS = P3_PEERS;


// ════════════════════════════════════════════════════════════════
//  ③ MODE EXPERT-COMPTABLE — Co-signature
// ════════════════════════════════════════════════════════════════

const P3_COSIGN = (() => {

  // Réseau d'experts partenaires Doctor Smile
  const EXPERTS = [
    { id:'e1', name:'Dr. Aminatou Diallo', spec:'Expert-comptable · PME Afrique francophone', country:'Sénégal',   rating:4.9, reviews:47, verified:true, available:true,  avatar:'AD', color:'#a78bfa' },
    { id:'e2', name:'Mme. Claire Fontaine', spec:'Commissaire aux comptes · CAC40 & ETI',     country:'France',    rating:4.8, reviews:132,verified:true, available:true,  avatar:'CF', color:'#60A5FA' },
    { id:'e3', name:'M. Kouassi Bamba',     spec:'Expert-comptable · Secteur bancaire',       country:"Côte d'Ivoire", rating:4.7, reviews:28, verified:true, available:false, avatar:'KB', color:'#34D399' },
    { id:'e4', name:'M. Antoine Müller',    spec:'DAF externalisé · Startups & scale-ups',    country:'Belgique',  rating:4.9, reviews:89, verified:true, available:true,  avatar:'AM', color:'#F59E0B' },
  ];

  let _pendingRequests = [];

  async function _loadRequests() {
    try {
      const data = await _p3Get('/cosign/requests');
      _pendingRequests = data.requests || [];
    } catch {
      // Mode local — charger depuis localStorage
      try {
        _pendingRequests = JSON.parse(localStorage.getItem('ds_cosign_requests') || '[]');
      } catch { _pendingRequests = []; }
    }
  }

  async function requestSignature(expertId) {
    const expert  = EXPERTS.find(e => e.id === expertId);
    const analyse = window.S?.currentAnalyse;
    if (!expert || !analyse) return;

    const req = {
      id:         `req_${Date.now()}`,
      expertId,
      expertName: expert.name,
      analyseId:  analyse.id,
      entreprise: analyse.entreprise || 'Entreprise',
      score:      analyse.score,
      zone:       analyse.zone,
      status:     'pending',
      requestedAt: new Date().toISOString(),
      message:    `Demande de validation et co-signature pour l'analyse financière de ${analyse.entreprise || 'notre entreprise'}.`,
    };

    try {
      await _p3Post('/cosign/request', req);
    } catch {
      // Sauver localement
      const existing = JSON.parse(localStorage.getItem('ds_cosign_requests') || '[]');
      existing.unshift(req);
      localStorage.setItem('ds_cosign_requests', JSON.stringify(existing.slice(0,10)));
    }

    _pendingRequests.unshift(req);

    const o = document.createElement('div');
    o.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.8);backdrop-filter:blur(12px);';
    o.innerHTML=`<div style="background:rgba(8,12,22,.99);border:1px solid rgba(96,165,250,.25);border-radius:18px;padding:32px;max-width:420px;text-align:center;">
      <div style="font-size:36px;margin-bottom:12px;">✉️</div>
      <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:900;color:#fff;margin-bottom:8px;">Demande envoyée à ${expert.name}</div>
      <div style="font-size:10px;color:rgba(255,255,255,.4);line-height:1.7;margin-bottom:20px;">
        L'expert va examiner votre analyse (score ${analyse.score}/100 · ${analyse.zone}) 
        et vous répondre sous 24–48h.<br>
        Vous serez notifié dès sa décision.
      </div>
      <div style="padding:12px;background:rgba(96,165,250,.06);border-radius:10px;border:1px solid rgba(96,165,250,.15);margin-bottom:16px;font-size:9px;color:rgba(255,255,255,.4);text-align:left;line-height:1.8;">
        ✓ Rapport complet transmis en sécurité<br>
        ✓ Expert certifié Doctor Smile™<br>
        ✓ Signature numérique conforme eIDAS<br>
        ✓ Délai de réponse garanti 48h
      </div>
      <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 24px;border-radius:10px;background:rgba(96,165,250,.1);border:1px solid rgba(96,165,250,.25);color:#60A5FA;font-family:'Syne',sans-serif;font-size:10px;font-weight:800;cursor:pointer;">Compris</button>
    </div>`;
    document.body.appendChild(o);
    o.onclick = e => { if(e.target===o) o.remove(); };

    // Refresh la vue
    const el = document.getElementById('cosign-content');
    if (el) render(el);
  }

  async function render(container) {
    await _loadRequests();
    const analyse = window.S?.currentAnalyse;

    container.innerHTML = `
      <div class="p3-view p3-fu">

        <div style="margin-bottom:24px;">
          <div class="p3-view-title">Expert & <span class="g">Co-signature</span></div>
          <div class="p3-view-sub">Réseau partenaires Doctor Smile™ · Signature numérique eIDAS</div>
        </div>

        <!-- Analyse à soumettre -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;
          background:linear-gradient(135deg,rgba(96,165,250,.06),rgba(167,139,250,.04));">
          <div class="p3-card-title"><i class="fa-solid fa-file-signature" style="color:var(--p3-sign);"></i>Analyse à co-signer</div>
          ${analyse ? `
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
              <div style="flex:1;min-width:0;">
                <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:900;color:#fff;margin-bottom:4px;">
                  ${analyse.entreprise || 'Entreprise'}</div>
                <div style="font-size:10px;color:rgba(255,255,255,.35);">
                  Score ${analyse.score}/100 · ${analyse.zone} · ${(analyse.ratios||[]).length} ratios
                </div>
              </div>
              <div style="display:flex;gap:8px;align-items:center;">
                <span style="font-family:'Syne',sans-serif;font-size:28px;font-weight:900;
                  color:${analyse.score>=75?'#10b981':analyse.score>=50?'#f59e0b':'#ef4444'};">
                  ${analyse.score}</span>
                <span style="font-size:11px;color:rgba(255,255,255,.25);">/100</span>
              </div>
            </div>` : `
            <div style="font-size:10px;color:rgba(255,255,255,.3);padding:12px 0;">
              <i class="fa-solid fa-microscope" style="margin-right:8px;opacity:.3;"></i>
              Chargez une analyse pour la soumettre à un expert
            </div>`}
        </div>

        <!-- Réseau experts -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;">
          <div class="p3-card-title"><i class="fa-solid fa-user-tie" style="color:var(--p3-sign);"></i>Experts certifiés Doctor Smile™</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;">
            ${EXPERTS.map(e => `
              <div class="p3-expert-card" onclick="P3_COSIGN._selectExpert('${e.id}')">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
                  <div class="p3-expert-avatar">${e.avatar}</div>
                  <div>
                    <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:#fff;">
                      ${e.name}
                      ${e.verified ? '<i class="fa-solid fa-circle-check" style="color:#60A5FA;font-size:10px;margin-left:4px;"></i>' : ''}
                    </div>
                    <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;">${e.spec}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <span style="font-size:9px;color:#FFD700;">★ ${e.rating}</span>
                    <span style="font-size:8.5px;color:rgba(255,255,255,.25);margin-left:4px;">(${e.reviews} avis)</span>
                    <span style="font-size:8.5px;color:rgba(255,255,255,.2);margin-left:6px;">· ${e.country}</span>
                  </div>
                  ${e.available ? `
                    <button class="p3-btn p3-btn-sign"
                      style="font-size:8px;padding:5px 12px;"
                      onclick="event.stopPropagation();P3_COSIGN.requestSignature('${e.id}')">
                      <i class="fa-solid fa-paper-plane"></i>Demander
                    </button>` : `
                    <span style="font-size:8px;color:rgba(255,255,255,.2);">
                      <i class="fa-solid fa-clock" style="margin-right:3px;"></i>Indisponible
                    </span>`}
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Demandes en cours -->
        <div class="p3-card p3-fu">
          <div class="p3-card-title">
            <i class="fa-solid fa-hourglass-half" style="color:#f59e0b;"></i>
            Mes demandes de signature
            <span style="margin-left:6px;font-family:'Syne',sans-serif;font-size:8px;
              background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.2);
              color:#f59e0b;padding:2px 8px;border-radius:100px;">
              ${_pendingRequests.length}
            </span>
          </div>
          ${!_pendingRequests.length ? `
            <div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">
              <i class="fa-solid fa-file-signature" style="display:block;font-size:24px;margin-bottom:8px;opacity:.15;"></i>
              Aucune demande en cours
            </div>` :
            _pendingRequests.map(req => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:12px;flex-wrap:wrap;">
                <div>
                  <div style="font-size:10px;font-weight:700;color:#fff;margin-bottom:3px;">
                    ${req.entreprise} · Score ${req.score}/100
                  </div>
                  <div style="font-size:9px;color:rgba(255,255,255,.35);">
                    ${req.expertName} · ${new Date(req.requestedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div class="p3-sign-status ${req.status==='signed'?'p3-sign-signed':req.status==='rejected'?'p3-sign-rejected':'p3-sign-pending'}">
                  <i class="fa-solid fa-${req.status==='signed'?'check':req.status==='rejected'?'xmark':'clock'}"></i>
                  ${req.status==='signed'?'Signé':req.status==='rejected'?'Refusé':'En attente'}
                </div>
              </div>`).join('')}
        </div>

        <!-- Comment ça marche -->
        <div class="p3-card p3-fu" style="margin-top:14px;background:rgba(255,255,255,.01);">
          <div class="p3-card-title"><i class="fa-solid fa-circle-question" style="color:rgba(255,255,255,.2);"></i>Comment fonctionne la co-signature ?</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;font-size:9.5px;color:rgba(255,255,255,.45);line-height:1.7;">
            ${[
              ['1. Choisissez un expert','Sélectionnez un expert certifié Doctor Smile selon son domaine et sa disponibilité'],
              ['2. Envoyez votre analyse','L\'analyse est transmise de manière sécurisée à l\'expert pour examen'],
              ['3. Validation en 48h','L\'expert examine les ratios, le score ML et les recommandations'],
              ['4. Signature numérique','Le rapport final porte deux signatures : IA Doctor Smile + Expert humain'],
            ].map(([t,d]) => `
              <div style="padding:12px;background:rgba(255,255,255,.02);border-radius:9px;
                border-top:2px solid rgba(96,165,250,.2);">
                <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;
                  color:rgba(255,255,255,.7);margin-bottom:5px;">${t}</div>
                ${d}
              </div>`).join('')}
          </div>
        </div>

      </div>`;
  }

  function _selectExpert(id) {
    // Highlight la carte sélectionnée
    document.querySelectorAll('.p3-expert-card').forEach(el => {
      el.style.borderColor = '';
    });
  }

  return { render, requestSignature, _selectExpert };
})();

window.P3_COSIGN = P3_COSIGN;


// ════════════════════════════════════════════════════════════════
//  ④ INTÉGRATION WHATSAPP BUSINESS
// ════════════════════════════════════════════════════════════════

const P3_WHATSAPP = (() => {

  const WA_NUMBER = '+237600000000'; // Numéro WA Business Doctor Smile — à remplacer

  function _buildAlertMessage(analyse) {
    if (!analyse) return "Bonjour ! Je suis l'assistant Doctor Smile. Envoyez *ANALYSE* pour lancer une analyse financière.";
    const score = analyse.score || 0;
    const zone  = analyse.zone  || '—';
    const emoji = score >= 75 ? '🟢' : score >= 50 ? '🟡' : score >= 25 ? '🔶' : '🔴';
    return `${emoji} *Doctor Smile™ — Alerte financière*\n\n` +
      `Entreprise : ${analyse.entreprise || 'Votre entreprise'}\n` +
      `Score : *${score}/100*\n` +
      `Zone : *${zone}*\n\n` +
      `${(analyse.recommendations||[]).slice(0,2).map(r=>`⚠️ ${r.title}`).join('\n')}\n\n` +
      `_Voir le rapport complet sur Doctor Smile™_`;
  }

  function openChat(prefilledMessage) {
    const msg = prefilledMessage || `Bonjour, je voudrais une analyse financière pour mon entreprise.`;
    const url = `https://wa.me/${WA_NUMBER.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  function sendAlert(analyse) {
    const msg = _buildAlertMessage(analyse);
    openChat(msg);
  }

  async function configureWebhook(phoneNumber) {
    try {
      const r = await _p3Post('/whatsapp/configure', { phoneNumber });
      return r;
    } catch {
      return { status: 'ok', dev: true };
    }
  }

  function render(container) {
    const analyse = window.S?.currentAnalyse;
    const profile = window.S?.profile;
    const savedPhone = profile?.whatsapp || profile?.phone || '';

    const DEMO_MESSAGES = [
      { out: false, text: `*Bonjour !* Je suis l'assistant IA Doctor Smile 🤖\nQue puis-je faire pour vous ?\n\nRépondez :\n• *SCORE* — Voir votre dernier score\n• *ALERTE* — Activer les alertes\n• *ANALYSE* — Lancer une analyse\n• *AIDE* — Liste des commandes` },
      { out: true,  text: 'SCORE' },
      { out: false, text: `📊 *Votre dernier score*\n\nEntreprise : ${analyse?.entreprise || 'Exemple SAS'}\nScore : *${analyse?.score || 72}/100*\nZone : ${analyse?.zone || 'vigilance'}\n\n${(analyse?.recommendations||[{title:'Réduire le délai client'}]).slice(0,1).map(r=>`💡 ${r.title}`).join('\n')}\n\n_Voir le rapport complet → doctorsmile.io_` },
      { out: true,  text: 'ALERTE ON' },
      { out: false, text: `✅ *Alertes activées*\n\nVous recevrez une notification WhatsApp automatique si :\n• Votre score baisse de plus de 10 pts\n• Un ratio passe en zone critique\n• Une anomalie est détectée par l'Agent IA\n\nRépondez *ALERTE OFF* pour désactiver.` },
    ];

    container.innerHTML = `
      <div class="p3-view p3-fu">

        <div style="margin-bottom:24px;">
          <div class="p3-view-title">WhatsApp <span class="g">Business</span></div>
          <div class="p3-view-sub">Alertes · Analyses · Recommandations — directement sur WhatsApp</div>
        </div>

        <div class="p3-grid-2" style="margin-bottom:14px;">

          <!-- Connexion WhatsApp -->
          <div class="p3-card p3-fu" style="background:linear-gradient(135deg,rgba(37,211,102,.06),rgba(37,211,102,.02));">
            <div class="p3-card-title"><i class="fa-brands fa-whatsapp" style="color:var(--p3-wa);"></i>Connecter votre WhatsApp</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:16px;">
              Recevez vos alertes financières Doctor Smile directement sur WhatsApp.
              Analysez votre entreprise par message — partout, à tout moment.
            </div>

            <div style="margin-bottom:12px;">
              <div style="font-size:8px;color:rgba(255,255,255,.3);margin-bottom:6px;
                text-transform:uppercase;letter-spacing:.08em;">Votre numéro WhatsApp</div>
              <div style="display:flex;gap:8px;">
                <input id="p3-wa-phone" type="tel" placeholder="+237 6XX XXX XXX"
                  value="${savedPhone}"
                  style="flex:1;padding:10px 12px;background:rgba(255,255,255,.04);
                  border:1px solid rgba(37,211,102,.2);border-radius:10px;color:#fff;
                  font-size:11px;outline:none;"
                  onfocus="this.style.borderColor='rgba(37,211,102,.5)'"
                  onblur="this.style.borderColor='rgba(37,211,102,.2)'"/>
                <button class="p3-btn" onclick="P3_WHATSAPP.savePhone()"
                  style="background:rgba(37,211,102,.1);border-color:rgba(37,211,102,.3);color:var(--p3-wa);">
                  <i class="fa-solid fa-floppy-disk"></i>
                </button>
              </div>
            </div>

            <button class="p3-wa-btn" onclick="P3_WHATSAPP.openChat()">
              <i class="fa-brands fa-whatsapp" style="font-size:16px;"></i>
              Ouvrir Doctor Smile sur WhatsApp
            </button>

            ${analyse ? `
              <button onclick="P3_WHATSAPP.sendAlert(window.S?.currentAnalyse)"
                style="margin-top:10px;width:100%;padding:10px;border-radius:10px;
                background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.15);
                color:rgba(37,211,102,.7);font-family:'Syne',sans-serif;font-size:9px;
                font-weight:800;letter-spacing:.05em;cursor:pointer;transition:all .18s;"
                onmouseover="this.style.background='rgba(37,211,102,.12)'"
                onmouseout="this.style.background='rgba(37,211,102,.06)'">
                <i class="fa-solid fa-bell" style="margin-right:6px;"></i>
                Envoyer l'alerte de score maintenant
              </button>` : ''}
          </div>

          <!-- Simulation de conversation -->
          <div class="p3-card p3-fu">
            <div class="p3-card-title"><i class="fa-solid fa-comments" style="color:var(--p3-wa);"></i>Aperçu de la conversation</div>
            <div style="background:rgba(255,255,255,.02);border-radius:10px;padding:14px;
              max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
              ${DEMO_MESSAGES.map(m => `
                <div class="p3-wa-bubble ${m.out ? 'out' : ''}"
                  style="white-space:pre-line;font-size:10px;">${m.text}</div>`).join('')}
            </div>
          </div>
        </div>

        <!-- Commandes disponibles -->
        <div class="p3-card p3-fu" style="margin-bottom:14px;">
          <div class="p3-card-title"><i class="fa-solid fa-keyboard" style="color:rgba(255,255,255,.3);"></i>Commandes WhatsApp disponibles</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;">
            ${[
              ['SCORE',       'Voir votre dernier score de santé',          '#10b981'],
              ['ALERTE ON/OFF','Activer/désactiver les alertes automatiques', '#f59e0b'],
              ['ANALYSE',     'Instructions pour lancer une analyse',        '#a78bfa'],
              ['RAPPORT',     'Recevoir le résumé de votre dernier rapport', '#60A5FA'],
              ['CREDIT',      'Score de crédit bankable en 1 message',       '#FFD700'],
              ['AIDE',        'Liste de toutes les commandes disponibles',   'rgba(255,255,255,.3)'],
            ].map(([cmd, desc, col]) => `
              <div style="display:flex;gap:10px;padding:10px;background:rgba(255,255,255,.02);
                border-radius:9px;border:1px solid rgba(255,255,255,.04);">
                <code style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:700;
                  color:${col};flex-shrink:0;background:${col}18;padding:2px 7px;
                  border-radius:5px;">${cmd}</code>
                <span style="font-size:9px;color:rgba(255,255,255,.45);">${desc}</span>
              </div>`).join('')}
          </div>
        </div>

        <!-- Alertes automatiques -->
        <div class="p3-card p3-fu">
          <div class="p3-card-title"><i class="fa-solid fa-bell" style="color:var(--p3-wa);"></i>Alertes automatiques configurées</div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${[
              ['Score baisse de > 10 pts',           true,  '#ef4444'],
              ['Ratio en zone critique détecté',     true,  '#f59e0b'],
              ['Agent IA génère un plan d\'action',  false, '#a78bfa'],
              ['Rapport mensuel automatique',        false, '#60A5FA'],
              ['Demande co-signature traitée',       true,  '#10b981'],
            ].map(([label, active, col]) => `
              <div style="display:flex;align-items:center;justify-content:space-between;
                padding:10px 0;border-bottom:1px solid rgba(255,255,255,.04);">
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="width:7px;height:7px;border-radius:50%;
                    background:${active ? col : 'rgba(255,255,255,.12)'};"></div>
                  <span style="font-size:10px;color:${active ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.3)'};">${label}</span>
                </div>
                <div onclick="this.querySelector('input').click()"
                  style="width:36px;height:20px;border-radius:100px;cursor:pointer;
                  background:${active ? 'rgba(37,211,102,.3)' : 'rgba(255,255,255,.1)'};
                  border:1px solid ${active ? 'rgba(37,211,102,.4)' : 'rgba(255,255,255,.15)'};
                  position:relative;transition:all .2s;">
                  <div style="position:absolute;top:2px;left:${active ? '18px' : '2px'};
                    width:14px;height:14px;border-radius:50%;background:#fff;transition:left .2s;"></div>
                  <input type="checkbox" ${active ? 'checked' : ''} style="display:none;"/>
                </div>
              </div>`).join('')}
          </div>
        </div>

      </div>`;
  }

  function savePhone() {
    const phone = document.getElementById('p3-wa-phone')?.value?.trim();
    if (!phone) return;
    // Sauvegarder dans S.profile et Firestore
    if (window.S?.profile) window.S.profile.whatsapp = phone;
    try {
      import('./firebase-config.js').then(({ db, auth }) => {
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js').then(({ doc, updateDoc }) => {
          if (auth?.currentUser) {
            updateDoc(doc(db, 'users', auth.currentUser.uid), { 'profile.whatsapp': phone });
          }
        });
      });
    } catch {}
    // Feedback
    const btn = document.querySelector('[onclick="P3_WHATSAPP.savePhone()"]');
    if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i>'; setTimeout(()=>{btn.innerHTML='<i class="fa-solid fa-floppy-disk"></i>';},2000); }
  }

  return { render, openChat, sendAlert, savePhone, configureWebhook };
})();

window.P3_WHATSAPP = P3_WHATSAPP;


// ════════════════════════════════════════════════════════════════
//  INJECTION VUES + NAV
// ════════════════════════════════════════════════════════════════

function _p3InjectViews() {
  const main = document.getElementById('main');
  if (!main || document.getElementById('view-agent')) return;

  const views = ['agent','peers','cosign','whatsapp'];
  views.forEach(v => {
    const pane = document.createElement('div');
    pane.id = `view-${v}`;
    pane.className = 'view-pane';
    pane.innerHTML = `<div id="${v}-content" style="height:100%;overflow:hidden;"></div>`;
    main.appendChild(pane);
  });
}

function _p3InjectNav() {
  const nav = document.querySelector('nav');
  if (!nav || document.getElementById('p3-nav-group')) return;

  const sep = document.createElement('div');
  sep.id = 'p3-nav-group';
  sep.style.cssText = 'display:flex;flex-direction:column;gap:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px;';

  [
    { view:'agent',    icon:'fa-robot',       tip:'Agent IA' },
    { view:'peers',    icon:'fa-users',        tip:'Réseau de pairs' },
    { view:'cosign',   icon:'fa-file-signature',tip:'Co-signature' },
    { view:'whatsapp', icon:'fa-brands fa-whatsapp', tip:'WhatsApp' },
  ].forEach(item => {
    const btn = document.createElement('div');
    btn.className   = 'p3-nav-item';
    btn.dataset.view = item.view;
    btn.innerHTML   = `<i class="${item.icon.startsWith('fa-brands') ? item.icon : 'fa-solid '+item.icon}"></i><span class="nav-tip">${item.tip}</span>`;
    btn.onclick     = () => _p3NavTo(item.view);
    sep.appendChild(btn);
  });

  const spacer = nav.querySelector('.nav-spacer') || nav.querySelector('#p2-nav-group') || nav.querySelector('.nav-logout');
  if (spacer) nav.insertBefore(sep, spacer);
  else nav.appendChild(sep);
}

function _p3NavTo(view) {
  document.querySelectorAll('.nav-item, .p2-nav-item, .p3-nav-item').forEach(el => el.classList.remove('active'));
  document.querySelector(`.p3-nav-item[data-view="${view}"]`)?.classList.add('active');
  document.querySelectorAll('.view-pane').forEach(p => p.classList.toggle('active', p.id === `view-${view}`));

  const el = document.getElementById(`${view}-content`);
  if (!el) return;

  if      (view === 'agent')    P3_AGENT.render(el);
  else if (view === 'peers')    P3_PEERS.render(el);
  else if (view === 'cosign')   P3_COSIGN.render(el);
  else if (view === 'whatsapp') P3_WHATSAPP.render(el);
}

// Patcher DS_VIEWS.navTo pour inclure les vues Phase 3
(function _hookNavTo() {
  let _tries = 0;
  const _w = setInterval(() => {
    _tries++;
    if (_tries > 40) { clearInterval(_w); return; }
    if (window.DS_VIEWS?.navTo && !window.DS_VIEWS._p3hooked) {
      window.DS_VIEWS._p3hooked = true;
      const orig = window.DS_VIEWS.navTo.bind(window.DS_VIEWS);
      window.DS_VIEWS.navTo = (v) => {
        const p3Views = ['agent','peers','cosign','whatsapp'];
        if (p3Views.includes(v)) _p3NavTo(v);
        else orig(v);
      };
      clearInterval(_w);
    }
  }, 200);
})();

// ── Init ──────────────────────────────────────────────────────
(function _p3init() {
  function _boot() {
    _p3InjectViews();
    _p3InjectNav();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot);
  else _boot();
})();

// API publique
window.DS_PHASE3 = {
  agent:    P3_AGENT,
  peers:    P3_PEERS,
  cosign:   P3_COSIGN,
  whatsapp: P3_WHATSAPP,
  navTo:    _p3NavTo,
};

console.log('%c[phase3.js] ✓ Chargé — Agent IA · Réseau Pairs · Co-signature · WhatsApp', 'color:#A78BFA;font-weight:bold');
