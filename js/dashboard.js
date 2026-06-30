// ════════════════════════════════════════════════════════════════
//  dashboard.js — Doctor Smile (noyau v3 — modulaire)
//  Palette : violet (standard), cyan (premium), ambre (extra)
//  Tous les styles inline remplacés par des classes CSS ou
//  des variables CSS.
// ════════════════════════════════════════════════════════════════

import { auth, db }                   from './firebase-config.js';
import { getAuthToken, onAuthChange } from './firebase-auth.js';
import {
  getUserProfile,
  listenUserProfile,
  listenUserAnalyses,
  getAbonnement,
  listenAbonnement,
  createConversation,
  addMessage,
  getMessages,
  tsToString,
}                                     from './firebase-firestore.js';
import { requireAuth, checkPlan }     from './auth-guard.js';
import {
  getZoneRisque,
  fetchWithAuth,
  formatDate,
  debounce,
}                                     from './utils.js';

// ── État global ───────────────────────────────────────────────
const S = {
  user: null,
  profile: null,
  abonnement: null,
  analyses: [],
  currentAnalyse: null,
  filterText: '',
  waitingForResult: false,
  pendingAnalyseId: null,
  pipelineTimer: null,
};
window.S = S;

// ── Token robuste ─────────────────────────────────────────────
async function _getToken() {
  try { const t=await getAuthToken(); if(t) return t; } catch {}
  try { const u=auth.currentUser; if(u) return await u.getIdToken(false); } catch {}
  return null;
}

// ── Rendre DS_RENDER disponible pour les modules dépendants ───
window.DS_RENDER = {
  normalizeShap, normalizeRatios, normalizeRadar, normalizeRecos, normalizeWI,
};

// ── Exposition de _tsToString pour les vues ───────────────────
window.DS_DASH = {
  loadAnalyse,
  navTo:         (v) => window.DS_VIEWS?.navTo(v),
  _tsToString:   tsToString,
  updateUserUI,
};

// ════════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ════════════════════════════════════════════════════════════════
async function init() {
  console.log('[dashboard.js] Initialisation démarrée');

  const overlay = document.getElementById('loading-overlay');
  
  // S'assurer que les composants UI de base sont injectés
  if (typeof window._ds_injectContrastToggleUI === 'function') {
    window._ds_injectContrastToggleUI();
  }

  const entry = await window.DS_NAV?.handleDashboardEntry();
  if (entry?.action === 'demo') loadAnalyse(window.DEMO_DATA);

  window.DS_PAYMENT?.checkPaymentResult();

  try {
    if (typeof window.initBgCanvas === 'function') window.initBgCanvas();
    else console.warn('[dashboard] initBgCanvas non disponible');
  } catch (e) { console.error('initBgCanvas error', e); }
  try {
    if (typeof window.initCursor === 'function') window.initCursor();
    else console.warn('[dashboard] initCursor non disponible');
  } catch (e) { console.error('initCursor error', e); }

  requireAuth(async ({ user, profile, abonnement }) => {
    console.log('[Auth] Connecté :', user.email);
    S.user       = user;
    S.profile    = profile;
    S.abonnement = abonnement;

    if (overlay) {
      overlay.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      overlay.style.opacity    = '0';
      overlay.style.filter     = 'blur(20px)';
      
      // Lancer l'entrée magnifique de l'application
      const appEl = document.getElementById('app');
      if (appEl) {
        appEl.classList.add('page-entrance');
      }

      setTimeout(() => { 
        overlay.style.display = 'none'; 
      }, 850);
    }

    updateUserUI();
    setTopbarDate();
    drawSparks([],[],[],[]);
    setupRealtimeListeners(user.uid);
    fu();
    setTimeout(() => window.DS_PROFILE?.initFromProfile(), 200);
    console.log('[Dashboard] Initialisé ✓');
  });
}

// ════════════════════════════════════════════════════════════════
//  INTERFACE UTILISATEUR
// ════════════════════════════════════════════════════════════════
function syncPlanBadges(plan) {
  const labels = { standard:'Standard', premium:'Premium ✦', extra:'Extra ✦✦' };
  ['plan-badge', 'pd-plan-badge', 'pd-drawer-plan-badge'].forEach((id) => {
    const badge = document.getElementById(id);
    if (!badge) return;
    badge.textContent = labels[plan] ?? plan;
    badge.className = `badge ${plan}`;
    badge.style.opacity = '1';
  });
}

function updatePlanCards(plan) {
  const rank = { standard: 1, premium: 2, extra: 3 };
  const buttonLabels = {
    standard: 'Choisir Standard',
    premium: 'Passer a Premium',
    extra: 'Activer Extra'
  };

  document.querySelectorAll('.settings-plan-card[data-plan]').forEach((card) => {
    const cardPlan = card.dataset.plan;
    const btn = card.querySelector('[data-plan-action]');
    const status = card.querySelector('[data-plan-status]');
    const isCurrent = cardPlan === plan;
    const isIncluded = plan === 'extra' && (cardPlan === 'premium' || cardPlan === 'standard');
    const isDowngrade = (rank[cardPlan] || 0) < (rank[plan] || 0);

    card.classList.toggle('current', isCurrent);

    if (!btn || !status) return;

    btn.disabled = false;
    if (isCurrent) {
      status.textContent = 'Plan actuel';
      btn.textContent = 'Plan actuel';
      btn.disabled = true;
    } else if (isIncluded) {
      status.textContent = 'Deja inclus';
      btn.textContent = 'Deja inclus';
      btn.disabled = true;
    } else if (isDowngrade) {
      status.textContent = 'Plan inferieur';
      btn.textContent = 'Offre inferieure';
      btn.disabled = true;
    } else {
      status.textContent = cardPlan === 'premium' ? 'Upgrade cle' : cardPlan === 'extra' ? 'Niveau maximum' : 'Disponible';
      btn.textContent = buttonLabels[cardPlan] || `Choisir ${cardPlan}`;
    }
  });
}

function updateUserUI() {
  const prenom = S.profile?.prenom || S.user?.displayName?.split(' ')[0] || S.user?.email?.split('@')[0] || '…';
  const el = document.getElementById('uname');
  if (el) {
    // ✅ Utiliser des classes CSS plutôt que des styles inline
    el.innerHTML = `${prenom}<span class="topbar-sep">–</span><span id="topbar-clock" class="topbar-clock"></span>` +
      `<span class="online-dot"></span>`;
    _tickClock();
  }
  const av = document.getElementById('nav-avatar');
  if (av) {
    const initials = S.profile
      ? [S.profile.prenom?.[0], S.profile.nom?.[0]].filter(Boolean).join('').toUpperCase()
      : (S.user?.displayName?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?');
    const initEl = document.getElementById('nav-avatar-initials');
    if (initEl) {
      initEl.textContent = initials || '?';
    } else {
      av.textContent = initials || '?';
    }
    av.onclick = (e) => { e.stopPropagation(); if (window.DS_EXTRA?.showProfileDrawer) window.DS_EXTRA.showProfileDrawer(); else if (window.DS_PROFILE?.openDrawer) window.DS_PROFILE.openDrawer(); };
    av.title = 'Mon profil';
  }

  // Mettre à jour les informations textuelles du profil dans la sidebar
  const fullName = S.profile ? `${S.profile.prenom || ''} ${S.profile.nom || ''}`.trim() : S.user?.displayName || S.user?.email?.split('@')[0] || '…';
  const roleVal = S.profile?.poste || 'CFO';
  const companyVal = S.profile?.entreprise || 'Demo SAS';
  const sidebarNameEl = document.getElementById('sidebar-profile-name');
  if (sidebarNameEl) sidebarNameEl.textContent = fullName || '…';
  const sidebarRoleEl = document.getElementById('sidebar-profile-role');
  if (sidebarRoleEl) sidebarRoleEl.textContent = `${roleVal} - ${companyVal}`;

  // ✅ Race-condition guard :
  // Source-of-truth = Firestore abonnement quand dispo.
  // Si pas encore prêt => affichage standard (et on sera mis à jour
  // dès que listenAbonnement renvoie la valeur réelle).
  const planFromAb = S.abonnement?.plan;
  const plan = (planFromAb && ['standard','premium','extra'].includes(planFromAb))
    ? planFromAb
    : (S.profile?.plan && ['standard','premium','extra'].includes(S.profile.plan))
      ? S.profile.plan
      : 'standard';

  // Ne pas "figer" un plan incorrect via fallback local.
  // (On laisse le listener abonnement corriger dès qu'il arrive.)
  delete S._lastKnownPlan;

  syncPlanBadges(plan);
  updatePlanCards(plan);

  document.body.setAttribute('data-plan', plan);

  // ── Particules Extra ─────────────────────────────────────────
  let particles = document.getElementById('plan-particles');
  if (plan === 'extra') {
    if (!particles) {
      particles = document.createElement('div');
      particles.id        = 'plan-particles';
      particles.className = 'plan-particles';
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('div');
        s.className = 'star';
        const sz = Math.random() * 3 + 1;
        // ✅ Variables CSS pour les couleurs
        const colors = ['var(--color-violet)', 'var(--color-ice)', 'var(--color-accent)', 'var(--color-success)', 'var(--color-admin)'];
        const c = colors[Math.floor(Math.random() * colors.length)];
        s.style.setProperty('--star-c', c);
        s.style.background = 'var(--star-c)';
        s.style.width = `${sz}px`;
        s.style.height = `${sz}px`;
        s.style.left = `${Math.random() * 100}%`;
        s.style.top  = `${Math.random() * 100}%`;
        particles.appendChild(s);
      }
      document.body.appendChild(particles);
    } else {
      // Nettoyage si le plan n'est plus extra
      const existing = document.getElementById('plan-particles');
      if (existing) existing.remove();
    }

  }
 
} // <-- fin updateUserUI

// ── Horloge topbar — mise à jour toutes les 60s ────────────────
function _tickClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false});
}


function setTopbarDate(lastAnalyseDate=null) {
  const now      = new Date();
  const rawLabel = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const label    = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  const el = document.getElementById('tdate');
  if (el) el.textContent = label;

  const sep  = document.getElementById('tdate-sep');
  const last = document.getElementById('tdate-last');
  if (lastAnalyseDate && sep && last) {
    sep.style.display  = 'inline';
    last.style.display = 'inline';
    last.textContent   = 'Dernière analyse ' + msToHuman(now - lastAnalyseDate);
  } else {
    if (sep)  sep.style.display  = 'none';
    if (last) last.style.display = 'none';
  }
}

// ── Vérification des alertes proactives de l'Agent IA ──────────
function _checkProactiveAlerts(analyses) {
  if (!analyses || !analyses.length) return;
  const last = analyses[0];
  
  // Si le score est très bas (< 30) et que c'est une nouvelle analyse (moins de 24h)
  const isRecent = (Date.now() - tsToDate(last.createdAt).getTime()) < 86400000;
  
  if (last.score < 30 && isRecent && !localStorage.getItem(`alert_seen_${last.id}`)) {
    setTimeout(() => {
      window.Toast?.show(`🚨 Agent IA : Risque critique détecté pour ${last.entreprise}. Consultez le chat pour un plan d'urgence.`, { 
        type: 'error',
        duration: 8000 
      });
      localStorage.setItem(`alert_seen_${last.id}`, 'true');
    }, 2000);
  }
}

// ════════════════════════════════════════════════════════════════
//  ÉCOUTEURS FIRESTORE
// ════════════════════════════════════════════════════════════════
function setupRealtimeListeners(uid) {
  window.DS_NOTIFS?.init(uid);

  S._unsubProfile = listenUserProfile(uid, (profile) => {
    S.profile = profile;
    updateUserUI();
    getAbonnement(uid).then(ab => {
      S.abonnement = ab||{plan:'standard'};
      updateUserUI();
    }).catch(() => { S.abonnement={plan:'standard'}; updateUserUI(); });
  });

  S._unsubAbonnement = listenAbonnement(uid, (ab) => {
    S.abonnement = ab||{plan:'standard'};
    updateUserUI();
    if (ab?.plan && ab.plan!==S.profile?.plan) showToast(`🎉 Plan mis à jour : ${ab.plan}`,'ok');
  });

  S._unsubAnalyses = listenUserAnalyses(uid, (analyses) => {
    S.analyses = analyses||[];
    renderSidebar();
    updateKPIs();
    _checkProactiveAlerts(S.analyses); // ← Surveillance Agent Autonome
    if (!S.analyses.length) { showEmptyState(); return; }
    if (S.waitingForResult && S.pendingAnalyseId) {
      const fresh = S.analyses.find(a=>a.id===S.pendingAnalyseId&&a.status==='completed');
      if (fresh) {
        S.waitingForResult=false;
        window.DS_UPLOAD?.hidePipeline();
        loadAnalyse(fresh);
        showToast('✓ Analyse terminée','ok');
        if (window._DS_notifyAnalyseDone) window._DS_notifyAnalyseDone(fresh);
        return;
      }
    }
    if (!S.currentAnalyse && S.analyses.length>0) loadAnalyse(S.analyses[0]);
  });
}

// ════════════════════════════════════════════════════════════════
//  KPI
// ════════════════════════════════════════════════════════════════
function updateKPIs() {
  const { analyses }=S; if(!analyses.length) return;
  const latest=analyses[0], now=new Date();
  const ceJour=analyses.filter(a=>{const d=tsToDate(a.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const avgConf=Math.round(analyses.reduce((s,a)=>s+(a.confidence||94),0)/analyses.length);
  const lastMs=latest?.processingMs||340;
  anim('kv-score',0,latest?.score??0,1000);
  anim('kv-nb',   0,ceJour||analyses.length,800);
  anim('kv-conf', 0,avgConf,1200);

  const planNow = S.abonnement?.plan || 'standard';
  const maxAnalyses = {standard:10,premium:50,extra:Infinity}[planNow] ?? 10;
  const analysesLeft = Math.max(0, maxAnalyses - (S.analyses?.length || 0));
  const quotaEl = document.getElementById('kv-quota');
  if (quotaEl) {
    quotaEl.textContent = maxAnalyses === Infinity ? '∞' : analysesLeft;
    quotaEl.title = `${S.analyses?.length||0}/${maxAnalyses === Infinity ? '∞' : maxAnalyses} analyses utilisées`;
  }
  const kvTime=document.getElementById('kv-time'); if(kvTime) kvTime.textContent=lastMs;
  const hist=analyses.slice(0,6).reverse();
  drawSparks(hist.map(a=>a.score||0),hist.map((_,i)=>i+1),hist.map(a=>a.confidence||90),hist.map(a=>a.processingMs||340));
}

// ════════════════════════════════════════════════════════════════
//  CHARGER UNE ANALYSE
// ════════════════════════════════════════════════════════════════
function loadAnalyse(a) {
  S.currentAnalyse=a;
  renderSidebar();
  const plan=S.abonnement?.plan||S.profile?.plan||'standard';

  const _show = (id, disp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display     = disp;
    el.style.opacity     = '1';
    el.style.visibility  = 'visible';
    el.style.transform   = 'none';
  };
  _show('score-sec',        'grid');
  _show('ratios-sec',       'block');
  _show('wi-sec',           'block');
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
  window._planChatQuota = { standard:30, premium:200, extra:Infinity }[plan] ?? 30;

  const score  = a.score ?? 0;
  const zone   = a.zone  ?? zoneFromScore(score);
  const shap   = normalizeShap(a.shapValues || a.shap || []);
  const ratios = normalizeRatios(a.ratios || a.financialRatios || []);
  const radar  = normalizeRadar(a.radarDimensions || a.radar || []);
  const tl     = a.scoreHistory || a.tl || [score];
  const recos  = normalizeRecos(a.recommendations || a.recos || []);
  const wi     = normalizeWI(a.whatifParams || a.wi || [], ratios);

  const _lad = tsToDate(a.createdAt);
  window._lastAnalyseDate = _lad;
  setTopbarDate(_lad);
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
  fu();
  const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  const prob=Math.round((100-score)*(ZM[zone]||1)*.85);
  window._lastTimeline=tl; window._lastRatios=ratios; window._lastScore=score;
  window._lastZone=zone; window._lastAnalyse=a; window._lastShap=shap;
  // ✅ Utiliser des classes CSS pour les couleurs de jauge
  const gPct=document.getElementById('gauge-pct');
  if(gPct){
    gPct.textContent=prob+'%';
    gPct.className = prob>60 ? 'gauge-danger' : prob>35 ? 'gauge-warning' : 'gauge-ok';
  }
  setTimeout(()=>{
    if(window.DS_EXTRA && window.DS_VIEWS){
      window.DS_VIEWS.renderVisualisations();
    }
    window.DS_EXTRA?.renderTimelineFixed(tl,'tl-svg');
    // Rendu des graphiques 3D avancés
    render3DVisualizations(score, zone, ratios, a);
  },300);
  setTimeout(()=>window.DS_EXTRA?.initSmartAlerts(a),800);
  setTimeout(()=>window._DS_injectExportBtn?.(),500);
  setTimeout(()=>window.DS_EXTRA?.renderTimelineFixed(tl,'tl-svg'),350);
  console.log('[Analyse chargée]',a.entreprise||a.id,'— score:',score);
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  RENDU DES GRAPHIQUES 3D AVANCÉS
// ════════════════════════════════════════════════════════════════
function render3DVisualizations(score, zone, ratios, analysis) {
  // Vérifier que Three.js est chargé
  if (typeof window.THREE === 'undefined') {
    console.warn('[3D] Three.js non chargé, les graphiques 3D ne seront pas affichés');
    return;
  }

  // retry max pour éviter les race conditions de chargement (race entre modules)
  const MAX_WAIT_MS = 3000;
  const STEP_MS = 350;
  const start = render3DVisualizations._startTs || Date.now();
  if (!render3DVisualizations._startTs) render3DVisualizations._startTs = start;

  // Vérifier que le conteneur speedometer existe
  const speedContainer = document.getElementById('speedometer-3d');
  if (!speedContainer) {
    console.warn('[3D] Conteneurs 3D non trouvés dans le DOM');
    return;
  }

  // Vérifier que les fonctions de rendu 3D sont disponibles
  const renderers = {
    speedometer: window.DS_EXTRA_ADVANCED?.render3DSpeedometer || window.DS_EXTRA?.render3DSpeedometer || window.render3DSpeedometer,
    scorecard: window.DS_EXTRA_ADVANCED?.render3DScoreCard || window.DS_EXTRA?.render3DScoreCard || window.render3DScoreCard,
    frbfr: window.DS_EXTRA_ADVANCED?.render3DFRBFR || window.DS_EXTRA?.render3DFRBFR || window.render3DFRBFR,
    riskmatrix: window.DS_EXTRA_ADVANCED?.render3DRiskMatrix || window.DS_EXTRA?.render3DRiskMatrix || window.render3DRiskMatrix,
    tornado: window.DS_EXTRA_ADVANCED?.render3DTornado || window.DS_EXTRA?.render3DTornado || window.render3DTornado,
    altmanz: window.DS_EXTRA_ADVANCED?.render3DAltmanZ || window.DS_EXTRA?.render3DAltmanZ || window.render3DAltmanZ
  };

  // Si aucun renderer advanced n'est dispo, on attend jusqu'à MAX_WAIT_MS
  if (!Object.values(renderers).some(Boolean)) {
    const elapsed = Date.now() - start;
    if (elapsed < MAX_WAIT_MS) {
      console.warn('[3D] Rendu avance non encore pret — retry', elapsed + 'ms');
      setTimeout(() => {
        // reset startTs pour un nouveau cycle
        render3DVisualizations._startTs = null;
        render3DVisualizations(score, zone, ratios, analysis);
      }, STEP_MS);
      return;
    }
    console.warn('[3D] Timed out avant chargement renderers — rendu annulé');
    return;
  }

  // Déterminer la zone de couleur
  const zoneMap = {
    'saine': 'saine',
    'vigilance': 'vigilance',
    'risque': 'risque',
    'critique': 'critique'
  };
  const zoneKey = zoneMap[zone] || 'vigilance';

  // 1. Speedometer 3D
  if (renderers.speedometer) {
    try {
      renderers.speedometer('speedometer-3d', score, zoneKey, 'Score Santé');
      console.log('[3D] Speedometer rendu avec score:', score, 'zone:', zoneKey);
    } catch (e) {
      console.warn('[3D] Erreur speedometer:', e);
    }
  }

  // 2. Score Card 3D (multi-piliers)
  if (renderers.scorecard) {
    try {
      renderers.scorecard('scorecard-3d', ratios, score, zoneKey);
      console.log('[3D] ScoreCard rendu');
    } catch (e) {
      console.warn('[3D] Erreur scorecard:', e);
    }
  }

  // 3. FR/BFR 3D
  if (renderers.frbfr) {
    try {
      renderers.frbfr('frbfr-3d', ratios, score, zoneKey);
      console.log('[3D] FR/BFR rendu');
    } catch (e) {
      console.warn('[3D] Erreur frbfr:', e);
    }
  }

  // 4. Risk Matrix 3D
  if (renderers.riskmatrix) {
    try {
      renderers.riskmatrix('riskmatrix-3d', ratios, score, zoneKey);
      console.log('[3D] RiskMatrix rendu');
    } catch (e) {
      console.warn('[3D] Erreur riskmatrix:', e);
    }
  }

  // 5. Tornado 3D
  if (renderers.tornado) {
    try {
      renderers.tornado('tornado-3d', ratios, score, zoneKey);
      console.log('[3D] Tornado rendu');
    } catch (e) {
      console.warn('[3D] Erreur tornado:', e);
    }
  }

  // 6. Altman Z 3D
  if (renderers.altmanz) {
    try {
      renderers.altmanz('altmanz-3d', ratios, score, zoneKey);
      console.log('[3D] AltmanZ rendu');
    } catch (e) {
      console.warn('[3D] Erreur altmanz:', e);
    }
  }
}

function renderSidebar(filter=S.filterText) {
  const list=S.analyses.filter(a=>{
    const q=filter.toLowerCase();
    return (a.entreprise||a.company||'').toLowerCase().includes(q)
      || (a.filename||a.sourceFile||'').toLowerCase().includes(q)
      || (a.id||'').toLowerCase().includes(q);
  });
  const container=document.getElementById('sb-list'); if(!container) return;
  if(!list.length){
    // ✅ Utiliser la classe muted plutôt qu'un style inline
    container.innerHTML=`<div class="sidebar-empty">Aucune analyse trouvée</div>`;
    return;
  }
  container.innerHTML=list.map(a=>{
    const zone=a.zone??zoneFromScore(a.score??0), date=tsToString(a.createdAt);
    const model=(a.model||'').split('+')[0].trim()||'ML', active=S.currentAnalyse?.id===a.id?' active':'';
    const rawFile = a.filename||a.sourceFile||'';
    const fileLabel = rawFile ? rawFile.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ').slice(0,28) : '';
    const mainName = a.entreprise||a.company||fileLabel||('Analyse '+a.id.slice(-5));
    const showFile = fileLabel && fileLabel.toLowerCase() !== mainName.toLowerCase();
    // ✅ Bouton de suppression avec classe CSS au lieu de style inline
    return `<div class="ac${active}" data-id="${a.id}">
      <div class="ac-top">
        <div class="ac-name">${mainName}</div>
        <div class="ac-score s-${zone}">${a.score??'—'}</div>
      </div>
      ${showFile ? `<div class="ac-file-label"><i class="fa-solid fa-file"></i>${fileLabel}</div>` : ''}
      <div class="ac-meta">
        <i class="fa-solid fa-calendar" style="font-size:8px;"></i>${date}
        <i class="fa-solid fa-circle" style="font-size:3px;opacity:.4;"></i>${model}
      </div>
      <button class="ac-del-btn" data-did="${a.id}" data-dnom="${a.entreprise??''}">✕</button>
    </div>`;
  }).join('');
  container.querySelectorAll('.ac[data-id]').forEach(el=>{
    el.addEventListener('click',()=>{const found=S.analyses.find(a=>a.id===el.dataset.id);if(found)loadAnalyse(found);});
  });
  container.querySelectorAll('.ac-del-btn[data-did]').forEach(btn=>{
    btn.addEventListener('click',(e)=>{e.stopPropagation();window.DS_EXTRA?.deleteAnalyse(btn.dataset.did,btn.dataset.dnom);});
  });
  // Update sidebar count badge in real-time
  const badge = document.getElementById('sb-count-badge');
  if (badge) {
    const total = S.analyses.length;
    const shown = list.length;
    badge.textContent = filter ? `${shown}/${total}` : String(total);
  }
}

function showEmptyState() {
  const upSec=document.getElementById('upload-sec'); if(upSec) upSec.style.display='block';
  ['score-sec','ratios-sec','wi-sec','bottom-sec','chat-sec'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  anim('kv-score',0,0,400); anim('kv-nb',0,0,400); anim('kv-conf',0,0,400);
}

// ════════════════════════════════════════════════════════════════
//  NORMALISATION
// ════════════════════════════════════════════════════════════════
function normalizeShap(raw) {
  return raw.map(s=>({
    n: s.feature??s.n??'Inconnu',
    v: +(+(s.value??s.v??0)).toFixed(2),
    p: s.pct??s.p??Math.min(Math.abs(+(s.value??s.v??0))*10,100),
    pos:s.direction==='positive'||s.pos||(+(s.value??s.v??0))>0,
  }));
}

function normalizeRatios(raw) {
  // ✅ Utiliser les variables CSS pour les couleurs de statut
  const CM={
    green:'var(--color-success)',
    yellow:'var(--color-accent)',
    orange:'#f97316',
    red:'var(--color-error)'
  };
  return raw.map(r=>({
    n:r.name??r.n??'Ratio', v:r.value??r.v??0, u:r.unit??r.u??'',
    b:r.benchmark??r.b??'—', c:CM[r.status]??r.color??r.c??'var(--color-primary-dark)', p:r.score??r.p??50,
  }));
}

function normalizeRadar(raw) {
  return raw.map(r=>({l:r.label??r.l??r.dimension??'Dim',v:r.value??r.v??r.score??50}));
}

function normalizeRecos(raw) {
  const LM={high:'high',medium:'medium',low:'low',critical:'high',warning:'medium',info:'low'};
  const ICON={ high:'triangle-exclamation', medium:'chart-line', low:'seedling' };
  // ✅ Utiliser les variables CSS
  const CATS={
    high:   { label:'Urgent',   color:'var(--color-error)', bg:'var(--error-bg)',   ring:'var(--error-ring)'  },
    medium: { label:'Important',color:'var(--color-accent)', bg:'var(--accent-bg)',  ring:'var(--accent-ring)' },
    low:    { label:'Conseil',  color:'var(--color-success)', bg:'var(--success-bg)', ring:'var(--success-ring)' },
  };
  const WEIGHT={high:3,medium:2,low:1};
  return raw.map((r,i)=>{
    const lvl  = LM[r.level??r.lvl??r.priority]??'medium';
    const cat  = CATS[lvl];
    const icon = r.icon??(ICON[lvl]??'lightbulb');
    const rawDesc = r.description??r.desc??r.d??'';
    const stepLines = rawDesc.split(/[;]/).map(s=>s.trim()).filter(s=>s.length>8);
    const steps = (r.steps??r.actions??[]).length
      ? (r.steps??r.actions)
      : stepLines.length > 1 ? stepLines : [];
    const shortDesc = steps.length ? stepLines[0] || rawDesc : rawDesc;
    return {
      lvl, cat, icon, weight: WEIGHT[lvl],
      t:    r.title??r.t??'Recommandation',
      d:    shortDesc,
      steps,
      impact:    r.impact??r.expectedImpact??null,
      horizon:   r.horizon??r.timeframe??r.delai??null,
      metric:    r.metric??r.kpi??null,
      idx: i,
    };
  });
}

function normalizeWI(raw,ratios) {
  if(raw.length) return raw.map(w=>({
    id:w.id??`wi-${(w.feature??w.l??'').replace(/\W/g,'')}`,
    l:w.label??w.feature??w.l??'Paramètre',
    min:w.min??0, max:w.max??100, step:w.step??0.1, cur:w.current??w.value??w.cur??0, u:w.unit??w.u??'',
  }));
  return ratios.slice(0,3).map((r,i)=>({
    id:`wi-${i}`, l:r.n,
    min:Math.max(0,+(r.v*.3).toFixed(2)), max:+(r.v*2.2).toFixed(2),
    step:+(r.v*.05).toFixed(3), cur:r.v, u:r.u,
  }));
}

// ════════════════════════════════════════════════════════════════
//  RENDU — Score ring
// ════════════════════════════════════════════════════════════════
const CIRC=2*Math.PI*65;

function renderRing(sc,zone) {
  const zc=ZC[zone]??ZC.vigilance, off=CIRC*(1-sc/100);
  ['rf','rg'].forEach(id=>document.getElementById(id)?.setAttribute('stroke',zc.s));
  setTimeout(()=>{
    ['rf','rg'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.strokeDashoffset=off;});
  },80);
  anim('snum',0,sc,1700);
  const numEl=document.getElementById('snum');
  // ✅ Utiliser les classes de zone au lieu de couleurs en dur
  if(numEl) {
    numEl.style.color = zc.t;
    numEl.className = 'score-num ' + zone;
  }
  const b=document.getElementById('zbadge');
  if(b){
    b.textContent=zc.l;
    b.className = `zone-badge score-badge zone-${zone}`;
  }
}

function renderMeta(a,zone) {
  const zc=ZC[zone]??ZC.vigilance, el=document.getElementById('smeta'); if(!el) return;
  const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  const prob=a.probabiliteDefaut??a.probDefault??Math.round((100-(a.score??50))*(ZM[zone]||1)*.85);
  // ✅ Classes CSS pour les couleurs de probabilité
  const pcClass = prob>60 ? 'danger' : prob>35 ? 'warning' : 'ok';
  el.innerHTML=`
    <div class="score-meta-row"><span class="sml">Probabilité défaut</span><span class="smv ${pcClass}">${prob}%</span></div>
    <div class="score-meta-row"><span class="sml">Indice confiance</span><span class="smv ice">${a.confidence??a.conf??'—'}%</span></div>
    <div class="score-meta-row"><span class="sml">Modèle ensemble</span><span class="smv muted">${a.model??'—'}</span></div>
    <div class="score-meta-row"><span class="sml">AUC ROC</span><span class="smv gold">${a.auc??'—'}</span></div>`;
}

function renderShap(sv) {
  const el=document.getElementById('shap-list'); if(!el) return;
  el.innerHTML=sv.map(s=>`
    <div class="shap-item">
      <div class="shap-row">
        <span class="shap-name">${s.n}</span>
        <span class="shap-v ${s.pos?'p':'n'}">${s.pos?'+':''}${s.v}</span>
      </div>
      <div class="bar-bg"><div class="bar-fill ${s.pos?'p':'n'}" id="sb${s.n.replace(/\W/g,'')}" style="width:0%"></div></div>
    </div>`).join('');
  setTimeout(()=>sv.forEach(s=>{const b=document.getElementById('sb'+s.n.replace(/\W/g,''));if(b)b.style.width=s.p+'%';}),280);
}

function renderRadar(dims) {
  const svg=document.getElementById('radar'); if(!svg||!dims.length) return;
  const cx=120,cy=120,r=85,n=dims.length;
  const ang=dims.map((_,i)=>i/n*2*Math.PI-Math.PI/2);
  let g='',ax='';
  [20,40,60,80,100].forEach(p=>{
    const pts=ang.map(a=>{const d=r*p/100;return `${cx+d*Math.cos(a)},${cy+d*Math.sin(a)}`;}).join(' ');
    g+=`<polygon points="${pts}" fill="none" stroke="var(--border-v)" stroke-width="1"/>`;
  });
  ang.forEach((a,i)=>{
    ax+=`<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(a)}" y2="${cy+r*Math.sin(a)}" stroke="var(--border-v)" stroke-width="1"/>`;
    const lx=cx+(r+16)*Math.cos(a),ly=cy+(r+16)*Math.sin(a);
    ax+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Syne,sans-serif" font-size="8" font-weight="700" letter-spacing="1" fill="var(--text-2)">${dims[i].l.toUpperCase()}</text>`;
  });
  const bench=ang.map(a=>{const d=r*.7;return `${cx+d*Math.cos(a)},${cy+d*Math.sin(a)}`;}).join(' ');
  const data=dims.map((d,i)=>{const dr=r*d.v/100;return `${cx+dr*Math.cos(ang[i])},${cy+dr*Math.sin(ang[i])}`;}).join(' ');
  svg.innerHTML=`<defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--violet-3)"/><stop offset="1" stop-color="var(--violet-bg)"/></linearGradient></defs>
    ${g}${ax}
    <polygon points="${bench}" fill="none" stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="4,3" opacity=".5"/>
    <polygon points="${data}" fill="url(#rg2)" stroke="var(--violet-2)" stroke-width="1.5"/>
    ${dims.map((d,i)=>{const dr=r*d.v/100,px=cx+dr*Math.cos(ang[i]),py=cy+dr*Math.sin(ang[i]);return `<circle cx="${px}" cy="${py}" r="3.5" fill="var(--violet-3)" stroke="var(--bg-base)" stroke-width="1.5"/>`;}).join('')}`;
}

function renderRatios(ratios) {
  const el=document.getElementById('ratios-grid'); if(!el) return;
  el.innerHTML=ratios.map(r=>`
    <div class="ratio">
      <div class="ratio-name">${r.n}</div>
      <div class="ratio-val" style="color:${r.c}">${r.v}${r.u}</div>
      <div class="ratio-bench">Réf : ${r.b}</div>
      <div class="ratio-bar"><div class="ratio-fill" id="rf${r.n.replace(/\W/g,'')}" style="width:0%;background:${r.c};box-shadow:0 0 5px ${r.c}44;"></div></div>
    </div>`).join('');
  setTimeout(()=>ratios.forEach(r=>{const b=document.getElementById('rf'+r.n.replace(/\W/g,''));if(b)b.style.width=r.p+'%';}),380);
}

function renderWI(items) {
  const el = document.getElementById('wi-grid'); if (!el) return;
  const sec = document.getElementById('wi-sec');
  if (sec) { sec.style.display = 'block'; sec.style.opacity = '1'; sec.style.visibility = 'visible'; }
  if (!items || !items.length) {
    el.innerHTML = '<div class="wi-empty">Importez une analyse pour accéder au simulateur What-If.</div>';
    return;
  }
  el.innerHTML=items.map(w=>`
    <div class="wi">
      <div class="wi-lbl">${w.l}</div>
      <input type="range" class="wi-slider" id="${w.id}" min="${w.min}" max="${w.max}" step="${w.step}" value="${w.cur}"
        oninput="DS.updateWIDisplay('${w.id}','wv${w.id}','${w.u}')">
      <div class="wi-display" id="wv${w.id}">${w.cur}${w.u}</div>
    </div>`).join('');
}

function updateWIDisplay(sid,vid,u) {
  const v=document.getElementById(sid)?.value, el=document.getElementById(vid);
  if(el&&v!==undefined) el.textContent=parseFloat(v).toFixed(2)+u;
}

// ════════════════════════════════════════════════════════════════
//  SCATTER DASHBOARD — render autonome dans scatter-dash-wrap
// ════════════════════════════════════════════════════════════════
function _renderScatterOnDash(current, peers, wrap) {
  if (!wrap) { wrap = document.getElementById('scatter-dash-wrap'); }
  if (!wrap) return;
  const W  = Math.max(wrap.offsetWidth, 500);
  const H  = Math.min(300, Math.max(240, W * 0.44));
  const PL = 44, PR = 16, PT = 18, PB = 38;
  const CW = W - PL - PR, CH = H - PT - PB;
  const sx = v => PL + (v / 100) * CW;
  const sy = v => PT + CH - (v / 100) * CH;
  // ✅ Utiliser les variables CSS pour les couleurs
  const zc = s => s>=75 ? 'var(--color-success)' : s>=50 ? 'var(--color-accent)' : s>=25 ? 'var(--color-risque)' : 'var(--color-error)';

  const same  = peers.filter(p => p.secteur === current.secteur);
  const other = peers.filter(p => p.secteur !== current.secteur);

  const quadrants = [
    {x:PL,      y:PT,      w:CW/2, h:CH/2, f:'var(--error-bg)',   l:'Risque élevé'},
    {x:PL+CW/2, y:PT,      w:CW/2, h:CH/2, f:'var(--accent-bg)',  l:'Vigilance'},
    {x:PL,      y:PT+CH/2, w:CW/2, h:CH/2, f:'var(--accent-bg)',  l:'Sous-performant'},
    {x:PL+CW/2, y:PT+CH/2, w:CW/2, h:CH/2, f:'var(--success-bg)', l:'Zone saine'},
  ].map(q=>`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.f}"/>
    <text x="${q.x+q.w/2}" y="${q.y+13}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="var(--text-hint)"
      font-weight="800" letter-spacing="1">${q.l.toUpperCase()}</text>`).join('');

  const grid = [0,25,50,75,100].map(v=>`
    <line x1="${sx(v)}" y1="${PT}" x2="${sx(v)}" y2="${PT+CH}"
      stroke="var(--border)" stroke-width=".5" stroke-dasharray="3,5"/>
    <line x1="${PL}" y1="${sy(v)}" x2="${PL+CW}" y2="${sy(v)}"
      stroke="var(--border)" stroke-width=".5" stroke-dasharray="3,5"/>
    <text x="${sx(v)}" y="${PT+CH+13}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="7.5" fill="var(--text-hint)">${v}</text>
    <text x="${PL-6}" y="${sy(v)+3}" text-anchor="end"
      font-family="Syne,sans-serif" font-size="7" fill="var(--text-hint)">${v}</text>`).join('');

  const axes = `
    <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT+CH}" stroke="var(--border-v)" stroke-width="1"/>
    <line x1="${PL}" y1="${PT+CH}" x2="${PL+CW}" y2="${PT+CH}" stroke="var(--border-v)" stroke-width="1"/>
    <text x="${PL+CW/2}" y="${H-4}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="var(--text-2)">
      ← Doctor Score™ →
    </text>
    <text x="10" y="${PT+CH/2}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="var(--text-2)"
      transform="rotate(-90,10,${PT+CH/2})">← Risque →</text>`;

  const otherDots = other.map(p=>`<circle cx="${sx(p.score||50)}" cy="${sy(p.y||50)}"
    r="4" fill="${zc(p.score||50)}" opacity=".2"/>`).join('');

  const sameDots = same.map(p=>`<circle cx="${sx(p.score||50)}" cy="${sy(p.y||50)}"
    r="5.5" fill="${zc(p.score||50)}" opacity=".5"
    stroke="var(--border-v)" stroke-width=".8"/>`).join('');

  const cx = sx(current.x||current.score||50);
  const cy = sy(current.y||50);
  const cc = zc(current.x||current.score||50);
  const guides = `
    <line x1="${cx}" y1="${PT}" x2="${cx}" y2="${cy}"
      stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="4,4" opacity=".3"/>
    <line x1="${PL}" y1="${cy}" x2="${cx}" y2="${cy}"
      stroke="var(--color-accent)" stroke-width="1" stroke-dasharray="4,4" opacity=".3"/>`;

  const label = (current.entreprise||'Vous').slice(0,16);
  const star = `
    <g transform="translate(${cx},${cy})">
      <circle r="20" fill="${cc}" opacity=".08"/>
      <circle r="11" fill="${cc}" opacity=".15"/>
      <circle r="7" fill="${cc}" opacity=".9"
        style="filter:drop-shadow(0 0 8px ${cc})"/>
      <path d="M0,-6.5 L1.5,-2 L6,-2 L2.5,1.2 L3.8,5.5 L0,3.2 L-3.8,5.5 L-2.5,1.2 L-6,-2 L-1.5,-2 Z"
        fill="var(--text)" opacity=".95"/>
      <text y="-16" text-anchor="middle"
        font-family="Syne,sans-serif" font-size="8.5" font-weight="900"
        fill="var(--text)" letter-spacing=".5">${label}</text>
      <text y="22" text-anchor="middle"
        font-family="Syne,sans-serif" font-size="8" fill="var(--text-2)">
        ${current.score||current.x||'—'}/100
      </text>
    </g>`;

  const legend = `
    <g transform="translate(${PL+4},${PT+6})">
      <circle cx="5" cy="5" r="5" fill="var(--color-success)" opacity=".5"/>
      <text x="14" y="9" font-family="Syne,sans-serif" font-size="7.5"
        fill="var(--text-2)">Même secteur</text>
    </g>
    <g transform="translate(${PL+90},${PT+6})">
      <circle cx="5" cy="5" r="3.5" fill="var(--text-2)" opacity=".3"/>
      <text x="14" y="9" font-family="Syne,sans-serif" font-size="7.5"
        fill="var(--text-2)">Autres secteurs</text>
    </g>`;

  wrap.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}"
    style="display:block;overflow:visible;">
    ${quadrants}${grid}${axes}${otherDots}${sameDots}${guides}${star}${legend}
  </svg>`;

  const sTag = document.getElementById('sc-sector-tag');
  if (sTag && current.secteur) { sTag.textContent = current.secteur; sTag.style.display = 'inline-block'; }
  const dTag = document.getElementById('sc-demo-badge');
  if (dTag) dTag.style.display = window._lastAnalyse?.score != null ? 'none' : 'inline-block';

  const sec = document.getElementById('sc-section') || document.getElementById('scatter-dash-sec');
  if (sec) { sec.style.display = 'block'; sec.style.opacity = '1'; }
}

function _initScatterBoth(a) {
  if (!window._SCATTER_RENDER && !a) return;
  const cur = {
    score:      a.score ?? 50,
    entreprise: a.entreprise ?? 'Votre entreprise',
    secteur:    a.secteur ?? 'Tech',
    x:          a.score ?? 50,
    y:          Math.max(5, Math.round((100-(a.score??50))*0.85)),
  };
  const peers = window._SCATTER_DEMO_PEERS || [];
  window._lastScatterData = { cur, peers };

  const dashWrap = document.getElementById('scatter-plot-wrap');
  if (dashWrap && !window._SCATTER_RENDER) _renderScatterOnDash(cur, peers, dashWrap);

  const vizWrap = document.getElementById('scatter-plot-wrap');
  if (vizWrap && window._SCATTER_RENDER) {
    const forcedW = vizWrap.offsetWidth
      || vizWrap.closest('.view-pane')?.offsetWidth
      || vizWrap.closest('.card')?.offsetWidth
      || document.querySelector('.main-content')?.offsetWidth
      || window.innerWidth - 280;
    if (!vizWrap.offsetWidth) {
      vizWrap.style.width = forcedW + 'px';
      vizWrap.style.minHeight = '320px';
    }
    try { window._SCATTER_RENDER(cur, peers); } catch(e) {}
    setTimeout(() => {
      try { vizWrap.style.width = '100%'; window._SCATTER_RENDER(cur, peers); } catch(e) {}
    }, 300);
  } else if (vizWrap && !window._SCATTER_RENDER) {
    _renderScatterOnDash(cur, peers, vizWrap);
    setTimeout(() => { if (window._SCATTER_RENDER) window._SCATTER_RENDER(cur, peers); }, 500);
  }
}

function renderTimeline(data) {
  const svg=document.getElementById('tl-svg'); if(!svg||!data?.length) return;
  const par=svg.parentElement;
  if(par){par.style.overflow='hidden';par.style.position='relative';}
  svg.style.cssText='width:100%;height:100px;display:block;overflow:hidden;';
  if(window.DS_EXTRA?.renderTimelineFixed){window.DS_EXTRA.renderTimelineFixed(data,'tl-svg');return;}
  const TW=560,TH=100,mn=Math.min(...data)-8,mx=Math.max(...data)+8;
  const pts=data.map((v,i)=>({x:(i/(data.length-1))*(TW-50)+25,y:TH-16-((v-mn)/(mx-mn))*(TH-32)}));
  const pd=pts.map((p,i)=>(i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
  const ad=`M${pts[0].x},${TH} `+pts.map(p=>`L${p.x},${p.y}`).join(' ')+` L${pts[pts.length-1].x},${TH} Z`;
  const MONTHS=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const now=new Date().getMonth();
  const labels=data.map((_,i)=>MONTHS[(now-data.length+1+i+12)%12]);
  // ✅ Utiliser les variables CSS pour les couleurs
  svg.innerHTML=`<defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--violet-3)" stop-opacity=".22"/><stop offset="1" stop-color="var(--violet-3)" stop-opacity="0"/>
  </linearGradient></defs>
  <path d="${ad}" fill="url(#tlg)"/>
  <path d="${pd}" fill="none" stroke="var(--violet-2)" stroke-width="1.8" stroke-linecap="round" opacity=".65"/>
  ${pts.map((p,i)=>`
    <text x="${p.x}" y="${TH-2}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" fill="var(--text-hint)" letter-spacing="1">${labels[i]?.toUpperCase()}</text>
    <text x="${p.x}" y="${p.y-9}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="700" fill="var(--text-2)">${data[i]}</text>
    <circle cx="${p.x}" cy="${p.y}" r="${i===pts.length-1?5:2.8}" fill="${i===pts.length-1?'var(--color-accent)':'var(--violet-2)'}" stroke="var(--bg-base)" stroke-width="1.5"/>
  `).join('')}`;
}

/* ─── Tendance sparkline & delta ──────────────────────────── */
function renderTendance(tl) {
  if (!tl || tl.length < 2) return;
  // Delta val
  const last = tl[tl.length - 1], prev = tl[tl.length - 2];
  const delta = Math.round(last - prev);
  const el = document.getElementById('tendance-val');
  if (el) {
    el.textContent = (delta >= 0 ? '+' : '') + delta;
    el.style.color = delta >= 0 ? 'var(--success)' : '#ef4444';
  }
  // Sparkline
  const svg = document.getElementById('tendance-spark-svg');
  if (!svg || tl.length < 2) return;
  const W=160, H=44;
  const mn = Math.min(...tl), mx = Math.max(...tl);
  const range = mx - mn || 1;
  const pts = tl.map((v,i) => ({
    x: (i/(tl.length-1)) * W,
    y: H - 4 - ((v - mn)/range) * (H - 8)
  }));
  const path = pts.map((p,i) => (i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map(p=>`L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${H} Z`;
  const col = delta >= 0 ? 'var(--success)' : '#ef4444';
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = `<defs><linearGradient id="tspg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${col}" stop-opacity=".18"/>
    <stop offset="1" stop-color="${col}" stop-opacity="0"/>
  </linearGradient></defs>
  <path d="${area}" fill="url(#tspg)"/>
  <path d="${path}" fill="none" stroke="${col}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${pts[pts.length-1].x}" cy="${pts[pts.length-1].y}" r="3.5" fill="${col}" stroke="var(--bg-base)" stroke-width="1.5"/>`;
}

/* ─── Alertes & Points de vigilance ──────────────────────── */
function renderAlerts(recos, zone, analyse) {
  const el = document.getElementById('alerts-list');
  if (!el) return;
  // Construire les alertes à partir des recos à impact élevé + indicateurs de zone
  const warns = [];
  // Depuis les ratios si disponibles
  const ratios = window._lastRatios || [];
  ratios.filter(r => r.p < 50).slice(0, 2).forEach(r => {
    warns.push({
      icon: 'warn',
      title: r.n || 'Indicateur faible',
      sub: `Valeur actuelle : ${r.v}${r.u||''} — Référence : ${r.b||'—'}`
    });
  });
  // Depuis les recommandations prioritaires
  recos.filter(r => r.impact === 'élevé' || r.priority >= 2).slice(0, 3 - warns.length).forEach(r => {
    warns.push({
      icon: r.priority >= 2 ? 'error' : 'warn',
      title: r.t || r.title || 'Action recommandée',
      sub: r.d || r.desc || ''
    });
  });
  // Fallback par zone
  if (!warns.length) {
    const zoneWarns = {
      critique: [{icon:'error', title:'Score critique détecté', sub:'Consultez les recommandations pour agir rapidement.'}],
      risque:   [{icon:'warn',  title:'Zone de risque', sub:'Plusieurs ratios nécessitent votre attention.'}],
      vigilance:[{icon:'warn',  title:'Vigilance requise', sub:'Surveillez l\'évolution de vos indicateurs.'}],
      saine:    [{icon:'warn',  title:'Bonne santé globale', sub:'Maintenez votre discipline financière.'}]
    };
    warns.push(...(zoneWarns[zone] || zoneWarns.vigilance));
  }
  el.innerHTML = warns.map(w => `
    <div class="alert-item">
      <i class="fa-solid fa-triangle-exclamation alert-icon ${w.icon}"></i>
      <div class="alert-body">
        <div class="alert-title">${w.title}</div>
        ${w.sub ? `<div class="alert-sub">${w.sub}</div>` : ''}
      </div>
      <i class="fa-solid fa-chevron-right alert-arrow"></i>
    </div>`).join('');
}

/* ─── Répartition des risques (doughnut SVG) ─────────────── */
function renderRisques(ratios, zone) {
  const svgEl = document.getElementById('risques-doughnut-svg');
  const legendEl = document.getElementById('risques-legend-list');
  if (!svgEl) return;
  // Calculer la distribution par niveau
  const total = ratios.length || 4;
  const r = ratios;
  const faible    = r.filter(x => (x.p||50) >= 70).length;
  const modere    = r.filter(x => (x.p||50) >= 45 && (x.p||50) < 70).length;
  const eleve     = r.filter(x => (x.p||50) >= 25 && (x.p||50) < 45).length;
  const critique  = r.filter(x => (x.p||50) < 25).length;
  // Fallback si pas de ratios
  const totReel = faible + modere + eleve + critique || 1;
  const segments = [
    { label: 'Faible',    pct: Math.round(faible/totReel*100)||45, color: '#10b981' },
    { label: 'Modéré',   pct: Math.round(modere/totReel*100)||35, color: '#f59e0b' },
    { label: 'Élevé',    pct: Math.round(eleve/totReel*100)||15,  color: '#f97316' },
    { label: 'Critique', pct: Math.round(critique/totReel*100)||5, color: '#ef4444' }
  ];
  // SVG doughnut
  const cx=70, cy=70, outerR=58, innerR=36;
  let cumAngle = -Math.PI / 2;
  let paths = '';
  segments.forEach(seg => {
    const angle = (seg.pct / 100) * 2 * Math.PI;
    const x1 = cx + outerR * Math.cos(cumAngle);
    const y1 = cy + outerR * Math.sin(cumAngle);
    const x2 = cx + outerR * Math.cos(cumAngle + angle);
    const y2 = cy + outerR * Math.sin(cumAngle + angle);
    const ix1 = cx + innerR * Math.cos(cumAngle + angle);
    const iy1 = cy + innerR * Math.sin(cumAngle + angle);
    const ix2 = cx + innerR * Math.cos(cumAngle);
    const iy2 = cy + innerR * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${x1},${y1} A${outerR},${outerR} 0 ${large},1 ${x2},${y2} L${ix1},${iy1} A${innerR},${innerR} 0 ${large},0 ${ix2},${iy2} Z" fill="${seg.color}" opacity="0.88"/>`;
    cumAngle += angle;
  });
  svgEl.innerHTML = paths;
  // Légende
  const zoneLabel = { saine:'Bonne santé', vigilance:'Vigilance', risque:'Risque modéré', critique:'Zone critique' };
  const summaryEl = document.getElementById('risques-summary-text');
  if (summaryEl) summaryEl.textContent = zoneLabel[zone] || 'Risque modéré';
  if (legendEl) {
    legendEl.innerHTML = segments.map(s => `
      <div class="risque-row">
        <span class="risque-dot" style="background:${s.color};"></span>
        <span class="risque-label">${s.label}</span>
        <span class="risque-pct">${s.pct}%</span>
      </div>`).join('');
  }
}

function renderRecos(recos) {
  const el = document.getElementById('reco-list'); if (!el) return;
  if (!recos.length) {
    el.innerHTML = `<div class="reco-empty">
      <i class="fa-solid fa-circle-check reco-empty-icon"></i>
      Aucune recommandation critique détectée.</div>`;
    return;
  }

  const badge = document.getElementById('reco-badge');
  if (badge) {
    const nHigh = recos.filter(r=>r.lvl==='high').length;
    badge.textContent = nHigh ? `${nHigh} urgente${nHigh>1?'s':''}` : `${recos.length} conseil${recos.length>1?'s':''}`;
    badge.style.display = 'inline-block';
    // ✅ Classes CSS au lieu de styles inline
    badge.className = nHigh ? 'reco-badge-high' : 'reco-badge-normal';
  }

  const resolvedCount = parseInt(localStorage.getItem(`reco-resolved-${S.currentAnalyse?.id}`) || '0');
  const resolvedPct   = Math.min(100, Math.round((resolvedCount / Math.max(recos.length,1)) * 100));
  const activeFilter = el.dataset.filter || 'all';

  const filterBar = `
    <div class="reco-filters" id="reco-filter-bar">
      <span class="reco-filter-label">Filtrer :</span>
      ${['all','high','medium','low'].map(f=>`
        <button class="reco-filter-btn${activeFilter===f?' active':''}" data-f="${f}"
          onclick="document.getElementById('reco-list').dataset.filter='${f}';renderRecos(window._lastRecos||[])">
          ${f==='all'?'Tout':f==='high'?'🔴 Urgent':f==='medium'?'🟡 Important':'🟢 Conseil'}
        </button>`).join('')}
      <div class="reco-progress-wrap" title="${resolvedCount}/${recos.length} traité${resolvedCount>1?'s':''}">
        <div class="reco-progress-bar" style="width:${resolvedPct}%"></div>
        <span class="reco-progress-label">${resolvedPct}%</span>
      </div>
    </div>`;

  const filtered = activeFilter === 'all' ? recos : recos.filter(r=>r.lvl===activeFilter);

  const cards = filtered.map((r, i) => {
    const isResolved = localStorage.getItem(`reco-done-${S.currentAnalyse?.id}-${r.idx}`) === '1';
    const stepsHtml = r.steps.length
      ? `<ol class="reco-steps">${r.steps.map((s,si)=>
          `<li class="reco-step"><span class="reco-step-num">${si+1}</span><span>${s.replace(/^[\d\.\-\*\•]\s*/,'')}</span></li>`
        ).join('')}</ol>`
      : '';

    const metaHtml = [
      r.impact  ? `<span class="reco-meta-chip"><i class="fa-solid fa-arrow-trend-up"></i>${r.impact}</span>` : '',
      r.horizon ? `<span class="reco-meta-chip"><i class="fa-solid fa-clock"></i>${r.horizon}</span>` : '',
      r.metric  ? `<span class="reco-meta-chip reco-chip-kpi"><i class="fa-solid fa-chart-simple"></i>${r.metric}</span>` : '',
    ].filter(Boolean).join('');

    const chatQ = `Explique-moi comment mettre en œuvre cette recommandation : "${r.t}". Donne-moi des étapes concrètes adaptées à mon analyse.`;

    // ✅ Utiliser des classes CSS pour les couleurs de fond/bordure
    return `
    <div class="reco2 ${r.lvl}${isResolved ? ' reco2-done' : ''} fu"
      data-idx="${r.idx}"
      style="animation-delay:${i * 0.06}s">

      <div class="reco2-head" onclick="window._toggleReco(this)">
        <div class="reco2-icon-wrap">
          <div class="reco2-icon">
            <i class="fa-solid fa-${r.icon}"></i>
          </div>
          <svg class="reco2-ring" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none"
              stroke="${r.cat.ring}" stroke-width="2.5"
              stroke-dasharray="${Math.round(r.weight/3*113)} 113"
              stroke-linecap="round"
              transform="rotate(-90 22 22)"/>
          </svg>
        </div>

        <div class="reco2-main">
          <div class="reco2-row1">
            <span class="reco2-tag ${r.lvl}">${r.cat.label}</span>
            ${metaHtml}
          </div>
          <div class="reco2-title">${r.t}</div>
          <div class="reco2-desc">${r.d}</div>
        </div>

        <div class="reco2-chevron">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </div>

      <div class="reco2-body" style="display:none;">
        ${stepsHtml}
        <div class="reco2-actions">
          <button class="reco2-btn reco2-btn-chat"
            onclick="event.stopPropagation();DS_CHAT?._sendToChat(${JSON.stringify(chatQ)});DS?.navTo('chat')">
            <i class="fa-solid fa-comments"></i>Demander à l'IA
          </button>
          <button class="reco2-btn reco2-btn-done${isResolved?' reco2-done-active':''}"
            onclick="event.stopPropagation();window._toggleRecoDone(this,'${S.currentAnalyse?.id}',${r.idx})">
            <i class="fa-solid fa-${isResolved?'rotate-left':'circle-check'}"></i>
            ${isResolved ? 'Marquer en cours' : 'Marquer traité'}
          </button>
        </div>
      </div>

    </div>`;
  }).join('');

  el.innerHTML = filterBar + (filtered.length ? cards
    : `<div class="reco-empty-filter">Aucune recommandation dans cette catégorie.</div>`);

  window._lastRecos = recos;
  window.renderRecos = renderRecos;

  requestAnimationFrame(() => {
    el.querySelectorAll('.reco2.fu').forEach((card, i) => {
      setTimeout(() => card.classList.add('on'), i * 60);
    });
  });
}

window._toggleReco = function(head) {
  const card   = head.closest('.reco2');
  const body   = card.querySelector('.reco2-body');
  const chev   = card.querySelector('.reco2-chevron i');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.style.transform = isOpen ? '' : 'rotate(180deg)';
  card.classList.toggle('reco2-open', !isOpen);
};

window._toggleRecoDone = function(btn, analyseId, idx) {
  const card    = btn.closest('.reco2');
  const key     = `reco-done-${analyseId}-${idx}`;
  const isDone  = localStorage.getItem(key) === '1';
  localStorage.setItem(key, isDone ? '0' : '1');
  card.classList.toggle('reco2-done', !isDone);
  btn.innerHTML = isDone
    ? '<i class="fa-solid fa-circle-check"></i>Marquer traité'
    : '<i class="fa-solid fa-rotate-left"></i>Marquer en cours';
  btn.classList.toggle('reco2-done-active', !isDone);
  // ✅ Utiliser la classe de toast
  showToast(isDone ? 'Recommandation remise en cours' : 'Recommandation marquée traitée ✓', 'ok');
};

function drawSparks(sc,nb,cf,ms) {
  spk('sp0',sc.length?sc:[0,0,0,0,0,0],'var(--color-primary-dark)');
  spk('sp1',nb.length?nb:[0,0,0,0,0,0],'var(--color-accent)');
  spk('sp2',cf.length?cf:[0,0,0,0,0,0],'var(--color-success)');
  spk('sp3',ms.length?ms:[0,0,0,0,0,0],'var(--violet)');
}

function spk(id,data,c) {
  const s=document.getElementById(id); if(!s) return;
  const SW=120,SH=32,mn=Math.min(...data),mx=Math.max(...data);
  const ps=data.map((v,i)=>({x:i/(data.length-1)*SW,y:SH-((v-mn)/(mx-mn||1))*(SH-5)-3}));
  const d=ps.map((p,i)=>(i===0?`M${p.x},${p.y}`:`L${p.x},${p.y}`)).join(' ');
  s.innerHTML=`<path d="${d}" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round" opacity=".65"/>
    <circle cx="${ps[ps.length-1].x}" cy="${ps[ps.length-1].y}" r="2.2" fill="${c}"/>`;
}

// ════════════════════════════════════════════════════════════════
//  PARAMÈTRES — Helpers
// ════════════════════════════════════════════════════════════════
async function saveProfile() {
  const prenom=document.getElementById('param-prenom')?.value.trim();
  const nom   =document.getElementById('param-nom')?.value.trim();
  if(!S.user) return;
  if(prenom&&S.profile) S.profile.prenom=prenom;
  if(nom   &&S.profile) S.profile.nom=nom;
  updateUserUI();
  import('./firebase-firestore.js').then(({saveUserProfile})=>{
    saveUserProfile(S.user.uid,{prenom,nom})
      .then(()=>showToast('Profil mis à jour ✓','ok'))
      .catch(()=>showToast('Erreur de sauvegarde','err'));
  }).catch(()=>showToast('Profil mis à jour localement','ok'));
}

async function changePasswordFlow() {
  import('./firebase-auth.js').then(({resetPassword})=>{
    resetPassword(S.user.email)
      .then(()=>showToast(`Email envoyé à ${S.user.email}`,'ok'))
      .catch(()=>showToast("Erreur d'envoi email",'err'));
  });
}

function showToastUpgrade() {
  window.DS_PAYMENT?.showPaymentModal(S.abonnement?.plan||'standard');
}

function downloadReport(analyseId, type = 'json') {
  const a = S.analyses.find(x => x.id === analyseId) || S.currentAnalyse;
  if (!a) {
    showToast('Analyse introuvable', 'err');
    return;
  }
  
  showToast(`Préparation de l'export ${type.toUpperCase()}...`, 'info');
  
  const token = _getToken();
  const url = `${API_BASE}/analyses/${a.id}/export?format=${type}`;
  
  // Utiliser un lien temporaire pour forcer le téléchargement
  fetchWithAuth(url)
    .then(async response => {
      if (!response.ok) throw new Error('Erreur export');
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `doctor_smile_${a.entreprise || a.id}.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Téléchargement réussi ✓', 'ok');
    })
    .catch(err => {
      console.error('Export error:', err);
      showToast('Échec du téléchargement', 'err');
    });
}

// ════════════════════════════════════════════════════════════════
//  EXPOSITION PUBLIQUE window.DS
// ════════════════════════════════════════════════════════════════
window.DS = {
  triggerUpload:        ()   => window.DS_UPLOAD?.trigger(),
  handleFile:           (f)  => window.DS_UPLOAD?.handleFile(f),
  handleDragOver:       (e)  => window.DS_UPLOAD?.handleDragOver(e),
  handleDragLeave:      ()   => window.DS_UPLOAD?.handleDragLeave(),
  handleDrop:           (e)  => window.DS_UPLOAD?.handleDrop(e),
  openCurrentDataViewer:()   => window.DS_UPLOAD?.openCurrentDataViewer(),
  switchDataView:       (v,b)=> window.DS_UPLOAD?.switchDataView(v,b),
  resetDataTable:       ()   => window.DS_UPLOAD?.resetDataTable(),
  closeModal:           (e)  => window.DS_UPLOAD?.closeModal(e),
  closeModalDirect:     ()   => window.DS_UPLOAD?.closeModalDirect(),
  launchML:             ()   => window.DS_UPLOAD?.launchML(),
  simulate:             ()   => window.DS_UPLOAD?.simulate(),
  sendChat:             ()   => window.DS_CHAT?.sendChat(),
  chatKeydown:          (e)  => window.DS_CHAT?.chatKeydown(e),
  autoResize:           (el) => window.DS_CHAT?.autoResize(el),
  sendChatFull:         ()   => window.DS_CHAT?.sendChatFull(),
  chatKeydownFull:      (e)  => window.DS_CHAT?.chatKeydownFull(e),
  navTo:                (v)  => window.DS_VIEWS?.navTo(v),
  updateWIDisplay,
  filterSidebar: debounce((v)=>{S.filterText=v;renderSidebar(v);},200),
  saveProfile,
  changePasswordFlow,
  showToastUpgrade,
  downloadReport,
  toggleNotifPanel:     ()   => window.DS_NOTIFS?.togglePanel(),
  _markAllRead:         ()   => window.DS_NOTIFS?.markAllRead(),
  shareReport:          (id) => window.DS_NOTIFS?.shareReport(id),
  renderViewVisualisations: () => window.DS_VIEWS?.renderVisualisations(),
  toggleSidebar:        (v)  => window.DS_VIEWS?.toggleSidebar(v),
  toggleChatHistory:    (v)  => window.DS_CHAT?.toggleHistory(v),
};

window.DS_DASH.loadAnalyse = loadAnalyse;

// ════════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);
