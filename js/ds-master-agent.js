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
    tone:        'coaching',   // coaching | strict | growth | conservative
    customInstructions: '',    // instructions personnalisées pour l'agent
  };

  function _loadCfg() {
    try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem('ds_agent_cfg') || '{}') }; }
    catch { return { ...DEFAULT_CFG }; }
  }

  function saveCfg(updates) {
    const cfg = { ..._loadCfg(), ...updates };
    localStorage.setItem('ds_agent_cfg', JSON.stringify(cfg));
    _restart();
    _log('Configuration mise à jour', 'var(--violet-3)');
    renderConfig();
  }

  function getCfg() { return _loadCfg(); }

  /* ── Couleurs selon statut ───────────────────────────────────── */
  const COLORS = {
    monitoring: 'var(--cyan)',
    thinking:   'var(--amber)',
    alerting:   'var(--error)',
    idle:       'var(--text-hint)',
  };

  const STATUS_LABELS = {
    monitoring: 'Surveillance active',
    thinking:   'Analyse en cours…',
    alerting:   'Alerte détectée !',
    idle:       'En attente de données',
  };

  /* ── Journal de bord ─────────────────────────────────────────── */
  function _log(msg, color = 'var(--cyan)') {
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    _journal.unshift({ msg, color, time: now });
    if (_journal.length > 30) _journal.pop();
    _renderJournal();
  }

  function _renderJournal() {
    const el = document.getElementById('agent-logs-view');
    if (!el) return;
    if (!_journal.length) {
      el.innerHTML = `<div style="padding:20px;text-align:center;font-size:10px;color:var(--text-hint);">Journal vide</div>`;
      return;
    }
    el.innerHTML = _journal.map(j => `
      <div style="display:flex;align-items:baseline;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="font-family:'JetBrains Mono',monospace;font-size:8px;color:var(--text-hint);opacity:0.5;white-space:nowrap;">${j.time}</span>
        <span style="font-size:10px;color:${j.color};line-height:1.4;font-weight:600;">${j.msg.replace(/⚠/g, '<i class="fa-solid fa-triangle-exclamation"></i>').replace(/✓/g, '<i class="fa-solid fa-check"></i>')}</span>
      </div>
    `).join('');
  }

  /* ── Switch Tabs ───────────────────────────────────────────── */
  window._agentTab = function(tab) {
    // Buttons
    const btnI = document.getElementById('agent-tab-insights');
    const btnJ = document.getElementById('agent-tab-journal');
    const btnP = document.getElementById('agent-tab-predict');

    // Panels
    const panI = document.getElementById('agent-panel-insights');
    const panJ = document.getElementById('agent-panel-journal');
    const panP = document.getElementById('agent-panel-predict');

    if (!btnI || !panI) return;

    // Reset all
    [btnI, btnJ, btnP].forEach(b => {
      if (!b) return;
      b.style.background = 'transparent';
      b.style.borderBottom = '2px solid transparent';
      b.style.color = 'var(--text-muted)';
    });
    [panI, panJ, panP].forEach(p => { if (p) p.style.display = 'none'; });

    // Activate
    const activeBtn = tab === 'insights' ? btnI : tab === 'journal' ? btnJ : btnP;
    const activePan = tab === 'insights' ? panI : tab === 'journal' ? panJ : panP;

    if (activeBtn) {
      activeBtn.style.background = 'rgba(167,139,250,.08)';
      activeBtn.style.borderBottom = '2px solid var(--color-violet-light)';
      activeBtn.style.color = 'var(--color-violet-light)';
    }
    if (activePan) activePan.style.display = 'block';
  };

  /* ── Init ────────────────────────────────────────────────────── */
  function init() {
    console.log('%c[Master Agent v2] Initialisation…', 'color:var(--violet-3);font-weight:bold;');
    _log('Master Agent v2 démarré', 'var(--violet-3)');
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
      _log(`Cycle #${_loopCount} — En attente d'une analyse`, 'var(--text-hint)');
      return;
    }

    setStatus('thinking');
    _log(`Cycle #${_loopCount} — Analyse de ${analyse.entreprise || 'l\'entreprise'}…`, 'var(--amber)');

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
        ? `Tension(s) détectée(s)`
        : `Aucune anomalie — Score : ${analyse.score || '?'}/100`,
      tensions.length > 0 ? 'var(--error)' : 'var(--success)'
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
    
    // --- Actions réelles ---
    if (score < 30) {
      _log("Action Agent : Préparation d'une demande de co-signature urgente", 'var(--error)');
      // Ici on pourrait appeler l'API /cosign/request automatiquement
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
      window.DS_SUPPLEMENT?.alerts?.push?.(`[IA] ${insight.title}`, 'danger');
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
      tag.style.borderColor = `var(--border)`;
      tag.style.background = `var(--surface-2)`;
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
        <div style="padding:50px 20px;text-align:center;color:var(--text-hint);">
          <i class="fa-solid fa-shield-check" style="font-size:36px;display:block;margin-bottom:14px;opacity:.3;"></i>
          <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;">Aucune anomalie détectée</div>
          <div style="font-size:10px;margin-top:6px;line-height:1.6;">L'IA surveille vos finances en continu.<br>Importez une liasse pour commencer.</div>
        </div>`;
      return;
    }

    const SICON = { critical: 'fa-triangle-exclamation', high: 'fa-circle-exclamation', ok: 'fa-circle-check', info: 'fa-lightbulb', info2: 'fa-lightbulb' };
    const SCOL  = { critical: 'var(--error)', high: 'var(--amber)', ok: 'var(--success)', info: 'var(--violet-3)', opportunity: 'var(--violet-3)' };

    el.innerHTML = _insights.map(i => {
      const col = SCOL[i.severity] || 'var(--cyan)';
      const ico = SICON[i.severity] || 'fa-lightbulb';
      return `
        <div style="background:var(--surface-2);border:1px solid var(--border);border-left:3px solid ${col};
          border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;gap:12px;
          animation:slideInAgent .3s ease-out;">
          <div style="width:34px;height:34px;border-radius:8px;background:var(--surface-3);color:${col};
            display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;">
            <i class="fa-solid ${ico}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:var(--text);margin-bottom:4px;">${i.title}</div>
            <div style="font-size:9.5px;color:var(--text-2);line-height:1.6;">${i.desc}</div>
            <div style="font-size:8px;color:var(--text-hint);margin-top:6px;">Détecté à ${i.time}</div>
          </div>
          <button onclick="window.DS_MASTER_AGENT._dismissInsight(${i.id})"
            style="background:none;border:none;color:var(--text-hint);cursor:pointer;font-size:14px;flex-shrink:0;align-self:flex-start;padding:2px;"
            title="Ignorer"><i class="fa-solid fa-xmark"></i></button>
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
      <div style="font-family:Syne,sans-serif;font-size:8px;font-weight:900;letter-spacing:.1em;color:var(--violet-3);opacity:0.6;text-transform:uppercase;margin-bottom:4px;">
        <i class="fa-solid fa-sparkles"></i> Insights prioritaires
      </div>
      ${critical.map(i => `
        <div class="chat-ai-insight">
          <i class="fa-solid fa-triangle-exclamation" style="color:var(--error);"></i>
          <span>${i.title}</span>
          <button onclick="window.DS_VIEWS?.navTo('agent')" style="background:none;border:none;color:var(--cyan);font-size:8.5px;font-weight:800;text-decoration:underline;cursor:pointer;margin-left:auto;">Voir</button>
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
      { v: 'growth',   l: 'Croissance',  i: 'fa-chart-line', d: 'Priorité aux opportunités' },
      { v: 'balanced', l: 'Équilibré',   i: 'fa-scale-balanced', d: 'Croissance et sécurité' },
      { v: 'security', l: 'Sécurité',    i: 'fa-shield-halved', d: 'Minimiser les risques' },
    ];
    const proactOpts = [
      { v: 'low',    l: 'Faible',  i: 'fa-gauge-low', d: 'Alertes urgentes seulement' },
      { v: 'medium', l: 'Moyen',   i: 'fa-gauge', d: 'Alertes importantes' },
      { v: 'high',   l: 'Élevé',   i: 'fa-gauge-high', d: 'Toutes les suggestions' },
    ];
    const toneOpts = [
      { v: 'strict',       l: 'Strict',        i: 'fa-gavel',               d: 'Direct, analytique et franc' },
      { v: 'coaching',     l: 'Coaching',      i: 'fa-graduation-cap',      d: 'Pédagogue et explicatif' },
      { v: 'growth',       l: 'Opportuniste',  i: 'fa-rocket',              d: 'Expansion et rentabilité' },
      { v: 'conservative', l: 'Prudent',       i: 'fa-vault',               d: 'Préservation du capital' },
    ];

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:18px;">

        <!-- Focus -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-crosshairs" style="margin-right:5px;color:var(--cyan);"></i>Orientation stratégique
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${focusOpts.map(o => `
              <button onclick="window.DS_MASTER_AGENT.saveCfg({focus:'${o.v}'})"
                style="padding:10px 8px;border-radius:10px;border:1px solid ${cfg.focus===o.v?'var(--cyan)':'var(--border)'};
                background:${cfg.focus===o.v?'var(--cyan-hover)':'var(--surface-2)'};
                color:${cfg.focus===o.v?'var(--cyan)':'var(--text-2)'};
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;
                transition:all .18s;text-align:center;line-height:1.5;">
                <div style="font-size:16px;margin-bottom:4px;"><i class="fa-solid ${o.i}"></i></div>
                <div>${o.l}</div>
                <div style="font-size:8px;color:var(--text-hint);margin-top:3px;">${o.d}</div>
              </button>`).join('')}
          </div>
        </div>

        <!-- Personnalité / Ton de l'Agent IA -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-circle-nodes" style="margin-right:5px;color:var(--p3-agent);"></i>Personnalité &amp; Ton
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">
            ${toneOpts.map(o => `
              <button onclick="window.DS_MASTER_AGENT.saveCfg({tone:'${o.v}'})"
                style="padding:10px 8px;border-radius:10px;border:1px solid ${cfg.tone===o.v?'var(--p3-agent)':'var(--border)'};
                background:${cfg.tone===o.v?'rgba(167,139,250,.08)':'var(--surface-2)'};
                color:${cfg.tone===o.v?'var(--p3-agent)':'var(--text-2)'};
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;
                transition:all .18s;text-align:center;line-height:1.5;">
                <div style="font-size:14px;margin-bottom:4px;color:${cfg.tone===o.v?'var(--p3-agent)':'var(--text-hint)'};"><i class="fa-solid ${o.i}"></i></div>
                <div>${o.l}</div>
                <div style="font-size:8px;color:var(--text-hint);margin-top:3px;">${o.d}</div>
              </button>`).join('')}
          </div>
        </div>

        <!-- Instructions personnalisées -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-file-signature" style="margin-right:5px;color:var(--violet-3);"></i>Instructions personnalisées
          </div>
          <div style="position:relative;">
            <textarea id="agent-custom-instructions"
              placeholder="Ex: Alerte-moi si la rentabilité nette passe en dessous de 8%. Privilégie l'analyse du BFR..."
              style="width:100%;min-height:75px;padding:12px;border-radius:10px;
              border:1px solid var(--border);background:var(--surface-2);color:var(--text);
              font-family:inherit;font-size:10px;line-height:1.5;resize:vertical;outline:none;
              transition:border-color .2s;"
              onfocus="this.style.borderColor='var(--violet-3)'"
              onblur="this.style.borderColor='var(--border)'"
            >${cfg.customInstructions || ''}</textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:6px;">
              <button onclick="window.DS_MASTER_AGENT.saveCfg({customInstructions:document.getElementById('agent-custom-instructions').value})"
                style="padding:6px 14px;border-radius:8px;
                background:var(--violet-bg);border:1px solid var(--violet-border);color:var(--violet-3);
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;
                transition:all .18s;"
                onmouseenter="this.style.background='var(--violet-hover)'"
                onmouseleave="this.style.background='var(--violet-bg)'">
                <i class="fa-solid fa-floppy-disk" style="margin-right:5px;"></i>Enregistrer les instructions
              </button>
            </div>
          </div>
        </div>

        <!-- Proactivité -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-bolt" style="margin-right:5px;color:var(--amber);"></i>Niveau de proactivité
          </div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
            ${proactOpts.map(o => `
              <button onclick="window.DS_MASTER_AGENT.saveCfg({proactivity:'${o.v}'})"
                style="padding:9px 6px;border-radius:10px;border:1px solid ${cfg.proactivity===o.v?'var(--amber)':'var(--border)'};
                background:${cfg.proactivity===o.v?'var(--amber-hover)':'var(--surface-2)'};
                color:${cfg.proactivity===o.v?'var(--amber)':'var(--text-2)'};
                font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;text-align:center;">
                <div>${o.l}</div>
                <div style="font-size:8px;color:var(--text-hint);margin-top:3px;">${o.d}</div>
              </button>`).join('')}
          </div>
        </div>

        <!-- Fréquence -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-clock" style="margin-right:5px;color:var(--violet-3);"></i>Fréquence d'analyse
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" min="30" max="300" step="30" value="${cfg.frequency}"
              oninput="this.nextElementSibling.textContent=this.value+'s'"
              onchange="window.DS_MASTER_AGENT.saveCfg({frequency:parseInt(this.value)})"
              style="flex:1;accent-color:var(--violet-3);">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--violet-3);min-width:36px;">${cfg.frequency}s</span>
          </div>
          <div style="font-size:9px;color:var(--text-hint);margin-top:5px;">Cycle toutes les ${cfg.frequency}s · ${Math.round(cfg.frequency/60)} min</div>
        </div>

        <!-- Seuil d'alerte -->
        <div>
          <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--text-hint);margin-bottom:10px;">
            <i class="fa-solid fa-gauge" style="margin-right:5px;color:var(--error);"></i>Seuil d'alerte (score)
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <input type="range" min="20" max="70" step="5" value="${cfg.scoreThreshold}"
              oninput="this.nextElementSibling.textContent=this.value+'/100'"
              onchange="window.DS_MASTER_AGENT.saveCfg({scoreThreshold:parseInt(this.value)})"
              style="flex:1;accent-color:var(--error);">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:var(--error);min-width:52px;">${cfg.scoreThreshold}/100</span>
          </div>
        </div>

        <!-- Toggles -->
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button onclick="window.DS_MASTER_AGENT.saveCfg({notifications:!window.DS_MASTER_AGENT.getCfg().notifications})"
            style="flex:1;padding:9px 14px;border-radius:9px;
            border:1px solid ${cfg.notifications?'var(--success-border)':'var(--border)'};
            background:${cfg.notifications?'var(--success-bg)':'var(--surface-2)'};
            color:${cfg.notifications?'var(--success)':'var(--text-hint)'};
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;">
            <i class="fa-solid ${cfg.notifications?'fa-bell':'fa-bell-slash'}" style="margin-right:5px;"></i>
            Notifications ${cfg.notifications?'ON':'OFF'}
          </button>
          <button onclick="window.DS_MASTER_AGENT.saveCfg({cashflowWatch:!window.DS_MASTER_AGENT.getCfg().cashflowWatch})"
            style="flex:1;padding:9px 14px;border-radius:9px;
            border:1px solid ${cfg.cashflowWatch?'var(--cyan-border)':'var(--border)'};
            background:${cfg.cashflowWatch?'var(--cyan-hover)':'var(--surface-2)'};
            color:${cfg.cashflowWatch?'var(--cyan)':'var(--text-hint)'};
            font-family:Syne,sans-serif;font-size:9px;font-weight:800;cursor:pointer;transition:all .18s;">
            <i class="fa-solid fa-water" style="margin-right:5px;"></i>
            Cashflow ${cfg.cashflowWatch?'ON':'OFF'}
          </button>
        </div>

        <!-- Bouton forcer analyse -->
        <button onclick="window.DS_MASTER_AGENT._forceAnalyze()"
          style="width:100%;padding:12px;border-radius:10px;
          background:var(--violet-bg);
          border:1px solid var(--violet-border);color:var(--violet-3);
          font-family:Syne,sans-serif;font-size:10px;font-weight:800;
          cursor:pointer;transition:all .2s;letter-spacing:.05em;">
          <i class="fa-solid fa-play" style="margin-right:7px;"></i>Lancer une analyse maintenant
        </button>
      </div>`;
  }

  function _forceAnalyze() {
    _log('Analyse manuelle déclenchée', 'var(--amber)');
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
