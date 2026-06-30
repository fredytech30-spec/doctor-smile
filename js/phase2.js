// ════════════════════════════════════════════════════════════════
//  phase2.js — Doctor Smile · Phase 2
//  Palette harmonisée avec le design system (violet/cyan/amber)
//  Toutes les couleurs inline remplacées par des variables CSS.
// ════════════════════════════════════════════════════════════════

// ── CSS Phase 2 ───────────────────────────────────────────────
(function _injectP2CSS() {
  if (document.getElementById('_p2_css')) return;
  const st = document.createElement('style');
  st.id = '_p2_css';
  st.textContent = `

/* ══ Variables communes Phase 2 (utilisent les variables globales) ══ */
:root {
  /* Aliases locaux pour lisibilité, tous basés sur les variables globales */
  --p2-teal:   var(--color-success);        /* #10b981 → teal */
  --p2-amber:  var(--color-accent);         /* #F59E0B */
  --p2-violet: var(--violet);               /* #8B7FF0 → violet */
  --p2-rose:   var(--color-error);          /* #F43F5E → rouge */
  --p2-gold:   var(--color-accent);         /* #FFD700 → accent */
  --p2-ice:    var(--color-primary-dark);    /* #8B7FF0 → cyan */
  --p2-card:   var(--bg-elevated);
  --p2-border: var(--border-v);
  --p2-surf:   var(--surface-2);
}

/* ══ Nav items Phase 2 ═════════════════════════════════════════ */
.p2-nav-item {
  width:44px;height:44px;border-radius:11px;display:flex;align-items:center;
  justify-content:center;cursor:pointer;font-size:16px;color:var(--text-muted);
  transition:all .2s;position:relative;
}
.p2-nav-item:hover { color:var(--p2-ice);background:var(--violet-hover); }
.p2-nav-item.active { color:var(--p2-gold);background:var(--accent-bg); }
.p2-nav-item .nav-tip {
  position:absolute;left:calc(100% + 10px);background:var(--p2-card);
  border:1px solid var(--p2-border);border-radius:8px;padding:5px 10px;
  font-family:'Syne',sans-serif;font-size:9px;font-weight:700;white-space:nowrap;
  color:var(--text);opacity:0;transform:translateX(-6px);transition:all .18s;
  pointer-events:none;z-index:100;
}
.p2-nav-item:hover .nav-tip { opacity:1;transform:translateX(0); }

/* ══ Vues Phase 2 ══════════════════════════════════════════════ */
.p2-view {
  padding:28px 32px;overflow-y:auto;height:100%;
}
.p2-view-header {
  display:flex;align-items:flex-start;justify-content:space-between;
  margin-bottom:24px;flex-wrap:wrap;gap:12px;
}
.p2-view-title {
  font-family:'Syne',sans-serif;font-size:clamp(18px,1.6vw,26px);
  font-weight:900;letter-spacing:-.02em;color:var(--text);
}
.p2-view-title .g { background: linear-gradient(135deg, var(--violet-3), var(--cyan-2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.p2-view-sub { font-size:10px;color:var(--text-hint);margin-top:3px; }

/* ══ Cards génériques ══════════════════════════════════════════ */
.p2-card {
  background:var(--p2-card);border:1px solid var(--p2-border);
  border-radius:16px;padding:20px 22px;position:relative;overflow:hidden;
}
.p2-card::before {
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,var(--violet-border),transparent);
}
.p2-card-title {
  font-family:'Syne',sans-serif;font-size:10px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;color:var(--text-hint);
  margin-bottom:14px;display:flex;align-items:center;gap:8px;
}
.p2-card-title i { font-size:11px; }
.p2-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:14px; }
.p2-grid-3 { display:grid;grid-template-columns:repeat(3,1fr);gap:14px; }
.p2-grid-4 { display:grid;grid-template-columns:repeat(4,1fr);gap:12px; }
@media(max-width:1100px) { .p2-grid-4{grid-template-columns:repeat(2,1fr);}
  .p2-grid-3{grid-template-columns:1fr 1fr;} }
@media(max-width:800px) { .p2-grid-2,.p2-grid-3,.p2-grid-4{grid-template-columns:1fr;} }

/* ══ KPI mini ══════════════════════════════════════════════════ */
.p2-kpi {
  background:var(--p2-surf);border:1px solid var(--p2-border);
  border-radius:12px;padding:14px 16px;
}
.p2-kpi-val {
  font-family:'Syne',sans-serif;font-size:clamp(18px,1.5vw,26px);
  font-weight:900;letter-spacing:-.03em;color:var(--text);
}
.p2-kpi-lbl {
  font-size:9px;color:var(--text-hint);letter-spacing:.05em;
  text-transform:uppercase;margin-top:4px;
}
.p2-kpi-trend {
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  padding:2px 7px;border-radius:100px;margin-top:6px;display:inline-block;
}
.p2-kpi-up { background:var(--success-bg);color:var(--color-success); }
.p2-kpi-dn { background:var(--error-bg);color:var(--color-error); }
.p2-kpi-flat { background:rgba(255,255,255,.06);color:var(--text-hint); }

/* ══ Boutons ═══════════════════════════════════════════════════ */
.p2-btn {
  padding:9px 18px;border-radius:10px;font-family:'Syne',sans-serif;
  font-size:9px;font-weight:800;letter-spacing:.07em;cursor:pointer;
  transition:all .18s;border:1px solid transparent;display:inline-flex;
  align-items:center;gap:6px;white-space:nowrap;
}
.p2-btn-primary { background:var(--success-bg);border-color:var(--success-border);color:var(--color-success); }
.p2-btn-primary:hover { background:rgba(16,185,129,.2);transform:translateY(-1px); }
.p2-btn-gold { background:var(--accent-bg);border-color:var(--accent-border);color:var(--color-accent); }
.p2-btn-gold:hover { background:rgba(245,158,11,.2); }
.p2-btn-violet { background:var(--violet-bg);border-color:var(--violet-border);color:var(--violet-3); }
.p2-btn-violet:hover { background:var(--violet-hover); }
.p2-btn-neutral { background:rgba(255,255,255,.04);border-color:var(--border);color:var(--text-2); }
.p2-btn-neutral:hover { background:rgba(255,255,255,.1);color:var(--text); }
.p2-btn-danger { background:var(--error-bg);border-color:var(--error-border);color:var(--color-error); }

/* ══ Tags / Badges ══════════════════════════════════════════════ */
.p2-badge {
  display:inline-flex;align-items:center;gap:4px;padding:3px 9px;
  border-radius:100px;font-family:'Syne',sans-serif;font-size:7.5px;
  font-weight:800;letter-spacing:.08em;text-transform:uppercase;
}
.p2-badge-teal { background:var(--success-bg);border:1px solid var(--success-border);color:var(--color-success); }
.p2-badge-amber { background:var(--accent-bg);border:1px solid var(--accent-border);color:var(--color-accent); }
.p2-badge-rose { background:var(--error-bg);border:1px solid var(--error-border);color:var(--color-error); }
.p2-badge-violet { background:var(--violet-bg);border:1px solid var(--violet-border);color:var(--violet-3); }
.p2-badge-gold { background:var(--accent-bg);border:1px solid var(--accent-border);color:var(--color-accent); }

/* ══ ① PRÉVISION TRÉSORERIE ════════════════════════════════════ */
#p2-forecast-chart-wrap {
  position:relative;height:240px;margin:8px 0 16px;
}
#p2-forecast-svg { width:100%;height:100%; }
.p2-scenario-tab {
  padding:7px 16px;border-radius:9px;font-family:'Syne',sans-serif;
  font-size:9px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  border:1px solid transparent;transition:all .2s;
}
.p2-scenario-tab.active-opt  { background:var(--success-bg);border-color:var(--success-border);color:var(--color-success); }
.p2-scenario-tab.active-neu  { background:var(--violet-bg);border-color:var(--violet-border);color:var(--violet-3); }
.p2-scenario-tab.active-pes  { background:var(--error-bg);border-color:var(--error-border);color:var(--color-error); }
.p2-scenario-tab:not([class*="active"]) { background:rgba(255,255,255,.03);border-color:var(--border);color:var(--text-2); }
.p2-fc-month-row {
  display:grid;grid-template-columns:80px repeat(3,1fr);gap:1px;
  font-size:9px;border-bottom:1px solid var(--border);
  padding:7px 0;
}
.p2-fc-month-row:hover { background:rgba(255,255,255,.02); }
.p2-fc-month-row.header {
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.08em;color:var(--text-hint);text-transform:uppercase;
  padding-bottom:9px;border-bottom:1px solid var(--border);
}

/* ══ ② ALERTES PRÉCOCES ════════════════════════════════════════ */
.p2-alert-card {
  border-radius:13px;padding:16px 18px;margin-bottom:10px;
  display:flex;align-items:flex-start;gap:14px;
  border:1px solid transparent;transition:all .2s;
}
.p2-alert-card:hover { transform:translateY(-2px); }
.p2-alert-sev-3 { background:var(--error-bg);border-color:var(--error-border); }
.p2-alert-sev-2 { background:var(--accent-bg);border-color:var(--accent-border); }
.p2-alert-sev-1 { background:var(--success-bg);border-color:var(--success-border); }
.p2-alert-icon {
  width:36px;height:36px;border-radius:10px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:15px;
}
.p2-traj-bar {
  height:5px;border-radius:3px;overflow:hidden;
  background:rgba(255,255,255,.06);margin-top:6px;
}
.p2-traj-fill { height:100%;border-radius:3px;transition:width 1s ease; }

/* ══ ③ WORKSPACE CABINET ═══════════════════════════════════════ */
.p2-client-card {
  background:var(--p2-card);border:1px solid var(--p2-border);
  border-radius:13px;padding:16px 18px;cursor:pointer;
  transition:all .22s;position:relative;overflow:hidden;
}
.p2-client-card:hover {
  border-color:var(--violet-border);
  box-shadow:0 12px 40px rgba(0,0,0,.4);
  transform:translateY(-2px);
}
.p2-client-score {
  font-family:'Syne',sans-serif;font-size:28px;font-weight:900;
  line-height:1;letter-spacing:-.04em;
}
.p2-client-grid {
  display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
  gap:12px;
}
.p2-cabinet-stats {
  display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px;
}
@media(max-width:900px) { .p2-cabinet-stats{grid-template-columns:repeat(2,1fr);} }
.p2-stat-pill {
  background:var(--p2-surf);border:1px solid var(--p2-border);
  border-radius:12px;padding:14px;text-align:center;
}
.p2-stat-pill-val {
  font-family:'Syne',sans-serif;font-size:22px;font-weight:900;
  color:var(--text);letter-spacing:-.03em;
}
.p2-stat-pill-lbl {
  font-size:8.5px;color:var(--text-hint);margin-top:4px;
  letter-spacing:.06em;text-transform:uppercase;
}

/* ══ ④ SCORE CRÉDIT BANKABLE ═══════════════════════════════════ */
.p2-credit-score-ring {
  position:relative;display:flex;flex-direction:column;align-items:center;
}
.p2-credit-gauge {
  position:relative;width:180px;height:90px;overflow:hidden;
}
.p2-gauge-val {
  position:absolute;bottom:0;left:50%;transform:translateX(-50%);
  text-align:center;
}
.p2-credit-table {
  width:100%;border-collapse:collapse;font-size:10px;
}
.p2-credit-table th {
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.1em;color:var(--text-hint);text-transform:uppercase;
  padding:8px 12px;text-align:left;border-bottom:1px solid var(--border);
}
.p2-credit-table td {
  padding:10px 12px;border-bottom:1px solid var(--border);
  color:var(--text-2);
}
.p2-credit-table tr:hover td { background:rgba(255,255,255,.02); }
.p2-print-btn {
  position:fixed;bottom:28px;right:28px;z-index:7000;
  padding:12px 22px;border-radius:12px;
  background:linear-gradient(135deg,var(--violet-bg),var(--success-bg));
  border:1px solid var(--violet-border);color:var(--violet-3);
  font-family:'Syne',sans-serif;font-size:10px;font-weight:800;
  letter-spacing:.06em;cursor:pointer;transition:all .22s;
  display:none;align-items:center;gap:8px;
  box-shadow:0 8px 32px var(--violet-glow);
}
.p2-print-btn.show { display:flex; }
.p2-print-btn:hover { transform:translateY(-2px);box-shadow:0 16px 48px var(--violet-glow); }

/* ══ Animations ════════════════════════════════════════════════ */
@keyframes p2FadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.p2-fu { animation:p2FadeUp .4s cubic-bezier(.16,1,.3,1) both; }
.p2-fu:nth-child(1){animation-delay:.04s}.p2-fu:nth-child(2){animation-delay:.09s}
.p2-fu:nth-child(3){animation-delay:.14s}.p2-fu:nth-child(4){animation-delay:.19s}
.p2-fu:nth-child(5){animation-delay:.24s}.p2-fu:nth-child(6){animation-delay:.29s}

/* ══ Table de données ══════════════════════════════════════════ */
.p2-data-empty {
  text-align:center;padding:60px 20px;
  font-size:11px;color:var(--text-hint);
}
.p2-data-empty i {
  font-size:32px;display:block;margin-bottom:12px;opacity:.15;
}
  `;
  document.head.appendChild(st);
})();

// ════════════════════════════════════════════════════════════════
//  HELPERS PARTAGÉS
// ════════════════════════════════════════════════════════════════

const _p2API = window.API_BASE || 'http://127.0.0.1:8000';

async function _p2Post(path, body = {}) {
  const { fetchWithAuth } = await import('./utils.js');
  const r = await fetchWithAuth(`${_p2API}${path}`, {
    method: 'POST',
    body:   JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function _p2Get(path) {
  const { fetchWithAuth } = await import('./utils.js');
  const r = await fetchWithAuth(`${_p2API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function _p2fmt(n, dec = 0) {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function _p2fmtK(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' M FCFA';
  if (abs >= 1_000)     return (n / 1_000).toFixed(0) + ' k FCFA';
  return n + ' FCFA';
}

// ════════════════════════════════════════════════════════════════
//  ① PRÉVISION DE TRÉSORERIE IA — 12 mois · 3 scénarios
// ════════════════════════════════════════════════════════════════

const P2_FORECAST = (() => {

  let _scenario = 'neutral';
  let _data     = null;

  function _computeLocal(analyse) {
    const ratios  = analyse?.ratios || [];
    const score   = analyse?.score  || 50;

    const getRatio = (name) => ratios.find(r =>
      r.name?.toLowerCase().includes(name.toLowerCase()))?.value ?? null;

    const ca       = analyse?.chiffre_affaires || 5000;
    const treso    = getRatio('trésor') ?? getRatio('cash') ?? (ca * 0.08);
    const bfr_pct  = getRatio('bfr') ?? (ca * 0.15);
    const marge_net = getRatio('marge nette') ?? (score / 20);
    const couv_int  = getRatio('couverture') ?? 3.5;

    const caGrowth = {
      optimistic:  1.015,
      neutral:     1.005,
      pessimistic: 0.995,
    };

    const trGrowth = {
      optimistic:  1.01,
      neutral:     1.00,
      pessimistic: 0.97,
    };

    const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun',
                    'Jul','Aoû','Sep','Oct','Nov','Déc'];
    const now = new Date();

    return MONTHS.map((m, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const label = `${m} ${month.getFullYear().toString().slice(2)}`;

      const mkScenario = (key) => {
        const cgr = caGrowth[key]   ** (i + 1);
        const tgr = trGrowth[key]   ** (i + 1);
        const caM       = (ca / 12) * cgr;
        const chargesM  = caM * (1 - marge_net / 100) * 0.9;
        const cashflow  = (caM - chargesM) * (couv_int > 2 ? 1 : 0.7);
        const tresorie  = treso * tgr + cashflow * (i + 1) * 0.05;
        return {
          ca:       Math.round(caM),
          charges:  Math.round(chargesM),
          cashflow: Math.round(cashflow),
          tresorie: Math.round(tresorie),
        };
      };

      return {
        label,
        optimistic:  mkScenario('optimistic'),
        neutral:     mkScenario('neutral'),
        pessimistic: mkScenario('pessimistic'),
      };
    });
  }

  function _drawChart(months, key) {
    const svg = document.getElementById('p2-forecast-svg');
    if (!svg) return;

    const W = svg.clientWidth || 800;
    const H = svg.clientHeight || 220;
    const PAD = { t: 20, b: 36, l: 60, r: 20 };
    const cW = W - PAD.l - PAD.r;
    const cH = H - PAD.t - PAD.b;

    // Utiliser les variables CSS pour les couleurs des scénarios
    const cols = {
      optimistic:  'var(--color-success)',
      neutral:     'var(--violet-3)',
      pessimistic: 'var(--color-error)'
    };
    const col = cols[key] || 'var(--violet-3)';

    const vals = months.flatMap(m =>
      Object.keys(cols).map(s => m[s].tresorie)
    );
    const vMin = Math.min(...vals) * 0.9;
    const vMax = Math.max(...vals) * 1.1;
    const vRange = vMax - vMin || 1;

    const xOf = (i) => PAD.l + (i / (months.length - 1)) * cW;
    const yOf = (v) => PAD.t + cH - ((v - vMin) / vRange) * cH;

    const area = [
      ...months.map((m, i) => `${i===0?'M':'L'}${xOf(i)},${yOf(m.optimistic.tresorie)}`),
      ...months.slice().reverse().map((m, i, arr) => `L${xOf(arr.length-1-i)},${yOf(m.pessimistic.tresorie)}`),
      'Z'
    ].join(' ');

    const line = months.map((m, i) =>
      `${i===0?'M':'L'}${xOf(i)},${yOf(m[key].tresorie)}`
    ).join(' ');

    const labels = months.map((m, i) =>
      `<text x="${xOf(i)}" y="${H-8}" text-anchor="middle"
        font-family="'Syne',sans-serif" font-size="8"
        fill="var(--text-hint)">${m.label}</text>`
    ).join('');

    const yAxis = [0, 0.5, 1].map(f => {
      const v = vMin + f * vRange;
      const y = yOf(v);
      return `<text x="${PAD.l - 8}" y="${y + 4}" text-anchor="end"
        font-family="'Syne',sans-serif" font-size="8"
        fill="var(--text-hint)">${_p2fmtK(v)}</text>
        <line x1="${PAD.l}" y1="${y}" x2="${W - PAD.r}" y2="${y}"
          stroke="var(--border)" stroke-width="1"/>`;
    }).join('');

    const dots = months.map((m, i) => {
      const v = m[key].tresorie;
      const cx = xOf(i), cy = yOf(v);
      return `<circle cx="${cx}" cy="${cy}" r="3" fill="${col}" opacity=".9"/>`;
    }).join('');

    svg.innerHTML = `
      <defs>
        <linearGradient id="p2fg_${key}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${col}" stop-opacity=".15"/>
          <stop offset="100%" stop-color="${col}" stop-opacity=".01"/>
        </linearGradient>
        <filter id="p2glow"><feGaussianBlur stdDeviation="2" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${yAxis}
      <path d="${area}" fill="var(--violet-bg)" stroke="none"/>
      <path d="${line}" fill="none" stroke="${col}" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" filter="url(#p2glow)"/>
      ${dots}
      ${labels}
    `;
  }

  function _renderTable(months) {
    const wrap = document.getElementById('p2-forecast-table');
    if (!wrap) return;

    const COLS = {
      optimistic:  'var(--color-success)',
      neutral:     'var(--violet-3)',
      pessimistic: 'var(--color-error)'
    };

    wrap.innerHTML = `
      <div class="p2-fc-month-row header">
        <div>Mois</div>
        <div style="color:var(--color-success);">Optimiste</div>
        <div style="color:var(--violet-3);">Neutre</div>
        <div style="color:var(--color-error);">Pessimiste</div>
      </div>
      ${months.map(m => `
        <div class="p2-fc-month-row">
          <div style="font-family:'Syne',sans-serif;font-size:9px;font-weight:700;
            color:var(--text-2);">${m.label}</div>
          ${['optimistic','neutral','pessimistic'].map(s => `
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;
              color:${COLS[s]};font-weight:${_scenario===s?'700':'400'};">
              ${_p2fmtK(m[s].tresorie)}
              ${_scenario===s?`<span style="font-size:7px;opacity:.5;"> tréso</span>`:''}
            </div>`).join('')}
        </div>`).join('')}
    `;
  }

  function _renderKPIs(months) {
    const m6  = months[5];
    const m12 = months[11];
    const s   = _scenario;

    const treso0  = _data[0][s].tresorie;
    const treso6  = m6[s].tresorie;
    const treso12 = m12[s].tresorie;

    const set = (id, v, trend) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = `
        <div class="p2-kpi-val">${_p2fmtK(v)}</div>
        <div class="p2-kpi-lbl">${el.dataset.lbl}</div>
        <div class="p2-kpi-trend ${trend > 0 ? 'p2-kpi-up' : trend < 0 ? 'p2-kpi-dn' : 'p2-kpi-flat'}">
          ${trend > 0 ? '▲' : trend < 0 ? '▼' : '→'} ${Math.abs(Math.round((trend-1)*100))}%
        </div>`;
    };
    set('p2-fc-kpi-0', treso6,  treso6 / treso0);
    set('p2-fc-kpi-1', treso12, treso12 / treso0);
    set('p2-fc-kpi-2', m12[s].cashflow, m12[s].cashflow / (m12.neutral.cashflow || 1));
  }

  function setScenario(s) {
    _scenario = s;
    ['optimistic','neutral','pessimistic'].forEach(k => {
      const btn = document.getElementById(`p2-sc-${k}`);
      if (btn) {
        btn.className = `p2-scenario-tab${_scenario === k ? ` active-${k.slice(0,3)}` : ''}`;
      }
    });
    if (_data) {
      _drawChart(_data, _scenario);
      _renderKPIs(_data);
    }
  }

  function render(container, analyse) {
    _data = _computeLocal(analyse || window.S?.currentAnalyse || {});

    container.innerHTML = `
      <div class="p2-view p2-fu">

        <div class="p2-view-header">
          <div>
            <div class="p2-view-title">Trésorerie <span class="g">IA</span></div>
            <div class="p2-view-sub">Projection 12 mois · 3 scénarios driver-based</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button id="p2-sc-optimistic" class="p2-scenario-tab"
              onclick="P2_FORECAST.setScenario('optimistic')">Optimiste</button>
            <button id="p2-sc-neutral" class="p2-scenario-tab active-neu"
              onclick="P2_FORECAST.setScenario('neutral')">Neutre</button>
            <button id="p2-sc-pessimistic" class="p2-scenario-tab"
              onclick="P2_FORECAST.setScenario('pessimistic')">Pessimiste</button>
          </div>
        </div>

        <!-- KPIs -->
        <div class="p2-grid-3" style="margin-bottom:16px;">
          ${[
            ['p2-fc-kpi-0','Trésorerie à 6 mois'],
            ['p2-fc-kpi-1','Trésorerie à 12 mois'],
            ['p2-fc-kpi-2','Cash-flow mensuel M12'],
          ].map(([id, lbl]) => `
            <div class="p2-kpi p2-fu">
              <div id="${id}" data-lbl="${lbl}">
                <div class="p2-kpi-val">—</div>
                <div class="p2-kpi-lbl">${lbl}</div>
              </div>
            </div>`).join('')}
        </div>

        <!-- Graphe -->
        <div class="p2-card p2-fu" style="margin-bottom:14px;">
          <div class="p2-card-title">
            <i class="fa-solid fa-chart-area" style="color:var(--color-success);"></i>
            Évolution de la trésorerie projetée
          </div>
          <div id="p2-forecast-chart-wrap">
            <svg id="p2-forecast-svg" viewBox="0 0 800 220" preserveAspectRatio="none"></svg>
          </div>
          <div style="display:flex;gap:18px;justify-content:center;margin-top:8px;">
            ${[['var(--color-success)','Optimiste'],['var(--violet-3)','Neutre'],['var(--color-error)','Pessimiste']].map(([c,l])=>`
              <div style="display:flex;align-items:center;gap:5px;font-size:9px;color:var(--text-2);">
                <span style="width:24px;height:2px;background:${c};border-radius:2px;display:inline-block;"></span>${l}
              </div>`).join('')}
          </div>
        </div>

        <!-- Tableau mensuel -->
        <div class="p2-card p2-fu">
          <div class="p2-card-title">
            <i class="fa-solid fa-table" style="color:var(--violet-3);"></i>
            Détail mensuel — trésorerie fin de mois
          </div>
          <div id="p2-forecast-table" style="overflow-x:auto;"></div>
        </div>

        <!-- Hypothèses -->
        <div class="p2-card p2-fu" style="margin-top:14px;">
          <div class="p2-card-title">
            <i class="fa-solid fa-sliders" style="color:var(--color-accent);"></i>
            Hypothèses du modèle
          </div>
          <div class="p2-grid-3" style="font-size:10px;color:var(--text-2);gap:8px;">
            ${[
              ['Croissance CA optimiste','+1.5%/mois'],
              ['Croissance CA neutre',   '+0.5%/mois'],
              ['Croissance CA pessimiste','-0.5%/mois'],
              ['Modèle',                 'Driver-based · Ratios actuels'],
              ['Horizon',                '12 mois glissants'],
              ['Source',                 'Ratios issus de l\'analyse ML'],
            ].map(([k,v])=>`
              <div style="background:var(--p2-surf);border:1px solid var(--p2-border);
                border-radius:9px;padding:10px 12px;">
                <div style="font-size:8px;color:var(--text-hint);margin-bottom:3px;
                  font-family:'Syne',sans-serif;font-weight:800;letter-spacing:.06em;">${k}</div>
                <div style="color:var(--text);font-weight:600;">${v}</div>
              </div>`).join('')}
          </div>
        </div>

      </div>`;

    requestAnimationFrame(() => {
      setScenario('neutral');
      _renderTable(_data);
    });
  }

  return { render, setScenario };
})();

window.P2_FORECAST = P2_FORECAST;


// ════════════════════════════════════════════════════════════════
//  ② DÉTECTION ALERTE PRÉCOCE — Trajectoire + signal faible
// ════════════════════════════════════════════════════════════════

const P2_ALERTS = (() => {

  function _computeAlerts(analyses) {
    if (!analyses?.length) return [];

    const sorted = [...analyses].sort((a, b) => {
      const ta = a.createdAt?.seconds || 0;
      const tb = b.createdAt?.seconds || 0;
      return ta - tb;
    });

    const alerts = [];
    const last = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];

    if (prev && last) {
      const scoreDelta = (last.score || 50) - (prev.score || 50);
      const scoreDeltaPct = (scoreDelta / (prev.score || 50)) * 100;

      if (scoreDelta <= -10) {
        alerts.push({
          sev: 3,
          title: 'Dégradation rapide du score',
          desc: `Score passé de ${prev.score} à ${last.score}/100 (${scoreDelta.toFixed(0)} pts) — dégradation de ${Math.abs(scoreDeltaPct).toFixed(0)}% sur la dernière période.`,
          icon: 'fa-chart-line-down',
          color: 'var(--color-error)',
          bg:    'var(--error-bg)',
          action: 'Analyser les causes',
          delta: scoreDelta,
        });
      } else if (scoreDelta <= -5) {
        alerts.push({
          sev: 2,
          title: 'Signal faible — score en baisse',
          desc: `Recul de ${Math.abs(scoreDelta)} pts détecté. Tendance à surveiller sur les 2 prochains mois.`,
          icon: 'fa-triangle-exclamation',
          color: 'var(--color-accent)',
          bg:    'var(--accent-bg)',
          delta: scoreDelta,
        });
      }
    }

    const ratios = last?.ratios || last?.financialRatios || [];
    const redRatios = ratios.filter(r => r.status === 'red' || r.color === '#ef4444');

    if (redRatios.length >= 4) {
      alerts.push({
        sev: 3,
        title: 'Accumulation de ratios critiques',
        desc: `${redRatios.length} ratios sont en zone rouge : ${redRatios.slice(0,3).map(r=>r.name).join(', ')}…`,
        icon: 'fa-circle-exclamation',
        color: 'var(--color-error)',
        bg:    'var(--error-bg)',
        action: 'Voir les ratios',
      });
    } else if (redRatios.length >= 2) {
      alerts.push({
        sev: 2,
        title: 'Ratios sous les seuils critiques',
        desc: `${redRatios.map(r=>r.name).join(' · ')} nécessitent une attention immédiate.`,
        icon: 'fa-gauge-high',
        color: 'var(--color-accent)',
        bg:    'var(--accent-bg)',
      });
    }

    const liq = ratios.find(r => r.name?.toLowerCase().includes('liquidit'));
    if (liq?.value != null && liq.value < 0.8) {
      alerts.push({
        sev: 3,
        title: 'Risque de rupture de trésorerie',
        desc: `Liquidité générale à ${liq.value?.toFixed(2)} (seuil critique < 0.8). Capacité à honorer les dettes CT compromise.`,
        icon: 'fa-droplet-slash',
        color: 'var(--color-error)',
        bg:    'var(--error-bg)',
        action: 'Voir prévision trésorerie',
        actionFn: () => window.DS_VIEWS?.navTo?.('forecast'),
      });
    }

    const az = last?.altman_z ?? null;
    if (az !== null && az < 1.23) {
      alerts.push({
        sev: 3,
        title: 'Zone de détresse financière — Altman Z',
        desc: `Score Altman Z = ${az?.toFixed(2)} (< 1.23 = zone critique). Risque de défaillance élevé selon modèle Altman révisé Europe.`,
        icon: 'fa-skull-crossbones',
        color: 'var(--color-error)',
        bg:    'var(--error-bg)',
      });
    } else if (az !== null && az < 2.0) {
      alerts.push({
        sev: 2,
        title: 'Zone grise — Altman Z',
        desc: `Score Altman Z = ${az?.toFixed(2)} (zone grise 1.23–2.0). Surveillance recommandée.`,
        icon: 'fa-circle-half-stroke',
        color: 'var(--color-accent)',
        bg:    'var(--accent-bg)',
      });
    }

    if (!alerts.length) {
      alerts.push({
        sev: 1,
        title: 'Aucun signal d\'alerte détecté',
        desc: `Tous les indicateurs sont dans des plages acceptables. Prochain contrôle recommandé dans 30 jours.`,
        icon: 'fa-shield-check',
        color: 'var(--color-success)',
        bg:    'var(--success-bg)',
      });
    }

    return alerts.sort((a, b) => b.sev - a.sev);
  }

  function _scoreTrajectory(analyses) {
    if (analyses.length < 2) return [];
    return [...analyses]
      .sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0))
      .slice(-6)
      .map(a => ({ score: a.score || 0, label: window.DS_DASH?._tsToString(a.createdAt) || '—' }));
  }

  function render(container, analyses) {
    const allAnalyses = analyses || window.S?.analyses || [];
    const current     = window.S?.currentAnalyse;
    const alerts      = _computeAlerts(allAnalyses);
    const traj        = _scoreTrajectory(allAnalyses);
    const trend       = traj.length >= 2
      ? traj[traj.length-1].score - traj[traj.length-2].score : 0;

    container.innerHTML = `
      <div class="p2-view p2-fu">

        <div class="p2-view-header">
          <div>
            <div class="p2-view-title">Alertes <span class="g">Précoces</span></div>
            <div class="p2-view-sub">Détection de signaux faibles · Trajectoire 6 analyses</div>
          </div>
          <div style="display:flex;gap:8px;">
            <span class="p2-badge ${alerts.some(a=>a.sev===3)?'p2-badge-rose':alerts.some(a=>a.sev===2)?'p2-badge-amber':'p2-badge-teal'}">
              <i class="fa-solid ${alerts.some(a=>a.sev===3)?'fa-triangle-exclamation':alerts.some(a=>a.sev===2)?'fa-circle-exclamation':'fa-shield-check'}"></i>
              ${alerts.filter(a=>a.sev===3).length} critique${alerts.filter(a=>a.sev===3).length>1?'s':''}
            </span>
          </div>
        </div>

        <!-- Trajectoire du score -->
        <div class="p2-grid-2 p2-fu" style="margin-bottom:16px;">
          <div class="p2-card">
            <div class="p2-card-title"><i class="fa-solid fa-chart-line" style="color:var(--color-success);"></i>Trajectoire du score</div>
            ${traj.length < 2 ? `
              <div class="p2-data-empty"><i class="fa-solid fa-chart-line"></i>
                Réalisez au moins 2 analyses pour voir la trajectoire</div>` : `
              <div style="display:flex;align-items:flex-end;gap:6px;height:80px;padding:8px 0;">
                ${traj.map((t, i) => {
                  const h = Math.max(8, (t.score / 100) * 70);
                  const isLast = i === traj.length - 1;
                  const col = t.score >= 75 ? 'var(--color-success)' : t.score >= 50 ? 'var(--color-accent)' : 'var(--color-error)';
                  return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <div style="font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
                      color:${isLast?col:'var(--text-hint)'};">${t.score}</div>
                    <div style="width:100%;height:${h}px;background:${isLast?col:'var(--border)'};
                      border-radius:4px;transition:height 1s ease;"></div>
                    <div style="font-size:7px;color:var(--text-hint);text-align:center;
                      max-width:36px;overflow:hidden;text-overflow:ellipsis;">${t.label.slice(0,8)}</div>
                  </div>`;
                }).join('')}
              </div>
              <div style="margin-top:8px;font-size:10px;color:${trend>0?'var(--color-success)':trend<0?'var(--color-error)':'var(--text-2)'};">
                <i class="fa-solid fa-${trend>0?'arrow-trend-up':trend<0?'arrow-trend-down':'minus'}"></i>
                ${trend>0?`+${trend} pts vs analyse précédente`:trend<0?`${trend} pts vs analyse précédente`:'Score stable'}
              </div>`}
          </div>

          <div class="p2-card">
            <div class="p2-card-title"><i class="fa-solid fa-gauge" style="color:var(--color-accent);"></i>État actuel</div>
            ${current ? `
              <div style="font-family:'Syne',sans-serif;font-size:42px;font-weight:900;
                letter-spacing:-.04em;color:${current.score>=75?'var(--color-success)':current.score>=50?'var(--color-accent)':current.score>=25?'#f97316':'var(--color-error)'};">
                ${current.score}<span style="font-size:16px;color:var(--text-hint);">/100</span>
              </div>
              <div style="font-size:10px;color:var(--text-2);margin-top:4px;">
                ${current.entreprise || 'Dernière analyse'} · ${current.zone || '—'}
              </div>
              <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
                <span class="p2-badge p2-badge-amber">
                  <i class="fa-solid fa-triangle-exclamation"></i>
                  ${(current.ratios||[]).filter(r=>r.status==='red').length} ratios critiques
                </span>
                <span class="p2-badge p2-badge-violet">
                  <i class="fa-solid fa-lightbulb"></i>
                  ${(current.recommendations||[]).length} recommandations
                </span>
              </div>` : `
              <div class="p2-data-empty"><i class="fa-solid fa-microscope"></i>Aucune analyse en cours</div>`}
          </div>
        </div>

        <!-- Alertes -->
        <div class="p2-card p2-fu">
          <div class="p2-card-title">
            <i class="fa-solid fa-bell" style="color:var(--color-error);"></i>
            Alertes actives — ${alerts.length} détectée${alerts.length>1?'s':''}
          </div>
          ${alerts.map(a => `
            <div class="p2-alert-card p2-alert-sev-${a.sev}"
              style="background:${a.bg};border-color:${a.color}33;">
              <div class="p2-alert-icon" style="background:${a.color}15;color:${a.color};">
                <i class="fa-solid ${a.icon}"></i>
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
                  color:var(--text);margin-bottom:5px;">
                  ${a.sev===3?'🔴':a.sev===2?'🟡':'🟢'} ${a.title}
                </div>
                <div style="font-size:10px;color:var(--text-2);line-height:1.6;">
                  ${a.desc}
                </div>
                ${a.delta != null ? `
                  <div class="p2-traj-bar" style="max-width:220px;">
                    <div class="p2-traj-fill" style="width:${Math.min(100,Math.abs(a.delta)*5)}%;
                      background:${a.delta<0?'var(--color-error)':'var(--color-success)'};">
                    </div>
                  </div>` : ''}
              </div>
              ${a.action ? `
                <button class="p2-btn p2-btn-neutral"
                  onclick="${a.actionFn ? `P2_ALERTS._runAction(${JSON.stringify(a.title)})` : ''}"
                  style="font-size:8px;padding:6px 12px;flex-shrink:0;">
                  ${a.action}
                </button>` : ''}
            </div>`).join('')}
        </div>

        <!-- Recommandations IA issues des alertes -->
        ${(current?.recommendations||[]).length ? `
        <div class="p2-card p2-fu" style="margin-top:14px;">
          <div class="p2-card-title">
            <i class="fa-solid fa-lightbulb" style="color:var(--color-accent);"></i>
            Actions correctives recommandées
          </div>
          ${(current.recommendations||[]).slice(0,4).map(r => `
            <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
              <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:4px;
                background:${r.level==='high'?'var(--color-error)':r.level==='medium'?'var(--color-accent)':'var(--color-success)'};">
              </div>
              <div>
                <div style="font-size:10px;font-weight:700;color:var(--text);margin-bottom:3px;">${r.title}</div>
                <div style="font-size:9px;color:var(--text-2);line-height:1.6;">${r.description}</div>
              </div>
            </div>`).join('')}
        </div>` : ''}

      </div>`;
  }

  return { render };
})();

window.P2_ALERTS = P2_ALERTS;


// ════════════════════════════════════════════════════════════════
//  ③ WORKSPACE MULTI-ENTREPRISES — Cabinet comptable
// ════════════════════════════════════════════════════════════════

const P2_CABINET = (() => {

  let _clients = [];
  let _filter  = '';
  let _sort    = 'score_asc';

  function _buildClientsFromAnalyses() {
    const map = {};
    (window.S?.analyses || []).forEach(a => {
      const key = a.entreprise || a.userId || 'Entreprise';
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });

    return Object.entries(map).map(([name, analyses]) => {
      const sorted  = [...analyses].sort((a, b) =>
        (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0));
      const latest  = sorted[0];
      const prev    = sorted[1];
      const trend   = prev ? (latest.score||0) - (prev.score||0) : 0;

      return {
        name,
        score:     latest.score || 0,
        zone:      latest.zone  || zoneFromScore(latest.score||0),
        analyses:  analyses.length,
        lastDate:  window.DS_DASH?._tsToString(latest.createdAt) || '—',
        trend,
        latestId:  latest.id,
        alertCount: (latest.ratios||[]).filter(r=>r.status==='red').length,
        model:     latest.model || 'ML',
        confidence: latest.confidence || 0,
      };
    });
  }

  async function _loadClientsFromBackend() {
    try {
      const data = await _p2Get('/cabinet/clients');
      return data.clients || [];
    } catch {
      return _buildClientsFromAnalyses();
    }
  }

  function _sortedFiltered() {
    let list = _clients.filter(c =>
      !_filter || c.name.toLowerCase().includes(_filter.toLowerCase())
    );
    const [field, dir] = _sort.split('_');
    list.sort((a, b) => {
      let va = a[field], vb = b[field];
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb?.toLowerCase();
      return dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }

  function _renderClientCard(c) {
    const zc = window.ZC?.[c.zone] || {s:'var(--violet-3)',bg:'var(--violet-bg)',l:c.zone};
    return `
      <div class="p2-client-card p2-fu"
        onclick="P2_CABINET.openClient('${escHtml(c.name)}')">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
          <div style="flex:1;min-width:0;">
            <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;
              color:var(--text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${escHtml(c.name)}</div>
            <div style="font-size:8.5px;color:var(--text-hint);">
              ${c.analyses} analyse${c.analyses>1?'s':''} · ${c.lastDate}
            </div>
          </div>
          <div style="flex-shrink:0;margin-left:8px;">
            <div class="p2-client-score" style="color:${zc.s};">${c.score}</div>
            <div style="font-size:8px;color:var(--text-hint);text-align:right;">/100</div>
          </div>
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:7.5px;font-weight:800;letter-spacing:.07em;padding:3px 8px;
            border-radius:100px;background:${zc.bg};color:${zc.s};border:1px solid ${zc.s}33;">
            ${zc.l}
          </span>
          <div style="display:flex;align-items:center;gap:8px;">
            ${c.alertCount > 0 ? `
              <span class="p2-badge p2-badge-rose">
                <i class="fa-solid fa-triangle-exclamation"></i>${c.alertCount}
              </span>` : ''}
            <span style="font-size:9px;font-weight:700;
              color:${c.trend>0?'var(--color-success)':c.trend<0?'var(--color-error)':'var(--text-hint)'};">
              ${c.trend>0?'▲ +':c.trend<0?'▼ ':' '}${c.trend!==0?Math.abs(c.trend)+'pts':'—'}
            </span>
          </div>
        </div>

        <div style="margin-top:10px;height:3px;background:var(--border);border-radius:2px;">
          <div style="width:${c.score}%;height:100%;background:${zc.s};border-radius:2px;
            transition:width 1s ease;"></div>
        </div>
      </div>`;
  }

  function openClient(name) {
    const a = (window.S?.analyses||[]).find(a => a.entreprise === name || (!a.entreprise && name === 'Entreprise'));
    if (a) {
      window.DS_DASH?.loadAnalyse(a);
      window.DS_VIEWS?.navTo('dashboard');
    }
  }

  async function render(container) {
    container.innerHTML = `<div class="p2-view">
      <div style="text-align:center;padding:40px;color:var(--text-hint);font-size:11px;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size:22px;margin-bottom:12px;display:block;"></i>
        Chargement des clients…
      </div>
    </div>`;

    _clients = await _loadClientsFromBackend();

    const total    = _clients.length;
    const enAlerte = _clients.filter(c => c.alertCount > 0).length;
    const avgScore = total ? Math.round(_clients.reduce((s,c)=>s+c.score,0)/total) : 0;
    const zones    = { saine:0, vigilance:0, risque:0, critique:0 };
    _clients.forEach(c => zones[c.zone] = (zones[c.zone]||0) + 1);

    container.innerHTML = `
      <div class="p2-view p2-fu">

        <div class="p2-view-header">
          <div>
            <div class="p2-view-title">Cabinet <span class="g">Comptable</span></div>
            <div class="p2-view-sub">Workspace multi-entreprises · ${total} client${total>1?'s':''}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <select onchange="P2_CABINET.setSort(this.value)"
              style="background:rgba(255,255,255,.04);border:1px solid var(--border);
              color:var(--text-2);border-radius:9px;padding:7px 12px;
              font-family:'Syne',sans-serif;font-size:9px;cursor:pointer;outline:none;">
              <option value="score_asc">Score ↑</option>
              <option value="score_desc">Score ↓</option>
              <option value="name_asc">Nom A→Z</option>
              <option value="alertCount_desc">Alertes</option>
            </select>
            <button class="p2-btn p2-btn-violet" onclick="P2_CABINET.exportCSV()">
              <i class="fa-solid fa-download"></i>Export CSV
            </button>
          </div>
        </div>

        <!-- Stats cabinet -->
        <div class="p2-cabinet-stats p2-fu">
          ${[
            [total,'Clients','fa-briefcase','var(--violet-3)'],
            [avgScore + '/100','Score moyen','fa-gauge-high',avgScore>=75?'var(--color-success)':avgScore>=50?'var(--color-accent)':'var(--color-error)'],
            [enAlerte,'En alerte','fa-triangle-exclamation',enAlerte>0?'var(--color-accent)':'var(--color-success)'],
            [zones.critique||0,'Critiques','fa-circle-exclamation','var(--color-error)'],
          ].map(([val,lbl,icon,col]) => `
            <div class="p2-stat-pill">
              <div style="font-size:18px;margin-bottom:6px;color:${col};">
                <i class="fa-solid ${icon}"></i></div>
              <div class="p2-stat-pill-val" style="color:${col};">${val}</div>
              <div class="p2-stat-pill-lbl">${lbl}</div>
            </div>`).join('')}
        </div>

        <!-- Répartition zones -->
        <div class="p2-card p2-fu" style="margin-bottom:14px;">
          <div class="p2-card-title"><i class="fa-solid fa-chart-pie" style="color:var(--violet-3);"></i>Répartition par zone</div>
          <div style="display:flex;gap:4px;height:10px;border-radius:6px;overflow:hidden;margin-bottom:10px;">
            ${Object.entries(zones).map(([z,n]) => {
              const col = {saine:'var(--color-success)',vigilance:'var(--color-accent)',risque:'#f97316',critique:'var(--color-error)'}[z];
              const pct = total ? Math.round((n/total)*100) : 0;
              return pct ? `<div style="width:${pct}%;background:${col};transition:width 1s;"></div>` : '';
            }).join('')}
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;">
            ${Object.entries(zones).map(([z,n]) => {
              const col = {saine:'var(--color-success)',vigilance:'var(--color-accent)',risque:'#f97316',critique:'var(--color-error)'}[z];
              const lbl = {saine:'Saine',vigilance:'Vigilance',risque:'Risque',critique:'Critique'}[z];
              return `<div style="display:flex;align-items:center;gap:5px;font-size:9px;color:var(--text-2);">
                <span style="width:8px;height:8px;border-radius:2px;background:${col};display:inline-block;"></span>
                ${lbl}: <strong style="color:${col};">${n}</strong>
              </div>`;
            }).join('')}
          </div>
        </div>

        <!-- Recherche -->
        <div style="margin-bottom:12px;">
          <div style="position:relative;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute;left:12px;top:50%;
              transform:translateY(-50%);color:var(--text-hint);font-size:11px;"></i>
            <input type="text" placeholder="Rechercher un client…"
              oninput="P2_CABINET.setFilter(this.value)"
              style="width:100%;padding:10px 12px 10px 34px;background:rgba(255,255,255,.03);
              border:1px solid var(--border);border-radius:10px;color:var(--text);
              font-size:11px;outline:none;box-sizing:border-box;transition:border .15s;"
              onfocus="this.style.borderColor='var(--violet-border)'"
              onblur="this.style.borderColor='var(--border)'"/>
          </div>
        </div>

        <!-- Grille clients -->
        <div class="p2-client-grid" id="p2-cabinet-grid">
          ${total === 0 ? `
            <div class="p2-data-empty" style="grid-column:1/-1;">
              <i class="fa-solid fa-briefcase"></i>
              Aucun client trouvé. Créez des analyses pour différentes entreprises.
            </div>` :
            _sortedFiltered().map(_renderClientCard).join('')}
        </div>

      </div>`;
  }

  function setFilter(v) {
    _filter = v;
    const grid = document.getElementById('p2-cabinet-grid');
    if (grid) grid.innerHTML = _sortedFiltered().map(_renderClientCard).join('');
  }

  function setSort(v) {
    _sort = v;
    const grid = document.getElementById('p2-cabinet-grid');
    if (grid) grid.innerHTML = _sortedFiltered().map(_renderClientCard).join('');
  }

  function exportCSV() {
    const rows = [
      ['Entreprise','Score','Zone','Nb Analyses','Dernière analyse','Alertes','Tendance'],
      ..._clients.map(c => [c.name, c.score, c.zone, c.analyses, c.lastDate, c.alertCount, c.trend])
    ];
    const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `cabinet-doctorsmile-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return { render, setFilter, setSort, openClient, exportCSV };
})();

window.P2_CABINET = P2_CABINET;


// ════════════════════════════════════════════════════════════════
//  ④ SCORE DE CRÉDIT BANKABLE
//  Dossier banque format BICEC / Afriland / SGBC Cameroun
// ════════════════════════════════════════════════════════════════

const P2_CREDIT = (() => {

  const BANK_RATIOS = [
    { key:'current_ratio',    label:'Ratio de liquidité générale',       weight:15, threshold:1.2, unit:'',   desc:'Actif CT / Passif CT' },
    { key:'debt_equity',      label:'Ratio d\'endettement',              weight:20, threshold:2.0, unit:'',   desc:'Dettes totales / Fonds propres', inverse:true },
    { key:'solvabilite',      label:'Taux de solvabilité',               weight:20, threshold:25,  unit:'%',  desc:'Fonds propres / Total bilan' },
    { key:'roa',              label:'Rentabilité des actifs (ROA)',       weight:15, threshold:3.0, unit:'%',  desc:'Résultat net / Total actif' },
    { key:'net_margin',       label:'Taux de marge nette',               weight:10, threshold:3.0, unit:'%',  desc:'Résultat net / Chiffre d\'affaires' },
    { key:'couverture_interets',label:'Couverture des charges financières',weight:10,threshold:2.0, unit:'x', desc:'EBIT / Charges financières' },
    { key:'rotation_actifs',  label:'Rotation des actifs',               weight:5,  threshold:0.8, unit:'',   desc:'CA / Total actif' },
    { key:'bfr_ca',           label:'BFR / Chiffre d\'affaires',         weight:5,  threshold:25,  unit:'%',  desc:'BFR / CA', inverse:true },
  ];

  const RATING_BANDS = [
    { min:85, label:'AAA', desc:'Excellent — Financement très probable', color:'var(--color-success)' },
    { min:70, label:'AA',  desc:'Très bon — Financement probable',       color:'#2DD4BF' },
    { min:55, label:'A',   desc:'Bon — Favorable sous conditions',       color:'var(--violet-3)' },
    { min:40, label:'BBB', desc:'Satisfaisant — À surveiller',           color:'var(--color-accent)' },
    { min:25, label:'BB',  desc:'Fragile — Exige des garanties',         color:'#f97316' },
    { min:0,  label:'B',   desc:'Risqué — Refus probable',               color:'var(--color-error)' },
  ];

  function _computeCreditScore(analyse) {
    const ratios = analyse?.ratios || analyse?.financialRatios || [];

    const getVal = (key) => {
      const r = ratios.find(r => {
        const n = r.name?.toLowerCase() || '';
        const mapping = {
          current_ratio:     ['liquidit'],
          debt_equity:       ['endett'],
          solvabilite:       ['solvab'],
          roa:               ['roa','rentab'],
          net_margin:        ['marge net'],
          couverture_interets:['couvert'],
          rotation_actifs:   ['rotation'],
          bfr_ca:            ['bfr'],
        };
        return (mapping[key] || [key]).some(k => n.includes(k));
      });
      return r?.value ?? null;
    };

    let totalScore = 0;
    let totalWeight = 0;
    const details = [];

    BANK_RATIOS.forEach(br => {
      const val = getVal(br.key);
      if (val === null) { details.push({ ...br, val: null, pts: 0, pct: 0 }); return; }

      let pct;
      if (br.inverse) {
        pct = Math.max(0, Math.min(100, (1 - val / (br.threshold * 2)) * 100));
      } else {
        pct = Math.max(0, Math.min(100, (val / br.threshold) * 80));
      }

      const pts = (pct / 100) * br.weight;
      totalScore  += pts;
      totalWeight += br.weight;

      details.push({ ...br, val, pct: Math.round(pct), pts: Math.round(pts * 10) / 10 });
    });

    const creditScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
    const band = RATING_BANDS.find(b => creditScore >= b.min) || RATING_BANDS[RATING_BANDS.length-1];

    return { score: creditScore, band, details };
  }

  function _renderGauge(score, color) {
    const angle = (score / 100) * 180;
    const r = 70, cx = 90, cy = 80;
    const arc = (deg) => {
      const rad = (deg - 180) * Math.PI / 180;
      return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
    };
    const start  = arc(0);
    const end    = arc(angle);
    const large  = angle > 90 ? 1 : 0;

    return `
      <svg width="180" height="100" viewBox="0 0 180 100">
        <defs>
          <linearGradient id="p2cg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="var(--color-error)"/>
            <stop offset="33%"  stop-color="var(--color-accent)"/>
            <stop offset="66%"  stop-color="#2DD4BF"/>
            <stop offset="100%" stop-color="var(--color-success)"/>
          </linearGradient>
        </defs>
        <path d="M${20},${cy} A${r},${r} 0 0 1 ${160},${cy}"
          fill="none" stroke="var(--border)" stroke-width="12" stroke-linecap="round"/>
        <path d="M${20},${cy} A${r},${r} 0 ${large} 1 ${end.x},${end.y}"
          fill="none" stroke="${color}" stroke-width="12" stroke-linecap="round"
          style="transition:all 1.2s ease;"/>
        ${score > 2 ? `<line x1="${cx}" y1="${cy}" x2="${end.x}" y2="${end.y}"
          stroke="${color}" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="${cx}" cy="${cy}" r="5" fill="${color}"/>` : ''}
      </svg>`;
  }

  async function render(container, analyse) {
    const a = analyse || window.S?.currentAnalyse;

    if (!a) {
      container.innerHTML = `<div class="p2-view">
        <div class="p2-data-empty" style="padding:80px 20px;">
          <i class="fa-solid fa-file-invoice"></i>
          Lancez d'abord une analyse pour générer le dossier de crédit
        </div>
      </div>`;
      return;
    }

    const { score, band, details } = _computeCreditScore(a);

    const printBtn = document.getElementById('p2-print-btn');
    if (printBtn) printBtn.classList.add('show');

    container.innerHTML = `
      <div class="p2-view p2-fu" id="p2-credit-content">

        <div class="p2-view-header">
          <div>
            <div class="p2-view-title">Crédit <span class="g">Bankable</span></div>
            <div class="p2-view-sub">Dossier de crédit · Format BICEC / Afriland / SGBC / Ecobank</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="p2-btn p2-btn-violet" onclick="P2_CREDIT.print()">
              <i class="fa-solid fa-print"></i>Imprimer le dossier
            </button>
            <button class="p2-btn p2-btn-gold" onclick="P2_CREDIT.exportPDF()">
              <i class="fa-solid fa-file-pdf"></i>Exporter PDF
            </button>
          </div>
        </div>

        <!-- En-tête dossier -->
        <div class="p2-card p2-fu" style="margin-bottom:14px;
          background:linear-gradient(135deg,var(--violet-bg),var(--success-bg));">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
            <div>
              <div style="font-size:9px;color:var(--text-hint);letter-spacing:.1em;
                text-transform:uppercase;font-family:'Syne',sans-serif;margin-bottom:6px;">
                Dossier de crédit · Doctor Smile™
              </div>
              <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:900;color:var(--text);">
                ${escHtml(a.entreprise || 'Entreprise')}
              </div>
              <div style="font-size:10px;color:var(--text-2);margin-top:4px;">
                Émis le ${new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}
                · Analyse #${(a.id||'').slice(0,8)}
              </div>
            </div>
            <div class="p2-credit-score-ring">
              ${_renderGauge(score, band.color)}
              <div class="p2-gauge-val">
                <div style="font-family:'Syne',sans-serif;font-size:28px;font-weight:900;
                  color:${band.color};line-height:1;">${score}</div>
                <div style="font-size:9px;color:var(--text-hint);">/ 100</div>
              </div>
              <div style="margin-top:16px;text-align:center;">
                <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:900;
                  color:${band.color};">${band.label}</div>
                <div style="font-size:9px;color:var(--text-2);margin-top:3px;
                  max-width:160px;text-align:center;">${band.desc}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grille ratios banque -->
        <div class="p2-grid-2 p2-fu" style="margin-bottom:14px;">
          <div class="p2-card">
            <div class="p2-card-title">
              <i class="fa-solid fa-table-cells" style="color:var(--violet-3);"></i>
              Ratios COBAC / BEAC requis
            </div>
            <table class="p2-credit-table">
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th style="text-align:right;">Valeur</th>
                  <th style="text-align:right;">Seuil</th>
                  <th style="text-align:right;">Score</th>
                </tr>
              </thead>
              <tbody>
                ${details.map(d => `
                  <tr>
                    <td>
                      <div style="font-weight:600;color:var(--text);">${d.label}</div>
                      <div style="font-size:8px;color:var(--text-hint);">${d.desc}</div>
                    </td>
                    <td style="text-align:right;font-family:'JetBrains Mono',monospace;
                      color:${d.val===null?'var(--text-hint)':d.pct>=70?'var(--color-success)':d.pct>=40?'var(--color-accent)':'var(--color-error)'};">
                      ${d.val !== null ? `${d.val?.toFixed(2)}${d.unit}` : '—'}
                    </td>
                    <td style="text-align:right;font-size:9px;color:var(--text-hint);">
                      ${d.inverse?'<':'>'} ${d.threshold}${d.unit}
                    </td>
                    <td style="text-align:right;">
                      <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
                        <div style="width:40px;height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
                          <div style="width:${d.pct}%;height:100%;background:${d.pct>=70?'var(--color-success)':d.pct>=40?'var(--color-accent)':'var(--color-error)'};"></div>
                        </div>
                        <span style="font-size:9px;font-weight:700;
                          color:${d.pct>=70?'var(--color-success)':d.pct>=40?'var(--color-accent)':'var(--color-error)'};">
                          ${d.pct}%
                        </span>
                      </div>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>

          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="p2-card" style="background:${band.color}0D;border-color:${band.color}33;">
              <div class="p2-card-title" style="color:${band.color};">
                <i class="fa-solid fa-landmark"></i>Avis de financement simulé
              </div>
              <div style="font-size:11px;color:var(--text);font-weight:700;margin-bottom:8px;">
                Notation : ${band.label} — ${band.desc}
              </div>
              <div style="font-size:10px;color:var(--text-2);line-height:1.7;margin-bottom:14px;">
                ${score >= 70 ?
                  `Le profil financier de l'entreprise est solide. Un financement peut être accordé avec des conditions standard. Taux préférentiel envisageable.` :
                score >= 40 ?
                  `Le dossier présente des points d'attention. Un financement est possible avec garanties supplémentaires (nantissement, caution). Taux majoré probable.` :
                  `Le niveau de risque est élevé. Des plans de restructuration sont recommandés avant toute demande de financement. Accompagnement conseillé.`}
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${score >= 55 ? `<span class="p2-badge p2-badge-teal"><i class="fa-solid fa-check"></i>Crédit court terme</span>` : ''}
                ${score >= 65 ? `<span class="p2-badge p2-badge-teal"><i class="fa-solid fa-check"></i>Crédit moyen terme</span>` : ''}
                ${score >= 70 ? `<span class="p2-badge p2-badge-gold"><i class="fa-solid fa-star"></i>Taux préférentiel</span>` : ''}
                ${score < 40 ? `<span class="p2-badge p2-badge-rose"><i class="fa-solid fa-xmark"></i>Garanties requises</span>` : ''}
              </div>
            </div>

            <div class="p2-card" style="flex:1;">
              <div class="p2-card-title"><i class="fa-solid fa-list-check" style="color:var(--color-accent);"></i>Pour renforcer votre dossier</div>
              ${details
                .filter(d => d.pct < 60 && d.val !== null)
                .slice(0, 3)
                .map(d => `
                  <div style="display:flex;gap:10px;margin-bottom:10px;">
                    <i class="fa-solid fa-circle-arrow-up" style="color:var(--color-accent);margin-top:2px;font-size:11px;flex-shrink:0;"></i>
                    <div style="font-size:10px;color:var(--text-2);line-height:1.6;">
                      <strong style="color:var(--text);">${d.label}</strong> : ${d.val?.toFixed(2)}${d.unit}
                      → objectif ${d.inverse?'<':'>'} ${d.threshold}${d.unit}
                    </div>
                  </div>`).join('') ||
                `<div style="font-size:10px;color:var(--text-hint);">
                  <i class="fa-solid fa-shield-check" style="color:var(--color-success);margin-right:6px;"></i>
                  Tous les ratios sont dans les seuils requis !</div>`}
            </div>
          </div>
        </div>

        <!-- Mentions légales -->
        <div class="p2-card p2-fu"
          style="background:rgba(255,255,255,.01);border-color:var(--border);">
          <div style="font-size:8.5px;color:var(--text-hint);line-height:1.8;">
            <strong style="color:var(--text-2);">⚠️ Avertissement</strong> —
            Ce rapport est généré automatiquement par Doctor Smile™ à partir des données financières fournies.
            Il ne constitue pas un avis bancaire officiel et ne remplace pas une analyse par un professionnel agréé.
            La notation simulée est indicative et basée sur des critères généraux COBAC/BEAC.
            Doctor Smile™ ne saurait être tenu responsable des décisions de financement prises sur la base de ce document.
            <br>Généré le ${new Date().toLocaleDateString('fr-FR')} · Propulsé par Doctor Smile™ v2.0 · IA : RF + XGBoost + LightGBM
          </div>
        </div>

      </div>`;
  }

  function print() {
    window.print();
  }

  async function exportPDF() {
    try {
      const a = window.S?.currentAnalyse;
      if (!a) return;
      const { score, band, details } = _computeCreditScore(a);
      const data = await _p2Post('/credit/generate-report', {
        analyseId:   a.id,
        entreprise:  a.entreprise,
        score,
        band:        band.label,
        ratios:      details,
      });
      if (data.url) window.open(data.url, '_blank');
      else _p2toast('Export PDF généré', 'ok');
    } catch {
      window.print();
    }
  }

  function _p2toast(msg, type) {
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:20px;right:20px;z-index:10000;
      padding:12px 18px;border-radius:12px;background:var(--bg-elevated);
      color:var(--text);font-size:11px;border:1px solid ${type==='ok'?'var(--success-border)':'var(--error-border)'};
      transform:translateX(320px);transition:transform .35s;`;
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.transform = 'none');
    setTimeout(() => { t.style.transform = 'translateX(320px)'; setTimeout(()=>t.remove(),380); }, 3500);
  }

  return { render, print, exportPDF };
})();

window.P2_CREDIT = P2_CREDIT;


// ════════════════════════════════════════════════════════════════
//  INJECTION VUES + NAV dans le dashboard existant
// ════════════════════════════════════════════════════════════════

function _p2InjectViews() {
  const main = document.getElementById('main');
  if (!main || document.getElementById('view-forecast')) return;

  const views = [
    { id:'forecast',  title:'Trésorerie <span class="g">IA</span>',         sub:'Projections 12 mois',          content:'forecast-content'  },
    { id:'early',     title:'Alertes <span class="g">Précoces</span>',       sub:'Signaux faibles & trajectoire', content:'early-content'     },
    { id:'cabinet',   title:'Cabinet <span class="g">Comptable</span>',      sub:'Workspace multi-entreprises',  content:'cabinet-content'   },
    { id:'credit',    title:'Crédit <span class="g">Bankable</span>',        sub:'Dossier banque certifié',      content:'credit-content'    },
  ];

  views.forEach(v => {
    const pane = document.createElement('div');
    pane.id        = `view-${v.id}`;
    pane.className = 'view-pane';
    pane.innerHTML = `<div id="${v.content}" style="height:100%;overflow:hidden;"></div>`;
    main.appendChild(pane);
  });

  const printBtn = document.createElement('button');
  printBtn.id = 'p2-print-btn';
  printBtn.className = 'p2-print-btn';
  printBtn.innerHTML = '<i class="fa-solid fa-print"></i>Imprimer le dossier';
  printBtn.onclick = () => P2_CREDIT.print();
  document.body.appendChild(printBtn);
}

function _p2InjectNav() {
  return;
}

function _p2NavTo(view) {
  document.querySelectorAll('.nav-item, .p2-nav-item').forEach(el => {
    el.classList.remove('active');
  });

  document.querySelector(`.p2-nav-item[data-view="${view}"]`)?.classList.add('active');
  document.querySelector(`.nav-item[data-view="${view}"]`)?.classList.add('active');

  document.querySelectorAll('.view-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `view-${view}`);
  });

  const printBtn = document.getElementById('p2-print-btn');
  if (printBtn) printBtn.classList.toggle('show', view === 'credit');

  const contentEl = document.getElementById(`${view}-content`);
  if (!contentEl) return;

  const a = window.S?.currentAnalyse;
  if      (view === 'forecast') P2_FORECAST.render(contentEl, a);
  else if (view === 'early')    P2_ALERTS.render(contentEl, window.S?.analyses);
  else if (view === 'cabinet')  P2_CABINET.render(contentEl);
  else if (view === 'credit')   P2_CREDIT.render(contentEl, a);
}

window.DS_VIEWS = window.DS_VIEWS || {};
const _origNavTo = window.DS_VIEWS.navTo?.bind(window.DS_VIEWS);
if (_origNavTo && !window.DS_VIEWS._p2hooked) {
  window.DS_VIEWS._p2hooked = true;
  window.DS_VIEWS.navTo = function(view) {
    const p2Views = ['forecast','early','cabinet','credit'];
    if (p2Views.includes(view)) {
      _p2NavTo(view);
    } else {
      document.getElementById('p2-print-btn')?.classList.remove('show');
      _origNavTo(view);
    }
  };
}

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════

(function _p2init() {
  function _boot() {
    _p2InjectViews();
    _p2InjectNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }
})();

window.DS_PHASE2 = {
  forecast: P2_FORECAST,
  alerts:   P2_ALERTS,
  cabinet:  P2_CABINET,
  credit:   P2_CREDIT,
  navTo:    _p2NavTo,
};

console.log('%c[phase2.js] ✓ Chargé — Trésorerie · Alertes · Cabinet · Crédit Bankable', 'color:var(--color-success);font-weight:bold');