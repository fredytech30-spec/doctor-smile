/**
 * ════════════════════════════════════════════════════════════════
 *  ds-master-agent.js  v2  — Doctor Smile Master Agent
 * ════════════════════════════════════════════════════════════════
 *  Moteur central unifié : surveillance proactive, insights,
 *  heartbeat dynamique, personnalité configurable, journal de bord.
 * ════════════════════════════════════════════════════════════════
 */

window.DS_MASTER_AGENT = (() => {

  /* ── État interne ────────────────────────────────────────────── */
  let _status   = 'monitoring';   // monitoring | thinking | alerting | idle
  let _loop     = null;
  let _insights = [];
  let _journal  = [];
  let _lastId   = null;
  let _loopCount = 0;

  /* ── Config par défaut (persistée dans localStorage) ────────── */
  const DEFAULT_CFG = {
    focus:       'balanced',   // growth | security | balanced
    proactivity: 'medium',     // low | medium | high
    frequency:   60,           // secondes entre chaque cycle
    notifications: true,
    scoreThreshold: 40,
    cashflowWatch: true,
  };

  function _loadCfg() {
    try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem('ds_agent_cfg') || '{}') }; }
    catch { return { ...DEFAULT_CFG }; }
  }

  function saveCfg(updates) {
    const cfg = { ..._loadCfg(), ...updates };
    localStorage.setItem('ds_agent_cfg', JSON.stringify(cfg));
    _restart();
    _log('Configuration mise à jour', '#a78bfa');
    renderConfig();
  }

  function getCfg() { return _loadCfg(); }

  /* ── Couleurs selon statut ───────────────────────────────────── */
  const COLORS = {
    monitoring: '#7DD3FC',
    thinking:   '#FFD700',
    alerting:   '#ef4444',
    idle:       'rgba(255,255,255,.2)',
  };

  const STATUS_LABELS = {
    monitoring: '● Surveillance active',
    thinking:   '◌ Analyse en cours…',
    alerting:   '⚠ Alerte détectée !',
    idle:       '○ En attente de données',
  };

  /* ── Journal de bord ─────────────────────────────────────────── */
  function _log(msg, color = '#7DD3FC') {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    _journal.unshift({ msg, color, time: now });
    if (_journal.length > 30) _journal.pop();
    _renderJournal();
  }

  function _renderJournal() {
    const el = document.getElementById('agent-logs-view');
    if (!el) return;
    if (!_journal.length) {
      el.innerHTML = `<div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">Journal vide</div>`;
      return;
    }
    el.innerHTML = _journal.map(j => `
      <div style="display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">
        <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,.25);white-space:nowrap;">${j.time}</span>
        <span style="font-size:10px;color:${j.color};line-height:1.4;">${j.msg}</span>
      </div>
    `).join('');
  }

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    console.log('%c[Master Agent v2] Initialisation…', 'color:#A78BFA;font-weight:bold;');
    _log('Master Agent v2 démarré', '#a78bfa');
    _restart();
    _updateHeartbeat();
  }

  function _restart() {
    if (_loop) clearInterval(_loop);
    const cfg = _loadCfg();
    _loop = setInterval(() => _analyze(), cfg.frequency * 1000);
    _analyze();
  }

  /* ── Boucle proactive ────────────────────────────────────────── */
  async function _analyze() {
    const analyse = window.S?.currentAnalyse;
    const cfg = _loadCfg();
    _loopCount++;

    if (!analyse) {
      setStatus('idle');
      _log(`Cycle #${_loopCount} — En attente d'une analyse`, 'rgba(255,255,255,.3)');
      return;
    }

    setStatus('thinking');
    _log(`Cycle #${_loopCount} — Analyse de ${analyse.entreprise || 'l\'entreprise'}…`, '#FFD700');

    // Simulate thinking
    await new Promise(r => setTimeout(r, 1800));

    // ── Déclenchement des détecteurs ─────────────────────────────
    const tensions = _detectTensions(analyse, cfg);
    const insights = _detectInsights(analyse, cfg);

    tensions.forEach(t => addInsight(t));
    insights.forEach(i => addInsight(i));

    // ── Intégration P3_AGENT ─────────────────────────────────────
    if (window.P3_AGENT?._forceRun) {
      try { await window.P3_AGENT._forceRun(); } catch {}
    }

    setStatus(tensions.length > 0 ? 'alerting' : 'monitoring');
    _lastId = analyse.id;

    _log(
      tensions.length > 0
        ? `⚠ ${tensions.length} tension(s) détectée(s)`
        : `✓ Aucune anomalie — Score : ${analyse.score || '?'}/100`,
      tensions.length > 0 ? '#ef4444' : '#10b981'
    );

    renderInsights();
    _updateStatusUI();
  }

  /* ── Détection de tensions ───────────────────────────────────── */
  function _detectTensions(analyse, cfg) {
    const t = [];
    const score = analyse.score || 0;

    if (cfg.cashflowWatch && window.S?.cashflow?.tension) {
      t.push({ type: 'tension', title: 'Tension de trésorerie détectée', desc: 'Risque de solde négatif sous 15 jours. Action immédiate recommandée.', severity: 'critical' });
    }
    if (score < cfg.scoreThreshold) {
      t.push({ type: 'anomaly', title: 'Score de santé fragile', desc: `Score ${score}/100 — En dessous du seuil de vigilance (${cfg.scoreThreshold}).`, severity: score < 25 ? 'critical' : 'high' });
    }
    const ratios = analyse.ratios || {};
    if (ratios.liquidite_generale !== undefined && ratios.liquidite_generale < 1) {
      t.push({ type: 'ratio', title: 'Liquidité générale critique', desc: `Ratio ${ratios.liquidite_generale.toFixed(2)} < 1 — incapacité à couvrir les dettes court terme.`, severity: 'critical' });
    }
    if (ratios.endettement !== undefined && ratios.endettement > 1.5) {
      t.push({ type: 'ratio', title: 'Endettement élevé', desc: `Ratio d'endettement à ${ratios.endettement.toFixed(2)} — levier financier dangereux.`, severity: 'high' });
    }
    return t;
  }

  /* ── Détection d'insights positifs ──────────────────────────── */
  function _detectInsights(analyse, cfg) {
    const out = [];
    const score = analyse.score || 0;
    if (score > 75) {
      out.push({ type: 'success', title: 'Excellente santé financière', desc: `Score ${score}/100 — L'entreprise est en zone saine. Continuez sur cette lancée.`, severity: 'ok' });
    }
    if (cfg.focus === 'growth' && score > 60) {
      out.push({ type: 'opportunity', title: 'Potentiel de croissance identifié', desc: 'Les indicateurs suggèrent une capacité d\'investissement disponible.', severity: 'info' });
    }
    return out;
  }

  /* ── Ajouter un insight (dédupliqué) ─────────────────────────── */
  function addInsight(insight) {
    if (_insights.find(i => i.title === insight.title)) return;
    _insights.unshift({
      ...insight,
      id: Date.now(),
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    if (_insights.length > 10) _insights.pop();

    if (insight.severity === 'critical' && _loadCfg().notifications) {
      window.DS_SUPPLEMENT?.alerts?.push?.(`⚠ [IA] ${insight.title}`, 'danger');
    }
  }

  /* ── Statut & Heartbeat ──────────────────────────────────────── */
  function setStatus(s) {
    _status = s;
    _updateHeartbeat();
  }

  function _updateHeartbeat() {
    const color = COLORS[_status];

    // Sidebar dot
    const dot   = document.getElementById('ds-heartbeat-dot');
    const pulse = document.getElementById('ds-heartbeat-pulse');
    if (dot)   { dot.style.background = color; dot.style.boxShadow = `0 0 10px ${color}`; }
    if (pulse) { pulse.style.borderColor = color; pulse.style.animationDuration = _status === 'alerting' ? '0.7s' : _status === 'thinking' ? '1.2s' : '3s'; }

    // Nav tip
    const tip = document.querySelector('.nav-item[data-view="agent"] .nav-tip');
    if (tip) tip.textContent = STATUS_LABELS[_status];

    // Grand orbe dans la vue
    const orb = document.getElementById('agent-hb-big');
    if (orb)  { orb.style.background = color; orb.style.boxShadow = `0 0 40px ${color}88, 0 0 80px ${color}33`; }

    // Status tag header
    const tag = document.getElementById('agent-status-tag');
    if (tag) {
      tag.textContent = STATUS_LABELS[_status];
      tag.style.color = color;
      tag.style.borderColor = color + '44';
      tag.style.background = color + '11';
    }

    // Status text
    const txt = document.getElementById('agent-status-text');
    if (txt) { txt.textContent = _status.toUpperCase(); txt.style.color = color; }
  }

  /* ── Render Insights ─────────────────────────────────────────── */
  function renderInsights() {
    const el = document.getElementById('agent-insights-list');
    if (!el) return;

    if (!_insights.length) {
      el.innerHTML = `
        <div style="padding:50px 20px;text-align:center;color:rgba(255,255,255,.18);">
          <i class="fa-solid fa-shield-check" style="font-size:36px;display:block;margin-bottom:14px;opacity:.3;"></i>
          <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;">Aucune anomalie détectée</div>
          <div style="font-size:10px;margin-top:6px;line-height:1.6;">L'IA surveille vos finances en continu.<br>Importez une analyse pour commencer.</div>
        </div>`;
      return;
    }

    const SICON = { critical: 'fa-triangle-exclamation', high: 'fa-circle-exclamation', ok: 'fa-circle-check', info: 'fa-lightbulb', info2: 'fa-lightbulb' };
    const SCOL  = { critical: '#ef4444', high: '#f59e0b', ok: '#10b981', info: '#a78bfa', opportunity: '#a78bfa' };

    el.innerHTML = _insights.map(i => {
      const col = SCOL[i.severity] || '#7DD3FC';
      const ico = SICON[i.severity] || 'fa-lightbulb';
      return `
        <div style="background:${col}08;border:1px solid ${col}22;border-left:3px solid ${col};
          border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;
          animation:slideInAgent .3s ease-out;">
          <div style="width:34px;height:34px;border-radius:8px;background:${col}15;color:${col};
            display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;">
            <i class="fa-solid ${ico}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#fff;margin-bottom:4px;">${i.title}</div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.5);line-height:1.6;">${i.desc}</div>
            <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:6px;">Détecté à ${i.time}</div>
          </div>
          <button onclick="window.DS_MASTER_AGENT._dismissInsight(${i.id})"
            style="background:none;border:none;color:rgba(255,255,255,.2);cursor:pointer;font-size:11px;flex-shrink:0;align-self:flex-start;padding:2px;"
            title="Ignorer">×</button>
        </div>`;
    }).join('');
  }

  /* ── Render Insights in Chat view ────────────────────────────── */
  function renderChatInsights() {
    const el = document.getElementById('chat-ai-insights-wrap');
    if (!el) return;
    const critical = _insights.filter(i => i.severity === 'critical');
    if (!critical.length) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    el.innerHTML = `
      <div style="font-family:Syne,sans-serif;font-size:8px;font-weight:900;letter-spacing:.1em;color:rgba(167,139,250,.4);text-transform:uppercase;margin-bottom:4px;">
        <i class="fa-solid fa-sparkles"></i> Insights prioritaires
      </div>
      ${critical.map(i => `
        <div class="chat-ai-insight">
          <i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i>
          <span>${i.title}</span>
          <button onclick="window.DS_VIEWS?.navTo('agent')" style="background:none;border:none;color:#7DD3FC;font-size:8.5px;font-weight:800;text-decoration:underline;cursor:pointer;margin-left:auto;">Voir</button>
        </div>
      `).join('')}
    `;
  }

  function _dismissInsight(id) {
    _insights = _insights.filter(i => i.id !== id);
    renderInsights();
  }

  /* ── Render Config (panneau paramètres agent) ────────────────── */
  function renderConfig(targetId = 'agent-config-panel') {
    const el = document.getElementById(targetId);
    if (!el) return;
    const cfg = _loadCfg();
    
    // Also try to render to the other possible container if it exists
    const otherId = targetId === 'agent-config-panel' ? 'agent-config-panel-settings' : 'agent-config-panel';
    const otherEl = document.getElementById(otherId);
    if (otherEl && !otherEl._rendering) {
      otherEl._rendering = true;
      renderConfig(otherId);
      delete otherEl._rendering;
    }

    const focusOpts = [
      { v: 'growth',   l: '📈 Croissance',  d: 'Priorité aux opportunités' },
      { v: 'balanced', l: '⚖️ Équilibré',   d: 'Croissance et sécurité' },
      { v: 'security', l: '🛡 Sécurité',    d: 'Minimiser les risques' },
    ];
    const proactOpts = [
      { v: 'low',    l: 'Faible',  d: 'Alertes urgentes seulement' },
      { v: 'medium', l: 'Moyen',   d: 'Alertes importantes' },
      { v: 'high',   l: 'Élevé',   d: 'Toutes les suggestions' },
    ];

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;">

        <!-- Focus -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px;">
            <i class="fa-solid fa-crosshairs" style="margin-right:5px;color:#7DD3FC;"></i>Orientation stratégique
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${focusOpts.map(o => `
              <button onclick="window.DS_MASTER_AGENT.saveCfg({focus:'${o.v}'})"
                style="padding:10px 8px;border-radius:10px;border:1px solid ${cfg.focus===o.v?'rgba(125,211,252,.5)':'rgba(255,255,255,.08)'};
                background:${cfg.focus===o.v?'rgba(125,211,252,.1)':'rgba(255,255,255,.03)'};
                color:${cfg.focus===o.v?'#7DD3FC':'rgba(255,255,255,.45)'};
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;
                transition:all .18s;text-align:center;line-height:1.5;">
                <div style="font-size:16px;margin-bottom:4px;">${o.l.split(' ')[0]}</div>
                <div>${o.l.split(' ').slice(1).join(' ')}</div>
                <div style="font-size:8px;color:rgba(255,255,255,.3);margin-top:3px;">${o.d}</div>
              </button>`).join('')}
          </div>
        </div>

        <!-- Proactivité -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px;">
            <i class="fa-solid fa-bolt" style="margin-right:5px;color:#FFD700;"></i>Niveau de proactivité
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${proactOpts.map(o => `
              <button onclick="window.DS_MASTER_AGENT.saveCfg({proactivity:'${o.v}'})"
                style="padding:9px 6px;border-radius:10px;border:1px solid ${cfg.proactivity===o.v?'rgba(255,215,0,.5)':'rgba(255,255,255,.08)'};
                background:${cfg.proactivity===o.v?'rgba(255,215,0,.08)':'rgba(255,255,255,.03)'};
                color:${cfg.proactivity===o.v?'#FFD700':'rgba(255,255,255,.45)'};
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;text-align:center;">
                <div>${o.l}</div>
                <div style="font-size:8px;color:rgba(255,255,255,.3);margin-top:3px;">${o.d}</div>
              </button>`).join('')}
          </div>
        </div>

        <!-- Fréquence -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px;">
            <i class="fa-solid fa-clock" style="margin-right:5px;color:#a78bfa;"></i>Fréquence d'analyse
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" min="30" max="300" step="30" value="${cfg.frequency}"
              oninput="this.nextElementSibling.textContent=this.value+'s'"
              onchange="window.DS_MASTER_AGENT.saveCfg({frequency:parseInt(this.value)})"
              style="flex:1;accent-color:#a78bfa;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#a78bfa;min-width:36px;">${cfg.frequency}s</span>
          </div>
          <div style="font-size:9px;color:rgba(255,255,255,.25);margin-top:5px;">Cycle toutes les ${cfg.frequency}s · ${Math.round(cfg.frequency/60)} min</div>
        </div>

        <!-- Seuil d'alerte -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin-bottom:10px;">
            <i class="fa-solid fa-gauge" style="margin-right:5px;color:#ef4444;"></i>Seuil d'alerte (score)
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" min="20" max="70" step="5" value="${cfg.scoreThreshold}"
              oninput="this.nextElementSibling.textContent=this.value+'/100'"
              onchange="window.DS_MASTER_AGENT.saveCfg({scoreThreshold:parseInt(this.value)})"
              style="flex:1;accent-color:#ef4444;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#ef4444;min-width:52px;">${cfg.scoreThreshold}/100</span>
          </div>
        </div>

        <!-- Toggles -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="window.DS_MASTER_AGENT.saveCfg({notifications:!window.DS_MASTER_AGENT.getCfg().notifications})"
            style="flex:1;padding:9px 14px;border-radius:9px;
            border:1px solid ${cfg.notifications?'rgba(16,185,129,.4)':'rgba(255,255,255,.1)'};
            background:${cfg.notifications?'rgba(16,185,129,.08)':'rgba(255,255,255,.03)'};
            color:${cfg.notifications?'#10b981':'rgba(255,255,255,.4)'};
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;">
            <i class="fa-solid ${cfg.notifications?'fa-bell':'fa-bell-slash'}" style="margin-right:5px;"></i>
            Notifications ${cfg.notifications?'ON':'OFF'}
          </button>
          <button onclick="window.DS_MASTER_AGENT.saveCfg({cashflowWatch:!window.DS_MASTER_AGENT.getCfg().cashflowWatch})"
            style="flex:1;padding:9px 14px;border-radius:9px;
            border:1px solid ${cfg.cashflowWatch?'rgba(125,211,252,.4)':'rgba(255,255,255,.1)'};
            background:${cfg.cashflowWatch?'rgba(125,211,252,.08)':'rgba(255,255,255,.03)'};
            color:${cfg.cashflowWatch?'#7DD3FC':'rgba(255,255,255,.4)'};
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;">
            <i class="fa-solid fa-water" style="margin-right:5px;"></i>
            Cashflow ${cfg.cashflowWatch?'ON':'OFF'}
          </button>
        </div>

        <!-- Bouton forcer analyse -->
        <button onclick="window.DS_MASTER_AGENT._forceAnalyze()"
          style="width:100%;padding:12px;border-radius:10px;
          background:linear-gradient(135deg,rgba(167,139,250,.15),rgba(125,211,252,.08));
          border:1px solid rgba(167,139,250,.3);color:#a78bfa;
          font-family:Syne,sans-serif;font-size:10px;font-weight:800;
          cursor:pointer;transition:all .2s;letter-spacing:.05em;"
          onmouseenter="this.style.background='linear-gradient(135deg,rgba(167,139,250,.25),rgba(125,211,252,.12))'"
          onmouseleave="this.style.background='linear-gradient(135deg,rgba(167,139,250,.15),rgba(125,211,252,.08))'">
          <i class="fa-solid fa-play" style="margin-right:7px;"></i>Lancer une analyse maintenant
        </button>
      </div>`;
  }

  function _forceAnalyze() {
    _log('Analyse manuelle déclenchée', '#FFD700');
    _analyze();
  }

  function _updateStatusUI() {
    _updateHeartbeat();
    renderInsights();
    _renderJournal();
  }

  /* ── API publique ────────────────────────────────────────────── */
  return {
    init,
    setStatus,
    addInsight,
    getStatus:      () => _status,
    getCfg,
    saveCfg,
    renderInsights,
    renderChatInsights,
    renderConfig,
    _renderJournal,
    _dismissInsight,
    _forceAnalyze,
    getInsights:    () => _insights,
    getJournal:     () => _journal,
  };

})();

/* ── Auto-init ───────────────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.DS_MASTER_AGENT.init());
} else {
  window.DS_MASTER_AGENT.init();
}
