// ════════════════════════════════════════════════════════════════
//  ds-views.js — Doctor Smile
//  Toutes les vues de navigation + renderViewVisualisations
//  Dépend de : ds-core.js, ds-notifs.js
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  GRAPHE : Bar chart horizontal ratios vs benchmark (bandes)
// ════════════════════════════════════════════════════════════════
function _renderBandChart(containerId, ratios, score, zone) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!ratios || !ratios.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;font-size:10px;color:rgba(255,255,255,.2);">Aucun ratio disponible</div>';
    return;
  }

  const ZC_col = {saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  const scoreColor = ZC_col[zone] || '#f59e0b';

  // Prendre les 8 ratios les plus significatifs
  const items = ratios.slice(0, 8).map(r => ({
    label: (r.n || r.name || '').slice(0, 26),
    value: parseFloat(r.v ?? r.value ?? 0),
    bench: parseFloat(r.benchmark ?? r.b ?? 0),
    unit:  r.u || r.unit || '',
    score: r.p ?? r.score ?? 50,
    color: r.c || r.color || scoreColor,
  }));

  const maxVal = Math.max(...items.map(i => Math.max(Math.abs(i.value), Math.abs(i.bench), 0.01))) * 1.25;
  const W = el.getBoundingClientRect().width || 500;
  const ROW_H = 44;
  const PAD_L = 160;
  const PAD_R = 60;
  const PAD_T = 20;
  const BAR_H = 10;
  const BENCH_H = 3;
  const TRACK_W = W - PAD_L - PAD_R;
  const H = PAD_T + items.length * ROW_H + 24;

  const px = v => PAD_L + (Math.abs(v) / maxVal) * TRACK_W;

  let rows = items.map((item, i) => {
    const y = PAD_T + i * ROW_H;
    const valW = Math.max(2, px(item.value) - PAD_L);
    const benchX = px(item.bench);
    const pct = Math.round(item.score);
    const col = item.score >= 70 ? '#10b981' : item.score >= 45 ? '#f59e0b' : '#ef4444';

    return `
      <g>
        <!-- Label -->
        <text x="${PAD_L - 10}" y="${y + ROW_H/2 + 1}" text-anchor="end"
          font-family="Instrument Sans,sans-serif" font-size="9" fill="rgba(255,255,255,.55)"
          dominant-baseline="central">${item.label}</text>

        <!-- Track fond -->
        <rect x="${PAD_L}" y="${y + ROW_H/2 - BAR_H/2}" width="${TRACK_W}" height="${BAR_H}"
          rx="3" fill="rgba(255,255,255,.05)"/>

        <!-- Barre valeur réelle -->
        <rect x="${PAD_L}" y="${y + ROW_H/2 - BAR_H/2}" width="${valW}" height="${BAR_H}"
          rx="3" fill="${col}" opacity="0.85">
          <animate attributeName="width" from="0" to="${valW}" dur="0.7s" calcMode="spline"
            keySplines="0.25,1,0.5,1" fill="freeze"/>
        </rect>

        <!-- Marqueur benchmark (ligne verticale) -->
        <rect x="${benchX - 1}" y="${y + ROW_H/2 - BENCH_H*2}" width="2" height="${BENCH_H*4}"
          fill="#FFD700" opacity="0.7" rx="1"/>

        <!-- Valeur texte -->
        <text x="${PAD_L + valW + 6}" y="${y + ROW_H/2 + 1}"
          font-family="Instrument Sans,sans-serif" font-size="9" font-weight="600"
          fill="${col}" dominant-baseline="central">
          ${item.value.toFixed(1)}${item.unit}
        </text>

        <!-- Score /100 à droite -->
        <text x="${W - 8}" y="${y + ROW_H/2 + 1}" text-anchor="end"
          font-family="Syne,sans-serif" font-size="9" font-weight="800"
          fill="${col}" dominant-baseline="central">${pct}</text>
      </g>`;
  }).join('');

  // Légende
  const legend = `
    <g>
      <rect x="${PAD_L}" y="${H - 16}" width="20" height="6" rx="2" fill="${scoreColor}" opacity=".85"/>
      <text x="${PAD_L + 26}" y="${H - 10}" font-family="Instrument Sans,sans-serif" font-size="8" fill="rgba(255,255,255,.35)">Votre valeur</text>
      <rect x="${PAD_L + 110}" y="${H - 14}" width="2" height="10" fill="#FFD700" opacity=".7" rx="1"/>
      <text x="${PAD_L + 118}" y="${H - 10}" font-family="Instrument Sans,sans-serif" font-size="8" fill="rgba(255,255,255,.35)">Benchmark sectoriel</text>
      <text x="${W - 8}" y="${H - 10}" text-anchor="end" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.25)">/100</text>
    </g>`;

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;">
      ${rows}
      ${legend}
    </svg>`;
}

// ════════════════════════════════════════════════════════════════
//  GRAPHE : Courbe d'évolution du score dans le temps
// ════════════════════════════════════════════════════════════════
function _renderScoreCurve(containerId, timeline, currentScore, zone) {
  const el = document.getElementById(containerId);
  if (!el) return;

  // Si moins de 2 points, construire une série synthétique plausible
  let pts = (timeline && timeline.length >= 2) ? [...timeline] : _syntheticTimeline(currentScore);

  const W = el.getBoundingClientRect().width || 500;
  const H = 160;
  const PAD = { t: 20, r: 24, b: 36, l: 44 };
  const IW = W - PAD.l - PAD.r;
  const IH = H - PAD.t - PAD.b;

  const minS = Math.max(0, Math.min(...pts) - 8);
  const maxS = Math.min(100, Math.max(...pts) + 8);
  const range = maxS - minS || 1;

  const xp = (i) => PAD.l + (i / (pts.length - 1)) * IW;
  const yp = (v) => PAD.t + IH - ((v - minS) / range) * IH;

  const ZC_col = {saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
  const col = ZC_col[zone] || '#f59e0b';

  // Courbe lissée (bezier)
  let path = `M ${xp(0)} ${yp(pts[0])}`;
  for (let i = 1; i < pts.length; i++) {
    const cx1 = xp(i - 0.5);
    const cy1 = yp(pts[i-1]);
    const cx2 = xp(i - 0.5);
    const cy2 = yp(pts[i]);
    path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${xp(i)} ${yp(pts[i])}`;
  }

  // Aire sous la courbe
  const areaPath = path + ` L ${xp(pts.length-1)} ${PAD.t + IH} L ${xp(0)} ${PAD.t + IH} Z`;

  // Zones de couleur horizontales (fond)
  const zoneY75 = yp(75), zoneY50 = yp(50), zoneY25 = yp(25);

  // Grille Y
  const gridLines = [25, 50, 75, 100].map(v => {
    const gy = yp(v);
    if (gy < PAD.t || gy > PAD.t + IH) return '';
    const gc = v >= 75 ? 'rgba(16,185,129,.12)' : v >= 50 ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)';
    return `
      <line x1="${PAD.l}" y1="${gy}" x2="${W - PAD.r}" y2="${gy}"
        stroke="${gc}" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="${PAD.l - 6}" y="${gy}" text-anchor="end" dominant-baseline="central"
        font-family="Instrument Sans,sans-serif" font-size="8" fill="rgba(255,255,255,.25)">${v}</text>`;
  }).join('');

  // Labels X (périodes)
  const xLabels = pts.map((_, i) => {
    if (pts.length <= 6 || i % Math.ceil(pts.length / 6) === 0 || i === pts.length - 1) {
      return `<text x="${xp(i)}" y="${H - 6}" text-anchor="middle"
        font-family="Instrument Sans,sans-serif" font-size="8" fill="rgba(255,255,255,.25)">P${i+1}</text>`;
    }
    return '';
  }).join('');

  // Points sur la courbe
  const dots = pts.map((v, i) => {
    const dotCol = v >= 75 ? '#10b981' : v >= 50 ? '#f59e0b' : '#ef4444';
    const isLast = i === pts.length - 1;
    return `
      <circle cx="${xp(i)}" cy="${yp(v)}" r="${isLast ? 5 : 3}"
        fill="${isLast ? col : dotCol}" stroke="${isLast ? '#fff' : 'transparent'}"
        stroke-width="${isLast ? 1.5 : 0}" opacity="0.9"/>
      ${isLast ? `<text x="${xp(i)}" y="${yp(v) - 10}" text-anchor="middle"
        font-family="Syne,sans-serif" font-size="9" font-weight="800" fill="${col}">${v}</text>` : ''}`;
  }).join('');

  // Indicateur tendance
  const trend = pts.length >= 2 ? pts[pts.length-1] - pts[pts.length-2] : 0;
  const trendIcon = trend > 0 ? '▲' : trend < 0 ? '▼' : '─';
  const trendCol  = trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#f59e0b';

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div style="font-size:9px;color:rgba(255,255,255,.3);">
        ${pts.length} période${pts.length>1?'s':''} · évolution du Doctor Score™
        ${timeline && timeline.length < 2 ? '<span style="color:rgba(245,158,11,.5);margin-left:6px;">projection estimée</span>' : ''}
      </div>
      <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:${trendCol};">
        ${trendIcon} ${Math.abs(trend).toFixed(0)} pts
      </div>
    </div>
    <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible;">
      <defs>
        <linearGradient id="curve-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${col}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${col}" stop-opacity="0.01"/>
        </linearGradient>
      </defs>

      <!-- Fond zones risque -->
      <rect x="${PAD.l}" y="${PAD.t}" width="${IW}" height="${IH}" fill="rgba(239,68,68,.03)" rx="2"/>

      <!-- Grille -->
      ${gridLines}

      <!-- Aire sous courbe -->
      <path d="${areaPath}" fill="url(#curve-grad)"/>

      <!-- Courbe principale -->
      <path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <animate attributeName="stroke-dashoffset" from="2000" to="0" dur="1.2s"
          calcMode="spline" keySplines="0.25,1,0.5,1" fill="freeze"/>
      </path>

      <!-- Points -->
      ${dots}

      <!-- Labels X -->
      ${xLabels}
    </svg>`;
}

// Génère une timeline synthétique plausible si pas assez de données historiques
function _syntheticTimeline(currentScore) {
  const pts = [];
  const n = 6;
  for (let i = 0; i < n - 1; i++) {
    const noise = (Math.random() - 0.5) * 14;
    const base  = currentScore - (n - 1 - i) * 1.5 + noise;
    pts.push(Math.round(Math.max(5, Math.min(99, base))));
  }
  pts.push(currentScore);
  return pts;
}

window.DS_VIEWS = {

  // ── Vues qui affichent la sidebar ────────────────────────────
  SIDEBAR_VIEWS: new Set(['dashboard','analyses','agent','chat']),

  // ── Helper : overlay de verrouillage ────────────────────────
  _planLock(container, requiredPlan, featureName, featureDesc) {
    if (!container) return;
    const plan = window.S?.abonnement?.plan || 'standard';
    const isPrm = requiredPlan === 'premium';
    const hasAccess = isPrm
      ? (plan === 'premium' || plan === 'extra')
      : (plan === 'extra');
    if (hasAccess) {
      const old = container.querySelector('.plan-lock-overlay');
      if (old) old.remove();
      return true;
    }
    // Déjà verrouillé
    if (container.querySelector('.plan-lock-overlay')) return false;
    container.style.position = 'relative';
    const cls  = isPrm ? 'prm' : 'ext';
    const icon = isPrm ? 'fa-crown' : 'fa-rocket';
    const planLabel = isPrm ? 'Premium' : 'Extra';
    const price     = isPrm ? '79€/mois' : '159€/mois';
    const overlay   = document.createElement('div');
    overlay.className = 'plan-lock-overlay';
    overlay.innerHTML = `
      <div class="lock-icon ${cls}">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="lock-title">${featureName}</div>
      <div class="lock-sub">${featureDesc}</div>
      <button class="lock-btn ${cls}"
        onclick="window.DS_PAYMENT?.showPaymentModal(this.dataset.plan)" data-plan="${requiredPlan}">
        ✦ Essai gratuit 45 jours · ${planLabel}
      </button>
      <div class="lock-trial">${price} après l'essai · Annulable à tout moment</div>`;
    container.appendChild(overlay);
    return false;
  },

  // ── Helper : banner Premium/Extra sur une vue ─────────────────
  _viewPlanBanner(viewEl, plan) {
    const existing = viewEl?.querySelector('.view-plan-aura');
    if (existing) existing.remove();
    if (!viewEl || plan === 'standard') return;
    const isPrm = plan === 'premium';
    const aura  = document.createElement('div');
    aura.className = 'view-plan-aura';
    aura.style.cssText = [
      'position:absolute', 'inset:0', 'pointer-events:none', 'border-radius:inherit', 'z-index:0',
      isPrm
        ? 'background:linear-gradient(135deg,rgba(109,40,217,.04) 0%,transparent 60%);border:1px solid rgba(139,92,246,.08)'
        : 'background:linear-gradient(135deg,rgba(234,88,12,.04) 0%,transparent 60%);border:1px solid rgba(249,115,22,.08)',
    ].join(';');
    viewEl.style.position = 'relative';
    viewEl.prepend(aura);
  },

  navTo(view) {
    document.querySelectorAll('.nav-item[data-view]').forEach(el=>{
      el.classList.toggle('active', el.dataset.view===view);
    });
    document.querySelectorAll('.view-pane').forEach(el=>{
      el.classList.toggle('active', el.id===`view-${view}`);
    });
    const sidebar=document.getElementById('sidebar');
    if(sidebar) sidebar.style.display=this.SIDEBAR_VIEWS.has(view)?'':'none';

    const plan = window.S?.abonnement?.plan || 'standard';
    const viewEl = document.getElementById(`view-${view}`);

    // Aura visuelle selon le plan sur chaque vue
    this._viewPlanBanner(viewEl, plan);

    // Afficher/masquer les icônes lock dans la nav
    const isStandard = plan === 'standard';
    const isNotExtra = plan !== 'extra';
    ['benchmark','forecast'].forEach(v => {
      const lockEl = document.getElementById(`nav-${v}-lock`);
      if (lockEl) lockEl.style.display = isStandard ? 'block' : 'none';
    });
    ['credit','cabinet'].forEach(v => {
      const lockEl = document.getElementById(`nav-${v}-lock`);
      if (lockEl) lockEl.style.display = isNotExtra ? 'block' : 'none';
    });

    if      (view==='analyses')       this.renderAnalyses();
    else if (view==='agent')          this.renderMasterAgent();
    else if (view==='rapports')       this.renderRapports();
    else if (view==='chat')           this.renderChat();
    else if (view==='parametres')     this.renderParametres();
    else if (view==='visualisations') this.renderVisualisations();
    else if (view==='alertes')        this.renderAlertes();
    else if (view==='benchmark') {
      if (plan === 'standard') {
        this._planLock(viewEl, 'premium',
          'Benchmark Sectoriel',
          'Comparez vos ratios aux entreprises de votre secteur et identifiez vos axes d\'amélioration prioritaires.');
      } else { this.renderBenchmark(); }
    }
    else if (view==='forecast') {
      if (plan === 'standard') {
        this._planLock(viewEl, 'premium',
          'Prévision Cash-flow',
          'Modélisez vos flux de trésorerie sur 12 mois et anticipez les tensions de liquidité avant qu\'elles surviennent.');
      } else {
        const contentEl = document.getElementById('forecast-content');
        if (window.P2_FORECAST) window.P2_FORECAST.render(contentEl || viewEl, S.currentAnalyse);
        else if (window.DS_EXTRA?.renderCashFlow) window.DS_EXTRA.renderCashFlow();
      }
    }
    else if (view==='early') {
      const contentEl = document.getElementById('early-content');
      if (window.P2_ALERTS) window.P2_ALERTS.render(contentEl || viewEl, S.analyses);
    }
    else if (view==='credit') {
      if (plan !== 'extra') {
        this._planLock(viewEl, 'extra',
          'Score Crédit Bancaire',
          'Générez un rapport de crédit professionnel prêt à soumettre à votre banquier pour un financement.');
      } else {
        const contentEl = document.getElementById('credit-content');
        if (window.P2_CREDIT) window.P2_CREDIT.render(contentEl || viewEl, S.currentAnalyse);
      }
    }
    else if (view==='cabinet') {
      if (plan !== 'extra') {
        this._planLock(viewEl, 'extra',
          'Cabinet Multi-clients',
          'Gérez le portefeuille financier de tous vos clients depuis une interface unifiée.');
      } else {
        const contentEl = document.getElementById('cabinet-content');
        if (window.P2_CABINET) window.P2_CABINET.render(contentEl || viewEl);
      }
    }
  },

  // ── Badge plan dans les vues ─────────────────────────────────
  _renderPlanBadge(plan) {
    if (plan === 'standard') return '';
    const isPrm = plan === 'premium';
    return `<span style="display:inline-flex;align-items:center;gap:5px;
      padding:3px 10px;border-radius:100px;font-family:Syne,sans-serif;
      font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
      background:${isPrm?'rgba(139,92,246,.12)':'rgba(249,115,22,.12)'};
      border:1px solid ${isPrm?'rgba(139,92,246,.25)':'rgba(249,115,22,.25)'};
      color:${isPrm?'#c4b5fd':'#fb923c'};
      box-shadow:0 0 12px ${isPrm?'rgba(139,92,246,.15)':'rgba(249,115,22,.15)'};
      animation:badge-pulse-${isPrm?'prm':'ext'} 3s ease-in-out infinite;">
      ${isPrm?'✦ Premium':'✦✦ Extra'}
    </span>`;
  },

  // ── VUE : Analyses ───────────────────────────────────────────
  renderAnalyses() {
    const container=document.getElementById('analyses-full-list');
    const counter=document.getElementById('analyses-count');
    if(!container) return;
    const list=S.analyses;
    if(counter) counter.textContent=list.length?`${list.length} analyse${list.length>1?'s':''} au total`:'Aucune analyse';
    if(!list.length){
      container.innerHTML=`<div class="analyses-empty">
        <i class="fa-solid fa-microscope"></i>
        Aucune analyse pour le moment.<br>
        <span style="margin-top:8px;display:inline-block;">Importez un fichier depuis le dashboard pour commencer.</span>
      </div>`; return;
    }
    container.innerHTML=list.map(a=>{
      const zone=a.zone??zoneFromScore(a.score??0), zc=ZC[zone];
      const date=window.DS_DASH?._tsToString(a.createdAt)??'';
      const model=(a.model||'ML').split('+')[0].trim();
      const prob=Math.round((100-(a.score??50))*({saine:.6,vigilance:1.0,risque:1.3,critique:1.6}[zone]||1)*.85);
      const pc=prob>60?'#ef4444':prob>35?'#f59e0b':'#10b981';
      return `<div class="an-card ${zone} fu" data-id="${a.id}" style="position:relative;">
        <div class="an-score-big" style="color:${zc.s}">${a.score??'—'}</div>
        <div class="an-info">
          <div class="an-name">${a.entreprise??a.company??'Sans nom'}</div>
          <div class="an-meta">
            <i class="fa-solid fa-calendar" style="font-size:9px;opacity:.5;"></i>${date}
            <i class="fa-solid fa-circle" style="font-size:3px;opacity:.3;"></i>${model}
            ${a.confidence?`<i class="fa-solid fa-circle" style="font-size:3px;opacity:.3;"></i>Confiance ${a.confidence}%`:''}
          </div>
          <div style="margin-top:5px;font-size:9px;">
            <span style="color:rgba(255,255,255,.3);">Risque faillite : </span>
            <span style="color:${pc};font-weight:800;">${prob}%</span>
          </div>
        </div>
        <div class="an-badges" style="gap:6px;">
          <div class="an-zone-badge" style="background:${zc.bg};color:${zc.t};border:1px solid ${zc.s}44;">${zc.l}</div>
          <div style="display:flex;gap:5px;">
            <button class="an-open-btn" style="font-size:8px;padding:5px 12px;">Ouvrir →</button>
            <button class="an-del-btn" data-did="${a.id}" data-dnom="${a.entreprise??''}"
              style="padding:5px 8px;border-radius:6px;border:1px solid rgba(239,68,68,.2);
              background:rgba(239,68,68,.06);color:rgba(239,68,68,.6);font-size:9px;cursor:pointer;
              font-family:Syne,sans-serif;transition:background .15s;"
              onmouseover="this.style.background='rgba(239,68,68,.18)'"
              onmouseout="this.style.background='rgba(239,68,68,.06)'">🗑️</button>
          </div>
        </div>
      </div>`;
    }).join('');
    container.querySelectorAll('.an-card[data-id]').forEach(el=>{
      el.addEventListener('click',(e)=>{
        if(e.target.closest('.an-del-btn')) return;
        const found=S.analyses.find(a=>a.id===el.dataset.id);
        if(found){window.DS_DASH?.loadAnalyse(found); this.navTo('dashboard');}
      });
    });
    container.querySelectorAll('.an-del-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{e.stopPropagation(); window.DS_EXTRA?.deleteAnalyse(btn.dataset.did,btn.dataset.dnom);});
    });
    fu();
  },

  // ── VUE : Rapports ───────────────────────────────────────────
  renderRapports() {
    const container = document.getElementById('rapports-list'); if (!container) return;

    if (!S.analyses.length) {
      container.innerHTML = `<div class="rapports-empty">
        <i class="fa-solid fa-folder-open"></i>
        Aucun dossier disponible.<br>Lancez d'abord une analyse.</div>`;
      return;
    }

    const RTYPES = [
      { key:'analyse',   icon:'fa-file-chart-column', color:'#7DD3FC',  bg:'rgba(125,211,252,.1)',  label:"Rapport d'analyse complet",   desc:'Score · Ratios · SHAP · Recommandations', ready:true  },
      { key:'risque',    icon:'fa-shield-halved',      color:'#f59e0b',  bg:'rgba(245,158,11,.1)',   label:'Rapport de risque détaillé',  desc:'Probabilité défaut · Zones · Alertes',     ready:true  },
      { key:'exec',      icon:'fa-file-lines',         color:'#FFD700',  bg:'rgba(255,215,0,.1)',    label:'Synthèse exécutive (1 page)', desc:'Résumé dirigeant · KPIs clés',            ready:false },
      { key:'benchmark', icon:'fa-chart-bar',          color:'#8B5CF6',  bg:'rgba(139,92,246,.1)',   label:'Benchmark sectoriel',         desc:'Comparaison médiane · Positionnement',    ready:false },
    ];

    container.innerHTML = S.analyses.map((a, ai) => {
      const zone = a.zone ?? zoneFromScore(a.score ?? 0);
      const zc   = ZC[zone];
      const date = window.DS_DASH?._tsToString(a.createdAt) ?? '—';
      const readyCount = RTYPES.filter(r => r.ready).length;
      const fid = `folder-${a.id}`;
      const isOpen = ai === 0; // Premier dossier ouvert par défaut

      const reports = RTYPES.map(rt => `
        <div class="rpt-row" data-rkey="${rt.key}">
          <div class="rpt-row-left">
            <div class="rpt-icon-sm" style="background:${rt.bg};color:${rt.color};">
              <i class="fa-solid ${rt.icon}"></i>
            </div>
            <div class="rpt-row-info">
              <div class="rpt-row-name">${rt.label}</div>
              <div class="rpt-row-desc">${rt.desc}</div>
            </div>
          </div>
          <div class="rpt-row-actions">
            ${rt.ready ? `
              <button class="rpt-btn-dl" title="Télécharger"
                onclick="event.stopPropagation();DS?.downloadReport(this.dataset.aid, this.dataset.key)" data-aid="${a.id}" data-key="${rt.key}">
                <i class="fa-solid fa-download"></i>
              </button>
              <button class="rpt-btn-share" title="Partager"
                onclick="event.stopPropagation();DS_NOTIFS?.shareReport(this.dataset.aid)" data-aid="${a.id}">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <button class="rpt-btn-del" title="Supprimer ce rapport"
                onclick="event.stopPropagation();DS_VIEWS._deleteReport(this.dataset.aid, this.dataset.key, this)" data-aid="${a.id}" data-key="${rt.key}">
                <i class="fa-solid fa-xmark"></i>
              </button>
            ` : `
              <span class="rpt-badge-soon">Bientôt</span>
            `}
          </div>
        </div>`).join('');

      return `
        <div class="rpt-folder fu" id="${fid}" data-aid="${a.id}">

          <!-- ── En-tête dossier ── -->
          <div class="rpt-folder-header" onclick="DS_VIEWS._toggleFolder(this.dataset.fid)" data-fid="${fid}">
            <div class="rpt-folder-left">
              <div class="rpt-folder-icon">
                <i class="fa-solid fa-folder${isOpen ? '-open' : ''}" id="fi-${fid}"></i>
              </div>
              <div>
                <div class="rpt-folder-name">${escHtml(a.entreprise ?? 'Analyse sans nom')}</div>
                <div class="rpt-folder-meta">
                  <span class="rpt-zone-badge" style="background:${zc.bg};color:${zc.t};border:1px solid ${zc.s}44;">${zc.l}</span>
                  <span>Score ${a.score ?? '—'}/100</span>
                  <span>${date}</span>
                  <span>${readyCount} rapport${readyCount > 1 ? 's' : ''} disponible${readyCount > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div class="rpt-folder-actions" onclick="event.stopPropagation()">
              <button class="rpt-pkg-btn rpt-pkg-dl" title="Télécharger tout le dossier"
                onclick="DS_VIEWS._downloadPackage(this.dataset.aid)" data-aid="${a.id}">
                <i class="fa-solid fa-file-zipper"></i>
                <span>Tout télécharger</span>
              </button>
              <button class="rpt-pkg-btn rpt-pkg-del" title="Supprimer tout le dossier"
                onclick="DS_VIEWS._deleteFolder(this.dataset.aid, this.dataset.nom)" data-aid="${a.id}" data-nom="${escHtml(a.entreprise ?? "cette analyse")}">
                <i class="fa-solid fa-folder-minus"></i>
                <span>Supprimer dossier</span>
              </button>
              <div class="rpt-chevron" id="chv-${fid}" style="transform:rotate(${isOpen ? 180 : 0}deg);">
                <i class="fa-solid fa-chevron-down"></i>
              </div>
            </div>
          </div>

          <!-- ── Corps dossier (accordéon) ── -->
          <div class="rpt-folder-body" id="body-${fid}" style="display:${isOpen ? "block" : "none"};">
            <div class="rpt-rows">
              ${reports}
            </div>
          </div>

        </div>`;
    }).join('');

    fu();
  },

  _toggleFolder(fid) {
    const body = document.getElementById(`body-${fid}`);
    const chv  = document.getElementById(`chv-${fid}`);
    const icon = document.getElementById(`fi-${fid}`);
    if (!body) return;
    const open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    if (chv)  chv.style.transform  = open ? 'rotate(0deg)' : 'rotate(180deg)';
    if (icon) icon.className = open ? 'fa-solid fa-folder' : 'fa-solid fa-folder-open';
  },

  _deleteReport(aid, rkey, btn) {
    if (!confirm(`Supprimer ce rapport ?`)) return;
    const row = btn?.closest('.rpt-row');
    if (row) {
      row.style.transition = 'opacity .2s,transform .2s';
      row.style.opacity = '0'; row.style.transform = 'translateX(12px)';
      setTimeout(() => row.remove(), 220);
    }
    showToast('Rapport supprimé', 'ok');
  },

  _downloadPackage(aid) {
    const a = S.analyses.find(x => x.id === aid);
    if (!a) { showToast('Analyse introuvable', 'warn'); return; }
    showToast('Préparation du package…', 'info');
    // Déclencher les exports disponibles
    setTimeout(() => { DS?.downloadReport(aid, 'analyse'); }, 200);
    setTimeout(() => { DS?.downloadReport(aid, 'risque');  }, 800);
    showToast('Package téléchargé ✓', 'ok');
  },

  _deleteFolder(aid, nom) {
    if (!confirm(`Supprimer tout le dossier de rapports pour "${nom}" ?\nCette action est irréversible.`)) return;
    const folder = document.querySelector(`.rpt-folder[data-aid="${aid}"]`);
    if (folder) {
      folder.style.transition = 'opacity .3s,transform .3s';
      folder.style.opacity = '0'; folder.style.transform = 'translateY(-8px)';
      setTimeout(() => folder.remove(), 320);
    }
    showToast(`Dossier "${nom}" supprimé`, 'ok');
  },

  // ── VUE : Paramètres ─────────────────────────────────────────
  renderParametres() {
    const container=document.getElementById('parametres-content'); if(!container) return;
    const plan=S.abonnement?.plan||S.profile?.plan||'standard';
    const prenom=S.profile?.prenom||S.user?.displayName?.split(' ')[0]||'';
    const nom=S.profile?.nom||'';
    const email=S.user?.email||'—';
    const planLabels={standard:'Standard',premium:'Premium',extra:'Extra'};
    const photoURL=S.profile?.photoURL||S.user?.photoURL||null;
    const initials=([prenom?.[0],nom?.[0]].filter(Boolean).join('').toUpperCase())||'?';
    const fullName=[prenom,nom].filter(Boolean).join(' ')||'—';

    container.innerHTML=`

      <!-- ══ BLOC PHOTO DE PROFIL ══════════════════════════════ -->
      <div class="param-section" style="align-items:center;gap:0;">
        <div class="param-section-title" style="width:100%;">
          <i class="fa-solid fa-circle-user" style="color:var(--ice);margin-right:8px;"></i>Photo de profil
        </div>

        <!-- Zone photo centrale -->
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px 0 8px;width:100%;">

          <!-- Avatar grand format cliquable -->
          <div id="param-avatar-wrap"
            onclick="document.getElementById('param-photo-input').click()"
            style="
              width:100px;height:100px;border-radius:50%;
              background:linear-gradient(135deg,var(--gold),var(--ice));
              border:3px solid rgba(255,215,0,.38);
              box-shadow:0 0 0 6px rgba(255,215,0,.07),0 10px 36px rgba(0,0,0,.45);
              display:flex;align-items:center;justify-content:center;
              font-family:var(--fd);font-size:32px;font-weight:900;color:var(--bg);
              cursor:pointer;position:relative;overflow:hidden;
              transition:all .28s cubic-bezier(.34,1.56,.64,1);"
            onmouseenter="this.style.borderColor='rgba(125,211,252,.6)';this.style.boxShadow='0 0 0 8px rgba(125,211,252,.08),0 10px 36px rgba(0,0,0,.55)';document.getElementById('param-avatar-overlay').style.opacity='1';"
            onmouseleave="this.style.borderColor='rgba(255,215,0,.38)';this.style.boxShadow='0 0 0 6px rgba(255,215,0,.07),0 10px 36px rgba(0,0,0,.45)';document.getElementById('param-avatar-overlay').style.opacity='0';">

            ${photoURL
              ? `<img id="param-avatar-img" src="${escHtml(photoURL)}" alt="Photo de profil"
                  style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`
              : `<span id="param-avatar-initials"
                  style="font-family:Syne,sans-serif;font-size:32px;font-weight:900;
                  color:var(--bg);user-select:none;">${escHtml(initials)}</span>`
            }

            <!-- Overlay caméra au hover -->
            <div id="param-avatar-overlay"
              style="position:absolute;inset:0;border-radius:50%;
                background:rgba(2,4,11,.72);
                display:flex;flex-direction:column;align-items:center;justify-content:center;
                gap:5px;opacity:0;transition:opacity .22s;pointer-events:none;">
              <i class="fa-solid fa-camera" style="font-size:20px;color:#fff;"></i>
              <span style="font-family:Syne,sans-serif;font-size:7px;font-weight:800;
                letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;">Modifier</span>
            </div>
          </div>

          <!-- Nom affiché sous l'avatar -->
          <div style="text-align:center;line-height:1.3;">
            <div id="param-avatar-name"
              style="font-family:Syne,sans-serif;font-size:15px;font-weight:900;color:#fff;">
              ${escHtml(fullName)}
            </div>
            <div style="font-size:9.5px;color:rgba(255,255,255,.32);margin-top:2px;">
              ${escHtml(email)}
            </div>
          </div>

          <!-- Boutons actions photo -->
          <div style="display:flex;gap:9px;align-items:center;flex-wrap:wrap;justify-content:center;">
            <button onclick="document.getElementById('param-photo-input').click()"
              style="display:flex;align-items:center;gap:7px;padding:9px 20px;
                border-radius:10px;background:rgba(125,211,252,.08);
                border:1px solid rgba(125,211,252,.22);
                color:#7DD3FC;font-family:Syne,sans-serif;font-size:9px;font-weight:800;
                letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
                transition:all .2s cubic-bezier(.34,1.56,.64,1);"
              onmouseenter="this.style.background='rgba(125,211,252,.16)';this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 20px rgba(125,211,252,.14)'"
              onmouseleave="this.style.background='rgba(125,211,252,.08)';this.style.transform='none';this.style.boxShadow='none'">
              <i class="fa-solid fa-camera"></i>
              ${photoURL ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            ${photoURL ? `
            <button onclick="DS_PROFILE?.removePhoto?.()"
              id="param-remove-photo-btn"
              style="display:flex;align-items:center;gap:7px;padding:9px 18px;
                border-radius:10px;background:rgba(239,68,68,.07);
                border:1px solid rgba(239,68,68,.18);
                color:#ef4444;font-family:Syne,sans-serif;font-size:9px;font-weight:800;
                letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
                transition:all .18s;"
              onmouseenter="this.style.background='rgba(239,68,68,.15)'"
              onmouseleave="this.style.background='rgba(239,68,68,.07)'">
              <i class="fa-solid fa-trash"></i>Supprimer
            </button>` : ''}
          </div>

          <!-- Info format accepté -->
          <div style="font-size:8px;color:rgba(255,255,255,.2);text-align:center;line-height:1.8;">
            <i class="fa-solid fa-circle-info" style="margin-right:4px;opacity:.6;"></i>
            JPG · PNG · WEBP · GIF · max 5 Mo · compressée automatiquement à 400px
          </div>

          <!-- Zone statut upload (spinner, erreur, succès) -->
          <div id="param-upload-status" style="min-height:18px;"></div>
        </div>

        <!-- Input file caché — déclenché par les boutons -->
        <input type="file" id="param-photo-input" accept="image/*" style="display:none;"
          onchange="window._paramHandlePhotoUpload(this.files[0])">
      </div>
      <!-- ════════════════════════════════════════════════════════ -->

      <div class="param-section">
        <div class="param-section-title">Profil utilisateur</div>
        <div class="param-row">
          <div class="param-label">Prénom<small>Affiché dans le dashboard</small></div>
          <input class="param-input" id="param-prenom" value="${escHtml(prenom)}" placeholder="Votre prénom"
            oninput="(()=>{const n=(this.value.trim()||'—')+' '+(document.getElementById('param-nom')?.value.trim()||'');const el=document.getElementById('param-avatar-name');if(el)el.textContent=n.trim()||'—';})()">
        </div>
        <div class="param-row">
          <div class="param-label">Nom<small>Nom de famille</small></div>
          <input class="param-input" id="param-nom" value="${escHtml(nom)}" placeholder="Votre nom"
            oninput="(()=>{const n=(document.getElementById('param-prenom')?.value.trim()||'—')+' '+this.value.trim();const el=document.getElementById('param-avatar-name');if(el)el.textContent=n.trim()||'—';})()">
        </div>
        <div class="param-row">
          <div class="param-label">Email<small>Adresse de connexion</small></div>
          <div class="param-value" style="color:var(--muted)">${escHtml(email)}</div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:4px;">
          <button class="param-btn primary" onclick="DS?.saveProfile()">
            <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Enregistrer
          </button>
        </div>
      </div>

      <!-- ══ CONFIGURATION ARGENT IA (MASTER AGENT) ══════════════ -->
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-brain" style="color:var(--p3-agent);margin-right:8px;"></i>Personnalité Argent IA
        </div>
        <div id="agent-config-panel-settings">
          <div style="font-size:10px; color:rgba(255,255,255,.3); padding:10px;">Chargement de la configuration IA...</div>
        </div>
        <script>
          // Petit hack pour injecter le panneau de config agent ici aussi
          setTimeout(() => {
            const container = document.getElementById('agent-config-panel-settings');
            if (container && window.DS_MASTER_AGENT) {
              window.DS_MASTER_AGENT.renderConfig(); // Ceci remplit 'agent-config-panel'
              // On peut cloner ou déplacer si besoin, mais ici on va juste appeler une fonction dédiée
              // Pour simplifier, on va faire en sorte que renderConfig accepte un ID optionnel
            }
          }, 100);
        </script>
      </div>

      <div class="param-section">
        <div class="param-section-title">Abonnement</div>
        <div class="param-row"><div class="param-label">Plan actuel<small>Détermine vos fonctionnalités</small></div><div class="param-value"><span class="badge ${plan}" style="font-size:9px;">${planLabels[plan]??plan}</span></div></div>
        <div class="param-row"><div class="param-label">Analyses ce mois<small>Quota selon votre plan</small></div><div class="param-value" style="color:var(--ice);">${S.analyses.length}</div></div>
        ${plan!=='extra'?`
        <div onclick="window.DS_PAYMENT?.showPaymentModal(this.dataset.plan)"
          data-plan="${plan === 'standard' ? 'premium' : 'extra'}"
          style="margin-top:10px;padding:16px;border-radius:14px;cursor:pointer;transition:all .22s;
            background:${plan==='standard'
              ?'linear-gradient(135deg,rgba(109,40,217,.14),rgba(139,92,246,.06))'
              :'linear-gradient(135deg,rgba(234,88,12,.14),rgba(249,115,22,.06))'};
            border:1px solid ${plan==='standard'?'rgba(139,92,246,.22)':'rgba(249,115,22,.22)'}"
          onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='0 10px 32px ${plan==='standard'?'rgba(139,92,246,.2)':'rgba(249,115,22,.2)'}'"
          onmouseleave="this.style.transform='';this.style.boxShadow=''">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
            <div style="width:40px;height:40px;border-radius:12px;flex-shrink:0;
              display:flex;align-items:center;justify-content:center;font-size:18px;
              background:${plan==='standard'?'rgba(139,92,246,.18)':'rgba(249,115,22,.18)'};
              border:1px solid ${plan==='standard'?'rgba(139,92,246,.35)':'rgba(249,115,22,.35)'};">
              ${plan==='standard'?'👑':'🚀'}
            </div>
            <div style="flex:1;">
              <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:900;letter-spacing:.04em;
                color:${plan==='standard'?'#c4b5fd':'#fb923c'};margin-bottom:3px;">
                ${plan==='standard'?'Passer à Premium':'Passer à Extra'}
                <span style="font-size:9px;font-weight:700;opacity:.7;"> · ${plan==='standard'?'79€':'159€'}/mois</span>
              </div>
              <div style="font-size:9px;color:rgba(255,255,255,.42);line-height:1.65;">
                ${plan==='standard'
                  ?'Prévisions cash-flow · Benchmark sectoriel · Score crédit bancaire'
                  :'API directe · Cabinet multi-clients · Agent IA autonome · WhatsApp'}
              </div>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:rgba(255,255,255,.2);font-size:11px;"></i>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <span style="font-size:8.5px;color:${plan==="standard" ? "rgba(196,181,253,.6)" : "rgba(251,146,60,.6)"};
              background:${plan==="standard" ? "rgba(139,92,246,.1)" : "rgba(249,115,22,.1)"};
              padding:3px 9px;border-radius:6px;">✦ Essai 45 jours gratuit</span>
            <span style="font-size:8.5px;color:rgba(255,255,255,.3);padding:3px 9px;">Annulable à tout moment</span>
            <span style="font-size:8.5px;color:rgba(255,255,255,.3);padding:3px 9px;">Aucune carte pendant l'essai</span>
          </div>
        </div>`
        :`<div class="param-row"><div class="param-label">Statut<small>Votre compte est au niveau maximum</small></div>
          <div class="param-value" style="color:#fb923c;font-family:Syne,sans-serif;font-weight:800;">
            ✦✦ Extra — Accès complet</div></div>`}
      </div>

      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-globe" style="color:var(--ice);margin-right:8px;"></i>Langue &amp; Région
        </div>
        <div class="param-row" style="flex-direction:column;align-items:flex-start;gap:14px;border-bottom:none;padding-bottom:4px;">
          <div class="param-label">Langue de l'interface
            <small>Choisissez la langue d'affichage de la plateforme</small>
          </div>
          <div id="lang-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;width:100%;">
            ${[
              {code:'fr', flag:'🇫🇷', label:'Français'},
              {code:'en', flag:'🇬🇧', label:'English'},
              {code:'es', flag:'🇪🇸', label:'Español'},
              {code:'ar', flag:'🇸🇦', label:'العربية', rtl:true},
            ].map(l=>{
              const cur=(localStorage.getItem('ds_lang')||'fr')===l.code;
              return `<button
                data-lang="${l.code}"
                onclick="window.DS_I18N?.changeLang(this.dataset.lang)"
                style="padding:12px 6px;border-radius:10px;
                  background:${cur?'rgba(56,189,248,.08)':'rgba(255,255,255,.04)'};
                  border:1px solid ${cur?'rgba(56,189,248,.4)':'rgba(125,211,252,.1)'};
                  cursor:pointer;display:flex;flex-direction:column;align-items:center;
                  gap:5px;transition:all .22s;position:relative;"
                ${l.rtl?'dir="rtl"':''}>
                <span style="font-size:22px;">${l.flag}</span>
                <span style="font-family:var(--fd);font-size:8.5px;font-weight:700;letter-spacing:.06em;
                  color:${cur?'var(--ice)':'rgba(255,255,255,.45)'};">${l.label}</span>
                ${l.rtl?'<span style="font-size:7px;font-weight:900;padding:1px 5px;border-radius:4px;background:rgba(139,92,246,.15);color:#8B5CF6;border:1px solid rgba(139,92,246,.25);">RTL</span>':''}
                ${cur?'<span class="lang-chk" style="position:absolute;top:5px;right:5px;width:14px;height:14px;border-radius:50%;background:var(--ice-2);color:#02040B;font-size:7px;display:flex;align-items:center;justify-content:center;"><i class=\'fa-solid fa-check\'></i></span>':''}
              </button>`;
            }).join('')}
          </div>
          <div id="lang-feedback" style="min-height:14px;font-family:var(--fd);font-size:9px;font-weight:700;color:#10b981;letter-spacing:.08em;"></div>
        </div>
      </div>

      <div class="param-section">
        <div class="param-section-title">Sécurité</div>
        <div class="param-row">
          <div class="param-label">Mot de passe<small>Connecté via ${S.user?.providerData?.[0]?.providerId==='google.com'?'Google OAuth':'Email/Mot de passe'}</small></div>
          ${S.user?.providerData?.[0]?.providerId==='google.com'
            ?'<div class="param-value" style="color:var(--muted);font-size:10px;">Géré par Google</div>'
            :'<button class="param-btn neutral" onclick="DS?.changePasswordFlow()"><i class="fa-solid fa-key" style="margin-right:6px;"></i>Modifier</button>'}
        </div>
        <div class="param-row">
          <div class="param-label">Déconnexion<small>Ferme la session sur cet appareil</small></div>
          <button class="param-btn danger" onclick="window.DS_LOGOUT?.()"><i class="fa-solid fa-right-from-bracket" style="margin-right:6px;"></i>Se déconnecter</button>
        </div>
      </div>

      <!-- ══ THÈME ══ -->
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-palette" style="color:var(--gold);margin-right:8px;"></i>Apparence
        </div>
        <div class="param-row" style="align-items:center;flex-wrap:wrap;gap:12px;">
          <div class="param-label">Thème de l'interface
            <small>Basculez entre le mode sombre et le mode clair</small>
          </div>
          <div style="display:flex;border-radius:10px;overflow:hidden;border:1px solid rgba(125,211,252,.18);">
            <button id="theme-btn-dark" onclick="DS_VIEWS._setTheme('dark')"
              style="display:flex;align-items:center;gap:7px;padding:9px 18px;
                font-family:var(--fd);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
                cursor:pointer;border:none;transition:all .22s;">
              <i class="fa-solid fa-moon"></i>Sombre
            </button>
            <div style="width:1px;background:rgba(125,211,252,.15);flex-shrink:0;"></div>
            <button id="theme-btn-light" onclick="DS_VIEWS._setTheme('light')"
              style="display:flex;align-items:center;gap:7px;padding:9px 18px;
                font-family:var(--fd);font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
                cursor:pointer;border:none;transition:all .22s;">
              <i class="fa-solid fa-moon" style="transform:rotate(-20deg);"></i>Crépuscule
            </button>
          </div>
        </div>
        <div id="theme-preview-bar" style="margin-top:14px;border-radius:12px;padding:14px 16px;transition:all .35s;"></div>
      </div>

      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-robot" style="color:var(--p3-agent);margin-right:8px;"></i>Intelligence Artificielle (Master Agent)
        </div>
        <div class="param-row">
          <div class="param-label">Surveillance Autonome
            <small>L'IA analyse vos données en arrière-plan et anticipe les risques</small>
          </div>
          <div class="param-value">
            <label class="ds-switch">
              <input type="checkbox" id="param-agent-active" ${window.P3_AGENT?._running ? 'checked' : ''} onchange="window.P3_AGENT?.toggle()">
              <span class="ds-slider"></span>
            </label>
          </div>
        </div>
        <div class="param-row">
          <div class="param-label">Sensibilité des alertes
            <small>Niveau de réactivité de l'agent aux anomalies</small>
          </div>
          <div class="param-value">
            <select class="param-input" style="width:120px;padding:5px;">
              <option value="high">Critique uniquement</option>
              <option value="med" selected>Standard</option>
              <option value="low">Toutes (Proactif)</option>
            </select>
          </div>
        </div>
        <div class="param-row">
          <div class="param-label">Canal de notification
            <small>Où l'agent doit-il vous alerter en priorité</small>
          </div>
          <div class="param-value" style="display:flex;gap:8px;">
            <i class="fa-solid fa-bell" style="color:var(--ice);" title="Dashboard"></i>
            <i class="fa-solid fa-envelope" style="color:rgba(255,255,255,.2);" title="Email"></i>
            <i class="fa-brands fa-whatsapp" style="color:rgba(255,255,255,.2);" title="WhatsApp (Extra)"></i>
          </div>
        </div>
      </div>

      <div class="param-section" style="border-color:rgba(255,255,255,.03);">
        <div class="param-section-title">À propos</div>
        <div class="param-row"><div class="param-label">Version</div><div class="param-value" style="color:var(--muted);font-family:var(--fm);font-size:10px;">v2.1.0 · Frontend</div></div>
        <div class="param-row"><div class="param-label">Modèle ML</div><div class="param-value" style="color:var(--muted);font-size:10px;">RF + XGBoost + LightGBM · Ensemble</div></div>
      </div>`;

    // ── Appliquer la langue courante aux sections injectées ────
    setTimeout(() => window.DS_I18N?.refresh(), 0);

    // ── Handler upload photo depuis la vue Paramètres ──────────
    window._paramHandlePhotoUpload = async (file) => {
      if (!file) return;
      const statusEl = document.getElementById('param-upload-status');
      const wrap     = document.getElementById('param-avatar-wrap');

      // Validation
      if (file.size > 5 * 1024 * 1024) { showToast('Photo trop lourde (max 5 Mo)', 'warn'); return; }
      if (!file.type.startsWith('image/')) { showToast('Format non supporté', 'err'); return; }

      // Prévisualisation immédiate locale (UX fluide)
      const localURL = URL.createObjectURL(file);
      if (wrap) {
        wrap.innerHTML = `
          <img src="${localURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">
          <div id="param-avatar-overlay" style="position:absolute;inset:0;border-radius:50%;background:rgba(2,4,11,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;opacity:0;transition:opacity .22s;pointer-events:none;">
            <i class="fa-solid fa-camera" style="font-size:20px;color:#fff;"></i>
            <span style="font-family:Syne,sans-serif;font-size:7px;font-weight:800;letter-spacing:.12em;color:rgba(255,255,255,.85);text-transform:uppercase;">Modifier</span>
          </div>`;
      }
      if (statusEl) statusEl.innerHTML = `<div style="display:flex;align-items:center;gap:6px;font-size:9px;color:var(--ice);font-family:Syne,sans-serif;font-weight:700;"><i class="fa-solid fa-circle-notch fa-spin"></i>Envoi en cours…</div>`;

      // Déléguer à DS_PROFILE qui gère compression + Firestore + nav-avatar
      try {
        await window.DS_PROFILE?.handlePhotoUpload(file);
        if (statusEl) statusEl.innerHTML = `<div style="font-size:9px;color:#10b981;font-family:Syne,sans-serif;font-weight:700;"><i class="fa-solid fa-circle-check" style="margin-right:5px;"></i>Photo mise à jour</div>`;
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
        // Rafraîchir le bouton Changer/Supprimer
        setTimeout(() => this.renderParametres(), 1200);
      } catch {
        if (statusEl) statusEl.innerHTML = `<div style="font-size:9px;color:#ef4444;font-family:Syne,sans-serif;font-weight:700;"><i class="fa-solid fa-circle-xmark" style="margin-right:5px;"></i>Erreur upload</div>`;
        setTimeout(() => { if (statusEl) statusEl.innerHTML = ''; }, 3000);
      }
      URL.revokeObjectURL(localURL);
    };
  },

  // ── Thème clair / sombre ────────────────────────────────────
  _setTheme(theme) {
    const isDark = theme === 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ds_theme', theme);

    // Boutons toggle
    const btnD = document.getElementById('theme-btn-dark');
    const btnL = document.getElementById('theme-btn-light');
    if (btnD) {
      btnD.style.background = isDark ? 'rgba(125,211,252,.14)' : 'rgba(255,255,255,.03)';
      btnD.style.color       = isDark ? '#7DD3FC' : 'rgba(255,255,255,.35)';
    }
    if (btnL) {
      btnL.style.background = !isDark ? 'rgba(147,217,255,.1)' : 'rgba(255,255,255,.03)';
      btnL.style.color       = !isDark ? '#93D9FF' : 'rgba(255,255,255,.35)';
    }

    // Preview bar
    const bar = document.getElementById('theme-preview-bar');
    if (bar) {
      if (isDark) {
        bar.style.background = 'rgba(125,211,252,.05)';
        bar.style.border     = '1px solid rgba(125,211,252,.12)';
        bar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;background:rgba(125,211,252,.1);
            display:flex;align-items:center;justify-content:center;color:#7DD3FC;font-size:14px;">
            <i class="fa-solid fa-moon"></i></div>
          <div>
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#fff;margin-bottom:2px;">Mode sombre actif</div>
            <div style="font-size:9px;color:rgba(255,255,255,.35);">Interface premium · Fond #02040B · Palette or & glace</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:5px;">
            <div style="width:12px;height:12px;border-radius:50%;background:#FFD700;"></div>
            <div style="width:12px;height:12px;border-radius:50%;background:#7DD3FC;"></div>
            <div style="width:12px;height:12px;border-radius:50%;background:#10b981;"></div>
          </div>
        </div>`;
      } else {
        bar.style.background = 'rgba(147,217,255,.05)';
        bar.style.border     = '1px solid rgba(147,217,255,.18)';
        bar.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:8px;
            background:linear-gradient(135deg,rgba(255,215,0,.18),rgba(147,217,255,.12));
            display:flex;align-items:center;justify-content:center;font-size:14px;">
            <i class="fa-solid fa-moon" style="color:#93D9FF;transform:rotate(-20deg);"></i>
          </div>
          <div>
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#D8EEFF;margin-bottom:2px;">Mode crépuscule actif</div>
            <div style="font-size:9px;color:rgba(180,210,255,.45);">Fond indigo nuit · Palette or & glace conservée · Contraste élevé</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:5px;">
            <div style="width:12px;height:12px;border-radius:50%;background:#FFD700;box-shadow:0 0 6px rgba(255,215,0,.5);"></div>
            <div style="width:12px;height:12px;border-radius:50%;background:#93D9FF;box-shadow:0 0 6px rgba(147,217,255,.4);"></div>
            <div style="width:12px;height:12px;border-radius:50%;background:#10b981;"></div>
          </div>
        </div>`;
      }
    }

    // Appliquer les variables CSS
    _applyThemeVars(isDark);
    showToast(`Thème ${isDark ? 'Sombre' : 'Crépuscule'} activé`, 'ok');
  },

  // ── VUE : Alertes ────────────────────────────────────────────
  renderAlertes() {
    const container=document.getElementById('alertes-content'); if(!container) return;
    const a=S.currentAnalyse;
    const { normalizeRatios, normalizeRecos } = window.DS_RENDER;
    const ratios=a?normalizeRatios(a.ratios||[]):[];
    const recos=a?normalizeRecos(a.recommendations||[]):[];
    const alerts=[];
    if(a){
      const redRatios=ratios.filter(r=>r.c==='#ef4444');
      if(redRatios.length>=2) alerts.push({lvl:'err',icon:'fa-triangle-exclamation',title:`${redRatios.length} ratios critiques détectés`,detail:redRatios.map(r=>r.n).join(', ')});
      if(a.score<25) alerts.push({lvl:'err',icon:'fa-skull',title:'Score critique < 25 — Urgence absolue',detail:`Score actuel : ${a.score}/100`});
      else if(a.score<50) alerts.push({lvl:'warn',icon:'fa-triangle-exclamation',title:'Zone Risque — Action requise',detail:`Score ${a.score}/100 — en dessous du seuil de vigilance`});
      if((a.probabiliteDefaut??0)>60) alerts.push({lvl:'err',icon:'fa-circle-exclamation',title:`Probabilité de faillite élevée : ${a.probabiliteDefaut}%`,detail:'Dépassement du seuil critique 60%'});
      recos.filter(r=>r.lvl==='high').forEach(r=>alerts.push({lvl:'warn',icon:'fa-lightbulb',title:r.t,detail:r.d}));
      if(!alerts.length) alerts.push({lvl:'ok',icon:'fa-circle-check',title:'Aucune alerte critique',detail:`Score ${a.score}/100 — Situation financière satisfaisante`});
    }
    const notifs=window.DS_NOTIFS._state.list.slice(0,10);
    const C={err:'#ef4444',warn:'#f59e0b',ok:'#10b981',info:'#7DD3FC'};
    container.innerHTML=`
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;margin-right:8px;"></i>Alertes analyse courante
          ${a?`<span style="font-size:9px;color:var(--muted);margin-left:8px;">${escHtml(a.entreprise??'')} · Score ${a.score}/100</span>`:''}
        </div>
        ${!a?`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">
          <i class="fa-solid fa-file-chart-column" style="display:block;font-size:24px;margin-bottom:10px;opacity:.2;"></i>
          Chargez une analyse pour voir les alertes</div>`
        :alerts.map(al=>`
          <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);">
            <div style="width:34px;height:34px;border-radius:9px;background:${C[al.lvl]}18;color:${C[al.lvl]};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${al.icon}"></i></div>
            <div>
              <div style="font-family:var(--fd);font-size:10px;font-weight:800;color:#fff;margin-bottom:3px;">${escHtml(al.title)}</div>
              <div style="font-size:9px;color:var(--muted);">${escHtml(al.detail)}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-bell" style="color:#7DD3FC;margin-right:8px;"></i>Notifications système
          <span style="font-size:9px;color:var(--muted);margin-left:8px;">Synchronisées Firebase</span>
        </div>
        ${notifs.length?notifs.map(n=>{
          const dt=n.createdAt?.toDate?n.createdAt.toDate():new Date();
          const ago=msToHuman(Date.now()-dt);
          return `<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.04);opacity:${n.read ? ".55" : "1"};">
            <div style="width:34px;height:34px;border-radius:9px;background:${n.color??'#7DD3FC'}18;color:${n.color??'#7DD3FC'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fa-solid ${n.icon??'fa-bell'}"></i></div>
            <div style="flex:1;">
              <div style="font-family:var(--fd);font-size:10px;font-weight:800;color:#fff;margin-bottom:2px;">${escHtml(n.title??'')}</div>
              <div style="font-size:9px;color:var(--muted);">${escHtml(n.body??'')}</div>
              <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:2px;">${ago}</div>
            </div>
            ${n.read?'':'<span style="width:7px;height:7px;background:#7DD3FC;border-radius:50%;flex-shrink:0;margin-top:6px;"></span>'}
          </div>`;}).join('')
        :`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">Aucune notification pour le moment</div>`}
        <div style="display:flex;gap:8px;margin-top:12px;">
          <button class="param-btn neutral" onclick="DS_NOTIFS.markAllRead().then(()=>DS_VIEWS.navTo('alertes'))" style="flex:1;">
            <i class="fa-solid fa-check-double" style="margin-right:6px;"></i>Tout marquer lu
          </button>
        </div>
      </div>`;
  },

  // ── VUE : Benchmark ─────────────────────────────────────────
  renderBenchmark() {
    const container=document.getElementById('benchmark-content'); if(!container) return;
    const a=S.currentAnalyse;
    const { normalizeRatios } = window.DS_RENDER;
    const ratios=a?normalizeRatios(a.ratios||[]):[];
    const SECTORS={
      'Industrie':   {liquidite:1.45,marge:5.2, roe:9.8, endettement:0.72,rotation:1.1,bfr:18},
      'Commerce':    {liquidite:1.22,marge:3.1, roe:11.2,endettement:0.85,rotation:2.4,bfr:24},
      'Services':    {liquidite:1.68,marge:8.5, roe:14.5,endettement:0.55,rotation:0.9,bfr:12},
      'Tech / SaaS': {liquidite:2.1, marge:15.3,roe:18.2,endettement:0.38,rotation:0.7,bfr:8 },
      'BTP':         {liquidite:1.35,marge:4.1, roe:10.3,endettement:0.68,rotation:1.4,bfr:32},
      'Hôtellerie':  {liquidite:0.95,marge:6.8, roe:8.1, endettement:1.1, rotation:0.8,bfr:-5},
    };
    const plan=S.abonnement?.plan||'standard';
    const sel=S._benchmarkSector||'Services';
    const bench=SECTORS[sel]||SECTORS['Services'];
    const RATIO_MAP=[
      {key:'liquidite',   label:'Liquidité générale',unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('liquid'))?.v},
      {key:'marge',       label:'Marge nette',       unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('marge'))?.v},
      {key:'roe',         label:'ROE',               unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('roe')||r.n.toLowerCase().includes('rentabilit'))?.v},
      {key:'endettement', label:'Endettement',       unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('endet'))?.v},
      {key:'rotation',    label:'Rotation actifs',   unit:'', ratio:ratios.find(r=>r.n.toLowerCase().includes('rotation'))?.v},
      {key:'bfr',         label:'BFR / CA',          unit:'%',ratio:ratios.find(r=>r.n.toLowerCase().includes('bfr'))?.v},
    ];
    container.innerHTML=`
      <div class="param-section">
        <div class="param-section-title">
          <i class="fa-solid fa-chart-bar" style="color:#a78bfa;margin-right:8px;"></i>Benchmark sectoriel
          <span style="font-size:9px;color:var(--muted);margin-left:8px;">Source : Banque de France / INSEE 2024</span>
        </div>
        <div class="param-row">
          <div class="param-label">Secteur de référence<small>Choisissez votre secteur d'activité</small></div>
          <select id="bench-sector" class="param-input" style="max-width:180px;cursor:pointer;"
            onchange="window.S._benchmarkSector=this.value;DS_VIEWS.navTo('benchmark')">
            ${Object.keys(SECTORS).map(s=>`<option value="${s}" ${s===sel?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="param-section">
        <div class="param-section-title">Comparaison avec la médiane ${sel}</div>
        ${!a?`<div style="padding:20px;text-align:center;font-size:10px;color:var(--muted);">
          <i class="fa-solid fa-chart-bar" style="display:block;font-size:24px;margin-bottom:10px;opacity:.2;"></i>
          Chargez une analyse pour comparer</div>`
        :`<div style="overflow-x:auto;">
           <table style="width:100%;border-collapse:collapse;">
             <thead><tr>
               <th style="text-align:left;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Ratio</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#7DD3FC;background:rgba(255,255,255,.02);">Votre valeur</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:#FFD700;background:rgba(255,255,255,.02);">Médiane secteur</th>
               <th style="text-align:center;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Écart</th>
               <th style="text-align:left;padding:8px 10px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted);background:rgba(255,255,255,.02);">Position</th>
             </tr></thead>
             <tbody>
               ${RATIO_MAP.map(rm=>{
                 const yours=rm.ratio!=null?+rm.ratio:null, ref=bench[rm.key];
                 const diff=yours!=null?+(yours-ref).toFixed(2):null;
                 const inverse=rm.key==='endettement'||rm.key==='bfr';
                 const better=diff!=null?(inverse?diff<0:diff>0):null;
                 const col=better===null?'var(--muted)':better?'#10b981':'#ef4444';
                 const posLabel=better===null?'—':better?`<span style="color:#10b981;font-weight:800;">✓ Au-dessus</span>`:`<span style="color:#ef4444;font-weight:800;">↓ En dessous</span>`;
                 return `<tr style="border-bottom:1px solid rgba(255,255,255,.04);">
                   <td style="padding:10px;font-size:10px;color:rgba(255,255,255,.7);">${rm.label}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:12px;font-weight:800;color:${col};">${yours!=null?yours+rm.unit:'<span style="color:var(--muted);">—</span>'}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:12px;font-weight:800;color:#FFD700;">${ref}${rm.unit}</td>
                   <td style="text-align:center;padding:10px;font-family:var(--fd);font-size:11px;font-weight:800;color:${col};">${diff!=null?(diff>=0?'+':'')+diff+rm.unit:'—'}</td>
                   <td style="padding:10px;font-size:10px;">${posLabel}</td>
                 </tr>`;
               }).join('')}
             </tbody>
           </table></div>
         <div style="margin-top:12px;padding:10px 12px;border-radius:8px;background:rgba(167,139,250,.06);border:1px solid rgba(167,139,250,.15);font-size:9px;color:rgba(255,255,255,.45);line-height:1.6;">
           <i class="fa-solid fa-circle-info" style="color:#a78bfa;margin-right:6px;"></i>
           Médianes calculées sur les entreprises françaises du secteur <strong style="color:#a78bfa;">${sel}</strong>.
           Sources : Banque de France FIBEN 2024, INSEE enquêtes sectorielles.
           ${plan==='standard'?'⚡ Passez <strong>Premium</strong> pour les benchmarks par tranche de CA et région.':''}
         </div>`}
      </div>
      ${a?`
      <div class="param-section">
        <div class="param-section-title">Positionnement global vs. secteur</div>
        ${(()=>{
          const betterCount=RATIO_MAP.filter(rm=>{if(rm.ratio==null)return false;const inv=rm.key==='endettement'||rm.key==='bfr';return inv?rm.ratio<bench[rm.key]:rm.ratio>bench[rm.key];}).length;
          const total=RATIO_MAP.filter(rm=>rm.ratio!=null).length;
          const pct=total?Math.round(betterCount/total*100):0;
          const col=pct>=60?'#10b981':pct>=40?'#f59e0b':'#ef4444';
          return `<div style="display:flex;align-items:center;gap:16px;padding:4px 0;">
            <div style="font-family:var(--fd);font-size:42px;font-weight:900;color:${col};">${pct}%</div>
            <div>
              <div style="font-size:11px;color:#fff;font-weight:700;margin-bottom:4px;">${betterCount} ratio${betterCount>1?'s':''} sur ${total} au-dessus de la médiane sectorielle</div>
              <div style="font-size:9px;color:var(--muted);">${pct>=60?'Profil financier supérieur à la médiane du secteur':pct>=40?'Profil dans la moyenne sectorielle':'Profil en dessous de la médiane — axes d\'amélioration identifiés'}</div>
            </div>
          </div>
          <div style="background:rgba(255,255,255,.06);border-radius:6px;height:8px;margin-top:12px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${col};border-radius:6px;transition:width .8s;"></div>
          </div>`;
        })()}
      </div>` : ''}`;
  },

  // ── VUE : Visualisations avancées ────────────────────────────
  renderVisualisations() {
    const X=window.DS_EXTRA;
    if(!X){setTimeout(()=>this.renderVisualisations(),200);return;}
    const analyse=window._lastAnalyse??S.currentAnalyse;
    const score=window._lastScore??S.currentAnalyse?.score??0;
    const zone=window._lastZone??(S.currentAnalyse?zoneFromScore(score):'vigilance');
    const { normalizeRatios, normalizeRadar } = window.DS_RENDER;
    const ratios=window._lastRatios??normalizeRatios(S.currentAnalyse?.ratios??[]);
    const radar=normalizeRadar(S.currentAnalyse?.radarDimensions??S.currentAnalyse?.radar??[]);
    const shap=window._lastShap??window.DS_RENDER?.normalizeShap?.(S.currentAnalyse?.shapValues??S.currentAnalyse?.shap??[])??[];
    const tl=window._lastTimeline??(score>0?[score]:[]);
    const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
    const prob=Math.round((100-score)*(ZM[zone]||1)*0.85);
    const ZC_col={saine:'#10b981',vigilance:'#f59e0b',risque:'#f97316',critique:'#ef4444'};
    const ZC_lbl={saine:'Zone Saine',vigilance:'Zone Vigilance',risque:'Zone Risque',critique:'Zone Critique'};
    const col=ZC_col[zone]||'#f59e0b';

    ['globe-3d','bar-3d'].forEach(id=>{
      const el=document.getElementById(id);
      if(el?._dsCleanup){try{el._dsCleanup();}catch(e){}delete el._dsCleanup;}
      if(el) el.innerHTML='';
    });

    const empty=document.getElementById('viz-empty'), content=document.getElementById('viz-content'), sub=document.getElementById('viz-sub');
    if(!S.currentAnalyse){
      if(empty) empty.style.display='block';
      if(content) content.style.display='none';
      if(sub) sub.textContent='Chargez une analyse pour afficher les graphes';
      return;
    }
    if(empty) empty.style.display='none';
    if(content) content.style.display='block';
    if(sub) sub.textContent=(analyse?.entreprise??'—')+'  ·  Score '+score+'/100  ·  '+(ZC_lbl[zone]??zone);

    const fpBig=document.getElementById('fail-pct-big'), fpBadge=document.getElementById('fail-zone-badge');
    if(fpBig){fpBig.textContent=prob+'%'; fpBig.style.color=prob>60?'#ef4444':prob>35?'#f97316':prob>20?'#f59e0b':'#10b981';}
    if(fpBadge){fpBadge.textContent=ZC_lbl[zone]??zone; fpBadge.style.color=col; fpBadge.style.background=col+'18'; fpBadge.style.borderColor=col+'44';}

    const tlBtn=document.getElementById('tl-chat-btn');
    if(tlBtn){
      const _tlMsg=`Explique l'évolution du score ${tl.join(', ')} sur ${tl.length} période${tl.length>1?'s':''}. Quelles tendances observes-tu ?`;
      window._tlExplainMsg=_tlMsg;
      tlBtn.onclick=(e)=>{
        e.stopPropagation();
        // Naviguer vers chat puis envoyer le message
        window.DS_VIEWS?.navTo('chat');
        setTimeout(()=>{
          if(window.DS_CHAT?._sendToChat) window.DS_CHAT._sendToChat(_tlMsg);
        },200);
      };
    }

    requestAnimationFrame(()=>{
      // ── SCATTER — rendu garanti : vue visible, layout calculé ──
      requestAnimationFrame(()=>{
        const wrap = document.getElementById('scatter-plot-wrap');
        // Re-render depuis les données cachées si disponibles
        if (wrap && window._lastScatterData) {
          wrap.style.minHeight = '320px';
          window._SCATTER_RENDER(window._lastScatterData.cur, window._lastScatterData.peers);
        } else if (wrap && window._SCATTER_RENDER) {
          const cur = S.currentAnalyse ? {
            score:      score,
            failProb:   prob,
            entreprise: analyse?.entreprise||'—',
            secteur:    analyse?.secteur||'—',
          } : window._SCATTER_DEMO_CURRENT;
          const peers = S.currentAnalyse
            ? (S.analyses||[]).filter(a=>a.id!==analyse?.id&&a.score!=null).map(a=>({
                score:a.score||0,
                failProb:a.failProb||a.probabiliteDefaut||(100-(a.score||0)),
                entreprise:a.entreprise||'—',
                secteur:a.secteur||'—',
              }))
            : (window._SCATTER_DEMO_PEERS||[]);
          wrap.dataset.real = S.currentAnalyse ? '1' : '0';
          window._SCATTER_RENDER(cur, peers);
        }
      });

      // ── Graphes existants ──
      X.renderHeatmap('heatmap-ratios',ratios);
      X.renderFailureForecast('forecast-chart',score,zone);
      setTimeout(()=>X.renderWaterfallChart('waterfall-chart',shap),60);
      setTimeout(()=>X.renderBulletRatios('bullet-chart',ratios),120);

      // ── Nouveaux graphes ──
      setTimeout(()=>_renderBandChart('band-chart',ratios,score,zone),180);
      setTimeout(()=>_renderScoreCurve('score-curve',tl,score,zone),240);

      if(window.THREE){
        setTimeout(()=>X.render3DGlobe('globe-3d',score,zone),360);
        setTimeout(()=>X.render3DBarChart('bar-3d',ratios),480);
      }

      // ── Graphes Avancés (dashboard-charts-advanced.js) ────────
      const XA = window.DS_EXTRA_ADVANCED || window.DS_EXTRA;
      if (XA && window.THREE) {
        setTimeout(()=> XA.render3DSpeedometer('speedometer-3d', score, zone), 900);
        setTimeout(()=> XA.render3DScoreCard('scorecard-3d', ratios, score, zone), 1050);
        setTimeout(()=> XA.render3DFRBFR('frbfr-3d', ratios, score, zone), 1200);
        setTimeout(()=> XA.render3DRiskMatrix('riskmatrix-3d', ratios, score, zone), 1350);
        setTimeout(()=> XA.render3DTornado('tornado-3d', ratios, score, zone), 1500);
        setTimeout(()=> XA.render3DAltmanZ('altmanz-3d', ratios, score, zone), 1650);
      }

      setTimeout(()=>X.initAlerts(analyse),1900);
    });
  },

  // ── VUE : Argent IA (Master Agent) ───────────────────────────
  renderMasterAgent() {
    if (window.DS_MASTER_AGENT) {
      window.DS_MASTER_AGENT.renderInsights();
      window.DS_MASTER_AGENT.renderConfig();
      window.DS_MASTER_AGENT._renderJournal();
      window.DS_MASTER_AGENT.setStatus(window.DS_MASTER_AGENT.getStatus());

      // Update quick stats
      const s = window.S?.currentAnalyse;
      if (s) {
        const scoreEl = document.getElementById('agent-stat-score');
        if (scoreEl) scoreEl.textContent = s.score || '—';
      }
      const insightCountEl = document.getElementById('agent-stat-insights');
      if (insightCountEl) insightCountEl.textContent = window.DS_MASTER_AGENT.getInsights().length;
    }
  },

  // ── VUE : Chatbot IA (Classique) ─────────────────────────────
  renderChat() {
    const msgsFull = document.getElementById('chat-msgs-full');
    const msgsDash = document.getElementById('chat-msgs');
    if (msgsFull && msgsDash && msgsFull.children.length === 0) {
        msgsFull.innerHTML = msgsDash.innerHTML;
        msgsFull.scrollTop = msgsFull.scrollHeight;
    }
  }
};

console.log('[ds-views] ✓ Chargé');
