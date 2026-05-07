// ════════════════════════════════════════════════════════════════
//  ds-admin.js — Doctor Smile · Interface Administrateur v2.0
//  Activé si S.profile.role === "admin"
//  Fonctionnalités :
//    · Gestion utilisateurs (CRUD, plan, statut, reset pwd, historique)
//    · Supervision analyses (global, suppression, statistiques)
//    · Monitoring technique (FastAPI, ML models, API quotas, logs)
//    · Gestion paiements Stripe (abonnements, échecs, remboursements)
// ════════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc,
  query, orderBy, limit, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ── Palette admin (cohérente avec dashboard) ─────────────────────
const A = {
  gold:    '#FFD700', ice:  '#7DD3FC', ice2: '#38BDF8',
  emerald: '#10b981', ruby: '#ef4444', amber: '#f59e0b',
  violet:  '#8B5CF6', pink: '#EC4899',
  bg:      '#02040B', surf: '#060A14', surf2: '#0A1020',
  bice:    'rgba(125,211,252,.12)', muted: 'rgba(255,255,255,.35)',
};

// ── State admin ──────────────────────────────────────────────────
const AS = {
  users:           [],
  analyses:        [],
  abonnements:     [],
  loaded:          false,
  userFilter:      '',
  userSort:        'createdAt',
  userStatusFilter:'all',
  analysesFilter:  '',
  analysesSort:    'createdAt',
  activeTab:       'overview',
  _logs:           [],   // Logs d'erreurs en mémoire
  _mlStatus:       null, // Cache statut modèles ML
  _apiQuotas:      null, // Cache quotas API
};

// ════════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════════
export async function initAdmin() {
  if (!window.S?.profile || S.profile.role !== 'admin') return;
  console.log('%c[DS-ADMIN] Mode administrateur activé v2.0', 'color:#FFD700;font-weight:bold');

  _injectAdminNav();
  _injectAdminView();
  _injectAdminStyles();
  await _loadAllData();
  renderAdmin();
}

// ════════════════════════════════════════════════════════════════
//  NAV INJECTION
// ════════════════════════════════════════════════════════════════
function _injectAdminNav() {
  const nav = document.getElementById('nav');
  if (!nav || nav.querySelector('[data-view="admin"]')) return;
  const spacer = nav.querySelector('.nav-spacer');
  const item = document.createElement('div');
  item.className = 'nav-item';
  item.setAttribute('data-view', 'admin');
  item.setAttribute('onclick', "DS?.navTo('admin')");
  item.style.cssText = 'color:#EC4899;margin-top:4px;';
  item.innerHTML = `
    <i class="fa-solid fa-shield-halved"></i>
    <span class="nav-tip" style="color:#EC4899;">Administration</span>
  `;
  if (spacer) nav.insertBefore(item, spacer);
  else nav.appendChild(item);
}

// ════════════════════════════════════════════════════════════════
//  VIEW INJECTION
// ════════════════════════════════════════════════════════════════
function _injectAdminView() {
  const main = document.getElementById('main');
  if (!main || document.getElementById('view-admin')) return;
  const pane = document.createElement('div');
  pane.id = 'view-admin';
  pane.className = 'view-pane';
  main.appendChild(pane);
}

// ════════════════════════════════════════════════════════════════
//  CHARGEMENT DONNÉES
// ════════════════════════════════════════════════════════════════
async function _loadAllData() {
  try {
    const [usersSnap, analysesSnap, abonnementsSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'analyses'), orderBy('createdAt', 'desc'), limit(500))),
      getDocs(collection(db, 'abonnements')),
    ]);
    AS.users       = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    AS.analyses    = analysesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    AS.abonnements = abonnementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    AS.loaded      = true;
  } catch(e) {
    console.error('[DS-ADMIN] Erreur chargement:', e);
    _addLog('error', 'Firestore', e.message);
  }
}

// ════════════════════════════════════════════════════════════════
//  RENDER PRINCIPAL
// ════════════════════════════════════════════════════════════════
export function renderAdmin() {
  const pane = document.getElementById('view-admin');
  if (!pane) return;

  const stats = _computeStats();
  const alertCount = _countAlerts();

  pane.innerHTML = `
    <div class="adm-root">

      <!-- ══ HEADER ══ -->
      <div class="adm-header">
        <div class="adm-header-left">
          <div class="adm-badge-admin">
            <i class="fa-solid fa-shield-halved"></i> ADMIN
          </div>
          <div>
            <div class="adm-title">Control Center</div>
            <div class="adm-subtitle">Doctor Smile · Plateforme SaaS &nbsp;·&nbsp; <span style="color:${A.pink};">${stats.usersTotal} utilisateurs</span></div>
          </div>
        </div>
        <div class="adm-header-right">
          ${alertCount > 0 ? `
            <div class="adm-alert-chip" onclick="window.DS_ADMIN?.switchTab('system')">
              <i class="fa-solid fa-triangle-exclamation"></i>
              ${alertCount} alerte${alertCount > 1 ? 's' : ''}
            </div>
          ` : ''}
          <div class="adm-live-dot"></div>
          <span class="adm-live-lbl">Temps réel</span>
          <button class="adm-refresh-btn" onclick="window.DS_ADMIN?.refresh()" title="Actualiser">
            <i class="fa-solid fa-rotate-right"></i>
          </button>
          <button class="adm-export-btn" onclick="window.DS_ADMIN?.exportCSV()" title="Exporter CSV">
            <i class="fa-solid fa-file-csv"></i>
          </button>
        </div>
      </div>

      <!-- ══ TABS ══ -->
      <div class="adm-tabs">
        ${_tab('overview',    'fa-gauge-high',   'Vue d\'ensemble')}
        ${_tab('users',       'fa-users',         'Utilisateurs',   _countBadge('users'))}
        ${_tab('abonnements', 'fa-credit-card',   'Paiements',      _countBadge('payments'))}
        ${_tab('analyses',    'fa-microscope',    'Analyses')}
        ${_tab('system',      'fa-server',        'Système',        _countBadge('system'))}
      </div>

      <!-- ══ CONTENU ══ -->
      <div class="adm-content" id="adm-content">
        ${_renderTab(AS.activeTab, stats)}
      </div>

    </div>
  `;

  _bindEvents();
}

function _tab(id, icon, label, badge = 0) {
  const active = AS.activeTab === id ? 'active' : '';
  const badgeHtml = badge > 0 ? `<span class="adm-tab-badge">${badge}</span>` : '';
  return `
    <button class="adm-tab ${active}" onclick="window.DS_ADMIN?.switchTab('${id}')">
      <i class="fa-solid ${icon}"></i>
      <span>${label}</span>
      ${badgeHtml}
    </button>
  `;
}

function _countBadge(type) {
  if (type === 'users')    return AS.users.filter(u => u.emailVerified === false).length;
  if (type === 'payments') return AS.abonnements.filter(a => a.status === 'failed' || a.status === 'past_due').length;
  if (type === 'system')   return AS._logs.filter(l => l.level === 'error').length;
  return 0;
}

function _countAlerts() {
  return _countBadge('users') + _countBadge('payments') + _countBadge('system');
}

// ════════════════════════════════════════════════════════════════
//  TABS ROUTER
// ════════════════════════════════════════════════════════════════
function _renderTab(tab, stats) {
  switch(tab) {
    case 'overview':    return _renderOverview(stats);
    case 'users':       return _renderUsers();
    case 'abonnements': return _renderAbonnements(stats);
    case 'analyses':    return _renderAnalyses();
    case 'system':      return _renderSystem(stats);
    default:            return _renderOverview(stats);
  }
}

// ════════════════════════════════════════════════════════════════
//  CALCUL STATS
// ════════════════════════════════════════════════════════════════
function _computeStats() {
  const now   = Date.now();
  const month = 30 * 24 * 3600 * 1000;
  const week  = 7  * 24 * 3600 * 1000;

  const usersTotal     = AS.users.length;
  const usersThisMonth = AS.users.filter(u => _ts(u.createdAt) > now - month).length;
  const usersThisWeek  = AS.users.filter(u => _ts(u.createdAt) > now - week).length;
  const usersDisabled  = AS.users.filter(u => u.disabled).length;

  const plans = { standard: 0, premium: 0, extra: 0, trial: 0 };
  AS.abonnements.forEach(a => {
    const p = (a.status === 'trial') ? 'trial' : (a.plan || 'standard');
    plans[p] = (plans[p] || 0) + 1;
  });

  const analysesTotal    = AS.analyses.length;
  const analysesThisMonth = AS.analyses.filter(a => _ts(a.createdAt) > now - month).length;
  const analysesThisWeek  = AS.analyses.filter(a => _ts(a.createdAt) > now - week).length;
  const avgScore = analysesTotal
    ? Math.round(AS.analyses.reduce((s, a) => s + (a.score || 0), 0) / analysesTotal)
    : 0;

  const priceMap = { standard: 0, premium: 49, extra: 149, trial: 0 };
  const mrr = AS.abonnements
    .filter(a => a.status === 'active')
    .reduce((s, a) => s + (priceMap[a.plan] || 0), 0);

  const failedPayments = AS.abonnements.filter(a => a.status === 'failed' || a.status === 'past_due').length;

  const convRate = usersTotal > 0
    ? Math.round(((plans.premium + plans.extra) / usersTotal) * 100)
    : 0;

  // Secteurs
  const sectors = {};
  AS.users.forEach(u => {
    const s = u.entreprise?.secteur || 'Non renseigné';
    sectors[s] = (sectors[s] || 0) + 1;
  });

  // Zones
  const zones = { saine: 0, vigilance: 0, risque: 0, critique: 0 };
  AS.analyses.forEach(a => {
    const sc = a.score || 0;
    if (sc >= 75)      zones.saine++;
    else if (sc >= 50) zones.vigilance++;
    else if (sc >= 25) zones.risque++;
    else               zones.critique++;
  });

  // Activité quotidienne (30 derniers jours)
  const dailyMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    dailyMap[d.toISOString().slice(0, 10)] = 0;
  }
  AS.analyses.forEach(a => {
    const d = new Date(_ts(a.createdAt)).toISOString().slice(0, 10);
    if (dailyMap[d] !== undefined) dailyMap[d]++;
  });

  return {
    usersTotal, usersThisMonth, usersThisWeek, usersDisabled,
    plans, analysesTotal, analysesThisMonth, analysesThisWeek,
    avgScore, mrr, convRate, failedPayments,
    sectors, zones, dailyMap,
  };
}

function _ts(v) {
  if (!v) return 0;
  if (v.seconds) return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  return new Date(v).getTime();
}

// ════════════════════════════════════════════════════════════════
//  VUE : OVERVIEW
// ════════════════════════════════════════════════════════════════
function _renderOverview(stats) {
  return `
    <!-- KPI GRID -->
    <div class="adm-kpi-grid">
      ${_kpi('Utilisateurs', stats.usersTotal,
        'fa-users', A.ice,
        `<span class="adm-trend up">+${stats.usersThisWeek} cette sem.</span>`, 'ice')}
      ${_kpi('Inscrits / mois', stats.usersThisMonth,
        'fa-user-plus', A.emerald, '', 'emerald')}
      ${_kpi('Analyses totales', stats.analysesTotal,
        'fa-microscope', A.gold,
        `<span class="adm-trend up">+${stats.analysesThisWeek} cette sem.</span>`, 'gold')}
      ${_kpi('Score moyen', stats.avgScore + '/100',
        'fa-heart-pulse', A.violet, '', 'violet')}
      ${_kpi('MRR', stats.mrr + ' €',
        'fa-coins', A.amber,
        `<span class="adm-trend ${stats.mrr > 0 ? 'up' : ''}">${stats.convRate}% conv.</span>`, 'amber')}
      ${_kpi('Paiements échoués', stats.failedPayments,
        'fa-circle-xmark', stats.failedPayments > 0 ? A.ruby : A.emerald,
        stats.failedPayments > 0 ? `<span class="adm-trend dn">Action requise</span>` : '', 'ruby')}
    </div>

    <!-- CHART + ZONE RISQUE + SECTEURS -->
    <div class="adm-row-3">
      <div class="adm-card" style="grid-column:span 1;">
        <div class="adm-card-title"><i class="fa-solid fa-chart-area"></i>Analyses / 30 jours</div>
        ${_sparklineChart(stats.dailyMap)}
      </div>
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-layer-group"></i>Répartition plans</div>
        ${_planBars(stats.plans)}
      </div>
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-circle-half-stroke"></i>Zones de risque</div>
        ${_zoneBars(stats.zones, stats.analysesTotal)}
      </div>
    </div>

    <!-- TOP SECTEURS + ACTIVITÉ -->
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:14px;">
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-building"></i>Top secteurs</div>
        ${_sectorList(stats.sectors)}
      </div>
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-clock-rotate-left"></i>Activité récente</div>
        <div class="adm-activity-list">${_recentActivity()}</div>
      </div>
    </div>
  `;
}

// ── Sparkline Chart SVG ─────────────────────────────────────────
function _sparklineChart(dailyMap) {
  const vals = Object.values(dailyMap);
  const keys = Object.keys(dailyMap);
  const max  = Math.max(...vals, 1);
  const W = 400, H = 80, pad = 4;
  const pts = vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  // gradient path
  const areaPath = `M${pad},${H} ` + vals.map((v, i) => {
    const x = pad + (i / (vals.length - 1)) * (W - pad * 2);
    const y = H - pad - (v / max) * (H - pad * 2);
    return `L${x},${y}`;
  }).join(' ') + ` L${W - pad},${H} Z`;

  const totalAnalyses = vals.reduce((a, b) => a + b, 0);
  const lastWeek = vals.slice(-7).reduce((a, b) => a + b, 0);
  const prevWeek = vals.slice(-14, -7).reduce((a, b) => a + b, 0);
  const trend = prevWeek > 0 ? Math.round(((lastWeek - prevWeek) / prevWeek) * 100) : 0;

  return `
    <div style="position:relative;">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:80px;overflow:visible;">
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${A.ice}" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="${A.ice}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <path d="${areaPath}" fill="url(#sg)"/>
        <polyline points="${pts}" fill="none" stroke="${A.ice}" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Points aux max -->
        ${vals.map((v, i) => v === max ? `
          <circle cx="${pad + (i / (vals.length - 1)) * (W - pad * 2)}"
                  cy="${H - pad - (v / max) * (H - pad * 2)}"
                  r="3" fill="${A.ice}" stroke="${A.bg}" stroke-width="1.5"/>
        ` : '').join('')}
      </svg>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
        <span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${A.muted};">
          ${keys[0]?.slice(5)} → ${keys[keys.length-1]?.slice(5)}
        </span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${A.ice};">
            ${totalAnalyses} analyses
          </span>
          <span class="adm-trend ${trend >= 0 ? 'up' : 'dn'}">
            ${trend >= 0 ? '+' : ''}${trend}% vs sem. préc.
          </span>
        </div>
      </div>
    </div>
  `;
}

function _kpi(label, val, icon, color, trend, cls) {
  return `
    <div class="adm-kpi adm-kpi-${cls}">
      <div class="adm-kpi-icon" style="color:${color};background:${color}18;">
        <i class="fa-solid ${icon}"></i>
      </div>
      <div class="adm-kpi-body">
        <div class="adm-kpi-val">${val}</div>
        <div class="adm-kpi-lbl">${label}</div>
        ${trend ? `<div class="adm-kpi-trend">${trend}</div>` : ''}
      </div>
    </div>
  `;
}

function _planBars(plans) {
  const total = Object.values(plans).reduce((a, b) => a + b, 0) || 1;
  const items = [
    { key: 'extra',    label: 'Extra',    color: A.violet },
    { key: 'premium',  label: 'Premium',  color: A.gold   },
    { key: 'standard', label: 'Standard', color: A.ice    },
    { key: 'trial',    label: 'Trial',    color: A.muted  },
  ];
  return items.map(({ key, label, color }) => {
    const n   = plans[key] || 0;
    const pct = Math.round((n / total) * 100);
    return `
      <div class="adm-bar-item">
        <div class="adm-bar-meta">
          <span class="adm-bar-dot" style="background:${color}"></span>
          <span class="adm-bar-lbl">${label}</span>
          <span class="adm-bar-val">${n} <span style="opacity:.45;font-size:9px;">(${pct}%)</span></span>
        </div>
        <div class="adm-bar-track">
          <div class="adm-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function _zoneBars(zones, total) {
  total = total || 1;
  const items = [
    { key: 'saine',     label: 'Zone Saine',  color: A.emerald },
    { key: 'vigilance', label: 'Vigilance',   color: A.amber   },
    { key: 'risque',    label: 'Risque',      color: '#f97316' },
    { key: 'critique',  label: 'Critique',    color: A.ruby    },
  ];
  return items.map(({ key, label, color }) => {
    const n   = zones[key] || 0;
    const pct = Math.round((n / total) * 100);
    return `
      <div class="adm-bar-item">
        <div class="adm-bar-meta">
          <span class="adm-bar-dot" style="background:${color}"></span>
          <span class="adm-bar-lbl">${label}</span>
          <span class="adm-bar-val">${n} <span style="opacity:.45;font-size:9px;">(${pct}%)</span></span>
        </div>
        <div class="adm-bar-track">
          <div class="adm-bar-fill" style="width:${pct}%;background:${color};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function _sectorList(sectors) {
  const sorted = Object.entries(sectors).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max    = sorted[0]?.[1] || 1;
  return sorted.map(([s, n]) => `
    <div class="adm-bar-item">
      <div class="adm-bar-meta">
        <span class="adm-bar-lbl" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s}</span>
        <span class="adm-bar-val">${n}</span>
      </div>
      <div class="adm-bar-track">
        <div class="adm-bar-fill" style="width:${Math.round((n/max)*100)}%;background:linear-gradient(90deg,${A.ice},${A.ice2});"></div>
      </div>
    </div>
  `).join('') || `<div style="color:rgba(255,255,255,.25);font-size:11px;padding:12px 0;">Aucune donnée</div>`;
}

function _recentActivity() {
  const events = [];
  AS.users.slice(0, 3).forEach(u => events.push({
    icon: 'fa-user-plus', color: A.ice,
    text: `<strong>${u.prenom || ''} ${u.nom || ''}</strong> (${u.email || '—'}) a rejoint la plateforme`,
    ts: _ts(u.createdAt),
  }));
  AS.analyses.slice(0, 5).forEach(a => {
    const col = a.score >= 75 ? A.emerald : a.score >= 50 ? A.amber : a.score >= 25 ? '#f97316' : A.ruby;
    const zone = a.score >= 75 ? 'Saine' : a.score >= 50 ? 'Vigilance' : a.score >= 25 ? 'Risque' : 'Critique';
    events.push({
      icon: 'fa-microscope', color: col,
      text: `Analyse <strong>${a.entreprise || '—'}</strong> · Score <strong style="color:${col}">${a.score}/100</strong> · ${zone}`,
      ts: _ts(a.createdAt),
    });
  });
  AS.abonnements.filter(a => a.status === 'failed').slice(0, 2).forEach(ab => {
    const u = AS.users.find(u => u.id === ab.id) || {};
    events.push({
      icon: 'fa-credit-card', color: A.ruby,
      text: `Paiement échoué · <strong>${u.email || ab.id}</strong> · plan ${ab.plan}`,
      ts: _ts(ab.updatedAt || ab.startDate),
    });
  });
  events.sort((a, b) => b.ts - a.ts);
  return events.slice(0, 9).map(e => `
    <div class="adm-activity-item">
      <div class="adm-act-icon" style="color:${e.color};background:${e.color}18;">
        <i class="fa-solid ${e.icon}"></i>
      </div>
      <div class="adm-act-body">
        <div class="adm-act-text">${e.text}</div>
        <div class="adm-act-time">${_timeAgo(e.ts)}</div>
      </div>
    </div>
  `).join('') || `<div style="color:rgba(255,255,255,.25);font-size:11px;padding:16px;text-align:center;">Aucune activité récente</div>`;
}

// ════════════════════════════════════════════════════════════════
//  VUE : UTILISATEURS
// ════════════════════════════════════════════════════════════════
function _renderUsers() {
  let users = [...AS.users];

  // Filtre texte
  if (AS.userFilter) {
    const q = AS.userFilter.toLowerCase();
    users = users.filter(u =>
      (u.email || '').toLowerCase().includes(q) ||
      (u.prenom || '').toLowerCase().includes(q) ||
      (u.nom || '').toLowerCase().includes(q) ||
      (u.entreprise?.nom || '').toLowerCase().includes(q)
    );
  }

  // Filtre statut
  if (AS.userStatusFilter === 'verified')   users = users.filter(u => u.emailVerified !== false);
  if (AS.userStatusFilter === 'unverified') users = users.filter(u => u.emailVerified === false);
  if (AS.userStatusFilter === 'disabled')   users = users.filter(u => u.disabled);
  if (AS.userStatusFilter === 'active')     users = users.filter(u => !u.disabled && u.emailVerified !== false);

  // Tri
  users.sort((a, b) => {
    if (AS.userSort === 'createdAt')  return _ts(b.createdAt) - _ts(a.createdAt);
    if (AS.userSort === 'lastLogin')  return _ts(b.lastLogin) - _ts(a.lastLogin);
    if (AS.userSort === 'email')      return (a.email||'').localeCompare(b.email||'');
    if (AS.userSort === 'plan')       return (a.plan||'').localeCompare(b.plan||'');
    if (AS.userSort === 'analyses') {
      const na = AS.analyses.filter(x => x.userId === a.id).length;
      const nb = AS.analyses.filter(x => x.userId === b.id).length;
      return nb - na;
    }
    return 0;
  });

  const unverifiedCount = AS.users.filter(u => u.emailVerified === false).length;

  return `
    <!-- Alertes utilisateurs -->
    ${unverifiedCount > 0 ? `
      <div class="adm-alert-bar warn">
        <i class="fa-solid fa-envelope-circle-check"></i>
        <span><strong>${unverifiedCount}</strong> utilisateur${unverifiedCount > 1 ? 's' : ''} avec email non vérifié</span>
      </div>
    ` : ''}

    <!-- Toolbar -->
    <div class="adm-users-header">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <div class="adm-search-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder="Nom, email, entreprise…"
            value="${AS.userFilter}"
            oninput="window.DS_ADMIN?.filterUsers(this.value)">
        </div>
        <select class="adm-select" onchange="window.DS_ADMIN?.filterUserStatus(this.value)">
          <option value="all"        ${AS.userStatusFilter==='all'       ?'selected':''}>Tous les statuts</option>
          <option value="active"     ${AS.userStatusFilter==='active'    ?'selected':''}>Actifs</option>
          <option value="unverified" ${AS.userStatusFilter==='unverified'?'selected':''}>Non vérifiés</option>
          <option value="disabled"   ${AS.userStatusFilter==='disabled'  ?'selected':''}>Désactivés</option>
        </select>
        <select class="adm-select" onchange="window.DS_ADMIN?.sortUsers(this.value)">
          <option value="createdAt" ${AS.userSort==='createdAt'?'selected':''}>Tri: Inscription</option>
          <option value="lastLogin" ${AS.userSort==='lastLogin'?'selected':''}>Tri: Connexion</option>
          <option value="email"     ${AS.userSort==='email'    ?'selected':''}>Tri: Email</option>
          <option value="plan"      ${AS.userSort==='plan'     ?'selected':''}>Tri: Plan</option>
          <option value="analyses"  ${AS.userSort==='analyses' ?'selected':''}>Tri: Analyses</option>
        </select>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="adm-users-count">${users.length} / ${AS.users.length} utilisateurs</div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="adm-table-wrap">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Utilisateur</th>
            <th>Entreprise</th>
            <th>Plan</th>
            <th>Inscription</th>
            <th>Dernière co.</th>
            <th>Analyses</th>
            <th>Statut</th>
            <th style="text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.length ? users.map(u => _userRow(u)).join('') : `
            <tr><td colspan="8" style="text-align:center;padding:32px;color:rgba(255,255,255,.2);font-size:12px;">
              Aucun utilisateur trouvé
            </td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function _userRow(u) {
  const initials  = [(u.prenom||'')[0], (u.nom||'')[0]].filter(Boolean).join('').toUpperCase() || '?';
  const planColors = { premium: A.gold, extra: A.violet, standard: A.ice, trial: A.muted };
  const ab         = AS.abonnements.find(a => a.id === u.id);
  const plan       = ab?.plan || u.plan || 'standard';
  const planColor  = planColors[plan] || A.muted;
  const nbAnalyses = AS.analyses.filter(a => a.userId === u.id).length;
  const verified   = u.emailVerified !== false;
  const disabled   = u.disabled === true;

  let statusHtml;
  if (disabled) {
    statusHtml = `<span class="adm-status-dot err"><i class="fa-solid fa-ban"></i> Désactivé</span>`;
  } else if (!verified) {
    statusHtml = `<span class="adm-status-dot warn"><i class="fa-solid fa-envelope"></i> Non vérifié</span>`;
  } else {
    statusHtml = `<span class="adm-status-dot ok"><i class="fa-solid fa-circle-check"></i> Actif</span>`;
  }

  return `
    <tr class="adm-table-row ${disabled ? 'adm-row-disabled' : ''}" onclick="window.DS_ADMIN?.openUser('${u.id}')">
      <td>
        <div class="adm-user-cell">
          <div class="adm-avatar-sm" style="background:linear-gradient(135deg,${planColor}22,${planColor}44);color:${planColor};">
            ${u.photoURL
              ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`
              : initials}
          </div>
          <div>
            <div class="adm-user-name">${u.prenom || ''} ${u.nom || ''}</div>
            <div class="adm-user-email">${u.email || '—'}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="adm-cell-main">${u.entreprise?.nom || '—'}</div>
        <div class="adm-cell-sub">${u.entreprise?.secteur || ''}</div>
      </td>
      <td>
        <span class="adm-plan-badge" style="color:${planColor};background:${planColor}18;border-color:${planColor}33;">${plan}</span>
      </td>
      <td><div class="adm-cell-mono">${_dateShort(_ts(u.createdAt))}</div></td>
      <td><div class="adm-cell-mono">${_dateShort(_ts(u.lastLogin))}</div></td>
      <td>
        <div class="adm-analyses-count" style="color:${nbAnalyses > 0 ? A.ice : A.muted};">${nbAnalyses}</div>
      </td>
      <td>${statusHtml}</td>
      <td onclick="event.stopPropagation()">
        <div class="adm-actions" style="justify-content:flex-end;">
          <button class="adm-action-btn" title="Voir le profil"
            onclick="window.DS_ADMIN?.openUser('${u.id}')">
            <i class="fa-solid fa-eye"></i>
          </button>
          <button class="adm-action-btn" title="Changer le plan"
            onclick="window.DS_ADMIN?.openChangePlan('${u.id}','${plan}')">
            <i class="fa-solid fa-credit-card"></i>
          </button>
          <button class="adm-action-btn ${disabled ? '' : 'warn'}" title="${disabled ? 'Réactiver' : 'Désactiver'}"
            onclick="window.DS_ADMIN?.toggleDisable('${u.id}',${disabled})">
            <i class="fa-solid ${disabled ? 'fa-lock-open' : 'fa-ban'}"></i>
          </button>
          <button class="adm-action-btn msg" title="Envoyer un message"
            onclick="window.DS_ADMIN?.openMessage('${u.id}')">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
          <button class="adm-action-btn danger" title="Supprimer"
            onclick="window.DS_ADMIN?.confirmDelete('${u.id}','${u.email}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// ════════════════════════════════════════════════════════════════
//  VUE : ABONNEMENTS / PAIEMENTS
// ════════════════════════════════════════════════════════════════
function _renderAbonnements(stats) {
  const failedList = AS.abonnements.filter(a => a.status === 'failed' || a.status === 'past_due');
  const priceMap   = { standard: 0, premium: 49, extra: 149, trial: 0 };

  return `
    <!-- Alertes paiements -->
    ${failedList.length > 0 ? `
      <div class="adm-alert-bar err">
        <i class="fa-solid fa-credit-card"></i>
        <span><strong>${failedList.length}</strong> paiement${failedList.length > 1 ? 's' : ''} échoué${failedList.length > 1 ? 's' : ''} — action requise</span>
        <button class="adm-btn-danger" style="padding:5px 12px;font-size:8px;margin-left:auto;"
          onclick="window.DS_ADMIN?.switchTab('abonnements')">Voir</button>
      </div>
    ` : ''}

    <!-- KPIs paiements -->
    <div class="adm-kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      ${_kpi('Plan Extra',     stats.plans.extra    || 0, 'fa-star',          A.violet, '', 'violet')}
      ${_kpi('Plan Premium',   stats.plans.premium  || 0, 'fa-crown',         A.gold,   '', 'gold')}
      ${_kpi('Plan Standard',  stats.plans.standard || 0, 'fa-user',          A.ice,    '', 'ice')}
      ${_kpi('MRR total',      stats.mrr + ' €',          'fa-chart-line',    A.emerald,'', 'emerald')}
    </div>

    <!-- Paiements échoués -->
    ${failedList.length > 0 ? `
      <div class="adm-card" style="border-color:rgba(239,68,68,.25);">
        <div class="adm-card-title" style="color:${A.ruby};">
          <i class="fa-solid fa-triangle-exclamation" style="color:${A.ruby};"></i>
          Paiements échoués / En retard
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th>Utilisateur</th><th>Plan</th><th>Statut</th>
                <th>Stripe ID</th><th>Depuis</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${failedList.map(ab => {
                const u = AS.users.find(u => u.id === ab.id) || {};
                const pc = { premium: A.gold, extra: A.violet, standard: A.ice }[ab.plan] || A.muted;
                return `
                  <tr class="adm-table-row">
                    <td>
                      <div class="adm-user-name">${u.prenom||''} ${u.nom||''}</div>
                      <div class="adm-user-email">${u.email || ab.id}</div>
                    </td>
                    <td>
                      <span class="adm-plan-badge" style="color:${pc};background:${pc}18;border-color:${pc}33;">${ab.plan||'?'}</span>
                    </td>
                    <td>
                      <span class="adm-status-dot err">
                        <i class="fa-solid fa-circle-xmark"></i>
                        ${ab.status === 'past_due' ? 'En retard' : 'Échoué'}
                      </span>
                    </td>
                    <td>
                      <code class="adm-stripe-id">${ab.stripeSubscriptionId || '—'}</code>
                    </td>
                    <td><div class="adm-cell-mono">${_dateShort(_ts(ab.updatedAt || ab.startDate))}</div></td>
                    <td>
                      <div class="adm-actions">
                        <button class="adm-btn-secondary" style="padding:5px 10px;font-size:8px;"
                          onclick="window.DS_ADMIN?.openRefund('${ab.id}')">
                          <i class="fa-solid fa-rotate-left"></i> Rembourser
                        </button>
                        <button class="adm-btn-danger" style="padding:5px 10px;font-size:8px;"
                          onclick="window.DS_ADMIN?.confirmCancelSubscription('${ab.id}','${u.email}')">
                          <i class="fa-solid fa-ban"></i> Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}

    <!-- Tous les abonnements -->
    <div class="adm-card" style="margin-bottom:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div class="adm-card-title" style="margin-bottom:0;">
          <i class="fa-solid fa-credit-card"></i>Tous les abonnements
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${A.muted};">
          ${AS.abonnements.length} abonnements · ${stats.mrr} € MRR
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Utilisateur</th><th>Plan</th><th>Statut</th>
              <th>Stripe ID</th><th>Depuis</th><th>Valeur/mois</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${AS.abonnements.map(ab => {
              const u = AS.users.find(u => u.id === ab.id) || {};
              const planColors = { premium: A.gold, extra: A.violet, standard: A.ice, trial: A.muted };
              const pc  = planColors[ab.plan] || A.muted;
              const price = priceMap[ab.plan] || 0;
              const statusColors = {
                active: A.emerald, trial: A.amber,
                failed: A.ruby, past_due: A.ruby, cancelled: A.muted,
              };
              const sc = statusColors[ab.status] || A.muted;
              return `
                <tr class="adm-table-row">
                  <td>
                    <div class="adm-user-name">${u.prenom||''} ${u.nom||''}</div>
                    <div class="adm-user-email">${u.email || ab.id}</div>
                  </td>
                  <td>
                    <span class="adm-plan-badge" style="color:${pc};background:${pc}18;border-color:${pc}33;">
                      ${ab.plan || 'standard'}
                    </span>
                  </td>
                  <td>
                    <span class="adm-status-dot" style="color:${sc};background:${sc}18;">
                      <i class="fa-solid ${ab.status === 'active' ? 'fa-circle-check' : ab.status === 'trial' ? 'fa-clock' : 'fa-circle-xmark'}"></i>
                      ${ab.status || 'trial'}
                    </span>
                  </td>
                  <td>
                    <code class="adm-stripe-id">${ab.stripeSubscriptionId?.slice(0, 18) || '—'}…</code>
                  </td>
                  <td><div class="adm-cell-mono">${_dateShort(_ts(ab.startDate))}</div></td>
                  <td>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${price > 0 ? A.emerald : A.muted};">
                      ${price > 0 ? price + ' €' : '—'}
                    </div>
                  </td>
                  <td>
                    <div class="adm-actions">
                      <button class="adm-action-btn" title="Changer le plan"
                        onclick="window.DS_ADMIN?.openChangePlan('${ab.id}','${ab.plan}')">
                        <i class="fa-solid fa-pen"></i>
                      </button>
                      <button class="adm-action-btn" title="Rembourser"
                        onclick="window.DS_ADMIN?.openRefund('${ab.id}')">
                        <i class="fa-solid fa-rotate-left"></i>
                      </button>
                      ${ab.status !== 'cancelled' ? `
                        <button class="adm-action-btn danger" title="Annuler abonnement"
                          onclick="window.DS_ADMIN?.confirmCancelSubscription('${ab.id}','${u.email}')">
                          <i class="fa-solid fa-ban"></i>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  VUE : ANALYSES
// ════════════════════════════════════════════════════════════════
function _renderAnalyses() {
  let analyses = [...AS.analyses];

  // Filtre texte
  if (AS.analysesFilter) {
    const q = AS.analysesFilter.toLowerCase();
    analyses = analyses.filter(a =>
      (a.entreprise || '').toLowerCase().includes(q) ||
      (a.secteur || '').toLowerCase().includes(q)
    );
  }

  // Tri
  analyses.sort((a, b) => {
    if (AS.analysesSort === 'createdAt') return _ts(b.createdAt) - _ts(a.createdAt);
    if (AS.analysesSort === 'score_asc') return (a.score || 0) - (b.score || 0);
    if (AS.analysesSort === 'score_desc') return (b.score || 0) - (a.score || 0);
    return 0;
  });

  const stats = _computeStats();

  return `
    <!-- Statistiques analyses -->
    <div class="adm-kpi-grid" style="grid-template-columns:repeat(4,1fr);">
      ${_kpi('Zone Saine',   stats.zones.saine,    'fa-shield-halved', A.emerald, '', 'emerald')}
      ${_kpi('Vigilance',    stats.zones.vigilance, 'fa-eye',           A.amber,   '', 'amber')}
      ${_kpi('Risque',       stats.zones.risque,    'fa-triangle-exclamation', '#f97316', '', 'amber')}
      ${_kpi('Critique',     stats.zones.critique,  'fa-skull',         A.ruby,    '', 'ruby')}
    </div>

    <!-- Chart + tableau -->
    <div class="adm-card" style="margin-bottom:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div class="adm-card-title" style="margin-bottom:0;">
          <i class="fa-solid fa-microscope"></i>Toutes les analyses
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="adm-search-wrap">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" placeholder="Entreprise, secteur…"
              value="${AS.analysesFilter}"
              oninput="window.DS_ADMIN?.filterAnalyses(this.value)">
          </div>
          <select class="adm-select" onchange="window.DS_ADMIN?.sortAnalyses(this.value)">
            <option value="createdAt"  ${AS.analysesSort==='createdAt'  ?'selected':''}>Tri: Date</option>
            <option value="score_desc" ${AS.analysesSort==='score_desc' ?'selected':''}>Tri: Score ↓</option>
            <option value="score_asc"  ${AS.analysesSort==='score_asc'  ?'selected':''}>Tri: Score ↑</option>
          </select>
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${A.muted};">
            ${analyses.length} résultats
          </span>
        </div>
      </div>
      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Entreprise</th>
              <th>Utilisateur</th>
              <th>Score</th>
              <th>Zone</th>
              <th>Plan</th>
              <th>Date</th>
              <th>Temps</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${analyses.slice(0, 150).map(a => {
              const u = AS.users.find(u => u.id === a.userId) || {};
              const sc = a.score || 0;
              const zd = sc >= 75 ? { l: 'Saine',    c: A.emerald }
                       : sc >= 50 ? { l: 'Vigilance', c: A.amber  }
                       : sc >= 25 ? { l: 'Risque',    c: '#f97316'}
                                  : { l: 'Critique',  c: A.ruby   };
              return `
                <tr class="adm-table-row">
                  <td>
                    <div class="adm-user-name">${a.entreprise || '—'}</div>
                    <div class="adm-user-email">${a.secteur || ''}</div>
                  </td>
                  <td>
                    <div class="adm-cell-sub">${u.email || a.userId?.slice(0,12) || '—'}</div>
                  </td>
                  <td>
                    <div class="adm-score-cell" style="color:${zd.c};">
                      <span class="adm-score-num">${sc}</span>
                      <span style="font-size:9px;opacity:.5;">/100</span>
                    </div>
                  </td>
                  <td>
                    <span class="adm-plan-badge" style="color:${zd.c};background:${zd.c}18;border-color:${zd.c}33;">
                      ${zd.l}
                    </span>
                  </td>
                  <td><div class="adm-cell-sub">${a.plan || 'standard'}</div></td>
                  <td><div class="adm-cell-mono">${_dateShort(_ts(a.createdAt))}</div></td>
                  <td>
                    <div class="adm-cell-mono" style="color:${
                      !a.processingTime ? A.muted :
                      a.processingTime < 2000 ? A.emerald :
                      a.processingTime < 5000 ? A.amber : A.ruby
                    };">
                      ${a.processingTime ? a.processingTime + 'ms' : '—'}
                    </div>
                  </td>
                  <td>
                    <button class="adm-action-btn danger" title="Supprimer cette analyse"
                      onclick="window.DS_ADMIN?.confirmDeleteAnalyse('${a.id}','${(a.entreprise||'').replace(/'/g,'\\\'')}')"
                      style="font-size:10px;">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${analyses.length > 150 ? `
        <div style="text-align:center;padding:12px 0;font-size:10px;color:${A.muted};">
          Affichage limité à 150 résultats · ${analyses.length - 150} masquées — affinez la recherche
        </div>
      ` : ''}
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  VUE : SYSTÈME
// ════════════════════════════════════════════════════════════════
function _renderSystem(stats) {
  const errorLogs = AS._logs.filter(l => l.level === 'error');

  return `
    <!-- Alertes système -->
    ${errorLogs.length > 0 ? `
      <div class="adm-alert-bar err">
        <i class="fa-solid fa-bug"></i>
        <span><strong>${errorLogs.length}</strong> erreur${errorLogs.length > 1 ? 's' : ''} système détectée${errorLogs.length > 1 ? 's' : ''}</span>
      </div>
    ` : ''}

    <div class="adm-system-grid">

      <!-- ── 1. FastAPI Status ── -->
      <div class="adm-card" id="adm-api-card">
        <div class="adm-card-title"><i class="fa-solid fa-server"></i>FastAPI Backend</div>
        <div class="adm-api-status" id="adm-api-status">
          <div class="adm-spinner"></div>
          <span style="color:${A.muted};font-size:11px;">Vérification en cours…</span>
        </div>
        <div class="adm-endpoint-list" id="adm-endpoints">
          ${[
            { ep: '/health',          label: 'Health check'     },
            { ep: '/analyses',        label: 'Endpoint analyses' },
            { ep: '/chat',            label: 'Endpoint chat'     },
            { ep: '/analyses/whatif', label: 'What-If simulator' },
          ].map(({ ep, label }) => `
            <div class="adm-endpoint" id="adm-ep-${ep.replace(/\//g,'-').slice(1)}">
              <span class="adm-ep-dot"></span>
              <div style="flex:1;">
                <code>${ep}</code>
                <div style="font-size:8px;color:${A.muted};margin-top:1px;">${label}</div>
              </div>
              <div style="text-align:right;">
                <span class="adm-ep-status">—</span>
                <div class="adm-ep-latency" style="font-size:8px;color:${A.muted};">—</div>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:14px;">
          <button class="adm-btn-primary" onclick="window.DS_ADMIN?.pingAPI()" style="width:100%;justify-content:center;">
            <i class="fa-solid fa-rotate-right"></i> Tester la connexion
          </button>
        </div>
      </div>

      <!-- ── 2. ML Models ── -->
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-brain"></i>Modèles ML</div>
        <div id="adm-ml-status">
          ${AS._mlStatus ? _renderMLStatus(AS._mlStatus) : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
                { name: 'Scoring Model v3.2', auc: '0.894', last: 'Il y a 12j', status: 'ok' },
                { name: 'Risk Classifier',    auc: '0.876', last: 'Il y a 12j', status: 'ok' },
                { name: 'NLP Analyser',       auc: '—',     last: 'Il y a 5j',  status: 'warn' },
              ].map(m => `
                <div class="adm-ml-row">
                  <div class="adm-ep-dot" style="background:${m.status === 'ok' ? A.emerald : A.amber};"></div>
                  <div style="flex:1;">
                    <div style="font-size:11px;font-weight:600;">${m.name}</div>
                    <div style="font-size:9px;color:${A.muted};">Dernier entraînement: ${m.last}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${m.status === 'ok' ? A.emerald : A.amber};">
                      AUC ${m.auc}
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
            <button class="adm-btn-secondary" style="margin-top:12px;width:100%;justify-content:center;"
              onclick="window.DS_ADMIN?.fetchMLStatus()">
              <i class="fa-solid fa-rotate-right"></i> Actualiser statut ML
            </button>
          `}
        </div>
      </div>

      <!-- ── 3. Quotas API ── -->
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-gauge-simple-high"></i>Consommation API</div>
        <div id="adm-quotas">
          ${[
            { name: 'Groq API',    used: 68,  limit: 100, unit: '% du quota mensuel', color: A.amber  },
            { name: 'Gemini API',  used: 31,  limit: 100, unit: '% du quota mensuel', color: A.ice    },
            { name: 'OpenAI (TTS)',used: 12,  limit: 100, unit: '% du quota mensuel', color: A.violet },
            { name: 'Firebase',    used: 4.2, limit: 10,  unit: 'GB / 10 GB',         color: A.emerald},
          ].map(q => {
            const pct = Math.round((q.used / q.limit) * 100);
            const c = pct > 80 ? A.ruby : pct > 60 ? A.amber : q.color;
            return `
              <div class="adm-bar-item">
                <div class="adm-bar-meta">
                  <span class="adm-bar-lbl">${q.name}</span>
                  <span class="adm-bar-val" style="color:${c};">${q.used} ${q.unit}</span>
                </div>
                <div class="adm-bar-track">
                  <div class="adm-bar-fill" style="width:${pct}%;background:${c};transition:width 1s ease;"></div>
                </div>
                ${pct > 80 ? `<div style="font-size:8px;color:${A.ruby};margin-top:2px;"><i class="fa-solid fa-triangle-exclamation"></i> Quota critique</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <button class="adm-btn-secondary" style="margin-top:12px;width:100%;justify-content:center;"
          onclick="window.DS_ADMIN?.fetchAPIQuotas()">
          <i class="fa-solid fa-rotate-right"></i> Actualiser quotas
        </button>
      </div>

      <!-- ── 4. Firebase Firestore ── -->
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-fire"></i>Firebase Firestore</div>
        <div class="adm-sys-stats">
          ${_sysRow('Collection users',       AS.users.length + ' documents',       A.ice)}
          ${_sysRow('Collection analyses',    AS.analyses.length + ' documents',    A.gold)}
          ${_sysRow('Collection abonnements', AS.abonnements.length + ' documents', A.emerald)}
          ${_sysRow('Total lectures (session)', (AS.users.length + AS.analyses.length + AS.abonnements.length) + ' reads', A.violet)}
        </div>
        <div class="adm-card-title" style="margin-top:18px;"><i class="fa-solid fa-shield-halved"></i>Firebase Auth</div>
        <div class="adm-sys-stats">
          ${_sysRow('Utilisateurs vérifiés',    AS.users.filter(u => u.emailVerified !== false).length + '',  A.emerald)}
          ${_sysRow('Email non vérifié',         AS.users.filter(u => u.emailVerified === false).length + '',  A.amber)}
          ${_sysRow('Comptes désactivés',        AS.users.filter(u => u.disabled).length + '',                A.ruby)}
          ${_sysRow('Connectés via Google',      AS.users.filter(u => u.source === 'google').length + '',     A.ice)}
        </div>
      </div>

      <!-- ── 5. Configuration plateforme ── -->
      <div class="adm-card">
        <div class="adm-card-title"><i class="fa-solid fa-sliders"></i>Configuration plateforme</div>
        <div class="adm-config-list">
          ${_configRow('Limite analyses / mois (Standard)', '5',      'standard')}
          ${_configRow('Limite analyses / mois (Premium)',  '50',     'premium')}
          ${_configRow('Limite analyses / mois (Extra)',    '∞',      'extra')}
          ${_configRow('What-If Simulator',                 'Premium+','feature')}
          ${_configRow('Export PDF',                        'Premium+','feature')}
          ${_configRow('API directe',                       'Extra',   'feature')}
          ${_configRow('TTS / Appel IA',                   'Tous',    'feature')}
        </div>
        <div style="margin-top:16px;display:flex;flex-direction:column;gap:8px;">
          <button class="adm-btn-secondary" style="width:100%;justify-content:center;"
            onclick="window.DS_ADMIN?.showMaintenanceToggle()">
            <i class="fa-solid fa-triangle-exclamation"></i> Activer mode maintenance
          </button>
          <button class="adm-btn-secondary" style="width:100%;justify-content:center;"
            onclick="window.DS_ADMIN?.exportCSV()">
            <i class="fa-solid fa-file-csv"></i> Exporter données CSV
          </button>
        </div>
      </div>

      <!-- ── 6. Logs d'erreurs ── -->
      <div class="adm-card" style="${errorLogs.length > 0 ? 'border-color:rgba(239,68,68,.22);' : ''}">
        <div class="adm-card-title" style="${errorLogs.length > 0 ? 'color:'+A.ruby+';' : ''}">
          <i class="fa-solid fa-bug" style="${errorLogs.length > 0 ? 'color:'+A.ruby+';' : ''}"></i>
          Logs d'erreurs récents
          ${errorLogs.length > 0 ? `<span class="adm-tab-badge" style="margin-left:auto;">${errorLogs.length}</span>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:5px;max-height:220px;overflow-y:auto;">
          ${AS._logs.length === 0 ? `
            <div class="adm-log-empty">
              <i class="fa-solid fa-circle-check" style="color:${A.emerald};"></i>
              Aucune erreur enregistrée
            </div>
          ` : AS._logs.slice(-20).reverse().map(log => `
            <div class="adm-log-row adm-log-${log.level}">
              <span class="adm-log-badge ${log.level}">${log.level.toUpperCase()}</span>
              <span class="adm-log-source">[${log.source}]</span>
              <span class="adm-log-msg">${log.message}</span>
              <span class="adm-log-time">${_timeAgo(log.ts)}</span>
            </div>
          `).join('')}
        </div>
        <button class="adm-btn-secondary" style="margin-top:10px;width:100%;justify-content:center;"
          onclick="window.DS_ADMIN?.clearLogs()">
          <i class="fa-solid fa-eraser"></i> Vider les logs
        </button>
      </div>

    </div>
  `;
}

function _renderMLStatus(status) {
  return status.models.map(m => `
    <div class="adm-ml-row">
      <div class="adm-ep-dot" style="background:${m.status === 'ok' ? A.emerald : A.amber};"></div>
      <div style="flex:1;">
        <div style="font-size:11px;font-weight:600;">${m.name}</div>
        <div style="font-size:9px;color:${A.muted};">Dernier train: ${m.lastTrain}</div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${m.status === 'ok' ? A.emerald : A.amber};">
        AUC ${m.auc}
      </div>
    </div>
  `).join('');
}

function _sysRow(label, val, color) {
  return `
    <div class="adm-sys-row">
      <span class="adm-sys-lbl">${label}</span>
      <span class="adm-sys-val" style="color:${color};">${val}</span>
    </div>
  `;
}

function _configRow(label, val, type) {
  const colors = { standard: A.ice, premium: A.gold, extra: A.violet, feature: A.emerald };
  const c = colors[type] || A.muted;
  return `
    <div class="adm-sys-row">
      <span class="adm-sys-lbl">${label}</span>
      <span class="adm-plan-badge" style="color:${c};background:${c}14;border-color:${c}28;font-size:8px;">${val}</span>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  ACTIONS FIREBASE
// ════════════════════════════════════════════════════════════════

// Changer le plan
async function _changePlan(uid, newPlan) {
  try {
    await updateDoc(doc(db, 'abonnements', uid), {
      plan: newPlan, status: 'active', updatedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', uid), { plan: newPlan });
    _showToast(`✅ Plan mis à jour : ${newPlan}`, 'ok');
    await _loadAllData();
    renderAdmin();
  } catch(e) {
    _addLog('error', 'Firebase', e.message);
    _showToast('❌ Erreur : ' + e.message, 'err');
  }
}

// Supprimer utilisateur
async function _deleteUser(uid) {
  try {
    await deleteDoc(doc(db, 'users', uid));
    await deleteDoc(doc(db, 'abonnements', uid));
    _showToast('✅ Utilisateur supprimé de Firestore', 'ok');
    await _loadAllData();
    renderAdmin();
  } catch(e) {
    _addLog('error', 'Firebase', e.message);
    _showToast('❌ Erreur : ' + e.message, 'err');
  }
}

// Désactiver / réactiver utilisateur
async function _toggleDisable(uid, currentlyDisabled) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      disabled: !currentlyDisabled,
      updatedAt: serverTimestamp(),
    });
    const action = currentlyDisabled ? 'réactivé' : 'désactivé';
    _showToast(`✅ Compte ${action}`, 'ok');
    await _loadAllData();
    const content = document.getElementById('adm-content');
    if (content) content.innerHTML = _renderUsers();
  } catch(e) {
    _addLog('error', 'Firebase', e.message);
    _showToast('❌ Erreur : ' + e.message, 'err');
  }
}

// Réinitialiser mot de passe (via Firebase Auth REST)
async function _sendResetPassword(email) {
  try {
    // Firebase Auth : envoi reset par l'API REST
    const apiKey = window.firebaseConfig?.apiKey || '';
    if (!apiKey) throw new Error('Clé API Firebase non trouvée');
    const r = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
      }
    );
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.error?.message || 'Erreur inconnue');
    }
    _showToast(`✅ Email de réinitialisation envoyé à ${email}`, 'ok');
    _addLog('info', 'Auth', `Reset password envoyé à ${email}`);
  } catch(e) {
    _addLog('error', 'Auth', e.message);
    _showToast('❌ Erreur reset : ' + e.message, 'err');
  }
}

// Supprimer une analyse
async function _deleteAnalyse(aid) {
  try {
    await deleteDoc(doc(db, 'analyses', aid));
    _showToast('✅ Analyse supprimée', 'ok');
    await _loadAllData();
    const content = document.getElementById('adm-content');
    if (content) content.innerHTML = _renderAnalyses();
  } catch(e) {
    _addLog('error', 'Firebase', e.message);
    _showToast('❌ Erreur : ' + e.message, 'err');
  }
}

// Annuler abonnement
async function _cancelSubscription(uid) {
  try {
    await updateDoc(doc(db, 'abonnements', uid), {
      status: 'cancelled', cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    // Si un stripeSubscriptionId existe, il faudrait appeler l'API Stripe côté serveur
    _showToast('✅ Abonnement annulé dans Firestore', 'ok');
    _addLog('warn', 'Stripe', `Abonnement ${uid} annulé manuellement — vérifier Stripe dashboard`);
    await _loadAllData();
    renderAdmin();
  } catch(e) {
    _addLog('error', 'Firebase', e.message);
    _showToast('❌ Erreur : ' + e.message, 'err');
  }
}

// ════════════════════════════════════════════════════════════════
//  PING API
// ════════════════════════════════════════════════════════════════
async function pingAPI() {
  const el = document.getElementById('adm-api-status');
  if (el) el.innerHTML = '<div class="adm-spinner"></div><span style="color:rgba(255,255,255,.5);font-size:11px;">Test en cours…</span>';

  const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
  const endpoints = ['/health', '/analyses', '/chat', '/analyses/whatif'];

  let allOk = true;

  for (const ep of endpoints) {
    const domId = 'adm-ep-' + ep.replace(/\//g, '-').slice(1);
    const epEl  = document.getElementById(domId);
    const t0    = Date.now();
    try {
      const r = await fetch(API_BASE + ep, { method: 'GET', signal: AbortSignal.timeout(4000) });
      const latency = Date.now() - t0;
      if (epEl) {
        const dot = epEl.querySelector('.adm-ep-dot');
        const st  = epEl.querySelector('.adm-ep-status');
        const lt  = epEl.querySelector('.adm-ep-latency');
        if (dot) dot.style.background = r.ok ? A.emerald : A.amber;
        if (st)  st.textContent = r.status;
        if (lt)  { lt.textContent = latency + 'ms'; lt.style.color = latency > 1000 ? A.amber : A.emerald; }
        if (!r.ok) allOk = false;
      }
    } catch(err) {
      allOk = false;
      if (epEl) {
        const dot = epEl.querySelector('.adm-ep-dot');
        const st  = epEl.querySelector('.adm-ep-status');
        const lt  = epEl.querySelector('.adm-ep-latency');
        if (dot) dot.style.background = A.ruby;
        if (st)  st.textContent = 'Hors ligne';
        if (lt)  lt.textContent = '—';
      }
      _addLog('error', 'FastAPI', `${ep} → ${err.message}`);
    }
  }

  if (el) {
    el.innerHTML = allOk
      ? `<span class="adm-status-dot ok"><i class="fa-solid fa-circle-check"></i> En ligne · ${API_BASE}</span>`
      : allOk === false && endpoints.every(ep => {
          const d = document.getElementById('adm-ep-' + ep.replace(/\//g,'-').slice(1));
          return d?.querySelector('.adm-ep-status')?.textContent === 'Hors ligne';
        })
        ? `<span class="adm-status-dot err"><i class="fa-solid fa-circle-xmark"></i> Backend hors ligne · ${API_BASE}</span>`
        : `<span class="adm-status-dot warn"><i class="fa-solid fa-circle-exclamation"></i> Partiellement disponible</span>`;
  }
}

// Fetch statut modèles ML
async function fetchMLStatus() {
  const el = document.getElementById('adm-ml-status');
  if (el) el.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><div class="adm-spinner"></div><span style="font-size:11px;color:rgba(255,255,255,.4);">Interrogation modèles…</span></div>';

  const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
  try {
    const r = await fetch(API_BASE + '/ml/status', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      AS._mlStatus = await r.json();
      if (el) el.innerHTML = _renderMLStatus(AS._mlStatus);
    } else {
      throw new Error(`HTTP ${r.status}`);
    }
  } catch(e) {
    _addLog('warn', 'ML', 'Statut modèles non disponible : ' + e.message);
    if (el) el.innerHTML = `<div style="color:${A.muted};font-size:11px;padding:8px 0;"><i class="fa-solid fa-triangle-exclamation" style="color:${A.amber};"></i> Endpoint /ml/status non disponible</div>`;
  }
}

// Fetch quotas API
async function fetchAPIQuotas() {
  _showToast('🔄 Actualisation des quotas…', 'ok');
  // En prod, appel à /admin/quotas sur le backend
  const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
  try {
    const r = await fetch(API_BASE + '/admin/quotas', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      AS._apiQuotas = await r.json();
      _showToast('✅ Quotas actualisés', 'ok');
      renderAdmin();
    } else {
      throw new Error(`HTTP ${r.status}`);
    }
  } catch(e) {
    _addLog('warn', 'Quotas', e.message);
    _showToast('⚠️ Quotas non disponibles (endpoint absent)', 'warn');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════════════

// Changer le plan
function _openChangePlan(uid, currentPlan) {
  _removeModal();
  const u = AS.users.find(u => u.id === uid) || {};
  const plans = ['standard','premium','extra'];
  const planMeta = {
    standard: { icon: 'fa-user',  color: A.ice,    price: 'Gratuit / trial', features: ['5 analyses/mois', 'Export CSV', 'Chat IA'] },
    premium:  { icon: 'fa-crown', color: A.gold,   price: '49 € / mois',    features: ['50 analyses/mois', 'Export PDF', 'What-If'] },
    extra:    { icon: 'fa-star',  color: A.violet,  price: '149 € / mois',  features: ['∞ analyses', 'API directe', 'Support dédié'] },
  };

  _showModal(`
    <div class="adm-modal-head">
      <div class="adm-card-title" style="margin-bottom:0;">
        <i class="fa-solid fa-credit-card"></i> Changer le plan
      </div>
      <button class="adm-modal-close" onclick="window.DS_ADMIN?._removeModal()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="adm-modal-body">
      <div style="font-size:11px;color:${A.muted};margin-bottom:18px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:8px;">
        <div style="font-weight:700;color:#fff;margin-bottom:2px;">${u.prenom||''} ${u.nom||''}</div>
        <div>${u.email || uid}</div>
      </div>
      <div class="adm-plan-grid">
        ${plans.map(p => {
          const m = planMeta[p];
          const active = p === currentPlan;
          return `
            <button class="adm-plan-option ${active ? 'active' : ''}" style="--pc:${m.color};"
              onclick="window.DS_ADMIN?._doChangePlan('${uid}','${p}');window.DS_ADMIN?._removeModal();">
              ${active ? `<div class="adm-current-badge" style="background:${m.color};">ACTUEL</div>` : ''}
              <i class="fa-solid ${m.icon}" style="font-size:22px;color:${m.color};margin-bottom:10px;"></i>
              <div style="font-family:'Syne',sans-serif;font-size:12px;font-weight:900;color:${m.color};letter-spacing:.06em;">${p.toUpperCase()}</div>
              <div style="font-size:9px;color:${A.muted};margin-top:5px;">${m.price}</div>
              <div style="margin-top:10px;display:flex;flex-direction:column;gap:3px;">
                ${m.features.map(f => `<div style="font-size:8px;color:rgba(255,255,255,.45);">· ${f}</div>`).join('')}
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `);
}

// Profil utilisateur détaillé
function _openUser(uid) {
  const u         = AS.users.find(u => u.id === uid);
  if (!u) return;
  const ab        = AS.abonnements.find(a => a.id === uid) || {};
  const analyses  = AS.analyses.filter(a => a.userId === uid);
  const plan      = ab.plan || u.plan || 'standard';
  const planColor = { premium: A.gold, extra: A.violet, standard: A.ice }[plan] || A.muted;
  const initials  = [(u.prenom||'')[0], (u.nom||'')[0]].filter(Boolean).join('').toUpperCase() || '?';
  const loginHistory = u.loginHistory || [];

  // ── Retirer tout drawer existant ──────────────────────────────
  document.getElementById('adm-drawer')?.remove();

  const drawer = document.createElement('div');
  drawer.id    = 'adm-drawer';
  drawer.innerHTML = `
    <!-- Overlay semi-transparent -->
    <div id="adm-drawer-overlay" onclick="document.getElementById('adm-drawer')?.remove()"
      style="position:fixed;inset:0;z-index:9800;background:rgba(2,4,11,.72);backdrop-filter:blur(8px);"></div>

    <!-- Panneau latéral plein écran -->
    <div id="adm-drawer-panel" style="
      position:fixed;top:0;right:0;bottom:0;z-index:9801;
      width:min(720px,100vw);
      background:rgba(6,10,20,.99);
      border-left:1px solid rgba(125,211,252,.12);
      display:flex;flex-direction:column;
      box-shadow:-40px 0 80px rgba(0,0,0,.6);
      transform:translateX(100%);
      transition:transform .32s cubic-bezier(.16,1,.3,1);
    ">

      <!-- ── En-tête drawer ────────────────────────────────────── -->
      <div style="
        padding:18px 24px 16px;
        border-bottom:1px solid rgba(255,255,255,.06);
        display:flex;align-items:center;gap:16px;
        flex-shrink:0;
      ">
        <div class="adm-avatar-lg" style="
          background:linear-gradient(135deg,${planColor}22,${planColor}44);
          color:${planColor};flex-shrink:0;
        ">
          ${u.photoURL
            ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`
            : initials}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:900;color:#fff;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${u.prenom||''} ${u.nom||''}
          </div>
          <div style="font-size:10px;color:${A.muted};margin-top:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${u.email||'—'}</div>
          <div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;">
            <span class="adm-plan-badge" style="color:${planColor};background:${planColor}18;border-color:${planColor}33;">${plan}</span>
            ${u.emailVerified !== false
              ? `<span class="adm-status-dot ok" style="font-size:9px;"><i class="fa-solid fa-circle-check"></i> Vérifié</span>`
              : `<span class="adm-status-dot warn" style="font-size:9px;"><i class="fa-solid fa-envelope"></i> Non vérifié</span>`}
            ${u.disabled ? `<span class="adm-status-dot err" style="font-size:9px;"><i class="fa-solid fa-ban"></i> Désactivé</span>` : ''}
          </div>
        </div>
        <button onclick="document.getElementById('adm-drawer')?.remove()"
          style="width:34px;height:34px;border-radius:9px;flex-shrink:0;
          background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);
          color:rgba(255,255,255,.4);cursor:pointer;font-size:14px;
          display:flex;align-items:center;justify-content:center;transition:all .15s;"
          onmouseenter="this.style.color='#ef4444';this.style.borderColor='rgba(239,68,68,.3)'"
          onmouseleave="this.style.color='rgba(255,255,255,.4)';this.style.borderColor='rgba(255,255,255,.08)'">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- ── Onglets ────────────────────────────────────────────── -->
      <div style="
        display:flex;gap:2px;padding:10px 24px 0;
        border-bottom:1px solid rgba(255,255,255,.06);
        flex-shrink:0;overflow-x:auto;
      ">
        ${[
          {id:'profil',   icon:'fa-user',          label:'Profil'},
          {id:'analyses', icon:'fa-microscope',     label:`Analyses (${analyses.length})`},
          {id:'message',  icon:'fa-paper-plane',    label:'Envoyer un message'},
          {id:'actions',  icon:'fa-bolt',           label:'Actions'},
        ].map(t => `
          <button id="adm-dtab-${t.id}" onclick="window.DS_ADMIN?._drawerTab('${t.id}')"
            style="
              padding:8px 16px 10px;border:none;background:none;cursor:pointer;
              font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
              letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;
              color:${t.id==='profil' ? '#fff' : 'rgba(255,255,255,.35)'};
              border-bottom:2px solid ${t.id==='profil' ? A.ice : 'transparent'};
              transition:all .18s;
            "
            onmouseenter="if(!this.classList.contains('active')){this.style.color='rgba(255,255,255,.7)';}"
            onmouseleave="if(!this.classList.contains('active')){this.style.color='${t.id==='profil'?'#fff':'rgba(255,255,255,.35)'}';}">
            <i class="fa-solid ${t.icon}" style="margin-right:5px;opacity:.7;"></i>${t.label}
          </button>
        `).join('')}
      </div>

      <!-- ── Corps scrollable ──────────────────────────────────── -->
      <div id="adm-drawer-body" style="flex:1;overflow-y:auto;padding:24px;">

        <!-- ═══ ONGLET : PROFIL ════════════════════════════════ -->
        <div id="adm-dpanel-profil">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:.14em;
            text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:14px;">
            Informations
          </div>
          <div class="adm-info-grid" style="grid-template-columns:1fr 1fr 1fr;margin-bottom:20px;">
            ${_infoCell('Entreprise',   u.entreprise?.nom     || '—')}
            ${_infoCell('Secteur',      u.entreprise?.secteur || '—')}
            ${_infoCell('Taille',       u.entreprise?.taille  || '—')}
            ${_infoCell('Pays',         u.entreprise?.pays    || '—')}
            ${_infoCell('Poste',        u.poste               || '—')}
            ${_infoCell('Source',       u.source              || '—')}
            ${_infoCell('Inscrit le',   _dateShort(_ts(u.createdAt)))}
            ${_infoCell('Dernière co.', _dateShort(_ts(u.lastLogin)))}
            ${_infoCell('UID',          uid.slice(0,14)+'…')}
          </div>

          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:.14em;
            text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:12px;">
            Historique de connexion
          </div>
          ${loginHistory.length > 0 ? `
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${loginHistory.slice(-8).reverse().map(l => `
                <div style="display:flex;align-items:center;gap:12px;padding:9px 14px;
                  background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);border-radius:9px;">
                  <i class="fa-solid fa-arrow-right-to-bracket" style="font-size:10px;color:${A.ice};flex-shrink:0;"></i>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:11px;flex:1;">${_dateShort(_ts(l.ts))}</span>
                  <span style="font-size:10px;color:${A.muted};">${l.ip || '—'}</span>
                  <span style="font-size:10px;color:${A.muted};">${l.device || '—'}</span>
                </div>
              `).join('')}
            </div>
          ` : `<div style="font-size:11px;color:${A.muted};padding:10px 0;text-align:center;">Aucun historique enregistré</div>`}
        </div>

        <!-- ═══ ONGLET : ANALYSES ══════════════════════════════ -->
        <div id="adm-dpanel-analyses" style="display:none;">
          ${analyses.length ? `
            <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:.14em;
              text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:14px;">
              ${analyses.length} analyse${analyses.length>1?'s':''}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${analyses.map(a => {
                const sc = a.score ?? 0;
                const c  = sc>=75 ? A.emerald : sc>=50 ? A.amber : sc>=25 ? '#f97316' : A.ruby;
                const zone = sc>=75?'Saine':sc>=50?'Vigilance':sc>=25?'Risque':'Critique';
                return `
                  <div style="display:flex;align-items:center;gap:14px;
                    padding:14px 16px;background:rgba(255,255,255,.03);
                    border:1px solid rgba(255,255,255,.06);border-radius:11px;
                    transition:background .15s;"
                    onmouseenter="this.style.background='rgba(255,255,255,.06)'"
                    onmouseleave="this.style.background='rgba(255,255,255,.03)'">
                    <!-- Score ring -->
                    <div style="width:44px;height:44px;border-radius:50%;flex-shrink:0;
                      background:${c}15;border:2px solid ${c}40;
                      display:flex;align-items:center;justify-content:center;">
                      <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:900;color:${c};">${sc}</span>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.entreprise||'—'}</div>
                      <div style="font-size:9px;color:${A.muted};margin-top:2px;">${a.secteur||''}</div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;">
                      <div style="font-size:9px;padding:3px 9px;border-radius:100px;
                        background:${c}12;color:${c};border:1px solid ${c}25;
                        font-family:'Syne',sans-serif;font-weight:800;margin-bottom:4px;">${zone}</div>
                      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${A.muted};">${_dateShort(_ts(a.createdAt))}</div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="text-align:center;padding:60px 20px;">
              <i class="fa-solid fa-microscope" style="font-size:36px;color:rgba(255,255,255,.08);display:block;margin-bottom:14px;"></i>
              <div style="font-size:12px;color:${A.muted};">Aucune analyse effectuée</div>
            </div>
          `}
        </div>

        <!-- ═══ ONGLET : MESSAGE ═══════════════════════════════ -->
        <div id="adm-dpanel-message" style="display:none;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:.14em;
            text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:18px;">
            Envoyer une notification à ${u.prenom||u.email||'cet utilisateur'}
          </div>

          <!-- Destinataire (affiché, non modifiable) -->
          <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
            background:rgba(125,211,252,.05);border:1px solid rgba(125,211,252,.15);
            border-radius:10px;margin-bottom:16px;">
            <div class="adm-avatar-sm" style="background:${planColor}20;color:${planColor};flex-shrink:0;">
              ${u.photoURL
                ? `<img src="${u.photoURL}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'">`
                : initials}
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:#fff;">
                ${u.prenom||''} ${u.nom||''}
              </div>
              <div style="font-size:9px;color:${A.muted};">${u.email||'—'}</div>
            </div>
            <i class="fa-solid fa-lock" style="font-size:10px;color:rgba(255,255,255,.2);"></i>
          </div>

          <!-- Type + Priorité -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
                color:rgba(255,255,255,.28);margin-bottom:5px;">Type de message</div>
              <select id="adm-msg-type" style="width:100%;padding:10px 12px;
                background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
                border-radius:9px;color:#fff;font-family:'Instrument Sans',sans-serif;
                font-size:11px;outline:none;cursor:pointer;"
                onfocus="this.style.borderColor='rgba(125,211,252,.4)'"
                onblur="this.style.borderColor='rgba(255,255,255,.1)'">
                <option value="info">💬 Message</option>
                <option value="alert">⚠️ Alerte</option>
                <option value="success">✅ Bonne nouvelle</option>
                <option value="system">🔔 Notification système</option>
                <option value="rapport">📄 À propos d'un rapport</option>
              </select>
            </div>
            <div>
              <div style="font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
                color:rgba(255,255,255,.28);margin-bottom:5px;">Priorité</div>
              <select id="adm-msg-priority" style="width:100%;padding:10px 12px;
                background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
                border-radius:9px;color:#fff;font-family:'Instrument Sans',sans-serif;
                font-size:11px;outline:none;cursor:pointer;"
                onfocus="this.style.borderColor='rgba(125,211,252,.4)'"
                onblur="this.style.borderColor='rgba(255,255,255,.1)'">
                <option value="normal">Normale</option>
                <option value="high">🔴 Haute</option>
                <option value="low">Basse</option>
              </select>
            </div>
          </div>

          <!-- Objet -->
          <div style="margin-bottom:10px;">
            <div style="font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
              color:rgba(255,255,255,.28);margin-bottom:5px;">Objet</div>
            <input id="adm-msg-subject" type="text" placeholder="Ex : Mise à jour de votre abonnement…"
              style="width:100%;padding:10px 14px;
              background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
              border-radius:9px;color:#fff;font-family:'Instrument Sans',sans-serif;
              font-size:11px;outline:none;transition:border-color .18s;"
              onfocus="this.style.borderColor='rgba(255,215,0,.4)'"
              onblur="this.style.borderColor='rgba(255,255,255,.1)'"/>
          </div>

          <!-- Corps du message -->
          <div style="margin-bottom:16px;">
            <div style="font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
              color:rgba(255,255,255,.28);margin-bottom:5px;">Message</div>
            <textarea id="adm-msg-body" rows="5"
              placeholder="Rédigez votre message ici. L'utilisateur le recevra dans sa cloche de notifications en temps réel…"
              style="width:100%;padding:10px 14px;
              background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);
              border-radius:9px;color:#fff;font-family:'Instrument Sans',sans-serif;
              font-size:11px;outline:none;resize:vertical;line-height:1.6;transition:border-color .18s;"
              onfocus="this.style.borderColor='rgba(255,215,0,.4)'"
              onblur="this.style.borderColor='rgba(255,255,255,.1)'"></textarea>
          </div>

          <!-- Bouton envoyer -->
          <button id="adm-msg-send-btn" onclick="window.DS_ADMIN?._sendNotifToUser('${uid}')"
            style="width:100%;padding:13px 20px;border-radius:11px;
            background:linear-gradient(135deg,#FFD700,#FFC107);border:none;
            color:#02040B;font-family:'Syne',sans-serif;font-size:10px;font-weight:900;
            letter-spacing:.12em;text-transform:uppercase;cursor:pointer;
            display:flex;align-items:center;justify-content:center;gap:8px;
            box-shadow:0 0 24px rgba(255,215,0,.3);transition:all .2s;"
            onmouseenter="this.style.boxShadow='0 0 40px rgba(255,215,0,.5)';this.style.transform='translateY(-1px)'"
            onmouseleave="this.style.boxShadow='0 0 24px rgba(255,215,0,.3)';this.style.transform='none'">
            <i class="fa-solid fa-paper-plane"></i>
            Envoyer la notification
          </button>

          <!-- Historique notifications envoyées à cet utilisateur -->
          <div id="adm-msg-sent-history" style="margin-top:22px;">
            <div style="font-size:8px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;
              color:rgba(255,255,255,.2);margin-bottom:10px;display:flex;align-items:center;gap:8px;">
              <i class="fa-solid fa-clock-rotate-left"></i> Historique des envois
            </div>
            <div id="adm-msg-history-inner">
              <div style="font-size:10px;color:rgba(255,255,255,.2);padding:10px 0;">
                Aucun message envoyé à cet utilisateur.
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ ONGLET : ACTIONS ═══════════════════════════════ -->
        <div id="adm-dpanel-actions" style="display:none;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;letter-spacing:.14em;
            text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:16px;">
            Actions administrateur
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">

            <!-- Changer le plan -->
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:16px 18px;background:rgba(255,255,255,.03);
              border:1px solid rgba(255,255,255,.07);border-radius:12px;">
              <div>
                <div style="font-weight:700;font-size:12px;margin-bottom:3px;">
                  <i class="fa-solid fa-credit-card" style="color:${A.ice};margin-right:7px;"></i>Changer le plan
                </div>
                <div style="font-size:10px;color:${A.muted};">Plan actuel : <span style="color:${planColor};font-weight:700;">${plan}</span></div>
              </div>
              <button class="adm-btn-primary"
                onclick="document.getElementById('adm-drawer')?.remove();window.DS_ADMIN?.openChangePlan('${uid}','${plan}')">
                <i class="fa-solid fa-pen"></i> Modifier
              </button>
            </div>

            <!-- Reset mot de passe -->
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:16px 18px;background:rgba(255,255,255,.03);
              border:1px solid rgba(255,255,255,.07);border-radius:12px;">
              <div>
                <div style="font-weight:700;font-size:12px;margin-bottom:3px;">
                  <i class="fa-solid fa-key" style="color:${A.amber};margin-right:7px;"></i>Réinitialiser le mot de passe
                </div>
                <div style="font-size:10px;color:${A.muted};">Envoie un email à <span style="color:#fff;">${u.email||'—'}</span></div>
              </div>
              <button class="adm-btn-secondary"
                onclick="window.DS_ADMIN?.sendResetPwd('${uid}','${u.email}')">
                <i class="fa-solid fa-paper-plane"></i> Envoyer
              </button>
            </div>

            <!-- Activer / Désactiver -->
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:16px 18px;background:rgba(255,255,255,.03);
              border:1px solid ${u.disabled ? 'rgba(16,185,129,.15)' : 'rgba(245,158,11,.12)'};
              border-radius:12px;">
              <div>
                <div style="font-weight:700;font-size:12px;margin-bottom:3px;">
                  <i class="fa-solid ${u.disabled ? 'fa-lock-open' : 'fa-ban'}" style="color:${u.disabled ? A.emerald : A.amber};margin-right:7px;"></i>
                  ${u.disabled ? 'Réactiver le compte' : 'Désactiver le compte'}
                </div>
                <div style="font-size:10px;color:${A.muted};">
                  ${u.disabled ? 'Le compte est actuellement désactivé' : 'Bloque l\'accès à la plateforme'}
                </div>
              </div>
              <button class="adm-btn-secondary warn"
                onclick="window.DS_ADMIN?.toggleDisable('${uid}',${!!u.disabled})">
                <i class="fa-solid ${u.disabled ? 'fa-lock-open' : 'fa-ban'}"></i>
                ${u.disabled ? 'Réactiver' : 'Désactiver'}
              </button>
            </div>

            <!-- Supprimer -->
            <div style="display:flex;align-items:center;justify-content:space-between;
              padding:16px 18px;background:rgba(239,68,68,.03);
              border:1px solid rgba(239,68,68,.12);border-radius:12px;">
              <div>
                <div style="font-weight:700;font-size:12px;margin-bottom:3px;color:#ef4444;">
                  <i class="fa-solid fa-trash" style="margin-right:7px;"></i>Supprimer le compte
                </div>
                <div style="font-size:10px;color:${A.muted};">Suppression définitive de Firestore</div>
              </div>
              <button class="adm-btn-danger"
                onclick="document.getElementById('adm-drawer')?.remove();window.DS_ADMIN?.confirmDelete('${uid}','${u.email}')">
                <i class="fa-solid fa-trash"></i> Supprimer
              </button>
            </div>

          </div>
        </div>
      </div><!-- /adm-drawer-body -->
    </div><!-- /adm-drawer-panel -->
  `;

  document.body.appendChild(drawer);

  // Animer l'entrée
  requestAnimationFrame(() => {
    const panel = document.getElementById('adm-drawer-panel');
    if (panel) panel.style.transform = 'translateX(0)';
  });

  // Fermer avec Escape
  const _escClose = (e) => {
    if (e.key === 'Escape') { document.getElementById('adm-drawer')?.remove(); document.removeEventListener('keydown', _escClose); }
  };
  document.addEventListener('keydown', _escClose);
}

// ── Switcher d'onglets du drawer ─────────────────────────────────
function _drawerTab(tabId) {
  const tabs   = ['profil', 'analyses', 'message', 'actions'];
  const colors = { profil: A.ice, analyses: A.gold, message: A.gold, actions: A.amber };

  tabs.forEach(t => {
    const panel = document.getElementById(`adm-dpanel-${t}`);
    const btn   = document.getElementById(`adm-dtab-${t}`);
    if (!panel || !btn) return;
    const active = t === tabId;
    panel.style.display     = active ? 'block' : 'none';
    btn.style.color         = active ? '#fff' : 'rgba(255,255,255,.35)';
    btn.style.borderBottom  = active ? `2px solid ${colors[t] || A.ice}` : '2px solid transparent';
  });
}

// ── Ouvrir directement l'onglet messagerie ────────────────────────
function _openMessageDrawer(uid) {
  _openUser(uid);
  setTimeout(() => _drawerTab('message'), 80);
}

// ── Envoyer une notification Firebase à l'utilisateur ────────────
async function _sendNotifToUser(uid) {
  const subject  = document.getElementById('adm-msg-subject')?.value?.trim();
  const body     = document.getElementById('adm-msg-body')?.value?.trim();
  const type     = document.getElementById('adm-msg-type')?.value    || 'info';
  const priority = document.getElementById('adm-msg-priority')?.value || 'normal';

  if (!subject && !body) {
    _showToast('⚠️ Rédigez un message avant d\'envoyer', 'warn');
    return;
  }

  const TYPE_CFG = {
    info:    { icon: 'fa-message',             color: '#7DD3FC' },
    alert:   { icon: 'fa-triangle-exclamation',color: '#ef4444' },
    success: { icon: 'fa-circle-check',        color: '#10b981' },
    system:  { icon: 'fa-bell',                color: '#8B5CF6' },
    rapport: { icon: 'fa-file-chart-column',   color: '#FFD700' },
  };
  const PRIO_PFX = { high: '🔴 ', normal: '', low: '' };
  const cfg = TYPE_CFG[type] || TYPE_CFG.info;

  const btn = document.getElementById('adm-msg-send-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours…';
  }

  try {
    const adminName = window.S?.profile?.displayName || window.S?.user?.displayName || 'Admin Doctor Smile';

    await addDoc(collection(db, 'notifications', uid, 'items'), {
      type,
      title:    (PRIO_PFX[priority] || '') + (subject || `Message de ${adminName}`),
      body:     body || '',
      icon:     cfg.icon,
      color:    cfg.color,
      priority,
      read:     false,
      fromUid:  window.S?.user?.uid || 'admin',
      fromName: adminName,
      isAdmin:  true,
      createdAt: serverTimestamp(),
    });

    // Log interne
    _addLog('info', 'Messagerie', `Notif envoyée à ${uid} · type:${type} · "${subject||'(sans objet)'}"`);
    _showToast(`✉️ Notification envoyée avec succès`, 'ok');

    // Vider le formulaire
    const subj = document.getElementById('adm-msg-subject');
    const bd   = document.getElementById('adm-msg-body');
    if (subj) subj.value = '';
    if (bd)   bd.value   = '';

    // Afficher dans l'historique local
    const hist = document.getElementById('adm-msg-history-inner');
    if (hist) {
      const entry = document.createElement('div');
      entry.style.cssText = `display:flex;align-items:flex-start;gap:10px;padding:10px 0;
        border-bottom:1px solid rgba(255,255,255,.05);`;
      entry.innerHTML = `
        <div style="width:28px;height:28px;border-radius:8px;flex-shrink:0;
          background:${cfg.color}15;border:1px solid ${cfg.color}25;
          display:flex;align-items:center;justify-content:center;color:${cfg.color};font-size:10px;">
          <i class="fa-solid ${cfg.icon}"></i>
        </div>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'Syne',sans-serif;font-size:10px;font-weight:800;color:rgba(255,255,255,.8);
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subject || '(sans objet)'}</div>
          <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${body || ''}</div>
          <div style="font-size:8px;color:rgba(255,255,255,.2);margin-top:3px;">
            À l'instant · <span style="color:${cfg.color};">✓ envoyé</span>
          </div>
        </div>
      `;
      // Enlever le message "aucun"
      const empty = hist.querySelector('div:only-child');
      if (empty && empty.textContent.includes('Aucun')) hist.innerHTML = '';
      hist.prepend(entry);
    }

  } catch (e) {
    console.error('[ADMIN MSG] Erreur:', e);
    _showToast('❌ Erreur d\'envoi — ' + (e.message || 'vérifiez Firebase'), 'err');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Envoyer la notification';
    }
  }
}

function _infoCell(label, val) {
  return `
    <div class="adm-info-cell">
      <div style="font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:${A.muted};margin-bottom:3px;">${label}</div>
      <div style="font-size:11px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${val}">${val}</div>
    </div>
  `;
}

// Confirmation suppression utilisateur
function _confirmDelete(uid, email) {
  _removeModal();
  _showModal(`
    <div style="padding:32px 24px 24px;text-align:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
        display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;color:${A.ruby};">
        <i class="fa-solid fa-trash"></i>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;margin-bottom:8px;">Supprimer l'utilisateur ?</div>
      <div style="font-size:11px;color:${A.muted};margin-bottom:24px;line-height:1.7;">
        <strong style="color:#fff;">${email}</strong> sera supprimé de Firestore.<br>
        Ses données d'analyses resteront conservées.
      </div>
      <div style="display:flex;gap:8px;">
        <button class="adm-btn-secondary" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._removeModal()">Annuler</button>
        <button class="adm-btn-danger" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._doDelete('${uid}');window.DS_ADMIN?._removeModal()">
          <i class="fa-solid fa-trash"></i> Supprimer
        </button>
      </div>
    </div>
  `, '380px');
}

// Confirmation suppression analyse
function _confirmDeleteAnalyse(aid, entreprise) {
  _removeModal();
  _showModal(`
    <div style="padding:32px 24px 24px;text-align:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
        display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;color:${A.ruby};">
        <i class="fa-solid fa-microscope"></i>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;margin-bottom:8px;">Supprimer cette analyse ?</div>
      <div style="font-size:11px;color:${A.muted};margin-bottom:24px;line-height:1.7;">
        L'analyse de <strong style="color:#fff;">${entreprise}</strong> sera supprimée définitivement.
      </div>
      <div style="display:flex;gap:8px;">
        <button class="adm-btn-secondary" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._removeModal()">Annuler</button>
        <button class="adm-btn-danger" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._doDeleteAnalyse('${aid}');window.DS_ADMIN?._removeModal()">
          <i class="fa-solid fa-trash"></i> Supprimer
        </button>
      </div>
    </div>
  `, '380px');
}

// Confirmation annulation abonnement
function _confirmCancelSubscription(uid, email) {
  _removeModal();
  _showModal(`
    <div style="padding:32px 24px 24px;text-align:center;">
      <div style="width:52px;height:52px;border-radius:14px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
        display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;color:${A.ruby};">
        <i class="fa-solid fa-ban"></i>
      </div>
      <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;margin-bottom:8px;">Annuler l'abonnement ?</div>
      <div style="font-size:11px;color:${A.muted};margin-bottom:8px;line-height:1.7;">
        L'abonnement de <strong style="color:#fff;">${email}</strong> sera annulé dans Firestore.<br>
        <span style="color:${A.amber};">⚠️ Pensez à annuler manuellement dans Stripe Dashboard.</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px;">
        <button class="adm-btn-secondary" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._removeModal()">Annuler</button>
        <button class="adm-btn-danger" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._doCancelSub('${uid}');window.DS_ADMIN?._removeModal()">
          <i class="fa-solid fa-ban"></i> Confirmer
        </button>
      </div>
    </div>
  `, '400px');
}

// Modal remboursement
function _openRefund(uid) {
  _removeModal();
  const ab = AS.abonnements.find(a => a.id === uid) || {};
  const u  = AS.users.find(u => u.id === uid) || {};
  const priceMap = { premium: 49, extra: 149 };
  const amount   = priceMap[ab.plan] || 0;

  _showModal(`
    <div class="adm-modal-head">
      <div class="adm-card-title" style="margin-bottom:0;">
        <i class="fa-solid fa-rotate-left"></i> Remboursement Stripe
      </div>
      <button class="adm-modal-close" onclick="window.DS_ADMIN?._removeModal()">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="adm-modal-body">
      <div style="padding:12px;background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.2);border-radius:9px;margin-bottom:18px;">
        <div style="font-size:9px;color:${A.amber};font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px;">
          <i class="fa-solid fa-triangle-exclamation"></i> Action irréversible
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,.6);line-height:1.6;">
          Le remboursement sera initié via Stripe. Vérifiez le Stripe Dashboard pour confirmation.
        </div>
      </div>
      <div class="adm-info-grid" style="margin-bottom:18px;">
        ${_infoCell('Utilisateur', u.email || uid)}
        ${_infoCell('Plan actuel', ab.plan || '—')}
        ${_infoCell('Stripe Sub ID', ab.stripeSubscriptionId?.slice(0, 20) + '…' || 'N/A')}
        ${_infoCell('Montant', amount > 0 ? amount + ' €' : 'Gratuit')}
      </div>
      <div style="margin-bottom:14px;">
        <div style="font-size:9px;color:${A.muted};letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">Motif du remboursement</div>
        <select class="adm-select" id="refund-reason" style="width:100%;">
          <option value="duplicate">Paiement en double</option>
          <option value="fraudulent">Fraude signalée</option>
          <option value="requested_by_customer">Demande client</option>
          <option value="other">Autre</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="adm-btn-secondary" style="flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._removeModal()">Annuler</button>
        <button class="adm-btn-primary" style="background:linear-gradient(135deg,${A.ruby},#c0392b);box-shadow:0 0 16px rgba(239,68,68,.2);flex:1;justify-content:center;"
          onclick="window.DS_ADMIN?._doRefund('${uid}',document.getElementById('refund-reason').value)">
          <i class="fa-solid fa-rotate-left"></i> Rembourser ${amount > 0 ? amount + ' €' : ''}
        </button>
      </div>
    </div>
  `);
}

// ── Utilitaire modal ─────────────────────────────────────────────
function _showModal(html, maxWidth = '480px') {
  const overlay = document.createElement('div');
  overlay.id    = 'adm-modal';
  overlay.className = 'adm-modal-overlay';
  overlay.innerHTML = `<div class="adm-modal-box" style="max-width:${maxWidth};">${html}</div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function _removeModal() {
  document.getElementById('adm-modal')?.remove();
}

// ════════════════════════════════════════════════════════════════
//  EVENTS
// ════════════════════════════════════════════════════════════════
function _bindEvents() {
  if (AS.activeTab === 'system') {
    setTimeout(pingAPI, 300);
  }
}

// ════════════════════════════════════════════════════════════════
//  EXPORT CSV
// ════════════════════════════════════════════════════════════════
function exportCSV() {
  const rows = [
    ['ID','Prénom','Nom','Email','Plan','Inscrit le','Dernière co.','Analyses','Statut','Entreprise','Secteur'],
    ...AS.users.map(u => {
      const ab = AS.abonnements.find(a => a.id === u.id);
      const plan = ab?.plan || u.plan || 'standard';
      const nbA  = AS.analyses.filter(a => a.userId === u.id).length;
      return [
        u.id,
        u.prenom || '',
        u.nom || '',
        u.email || '',
        plan,
        _dateShort(_ts(u.createdAt)),
        _dateShort(_ts(u.lastLogin)),
        nbA,
        u.disabled ? 'Désactivé' : u.emailVerified !== false ? 'Actif' : 'Non vérifié',
        u.entreprise?.nom || '',
        u.entreprise?.secteur || '',
      ];
    })
  ];
  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `doctor-smile-users-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  _showToast('✅ Export CSV téléchargé', 'ok');
}

// ════════════════════════════════════════════════════════════════
//  LOGS
// ════════════════════════════════════════════════════════════════
function _addLog(level, source, message) {
  AS._logs.push({ level, source, message, ts: Date.now() });
  if (AS._logs.length > 100) AS._logs.shift();
}

// ════════════════════════════════════════════════════════════════
//  UTILITAIRES
// ════════════════════════════════════════════════════════════════
function _dateShort(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });
}

function _timeAgo(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  if (d < 60000)    return 'À l\'instant';
  if (d < 3600000)  return Math.floor(d / 60000) + ' min';
  if (d < 86400000) return Math.floor(d / 3600000) + 'h';
  if (d < 2592000000) return Math.floor(d / 86400000) + 'j';
  return Math.floor(d / 2592000000) + ' mois';
}

function _showToast(msg, type = 'ok') {
  const existing = document.getElementById('adm-toast');
  if (existing) existing.remove();

  const colorMap = { ok: A.emerald, err: A.ruby, warn: A.amber };
  const c = colorMap[type] || A.emerald;

  const t = document.createElement('div');
  t.id = 'adm-toast';
  t.style.cssText = `
    position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(8px);
    background:rgba(5,9,18,.97);border:1px solid ${c}44;border-radius:12px;
    padding:10px 20px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
    color:${c};z-index:99999;pointer-events:none;
    box-shadow:0 8px 32px rgba(0,0,0,.5),0 0 20px ${c}22;
    opacity:0;transition:opacity .3s,transform .3s;white-space:nowrap;
  `;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(6px)';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE — window.DS_ADMIN
// ════════════════════════════════════════════════════════════════
window.DS_ADMIN = {
  switchTab(tab)         { AS.activeTab = tab; renderAdmin(); },
  filterUsers(val)       { AS.userFilter = val; document.getElementById('adm-content').innerHTML = _renderUsers(); },
  sortUsers(val)         { AS.userSort = val; document.getElementById('adm-content').innerHTML = _renderUsers(); },
  filterUserStatus(val)  { AS.userStatusFilter = val; document.getElementById('adm-content').innerHTML = _renderUsers(); },
  filterAnalyses(val)    { AS.analysesFilter = val; document.getElementById('adm-content').innerHTML = _renderAnalyses(); },
  sortAnalyses(val)      { AS.analysesSort = val; document.getElementById('adm-content').innerHTML = _renderAnalyses(); },
  openUser(uid)          { _openUser(uid); },
  openMessage(uid)       { _openMessageDrawer(uid); },
  _drawerTab(t)          { _drawerTab(t); },
  _sendNotifToUser(uid)  { _sendNotifToUser(uid); },
  openChangePlan(uid, plan)            { _openChangePlan(uid, plan); },
  confirmDelete(uid, email)            { _confirmDelete(uid, email); },
  confirmDeleteAnalyse(aid, entreprise){ _confirmDeleteAnalyse(aid, entreprise); },
  confirmCancelSubscription(uid, email){ _confirmCancelSubscription(uid, email); },
  openRefund(uid)                      { _openRefund(uid); },
  toggleDisable(uid, disabled)         { _toggleDisable(uid, disabled); },
  sendResetPwd(uid, email)             { _sendResetPassword(email); },
  _doChangePlan(uid, plan)             { _changePlan(uid, plan); },
  _doDelete(uid)                       { _deleteUser(uid); },
  _doDeleteAnalyse(aid)                { _deleteAnalyse(aid); },
  _doCancelSub(uid)                    { _cancelSubscription(uid); },
  _doRefund(uid, reason) {
    // En prod : POST /admin/stripe/refund { uid, reason }
    _addLog('warn', 'Stripe', `Remboursement demandé pour ${uid} · motif: ${reason}`);
    _showToast('⚠️ Remboursement initié — vérifiez le Stripe Dashboard', 'warn');
    _removeModal();
  },
  _removeModal()                       { _removeModal(); },
  pingAPI,
  fetchMLStatus,
  fetchAPIQuotas,
  exportCSV,
  clearLogs() {
    AS._logs = [];
    _showToast('✅ Logs effacés', 'ok');
    renderAdmin();
  },
  showMaintenanceToggle() {
    _showModal(`
      <div style="padding:28px 24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:14px;">🚧</div>
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:900;margin-bottom:8px;">Mode Maintenance</div>
        <div style="font-size:11px;color:${A.muted};margin-bottom:22px;line-height:1.7;">
          Activer le mode maintenance bloquera l'accès à la plateforme pour tous les utilisateurs<br>
          <strong style="color:${A.amber};">(hors admins)</strong> jusqu'à désactivation.
        </div>
        <div style="display:flex;gap:8px;">
          <button class="adm-btn-secondary" style="flex:1;justify-content:center;"
            onclick="window.DS_ADMIN?._removeModal()">Annuler</button>
          <button class="adm-btn-primary" style="background:linear-gradient(135deg,${A.amber},#e67e22);box-shadow:0 0 16px rgba(245,158,11,.2);flex:1;justify-content:center;"
            onclick="window.DS_ADMIN?._activateMaintenance()">
            <i class="fa-solid fa-triangle-exclamation"></i> Activer
          </button>
        </div>
      </div>
    `, '380px');
  },
  _activateMaintenance() {
    _addLog('warn', 'System', 'Mode maintenance activé par admin');
    _showToast('⚠️ Mode maintenance activé', 'warn');
    _removeModal();
    // En prod : updateDoc(doc(db,'config','platform'), { maintenance: true })
  },
  async refresh() {
    const btn = document.querySelector('.adm-refresh-btn i');
    if (btn) btn.style.animation = 'admSpin .6s linear infinite';
    await _loadAllData();
    renderAdmin();
    if (btn) btn.style.animation = '';
    _showToast('✅ Données actualisées', 'ok');
  },
};

// ════════════════════════════════════════════════════════════════
//  CSS
// ════════════════════════════════════════════════════════════════
function _injectAdminStyles() {
  if (document.getElementById('adm-styles')) return;
  const st = document.createElement('style');
  st.id = 'adm-styles';
  st.textContent = `

/* ══ ROOT ══════════════════════════════════════════════════════ */
.adm-root{
  padding:24px 28px 60px;
  display:flex;flex-direction:column;gap:18px;
  min-height:100%;font-family:'Instrument Sans',sans-serif;
}

/* ══ HEADER ══ */
.adm-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 22px;border-radius:14px;
  background:rgba(236,72,153,.04);
  border:1px solid rgba(236,72,153,.16);
  position:relative;overflow:hidden;
}
.adm-header::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(236,72,153,.55),rgba(139,92,246,.4),transparent);
}
.adm-header-left{display:flex;align-items:center;gap:14px;}
.adm-badge-admin{
  padding:5px 13px;border-radius:8px;
  background:linear-gradient(135deg,rgba(236,72,153,.18),rgba(139,92,246,.12));
  border:1px solid rgba(236,72,153,.32);
  font-family:'Syne',sans-serif;font-size:9px;font-weight:900;
  letter-spacing:.18em;color:#EC4899;
  display:flex;align-items:center;gap:6px;flex-shrink:0;
}
.adm-title{
  font-family:'Syne',sans-serif;font-size:22px;font-weight:900;letter-spacing:-.02em;
  background:linear-gradient(135deg,#fff 40%,rgba(236,72,153,.85));
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
}
.adm-subtitle{font-size:10px;color:rgba(255,255,255,.35);margin-top:1px;}
.adm-header-right{display:flex;align-items:center;gap:9px;}
.adm-live-dot{width:6px;height:6px;border-radius:50%;background:#10b981;animation:admPulse 2s ease infinite;flex-shrink:0;}
@keyframes admPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}
.adm-live-lbl{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.3);}
.adm-refresh-btn,.adm-export-btn{
  width:30px;height:30px;border-radius:8px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);
  color:rgba(255,255,255,.45);cursor:pointer;font-size:11px;
  display:flex;align-items:center;justify-content:center;transition:all .18s;
}
.adm-refresh-btn:hover{color:#7DD3FC;border-color:rgba(125,211,252,.3);background:rgba(125,211,252,.06);}
.adm-export-btn:hover{color:#10b981;border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.06);}
.adm-alert-chip{
  display:flex;align-items:center;gap:5px;
  padding:5px 11px;border-radius:100px;cursor:pointer;
  background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  color:#ef4444;letter-spacing:.06em;transition:all .18s;
}
.adm-alert-chip:hover{background:rgba(239,68,68,.18);}

/* ══ ALERTES ══ */
.adm-alert-bar{
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;border-radius:10px;font-size:11px;font-weight:600;
}
.adm-alert-bar.err{ background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.22); color:#ef4444;}
.adm-alert-bar.warn{background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.22);color:#f59e0b;}
.adm-alert-bar i{font-size:13px;}

/* ══ TABS ══ */
.adm-tabs{
  display:flex;gap:4px;
  background:rgba(6,10,20,.8);border:1px solid rgba(125,211,252,.1);
  border-radius:12px;padding:5px;
}
.adm-tab{
  flex:1;padding:9px 6px;border:none;background:none;
  color:rgba(255,255,255,.32);
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;border-radius:8px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:6px;
  transition:all .22s cubic-bezier(.34,1.56,.64,1);position:relative;
}
.adm-tab:hover{color:#7DD3FC;background:rgba(125,211,252,.06);}
.adm-tab.active{
  color:#EC4899;
  background:linear-gradient(135deg,rgba(236,72,153,.1),rgba(139,92,246,.07));
  border:1px solid rgba(236,72,153,.2);
  box-shadow:0 0 18px rgba(236,72,153,.08);
}
.adm-tab-badge{
  background:#ef4444;color:#fff;
  font-size:7px;font-weight:900;
  padding:1px 5px;border-radius:100px;line-height:1.4;
}

/* ══ CONTENT ══ */
.adm-content{display:flex;flex-direction:column;gap:14px;}

/* ══ CARDS ══ */
.adm-card{
  background:rgba(6,10,20,.8);border:1px solid rgba(125,211,252,.09);
  border-radius:14px;padding:18px 20px;transition:border-color .2s;
}
.adm-card:hover{border-color:rgba(125,211,252,.14);}
.adm-card-title{
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;
  letter-spacing:.18em;text-transform:uppercase;
  color:rgba(255,255,255,.28);margin-bottom:14px;
  display:flex;align-items:center;gap:7px;
}
.adm-card-title i{font-size:11px;color:#7DD3FC;}

/* ══ KPI ══ */
.adm-kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
@media(max-width:1000px){.adm-kpi-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:500px) {.adm-kpi-grid{grid-template-columns:1fr 1fr;}}
.adm-kpi{
  background:rgba(6,10,20,.9);border:1px solid rgba(125,211,252,.08);
  border-radius:12px;padding:14px 16px;
  display:flex;align-items:center;gap:12px;
  transition:all .2s;cursor:default;position:relative;overflow:hidden;
}
.adm-kpi::before{
  content:'';position:absolute;top:0;left:0;right:0;height:1px;
  background:linear-gradient(90deg,transparent,rgba(125,211,252,.14),transparent);
}
.adm-kpi:hover{transform:translateY(-2px);box-shadow:0 10px 32px rgba(0,0,0,.35);}
.adm-kpi-icon{width:34px;height:34px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;}
.adm-kpi-val{font-family:'Syne',sans-serif;font-size:clamp(16px,2vw,24px);font-weight:900;letter-spacing:-.02em;line-height:1;margin-bottom:2px;}
.adm-kpi-lbl{font-size:9px;color:rgba(255,255,255,.32);letter-spacing:.04em;}
.adm-kpi-trend{margin-top:4px;}
.adm-trend{font-family:'Syne',sans-serif;font-size:8px;font-weight:700;padding:2px 7px;border-radius:100px;}
.adm-trend.up{background:rgba(16,185,129,.1);color:#10b981;}
.adm-trend.dn{background:rgba(239,68,68,.1);color:#ef4444;}

/* ══ BARS ══ */
.adm-row-3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
@media(max-width:900px){.adm-row-3{grid-template-columns:1fr;}}
.adm-bar-item{margin-bottom:11px;}
.adm-bar-item:last-child{margin-bottom:0;}
.adm-bar-meta{display:flex;align-items:center;gap:7px;margin-bottom:4px;}
.adm-bar-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;}
.adm-bar-lbl{font-size:10px;color:rgba(255,255,255,.58);flex:1;}
.adm-bar-val{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;color:#fff;}
.adm-bar-track{height:4px;background:rgba(255,255,255,.05);border-radius:2px;overflow:hidden;}
.adm-bar-fill{height:100%;border-radius:2px;transition:width 1.4s cubic-bezier(.4,0,.2,1);}

/* ══ ACTIVITÉ ══ */
.adm-activity-list{display:flex;flex-direction:column;gap:6px;}
.adm-activity-item{
  display:flex;align-items:flex-start;gap:10px;
  padding:9px 13px;background:rgba(255,255,255,.02);
  border:1px solid rgba(255,255,255,.04);border-radius:9px;
  transition:border-color .18s;
}
.adm-activity-item:hover{border-color:rgba(125,211,252,.12);}
.adm-act-icon{width:26px;height:26px;border-radius:7px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;}
.adm-act-body{flex:1;min-width:0;}
.adm-act-text{font-size:11px;line-height:1.4;color:rgba(255,255,255,.65);overflow:hidden;text-overflow:ellipsis;}
.adm-act-time{font-size:9px;color:rgba(255,255,255,.26);margin-top:2px;}

/* ══ TABLE ══ */
.adm-table-wrap{overflow-x:auto;border-radius:9px;border:1px solid rgba(255,255,255,.05);}
.adm-table{width:100%;border-collapse:collapse;font-size:11px;}
.adm-table th{
  padding:10px 14px;background:rgba(8,14,26,.95);
  font-family:'Syne',sans-serif;font-size:7.5px;font-weight:800;
  letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26);
  text-align:left;border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap;
}
.adm-table-row{cursor:pointer;transition:background .1s;}
.adm-table-row:hover td{background:rgba(125,211,252,.022);}
.adm-table td{padding:10px 14px;border-bottom:1px solid rgba(255,255,255,.026);vertical-align:middle;}
.adm-row-disabled td{opacity:.45;}
.adm-user-cell{display:flex;align-items:center;gap:10px;}
.adm-avatar-sm{width:32px;height:32px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:10px;font-weight:900;overflow:hidden;}
.adm-avatar-lg{width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:18px;font-weight:900;overflow:hidden;}
.adm-user-name{font-weight:700;font-size:11px;}
.adm-user-email{font-size:9px;color:rgba(255,255,255,.33);}
.adm-cell-main{font-weight:600;font-size:11px;}
.adm-cell-sub{font-size:9px;color:rgba(255,255,255,.33);}
.adm-cell-mono{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.45);}
.adm-plan-badge{
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.1em;text-transform:uppercase;
  padding:3px 8px;border-radius:100px;border:1px solid;white-space:nowrap;
}
.adm-status-dot{
  font-family:'Syne',sans-serif;font-size:8px;font-weight:800;
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 8px;border-radius:100px;white-space:nowrap;
}
.adm-status-dot.ok  {color:#10b981;background:rgba(16,185,129,.1);}
.adm-status-dot.warn{color:#f59e0b;background:rgba(245,158,11,.1);}
.adm-status-dot.err {color:#ef4444;background:rgba(239,68,68,.1);}
.adm-analyses-count{font-family:'Syne',sans-serif;font-size:14px;font-weight:900;text-align:center;}
.adm-score-cell{display:flex;align-items:baseline;gap:3px;font-family:'Syne',sans-serif;}
.adm-score-num{font-size:18px;font-weight:900;}
.adm-stripe-id{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.38);background:rgba(255,255,255,.04);padding:2px 6px;border-radius:4px;}

/* ══ ACTIONS ══ */
.adm-actions{display:flex;gap:4px;}
.adm-action-btn{
  width:28px;height:28px;border-radius:7px;
  background:rgba(125,211,252,.06);border:1px solid rgba(125,211,252,.14);
  color:rgba(125,211,252,.6);cursor:pointer;font-size:10px;
  display:flex;align-items:center;justify-content:center;transition:all .15s;
}
.adm-action-btn:hover{background:rgba(125,211,252,.14);color:#7DD3FC;}
.adm-action-btn.danger{background:rgba(239,68,68,.06);border-color:rgba(239,68,68,.15);color:rgba(239,68,68,.5);}
.adm-action-btn.danger:hover{background:rgba(239,68,68,.14);color:#ef4444;}
.adm-action-btn.warn{background:rgba(245,158,11,.06);border-color:rgba(245,158,11,.15);color:rgba(245,158,11,.5);}
.adm-action-btn.warn:hover{background:rgba(245,158,11,.14);color:#f59e0b;}

/* ══ SEARCH ══ */
.adm-users-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px;}
.adm-search-wrap{position:relative;}
.adm-search-wrap i{position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:10px;color:rgba(255,255,255,.3);}
.adm-search-wrap input{
  padding:8px 12px 8px 30px;
  background:rgba(255,255,255,.04);border:1px solid rgba(125,211,252,.14);
  border-radius:8px;font-family:'Instrument Sans',sans-serif;font-size:12px;
  color:#fff;outline:none;width:200px;transition:border-color .18s,box-shadow .18s;
}
.adm-search-wrap input:focus{border-color:rgba(125,211,252,.4);box-shadow:0 0 0 3px rgba(125,211,252,.06);}
.adm-search-wrap input::placeholder{color:rgba(255,255,255,.2);}
.adm-select{
  padding:8px 12px;
  background:rgba(255,255,255,.04);border:1px solid rgba(125,211,252,.14);
  border-radius:8px;font-family:'Syne',sans-serif;font-size:9px;font-weight:700;
  color:rgba(255,255,255,.5);outline:none;cursor:pointer;transition:border-color .18s;
}
.adm-select:focus{border-color:rgba(125,211,252,.4);}
.adm-select option{background:#0A1020;}
.adm-users-count{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.28);}

/* ══ SYSTÈME ══ */
.adm-system-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:1100px){.adm-system-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:700px) {.adm-system-grid{grid-template-columns:1fr;}}
.adm-api-status{display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(255,255,255,.03);border-radius:9px;font-size:11px;}
.adm-spinner{width:16px;height:16px;border:2px solid rgba(125,211,252,.15);border-top-color:#7DD3FC;border-radius:50%;animation:admSpin .8s linear infinite;flex-shrink:0;}
@keyframes admSpin{to{transform:rotate(360deg)}}
.adm-endpoint-list{display:flex;flex-direction:column;gap:5px;margin-top:12px;}
.adm-endpoint{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:7px;border:1px solid rgba(255,255,255,.04);}
.adm-ep-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.15);flex-shrink:0;transition:background .3s;}
.adm-endpoint code{font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,.45);}
.adm-ep-status{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);}
.adm-ep-latency{font-family:'JetBrains Mono',monospace;font-size:8px;}
.adm-sys-stats{display:flex;flex-direction:column;gap:6px;}
.adm-sys-row{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);}
.adm-sys-row:last-child{border-bottom:none;}
.adm-sys-lbl{font-size:10px;color:rgba(255,255,255,.42);}
.adm-sys-val{font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;}
.adm-ml-row{display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,.03);border-radius:8px;margin-bottom:6px;}

/* ══ LOGS ══ */
.adm-log-row{
  display:flex;align-items:center;gap:7px;
  padding:5px 8px;border-radius:6px;font-size:10px;
  background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.04);
}
.adm-log-badge{font-family:'Syne',sans-serif;font-size:7px;font-weight:900;letter-spacing:.1em;padding:2px 6px;border-radius:100px;flex-shrink:0;}
.adm-log-badge.error{background:rgba(239,68,68,.15);color:#ef4444;}
.adm-log-badge.warn {background:rgba(245,158,11,.15);color:#f59e0b;}
.adm-log-badge.info {background:rgba(125,211,252,.12);color:#7DD3FC;}
.adm-log-source{font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,.3);flex-shrink:0;}
.adm-log-msg{flex:1;color:rgba(255,255,255,.55);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.adm-log-time{font-size:8px;color:rgba(255,255,255,.2);flex-shrink:0;}
.adm-log-empty{display:flex;align-items:center;gap:8px;padding:16px;color:rgba(255,255,255,.3);font-size:11px;}

/* ══ BOUTONS ══ */
.adm-btn-primary{
  padding:9px 18px;border-radius:9px;
  background:linear-gradient(135deg,#7DD3FC,#38BDF8);border:none;
  font-family:'Syne',sans-serif;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;
  color:#02040B;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
  box-shadow:0 0 16px rgba(125,211,252,.2);transition:all .18s;
}
.adm-btn-primary:hover{transform:translateY(-1px);box-shadow:0 0 24px rgba(125,211,252,.3);}
.adm-btn-secondary{
  padding:9px 18px;border-radius:9px;
  background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:rgba(255,255,255,.5);cursor:pointer;display:inline-flex;align-items:center;gap:6px;
  transition:all .18s;
}
.adm-btn-secondary:hover{color:#fff;border-color:rgba(125,211,252,.28);}
.adm-btn-secondary.warn{border-color:rgba(245,158,11,.2);color:rgba(245,158,11,.7);}
.adm-btn-secondary.warn:hover{color:#f59e0b;border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.06);}
.adm-btn-danger{
  padding:9px 18px;border-radius:9px;
  background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);
  font-family:'Syne',sans-serif;font-size:9px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
  color:#ef4444;cursor:pointer;display:inline-flex;align-items:center;gap:6px;
  transition:all .18s;
}
.adm-btn-danger:hover{background:rgba(239,68,68,.16);}

/* ══ MODAL ══ */
.adm-modal-overlay{
  position:fixed;inset:0;z-index:9900;
  background:rgba(2,4,11,.88);backdrop-filter:blur(18px);
  display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity .22s;
  padding:20px;
}
.adm-modal-overlay.show{opacity:1;}
.adm-modal-box{
  width:100%;max-height:90vh;overflow-y:auto;
  background:rgba(6,10,20,.99);border:1px solid rgba(125,211,252,.15);
  border-radius:18px;
  transform:scale(.94) translateY(14px);
  transition:transform .3s cubic-bezier(.34,1.56,.64,1);
  box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);
}
.adm-modal-overlay.show .adm-modal-box{transform:scale(1) translateY(0);}
.adm-modal-box::-webkit-scrollbar{width:3px;}
.adm-modal-box::-webkit-scrollbar-thumb{background:rgba(125,211,252,.2);border-radius:2px;}
.adm-modal-head{
  padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.06);
  display:flex;align-items:center;justify-content:space-between;
  position:sticky;top:0;background:rgba(6,10,20,.99);z-index:1;
}
.adm-modal-close{
  width:28px;height:28px;border-radius:7px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);
  color:rgba(255,255,255,.4);cursor:pointer;font-size:12px;
  display:flex;align-items:center;justify-content:center;transition:all .15s;
}
.adm-modal-close:hover{color:#ef4444;border-color:rgba(239,68,68,.3);}
.adm-modal-body{padding:20px 22px 24px;}

/* ══ PLAN GRID ══ */
.adm-plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.adm-plan-option{
  padding:18px 10px;border-radius:12px;
  border:1px solid rgba(255,255,255,.07);
  background:rgba(255,255,255,.03);cursor:pointer;
  display:flex;flex-direction:column;align-items:center;text-align:center;
  transition:all .22s cubic-bezier(.34,1.56,.64,1);
  position:relative;
}
.adm-plan-option:hover{border-color:var(--pc,rgba(125,211,252,.4));background:rgba(125,211,252,.04);transform:translateY(-2px);}
.adm-plan-option.active{border-color:var(--pc,rgba(125,211,252,.4));background:rgba(125,211,252,.06);box-shadow:0 0 20px rgba(125,211,252,.08);}
.adm-current-badge{
  position:absolute;top:-7px;right:-7px;
  background:var(--pc,#7DD3FC);color:#02040B;
  font-family:'Syne',sans-serif;font-size:7px;font-weight:900;
  padding:2px 7px;border-radius:100px;letter-spacing:.08em;
}
.adm-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.adm-info-cell{padding:10px 12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:9px;}

/* ══ CONFIG ══ */
.adm-config-list{display:flex;flex-direction:column;gap:6px;}

/* ══ RESPONSIVE ══ */
@media(max-width:768px){
  .adm-root{padding:14px 12px 80px;}
  .adm-tabs{flex-wrap:wrap;}
  .adm-tab{font-size:8px;}
  .adm-kpi-grid{grid-template-columns:1fr 1fr!important;}
  .adm-plan-grid{grid-template-columns:1fr;}
  .adm-info-grid{grid-template-columns:1fr;}
}
@media(max-width:480px){
  .adm-header{flex-direction:column;align-items:flex-start;gap:10px;}
  .adm-tabs .adm-tab span{display:none;}
  .adm-tab{flex:0 0 44px;}
  .adm-users-header{flex-direction:column;align-items:flex-start;}
  .adm-search-wrap input{width:100%;}
}

/* ══ DRAWER UTILISATEUR ══ */
#adm-drawer-panel::-webkit-scrollbar{width:3px;}
#adm-drawer-panel::-webkit-scrollbar-thumb{background:rgba(125,211,252,.18);border-radius:2px;}
#adm-drawer-body::-webkit-scrollbar{width:3px;}
#adm-drawer-body::-webkit-scrollbar-thumb{background:rgba(125,211,252,.18);border-radius:2px;}

/* ══ BOUTON MSG DANS LE TABLEAU ══ */
.adm-action-btn.msg{
  color:rgba(255,215,0,.6);
  border-color:rgba(255,215,0,.2);
}
.adm-action-btn.msg:hover{
  color:#FFD700;
  background:rgba(255,215,0,.1);
  border-color:rgba(255,215,0,.4);
}

/* ══ RESPONSIVE DRAWER ══ */
@media(max-width:720px){
  #adm-drawer-panel{width:100vw!important;}
}
  `;
  document.head.appendChild(st);
}

// ════════════════════════════════════════════════════════════════
window.DS_ADMIN.initAdmin = initAdmin;
console.log('%c[DS-ADMIN] ✓ Module v2.0 chargé — toutes fonctionnalités actives', 'color:#EC4899;font-weight:bold');