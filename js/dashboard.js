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
//  CLEANUP — Nettoyer les listeners Firestore
// ════════════════════════════════════════════════════════════════
function cleanupRealtimeListeners() {
  if (S._unsubProfile) {
    S._unsubProfile();
    S._unsubProfile = null;
  }
  if (S._unsubAbonnement) {
    S._unsubAbonnement();
    S._unsubAbonnement = null;
  }
  if (S._unsubAnalyses) {
    S._unsubAnalyses();
    S._unsubAnalyses = null;
  }
  
  // Nettoyer le timer de pipeline
  if (S.pipelineTimer) {
    clearInterval(S.pipelineTimer);
    S.pipelineTimer = null;
  }
  
  // Nettoyer les listeners de notifications
  if (window.DS_NOTIFS?._state?._unsub) {
    window.DS_NOTIFS._state._unsub();
    window.DS_NOTIFS._state._unsub = null;
  }
}

// Exposer la fonction de cleanup globalement
window.DS_DASH = window.DS_DASH || {};
window.DS_DASH.cleanup = cleanupRealtimeListeners;

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
  console.log('[loadAnalyse] Chargement analyse:', a?.id, 'Données:', Object.keys(a || {}));
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
  const cbr    = a.cash_burn_runway || null; // F1: Cash-Burn & Runway
  const ew     = a.early_warnings || []; // F3: Early Warnings
  const sb     = a.sector_benchmark || null; // F4: Sector Benchmark
  const ap     = a.action_plan || null; // F6: Action Plan

  const _lad = tsToDate(a.createdAt);
  window._lastAnalyseDate = _lad;
  setTopbarDate(_lad);
  renderRing(score, zone);
  renderMeta(a, zone);
  renderRatios(ratios);
  renderRecos(recos);
  // Nouveaux éléments mockup
  renderTendance(tl);
  renderAlerts(recos, zone, a);
  renderRisques(ratios, zone);
  // F1: Cash-Burn & Runway
  renderCashBurnRunway(cbr);
  // F3: Early Warnings
  renderEarlyWarnings(ew);
  // F4: Sector Benchmark
  renderSectorBenchmark(sb);
  // F6: Action Plan
  renderActionPlan(ap);
  // F7: Load histories
  window.HISTORY_MANAGER.loadAndRenderAll();
  if (S.convId !== a.id) window.DS_CHAT?.initChat(a, zone);
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
  },300);
  setTimeout(()=>window.DS_EXTRA?.initSmartAlerts(a),800);
  setTimeout(()=>window._DS_injectExportBtn?.(),500);
  setTimeout(()=>window.DS_EXTRA?.renderTimelineFixed(tl,'tl-svg'),350);
  console.log('[Analyse chargée]',a.entreprise||a.id,'— score:',score);
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════
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
  const LM = { high:'high', medium:'medium', low:'low', critical:'high', warning:'medium', info:'low' };
  const ICON = { high:'triangle-exclamation', medium:'chart-line', low:'seedling' };
  const URGENCY_LABELS = {
    immediate:   { fr: 'Immédiat',   horizon: '🔴 Action sous 48h', lvl: 'high'   },
    court_terme: { fr: 'Court terme', horizon: '🟠 30 jours',         lvl: 'medium' },
    moyen_terme: { fr: 'Conseil',     horizon: '🟡 90 jours',         lvl: 'low'    },
  };
  const CATS = {
    high:   { label:'Urgent',   color:'var(--color-error)',   bg:'var(--error-bg)',   ring:'var(--error-ring)'   },
    medium: { label:'Important',color:'var(--color-accent)',  bg:'var(--accent-bg)',  ring:'var(--accent-ring)'  },
    low:    { label:'Conseil',  color:'var(--color-success)', bg:'var(--success-bg)', ring:'var(--success-ring)' },
  };
  const WEIGHT = { high:3, medium:2, low:1 };

  return raw.map((r, i) => {
    // --- Level resolution: urgency (new) > level (old) ---
    let lvl;
    if (r.urgency && URGENCY_LABELS[r.urgency]) {
      lvl = URGENCY_LABELS[r.urgency].lvl;
    } else {
      lvl = LM[r.level ?? r.lvl ?? r.priority] ?? 'medium';
    }
    const cat     = CATS[lvl];
    const icon    = r.icon ?? (ICON[lvl] ?? 'lightbulb');

    // --- Description: prefer detail (terrain action) over description ---
    const actionText   = r.detail ?? '';
    const contextText  = r.description ?? r.desc ?? r.d ?? '';
    const primaryDesc  = actionText || contextText;

    // Steps: if we have both detail & description, show description as context
    let steps = r.steps ?? r.actions ?? [];
    if (!steps.length && actionText && contextText && actionText !== contextText) {
      steps = [actionText];
    } else if (!steps.length && contextText.includes(';')) {
      steps = contextText.split(';').map(s => s.trim()).filter(s => s.length > 8);
    }

    // --- Horizon: urgency label > explicit horizon ---
    const urgData = URGENCY_LABELS[r.urgency];
    const horizon = r.horizon ?? r.timeframe ?? r.delai ?? (urgData?.horizon) ?? null;

    // --- Metric: compte SYSCOHADA as a chip ---
    const metric = r.compte ? `Cpte ${r.compte}` : (r.metric ?? r.kpi ?? null);

    // --- Impact score chip ---
    const impactLabel = r.impact_score
      ? (r.impact_score > 0 ? `+${r.impact_score} pts` : `${r.impact_score} pts`)
      : (r.impact ?? r.expectedImpact ?? null);

    // --- Urgency emoji in tag ---
    const emoji = r.emoji ?? (lvl === 'high' ? '🔴' : lvl === 'medium' ? '🟠' : '🟡');

    return {
      lvl, cat, icon, emoji, weight: WEIGHT[lvl],
      t:       r.title ?? r.t ?? 'Recommandation',
      d:       primaryDesc,
      detail:  actionText,
      context: contextText,
      steps,
      impact:  impactLabel,
      horizon,
      metric,
      compte:  r.compte ?? null,
      urgency: r.urgency ?? null,
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
    <div class="score-meta-row"><span class="sml">Moteur</span><span class="smv muted">SYSCOHADA v4.0</span></div>`;
}

/* ─── F1: Cash-Burn & Runway (Suivi Trésorerie Critique) ─────────────── */
function renderCashBurnRunway(cbr) {
  const el = document.getElementById('cash-burn-runway');
  if (!el || !cbr) return;
  
  const { cash_burn_mensuel, runway_mois, tresorerie_actuelle, alerte_niveau, alerte_message, devise } = cbr;
  
  // Couleur selon niveau d'alerte
  const alerteColors = {
    'CRITIQUE': 'var(--error)',
    'ELEVE': 'var(--warning)',
    'MOYEN': 'var(--amber)',
    'NORMAL': 'var(--success)'
  };
  const alerteColor = alerteColors[alerte_niveau] || 'var(--text-muted)';
  
  // Formatage des nombres
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toFixed(0);
  };
  
  el.innerHTML = `
    <div class="cash-burn-container">
      <div class="cash-burn-header">
        <div class="cash-burn-title">
          <i class="fa-solid fa-fire-flame-curved"></i>
          <span>Suivi Trésorerie Critique</span>
        </div>
        <div class="cash-burn-badge" style="color: ${alerteColor}; border-color: ${alerteColor};">
          ${alerte_niveau}
        </div>
      </div>
      
      <div class="cash-burn-metrics">
        <div class="cash-burn-metric">
          <div class="metric-label">Runway</div>
          <div class="metric-value">${runway_mois === Infinity ? '∞' : runway_mois + ' mois'}</div>
          <div class="metric-sub">Avant épuisement</div>
        </div>
        
        <div class="cash-burn-metric">
          <div class="metric-label">Cash-Burn Mensuel</div>
          <div class="metric-value">${formatNumber(cash_burn_mensuel)} ${devise}</div>
          <div class="metric-sub">Consommation/mois</div>
        </div>
        
        <div class="cash-burn-metric">
          <div class="metric-label">Trésorerie Actuelle</div>
          <div class="metric-value">${formatNumber(tresorerie_actuelle)} ${devise}</div>
          <div class="metric-sub">Disponible</div>
        </div>
      </div>
      
      <div class="cash-burn-alert" style="border-left-color: ${alerteColor};">
        <i class="fa-solid fa-circle-info" style="color: ${alerteColor};"></i>
        <span>${alerte_message}</span>
      </div>
      
      <!-- Runway Progress Bar -->
      <div class="runway-progress">
        <div class="runway-bar" style="width: ${Math.min(100, (runway_mois / 12) * 100)}%; background: ${alerteColor};"></div>
        <div class="runway-labels">
          <span>0 mois</span>
          <span>6 mois</span>
          <span>12+ mois</span>
        </div>
      </div>
    </div>
  `;
}

/* ─── F2: Simulateur de Financement & Capacité d'Emprunt ───────────── */
window.FINANCING_SIMULATOR = {
  currentSimulation: null,
  
  async simulateFinancing(montantCredit, dureeMois = 12) {
    const analyseId = window._lastAnalyse?.id;
    if (!analyseId) {
      console.error('[FINANCING_SIMULATOR] Aucune analyse courante');
      return null;
    }
    
    try {
      const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE}/analyses/simulate-financing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        },
        body: JSON.stringify({
          analyse_id: analyseId,
          montant_credit: montantCredit,
          duree_mois: dureeMois
        })
      });
      
      if (!response.ok) throw new Error('Erreur lors de la simulation');
      
      const result = await response.json();
      window.FINANCING_SIMULATOR.currentSimulation = result.simulation;
      return result.simulation;
      
    } catch (error) {
      console.error('[FINANCING_SIMULATOR] Erreur:', error);
      return null;
    }
  },
  
  async simulateAndRender() {
    const montantInput = document.getElementById('financing-amount');
    const dureeSelect = document.getElementById('financing-duration');
    
    if (!montantInput || !dureeSelect) return;
    
    const montantCredit = parseFloat(montantInput.value) || 0;
    const dureeMois = parseInt(dureeSelect.value) || 12;
    
    if (montantCredit <= 0) {
      alert('Veuillez entrer un montant valide');
      return;
    }
    
    // Show loading state
    const simulationEl = document.getElementById('financing-simulation');
    if (simulationEl) {
      simulationEl.innerHTML = '<div class="financing-loading"><div class="loader-spinner"></div><p>Simulation en cours...</p></div>';
    }
    
    const simulation = await window.FINANCING_SIMULATOR.simulateFinancing(montantCredit, dureeMois);
    
    if (simulation) {
      window.FINANCING_SIMULATOR.renderSimulation(simulation);
    } else {
      if (simulationEl) {
        simulationEl.innerHTML = '<div class="financing-error">Erreur lors de la simulation. Veuillez réessayer.</div>';
      }
    }
  },
  
  renderSimulation(simulation) {
    const el = document.getElementById('financing-simulation');
    if (!el || !simulation) return;
    
    const { montant_credit, endettement_actuel, endettement_simule, score_actuel, score_impact, 
            capacite_emprunt_max, recommandation, niveau, message, scenarios, devise } = simulation;
    
    // Couleur selon niveau
    const niveauColors = {
      'CRITIQUE': 'var(--error)',
      'ELEVE': 'var(--warning)',
      'MOYEN': 'var(--amber)',
      'NORMAL': 'var(--success)'
    };
    const niveauColor = niveauColors[niveau] || 'var(--text-muted)';
    
    // Formatage
    const formatNumber = (num) => {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
      return num.toFixed(0);
    };
    
    const formatPercent = (num) => (num * 100).toFixed(1) + '%';
    
    el.innerHTML = `
      <div class="financing-simulation-container">
        <div class="financing-header">
          <div class="financing-title">
            <i class="fa-solid fa-calculator"></i>
            <span>Simulation Financement</span>
          </div>
          <div class="financing-badge" style="color: ${niveauColor}; border-color: ${niveauColor};">
            ${recommandation}
          </div>
        </div>
        
        <div class="financing-metrics">
          <div class="financing-metric">
            <div class="metric-label">Montant Crédit</div>
            <div class="metric-value">${formatNumber(montant_credit)} ${devise}</div>
          </div>
          
          <div class="financing-metric">
            <div class="metric-label">Endettement Actuel</div>
            <div class="metric-value">${formatPercent(endettement_actuel)}</div>
          </div>
          
          <div class="financing-metric">
            <div class="metric-label">Endettement Simulé</div>
            <div class="metric-value" style="color: ${niveauColor};">${formatPercent(endettement_simule)}</div>
          </div>
          
          <div class="financing-metric">
            <div class="metric-label">Impact Score</div>
            <div class="metric-value">${score_actuel} → ${score_impact}</div>
          </div>
          
          <div class="financing-metric">
            <div class="metric-label">Capacité Max</div>
            <div class="metric-value">${formatNumber(capacite_emprunt_max)} ${devise}</div>
          </div>
        </div>
        
        <div class="financing-alert" style="border-left-color: ${niveauColor};">
          <i class="fa-solid fa-circle-info" style="color: ${niveauColor};"></i>
          <span>${message}</span>
        </div>
        
        <div class="financing-scenarios">
          <div class="scenarios-title">Scénarios Alternatifs</div>
          <div class="scenarios-list">
            ${scenarios.map((sc, i) => `
              <div class="scenario-item">
                <div class="scenario-label">Scénario ${i + 1}</div>
                <div class="scenario-value">${formatNumber(sc.montant)} ${devise}</div>
                <div class="scenario-endettement">Endettement: ${formatPercent(sc.endettement)}</div>
                <div class="scenario-score">Score: ${sc.score_impact.toFixed(1)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }
};

/* ─── F3: Système d'Alertes Précoces (Early Warning) ───────────────── */
function renderEarlyWarnings(warnings) {
  const el = document.getElementById('early-warnings');
  if (!el || !warnings || warnings.length === 0) return;
  
  const niveauColors = {
    'CRITIQUE': 'var(--error)',
    'ELEVE': 'var(--warning)',
    'MOYEN': 'var(--amber)',
    'NORMAL': 'var(--success)'
  };
  
  const niveauIcons = {
    'CRITIQUE': 'fa-triangle-exclamation',
    'ELEVE': 'fa-circle-exclamation',
    'MOYEN': 'fa-circle-info',
    'NORMAL': 'fa-check-circle'
  };
  
  el.innerHTML = `
    <div class="early-warnings-container">
      <div class="early-warnings-header">
        <div class="early-warnings-title">
          <i class="fa-solid fa-bell"></i>
          <span>Alertes Précoces</span>
        </div>
        <div class="early-warnings-count">${warnings.length}</div>
      </div>
      
      <div class="early-warnings-list">
        ${warnings.map((warning, index) => {
          const niveauColor = niveauColors[warning.niveau] || 'var(--text-muted)';
          const niveauIcon = niveauIcons[warning.niveau] || 'fa-circle-info';
          
          return `
            <div class="early-warning-item" style="border-left-color: ${niveauColor}; animation: fadeInUp ${0.1 + index * 0.05}s var(--ease-premium) both;">
              <div class="early-warning-header">
                <div class="early-warning-icon" style="color: ${niveauColor};">
                  <i class="fa-solid ${niveauIcon}"></i>
                </div>
                <div class="early-warning-level" style="color: ${niveauColor}; background: ${niveauColor}20;">
                  ${warning.niveau}
                </div>
              </div>
              
              <div class="early-warning-title">${warning.titre}</div>
              
              <div class="early-warning-message">${warning.message}</div>
              
              <div class="early-warning-recommendation">
                <i class="fa-solid fa-lightbulb"></i>
                <span>${warning.recommandation}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/* ─── F4: Benchmarking Sectoriel Anonymisé ───────────────────────── */
function renderSectorBenchmark(benchmark) {
  const el = document.getElementById('sector-benchmark');
  if (!el || !benchmark) return;
  
  const { secteur, secteur_normalise, comparisons, performance_globale, performance_globale_couleur, 
          performance_score, message, data_source } = benchmark;
  
  el.innerHTML = `
    <div class="sector-benchmark-container">
      <div class="sector-benchmark-header">
        <div class="sector-benchmark-title">
          <i class="fa-solid fa-chart-line"></i>
          <span>Benchmarking Sectoriel</span>
        </div>
        <div class="sector-badge">${secteur_normalise}</div>
      </div>
      
      <div class="sector-benchmark-summary">
        <div class="benchmark-performance" style="color: ${performance_globale_couleur};">
          <i class="fa-solid fa-trophy"></i>
          <span>Performance: ${performance_globale.toUpperCase()}</span>
        </div>
        <div class="benchmark-score">Score: ${performance_score}/4</div>
      </div>
      
      <div class="benchmark-message">${message}</div>
      
      <div class="benchmark-comparisons">
        ${comparisons.map(comp => `
          <div class="benchmark-comparison-item">
            <div class="comparison-header">
              <div class="comparison-name">${comp.ratio}</div>
              <div class="comparison-performance" style="color: ${comp.couleur};">
                ${comp.performance.toUpperCase()}
              </div>
            </div>
            
            <div class="comparison-values">
              <div class="comparison-value">
                <span class="value-label">Votre valeur</span>
                <span class="value-number" style="color: ${comp.couleur};">${comp.valeur}${comp.unite}</span>
              </div>
              <div class="comparison-value">
                <span class="value-label">Moyenne secteur</span>
                <span class="value-number">${comp.moyenne_secteur}${comp.unite}</span>
              </div>
            </div>
            
            <div class="comparison-percentile">
              <div class="percentile-bar">
                <div class="percentile-fill" style="width: ${comp.percentile_entreprise}%; background: ${comp.couleur};"></div>
              </div>
              <div class="percentile-labels">
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>90%</span>
              </div>
              <div class="percentile-position">Position: ${comp.position} (${comp.percentile_entreprise}e percentile)</div>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="benchmark-source">
        <i class="fa-solid fa-database"></i>
        <span>${data_source}</span>
      </div>
    </div>
  `;
}

/* ─── F5: Générateur de Rapports Destinés aux Tiers ─────────────────── */
window.REPORT_GENERATOR = {
  async generateReport(rapportType = 'bancaire') {
    const analyseId = window._lastAnalyse?.id;
    if (!analyseId) {
      console.error('[REPORT_GENERATOR] Aucune analyse courante');
      return null;
    }
    
    try {
      const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE}/analyses/generate-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        },
        body: JSON.stringify({
          analyse_id: analyseId,
          rapport_type: rapportType
        })
      });
      
      if (!response.ok) throw new Error('Erreur lors de la génération du rapport');
      
      const result = await response.json();
      return result.rapport;
      
    } catch (error) {
      console.error('[REPORT_GENERATOR] Erreur:', error);
      return null;
    }
  },
  
  async generateAndRender() {
    const typeSelect = document.getElementById('report-type');
    if (!typeSelect) return;
    
    const rapportType = typeSelect.value || 'bancaire';
    
    // Show loading state
    const previewEl = document.getElementById('report-preview');
    if (previewEl) {
      previewEl.innerHTML = '<div class="report-loading"><div class="loader-spinner"></div><p>Génération du rapport en cours...</p></div>';
    }
    
    const rapport = await window.REPORT_GENERATOR.generateReport(rapportType);
    
    if (rapport) {
      window.REPORT_GENERATOR.renderReport(rapport);
    } else {
      if (previewEl) {
        previewEl.innerHTML = '<div class="report-error">Erreur lors de la génération du rapport. Veuillez réessayer.</div>';
      }
    }
  },
  
  renderReport(rapport) {
    const el = document.getElementById('report-preview');
    if (!el || !rapport) return;
    
    const { type_rapport, date_generation, entreprise, secteur, score_global, zone_risque, 
            sections, recommandation_globale, confidentialite, mention_legale } = rapport;
    
    const typeIcons = {
      'bancaire': 'fa-building-columns',
      'investisseur': 'fa-chart-line',
      'partenaire': 'fa-handshake'
    };
    
    const typeLabels = {
      'bancaire': 'Rapport Bancaire',
      'investisseur': 'Rapport Investisseur',
      'partenaire': 'Rapport Partenaire'
    };
    
    el.innerHTML = `
      <div class="report-container">
        <div class="report-header">
          <div class="report-title">
            <i class="fa-solid ${typeIcons[type_rapport] || 'fa-file-lines'}"></i>
            <span>${typeLabels[type_rapport] || 'Rapport'}</span>
          </div>
          <div class="report-badge">${confidentialite}</div>
        </div>
        
        <div class="report-meta">
          <div class="report-meta-item">
            <span class="meta-label">Entreprise</span>
            <span class="meta-value">${entreprise}</span>
          </div>
          <div class="report-meta-item">
            <span class="meta-label">Secteur</span>
            <span class="meta-value">${secteur}</span>
          </div>
          <div class="report-meta-item">
            <span class="meta-label">Date</span>
            <span class="meta-value">${date_generation}</span>
          </div>
          <div class="report-meta-item">
            <span class="meta-label">Score</span>
            <span class="meta-value">${score_global}/100</span>
          </div>
        </div>
        
        <div class="report-summary">
          <div class="summary-label">Recommandation Globale</div>
          <div class="summary-value">${recommandation_globale}</div>
        </div>
        
        <div class="report-sections">
          ${sections.map(section => `
            <div class="report-section">
              <div class="section-header">
                <div class="section-title">${section.titre}</div>
                <div class="section-priority">${section.priorite}</div>
              </div>
              <div class="section-content">${section.contenu}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="report-footer">
          <div class="report-mention">${mention_legale}</div>
          <button class="btn btn-secondary report-download-btn" onclick="window.REPORT_GENERATOR.downloadReport()">
            <i class="fa-solid fa-download"></i>
            Télécharger PDF
          </button>
        </div>
      </div>
    `;
  },
  
  downloadReport() {
    alert('Fonctionnalité de téléchargement PDF à implémenter avec le service PDF existant.');
  }
};

/* ─── F6: Plan d'Action Correctif Dynamique (To-Do List) ───────────── */
function renderActionPlan(actionPlan) {
  const el = document.getElementById('action-plan');
  if (!el || !actionPlan) return;
  
  const { actions, categories, stats, score_actuel, zone_risque, message } = actionPlan;
  
  const prioriteColors = {
    'HAUTE': 'var(--error)',
    'MOYENNE': 'var(--amber)',
    'BASSE': 'var(--success)'
  };
  
  const statutColors = {
    'EN_COURS': 'var(--cyan)',
    'EN_ATTENTE': 'var(--warning)',
    'TERMINEE': 'var(--success)'
  };
  
  el.innerHTML = `
    <div class="action-plan-container">
      <div class="action-plan-header">
        <div class="action-plan-title">
          <i class="fa-solid fa-list-check"></i>
          <span>Plan d'Action Correctif</span>
        </div>
        <div class="action-plan-stats">
          <div class="stat-item">
            <span class="stat-value">${stats.total_actions}</span>
            <span class="stat-label">Actions</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" style="color: var(--error);">${stats.haute_priorite}</span>
            <span class="stat-label">Haute</span>
          </div>
          <div class="stat-item">
            <span class="stat-value" style="color: var(--cyan);">${stats.en_cours}</span>
            <span class="stat-label">En cours</span>
          </div>
        </div>
      </div>
      
      <div class="action-plan-message">${message}</div>
      
      <div class="action-plan-list">
        ${actions.map((action, index) => {
          const categorie = categories[action.categorie] || categories['GENERAL'];
          const prioriteColor = prioriteColors[action.priorite] || 'var(--text-muted)';
          const statutColor = statutColors[action.statut] || 'var(--text-muted)';
          
          return `
            <div class="action-item" style="animation: fadeInUp ${0.1 + index * 0.05}s var(--ease-premium) both;">
              <div class="action-header">
                <div class="action-category" style="color: ${categorie.couleur};">
                  <i class="fa-solid ${categorie.icon}"></i>
                  <span>${action.categorie}</span>
                </div>
                <div class="action-priority" style="color: ${prioriteColor}; background: ${prioriteColor}20;">
                  ${action.priorite}
                </div>
              </div>
              
              <div class="action-title">${action.titre}</div>
              
              <div class="action-description">${action.description}</div>
              
              <div class="action-meta">
                <div class="action-meta-item">
                  <i class="fa-solid fa-clock"></i>
                  <span>Échéance: ${action.echeance_jours} jours</span>
                </div>
                <div class="action-meta-item">
                  <i class="fa-solid fa-chart-line"></i>
                  <span>Impact: ${action.impact_estime}</span>
                </div>
                <div class="action-meta-item">
                  <i class="fa-solid fa-user"></i>
                  <span>${action.responsable}</span>
                </div>
              </div>
              
              <div class="action-footer">
                <div class="action-status" style="color: ${statutColor};">
                  <i class="fa-solid fa-circle"></i>
                  <span>${action.statut.replace('_', ' ')}</span>
                </div>
                <button class="action-complete-btn" onclick="window.ACTION_PLAN.completeAction('${action.id}')">
                  <i class="fa-solid fa-check"></i>
                  Marquer terminé
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

window.ACTION_PLAN = {
  completeAction(actionId) {
    // Placeholder pour marquer une action comme terminée
    // Cette fonctionnalité nécessiterait une persistance dans Firebase
    console.log(`[ACTION_PLAN] Marquer l'action ${actionId} comme terminée`);
    alert('Fonctionnalité de suivi des actions à implémenter avec Firebase.');
  }
};

/* ─── F7: Gestion Historiques (Analyses + Conversations IA) ──────────── */
window.HISTORY_MANAGER = {
  async loadAnalysesHistory(limit = 10) {
    try {
      const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE}/analyses/history/analyses?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur lors de la récupération de l\'historique');
      
      const result = await response.json();
      return result.history || [];
      
    } catch (error) {
      console.error('[HISTORY_MANAGER] Erreur:', error);
      return [];
    }
  },
  
  async loadConversationsHistory(limit = 10) {
    try {
      const API_BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const response = await fetch(`${API_BASE}/analyses/history/conversations?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Erreur lors de la récupération de l\'historique');
      
      const result = await response.json();
      return result.history || [];
      
    } catch (error) {
      console.error('[HISTORY_MANAGER] Erreur:', error);
      return [];
    }
  },
  
  renderAnalysesHistory(history) {
    const el = document.getElementById('analyses-history');
    if (!el || !history || history.length === 0) return;
    
    const zoneColors = {
      'saine': 'var(--success)',
      'vigilance': 'var(--warning)',
      'risque': 'var(--amber)',
      'critique': 'var(--error)'
    };
    
    el.innerHTML = `
      <div class="history-container">
        <div class="history-header">
          <div class="history-title">
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span>Historique des Analyses</span>
          </div>
          <div class="history-count">${history.length} analyses</div>
        </div>
        
        <div class="history-list">
          ${history.map((item, index) => {
            const zoneColor = zoneColors[item.zone] || 'var(--text-muted)';
            const evolutionIcon = item.score_evolution > 0 ? 'fa-arrow-trend-up' : item.score_evolution < 0 ? 'fa-arrow-trend-down' : 'fa-minus';
            const evolutionColor = item.score_evolution > 0 ? 'var(--success)' : item.score_evolution < 0 ? 'var(--error)' : 'var(--text-muted)';
            
            return `
              <div class="history-item" style="animation: fadeInUp ${0.1 + index * 0.05}s var(--ease-premium) both;">
                <div class="history-item-header">
                  <div class="history-date">${item.date}</div>
                  <div class="history-score" style="color: ${zoneColor};">
                    <span class="score-value">${item.score}/100</span>
                    <span class="score-zone">${item.zone.toUpperCase()}</span>
                  </div>
                </div>
                
                <div class="history-item-body">
                  <div class="history-metrics">
                    <div class="history-metric">
                      <span class="metric-label">Marge Nette</span>
                      <span class="metric-value">${(item.marge_nette * 100).toFixed(1)}%</span>
                    </div>
                    <div class="history-metric">
                      <span class="metric-label">DSO</span>
                      <span class="metric-value">${item.dso.toFixed(0)}j</span>
                    </div>
                    <div class="history-metric">
                      <span class="metric-label">Endettement</span>
                      <span class="metric-value">${(item.ratio_endettement * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div class="history-evolution" style="color: ${evolutionColor};">
                    <i class="fa-solid ${evolutionIcon}"></i>
                    <span>${item.score_evolution > 0 ? '+' : ''}${item.score_evolution.toFixed(1)} pts</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },
  
  renderConversationsHistory(history) {
    const el = document.getElementById('conversations-history');
    if (!el || !history || history.length === 0) return;
    
    el.innerHTML = `
      <div class="history-container">
        <div class="history-header">
          <div class="history-title">
            <i class="fa-solid fa-comments"></i>
            <span>Historique des Conversations</span>
          </div>
          <div class="history-count">${history.length} conversations</div>
        </div>
        
        <div class="history-list">
          ${history.map((item, index) => `
            <div class="history-item conversation-item" style="animation: fadeInUp ${0.1 + index * 0.05}s var(--ease-premium) both;">
              <div class="history-item-header">
                <div class="history-date">${item.date}</div>
                <div class="history-messages">
                  <i class="fa-solid fa-message"></i>
                  <span>${item.message_count} messages</span>
                </div>
              </div>
              
              <div class="history-item-body">
                <div class="conversation-summary">${item.summary}</div>
                
                <div class="conversation-stats">
                  <div class="conversation-stat">
                    <i class="fa-solid fa-user"></i>
                    <span>${item.user_messages}</span>
                  </div>
                  <div class="conversation-stat">
                    <i class="fa-solid fa-robot"></i>
                    <span>${item.ai_messages}</span>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  async loadAndRenderAll() {
    const analysesHistory = await window.HISTORY_MANAGER.loadAnalysesHistory(10);
    const conversationsHistory = await window.HISTORY_MANAGER.loadConversationsHistory(10);
    
    window.HISTORY_MANAGER.renderAnalysesHistory(analysesHistory);
    window.HISTORY_MANAGER.renderConversationsHistory(conversationsHistory);
    
    // Mettre à jour les badges de la topbar
    updateTopbarBadges(analysesHistory.length, conversationsHistory.length);
  }
};

/* ─── Topbar Premium - Analytics Summary & Email Reports ─────────────── */
window.DS_ANALYTICS = {
  showSummary() {
    // Afficher le résumé analytique avec tendances
    const analysesHistory = window.HISTORY_MANAGER.loadAnalysesHistory(20);
    
    // Calculer les tendances
    const scores = analysesHistory.map(a => a.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const trend = scores.length > 1 ? scores[scores.length - 1] - scores[scores.length - 2] : 0;
    
    alert(`Résumé Analytique:\n\nScore moyen: ${avgScore.toFixed(1)}/100\nTendance: ${trend > 0 ? '+' : ''}${trend.toFixed(1)} pts\nAnalyses: ${analysesHistory.length}`);
  }
};

window.DS_EMAIL = {
  showReportSettings() {
    // Afficher les paramètres de rapports email automatiques
    alert('Paramètres de rapports email automatiques (Brevo):\n\n- Rapport hebdomadaire: Activé\n- Rapport mensuel: Activé\n- Alertes critiques: Activé\n\nFonctionnalité à implémenter avec service email.');
  }
};

function updateTopbarBadges(analysesCount, conversationsCount) {
  // Mettre à jour le badge analytics
  const analyticsBadge = document.getElementById('analytics-badge');
  if (analyticsBadge) {
    analyticsBadge.textContent = analysesCount;
    analyticsBadge.classList.toggle('hidden', analysesCount === 0);
  }
  
  // Mettre à jour le badge email
  const emailBadge = document.getElementById('email-badge');
  if (emailBadge) {
    // Simuler des emails en attente
    const pendingEmails = Math.min(analysesCount, 5);
    emailBadge.textContent = pendingEmails;
    emailBadge.classList.toggle('hidden', pendingEmails === 0);
  }
  
  // Mettre à jour le badge notifications
  const notifBadge = document.getElementById('notif-count');
  if (notifBadge) {
    // Simuler des notifications actives
    const activeNotifs = Math.max(1, Math.floor(analysesCount / 3));
    notifBadge.textContent = activeNotifs;
    notifBadge.classList.toggle('hidden', activeNotifs === 0);
  }
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
  // Construire les alertes à partir des recos à niveau élevé + indicateurs de zone
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
  // Depuis les recommandations prioritaires (backend: level='high' ou urgency='immediate')
  recos.filter(r => r.level === 'high' || r.urgency === 'immediate').slice(0, 3 - warns.length).forEach(r => {
    warns.push({
      icon: r.level === 'high' ? 'error' : 'warn',
      title: r.title || 'Action recommandée',
      sub: r.detail || r.description || ''
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
      r.metric  ? `<span class="reco-meta-chip reco-chip-kpi"><i class="fa-solid fa-layer-group"></i>${r.metric}</span>` : '',
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
            <span class="reco2-tag ${r.lvl}">${r.emoji ? r.emoji + ' ' : ''}${r.cat.label}</span>
            ${metaHtml}
          </div>
          <div class="reco2-title">${r.t}</div>
          <div class="reco2-desc">${r.detail || r.d}</div>
        </div>

        <div class="reco2-chevron">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </div>

      <div class="reco2-body" style="display:none;">
        ${r.context && r.context !== r.detail ? `<p class="reco2-context">${r.context}</p>` : ''}
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
