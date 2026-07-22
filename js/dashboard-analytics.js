// ════════════════════════════════════════════════════════════════
//  dashboard-analytics.js — Doctor Smile (module Analytics)
//  Fonctions de chargement et rendu des analyses
//  Extrait de dashboard.js pour modularisation
// ════════════════════════════════════════════════════════════════

import { S } from './dashboard-core.js';

// ── Exposition des fonctions Analytics ─────────────────────────────
window.DS_DASH_ANALYTICS = {
  loadAnalyse,
  normalizeShap,
  normalizeRatios,
  normalizeRadar,
  normalizeRecos,
  normalizeWI,
};

// ════════════════════════════════════════════════════════════════
//  CHARGER UNE ANALYSE
// ════════════════════════════════════════════════════════════════
function loadAnalyse(a) {
  S.currentAnalyse = a;
  
  if (window.DS_DASH_UI?.renderSidebar) {
    window.DS_DASH_UI.renderSidebar();
  }
  
  const plan = S.abonnement?.plan || S.profile?.plan || 'standard';

  const _show = (id, disp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display     = disp;
    el.style.opacity     = '1';
    el.style.visibility  = 'visible';
    el.style.transform   = 'none';
  };
  
  _show('score-sec', 'grid');
  _show('ratios-sec', 'block');
  _show('wi-sec', 'block');
  _show('sc-section', 'block');

  const _bs = document.getElementById('bottom-sec');
  if (_bs) {
    _bs.style.display        = 'flex';
    _bs.style.flexDirection  = 'column';
    _bs.style.gap            = '16px';
    _bs.style.opacity        = '1';
    _bs.style.visibility     = 'visible';
  }
  
  document.getElementById('upload-sec') && (document.getElementById('upload-sec').style.display = 'none');
  const _chatSec = document.getElementById('chat-sec');
  if (_chatSec) _chatSec.style.display = 'none';
  
  window._planChatQuota = { standard: 30, premium: 200, extra: Infinity }[plan] ?? 30;

  const score  = a.score ?? 0;
  const zone   = a.zone ?? zoneFromScore(score);
  const shap   = normalizeShap(a.shapValues || a.shap || []);
  const ratios = normalizeRatios(a.ratios || a.financialRatios || []);
  const radar  = normalizeRadar(a.radarDimensions || a.radar || []);
  const tl     = a.scoreHistory || a.tl || [score];
  const recos  = normalizeRecos(a.recommendations || a.recos || []);
  const wi     = normalizeWI(a.whatifParams || a.wi || [], ratios);

  const _lad = new Date(a.createdAt?.toDate?.() || a.createdAt);
  window._lastAnalyseDate = _lad;
  
  if (window.DS_DASH_UI?.setTopbarDate) {
    window.DS_DASH_UI.setTopbarDate(_lad);
  }
  
  renderRing(score, zone);
  renderMeta(a, zone);
  renderShap(shap);
  setTimeout(() => renderRadar(radar), 180);
  renderRatios(ratios);
  renderWI(wi);
  setTimeout(() => renderTimeline(tl), 280);
  renderRecos(recos);
  
  // Nouveaux éléments mockup
  renderTendance(tl);
  renderAlerts(recos, zone, a);
  renderRisques(ratios, zone);
  
  if (S.convId !== a.id) window.DS_CHAT?.initChat(a, zone);
  
  setTimeout(() => _initScatterBoth(a), 200);
  setTimeout(() => _initScatterBoth(a), 800);
  
  if (typeof fu === 'function') fu();
  
  const ZM = { saine: 0.6, vigilance: 1.0, risque: 1.3, critique: 1.6 };
  const prob = Math.round((100 - score) * (ZM[zone] || 1) * 0.85);
  
  window._lastTimeline = tl;
  window._lastRatios = ratios;
  window._lastScore = score;
  window._lastZone = zone;
  window._lastAnalyse = a;
  window._lastShap = shap;
  
  // Utiliser des classes CSS pour les couleurs de jauge
  const gPct = document.getElementById('gauge-pct');
  if (gPct) {
    gPct.textContent = prob + '%';
    gPct.className = prob > 60 ? 'gauge-danger' : prob > 35 ? 'gauge-warning' : 'gauge-ok';
  }
  
  setTimeout(() => {
    if (window.DS_EXTRA && window.DS_VIEWS) {
      window.DS_VIEWS.renderVisualisations();
    }
    window.DS_EXTRA?.renderTimelineFixed(tl, 'tl-svg');
    render3DVisualizations(score, zone, ratios, a);
  }, 300);
  
  setTimeout(() => window.DS_EXTRA?.initSmartAlerts(a), 800);
  setTimeout(() => window._DS_injectExportBtn?.(), 500);
  setTimeout(() => window.DS_EXTRA?.renderTimelineFixed(tl, 'tl-svg'), 350);
  
  console.log('[Analyse chargée]', a.entreprise || a.id, '— score:', score);
}

// ── Normalisation des données ───────────────────────────────────────
function normalizeShap(shap) {
  if (!Array.isArray(shap)) return [];
  return shap.map(s => ({
    feature: s.feature || s.name || 'Inconnu',
    value: s.value || 0,
    importance: Math.abs(s.value || 0)
  })).sort((a, b) => b.importance - a.importance).slice(0, 10);
}

function normalizeRatios(ratios) {
  if (!Array.isArray(ratios)) return [];
  return ratios.map(r => ({
    name: r.name || r.label || 'Ratio',
    value: r.value || 0,
    benchmark: r.benchmark || 0,
    zone: r.zone || zoneFromScore(r.value || 0)
  }));
}

function normalizeRadar(radar) {
  if (!Array.isArray(radar)) return [];
  const dimensions = ['Liquidité', 'Rentabilité', 'Solvabilité', 'Croissance', 'Efficacité', 'Innovation'];
  return dimensions.map((dim, i) => ({
    dimension: dim,
    value: radar[i]?.value || radar[i] || 50,
    benchmark: radar[i]?.benchmark || 50
  }));
}

function normalizeRecos(recos) {
  if (!Array.isArray(recos)) return [];
  return recos.map((r, i) => ({
    id: r.id || `reco-${i}`,
    title: r.title || r.recommendation || 'Recommandation',
    description: r.description || r.details || '',
    priority: r.priority || r.impact || 'medium',
    category: r.category || 'general'
  })).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function normalizeWI(wi, ratios) {
  if (!Array.isArray(wi)) return [];
  const params = ['Chiffre d\'affaires', 'Marge brute', 'Dettes', 'Trésorerie', 'Investissements'];
  return params.map((param, i) => ({
    parameter: param,
    value: wi[i]?.value || 0,
    min: wi[i]?.min || 0,
    max: wi[i]?.max || 100,
    impact: wi[i]?.impact || 0
  }));
}

// ── Fonctions de rendu (placeholders pour compatibilité) ───────────
function renderRing(score, zone) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderRing) {
    window.DS_VIEWS.renderRing(score, zone);
  }
}

function renderMeta(a, zone) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderMeta) {
    window.DS_VIEWS.renderMeta(a, zone);
  }
}

function renderShap(shap) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderShap) {
    window.DS_VIEWS.renderShap(shap);
  }
}

function renderRadar(radar) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderRadar) {
    window.DS_VIEWS.renderRadar(radar);
  }
}

function renderRatios(ratios) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderRatios) {
    window.DS_VIEWS.renderRatios(ratios);
  }
}

function renderWI(wi) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderWI) {
    window.DS_VIEWS.renderWI(wi);
  }
}

function renderTimeline(tl) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderTimeline) {
    window.DS_VIEWS.renderTimeline(tl);
  }
}

function renderRecos(recos) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderRecos) {
    window.DS_VIEWS.renderRecos(recos);
  }
}

function renderTendance(tl) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderTendance) {
    window.DS_VIEWS.renderTendance(tl);
  }
}

function renderAlerts(recos, zone, a) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderAlerts) {
    window.DS_VIEWS.renderAlerts(recos, zone, a);
  }
}

function renderRisques(ratios, zone) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.renderRisques) {
    window.DS_VIEWS.renderRisques(ratios, zone);
  }
}

function _initScatterBoth(a) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.initScatterBoth) {
    window.DS_VIEWS.initScatterBoth(a);
  }
}

function render3DVisualizations(score, zone, ratios, a) {
  // À implémenter avec le module de visualisation
  if (window.DS_VIEWS?.render3DVisualizations) {
    window.DS_VIEWS.render3DVisualizations(score, zone, ratios, a);
  }
}

function zoneFromScore(score) {
  if (score >= 70) return 'saine';
  if (score >= 50) return 'vigilance';
  if (score >= 30) return 'risque';
  return 'critique';
}

function tsToDate(ts) {
  if (!ts) return new Date();
  if (ts.toDate) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  return new Date(ts);
}

export { loadAnalyse, normalizeShap, normalizeRatios, normalizeRadar, normalizeRecos, normalizeWI };
