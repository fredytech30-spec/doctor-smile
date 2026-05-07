// ════════════════════════════════════════════════════════════════
//  dashboard.js — Doctor Smile  (noyau v3 — modulaire)
//
//  Arborescence :
//  js/
//  ├── ds-core.js       ← état S, ZC, helpers, canvas, cursor
//  ├── ds-upload.js     ← upload, pipeline ML, modal
//  ├── ds-chat.js       ← chat mini + plein écran
//  ├── ds-views.js      ← vues analyses/rapports/paramètres/alertes/benchmark/visuels
//  ├── ds-notifs.js     ← notifications Firebase + partage rapport
//  └── dashboard.js     ← CE FICHIER : init, auth, rendus, sidebar
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

  // Masquer l'overlay de chargement dès que possible
  const overlay = document.getElementById('loading-overlay');

  // Gérer l'entrée depuis la vitrine
  const entry = await window.DS_NAV?.handleDashboardEntry();
  if (entry?.action === 'demo') loadAnalyse(DEMO_DATA);

  window.DS_PAYMENT?.checkPaymentResult();

  // Effets visuels immédiats
  initBgCanvas();
  initCursor();

  // Auth Firebase
  requireAuth(async ({ user, profile, abonnement }) => {
    console.log('[Auth] Connecté :', user.email);
    S.user       = user;
    S.profile    = profile;
    S.abonnement = abonnement;

    // ✅ Masquer l'overlay de transition
    if (overlay) {
      overlay.style.transition = 'opacity 0.4s ease';
      overlay.style.opacity    = '0';
      setTimeout(() => { overlay.style.display = 'none'; }, 420);
    }

    updateUserUI();
    setTopbarDate();
    drawSparks([],[],[],[]);
    setupRealtimeListeners(user.uid);
    fu();
    // Initialiser photo de profil
    setTimeout(() => window.DS_PROFILE?.initFromProfile(), 200);
    // ── Onboarding premier login ──────────────────────────────
    window.DS_ONBOARDING?.checkAndStart(user.uid);
    console.log('[Dashboard] Initialisé ✓');
  });
}

// ════════════════════════════════════════════════════════════════
//  INTERFACE UTILISATEUR
// ════════════════════════════════════════════════════════════════
function updateUserUI() {
  const prenom = S.profile?.prenom || S.user?.displayName?.split(' ')[0] || S.user?.email?.split('@')[0] || '…';
  const el = document.getElementById('uname');
  if (el) {
    // Prénom fixe — l'heure est dans un span séparé mis à jour indépendamment
    el.innerHTML = `${prenom}<span id="topbar-sep" style="opacity:.25;margin:0 8px;">–</span><span id="topbar-clock" style="font-weight:500;"></span>` +
      `<span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;` +
      `margin-left:10px;vertical-align:middle;box-shadow:0 0 8px rgba(16,185,129,.7);` +
      `animation:pulseOnline 2s infinite ease-in-out;"></span>`;
    _tickClock(); // premier tick immédiat
  }
  const av = document.getElementById('nav-avatar');
  if (av) {
    const initials = S.profile
      ? [S.profile.prenom?.[0], S.profile.nom?.[0]].filter(Boolean).join('').toUpperCase()
      : (S.user?.displayName?.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?');
    av.textContent = initials||'?';
    av.onclick = (e) => { e.stopPropagation(); window.DS_EXTRA?.showProfileDrawer(); };
    av.title = 'Mon profil';
  }
  const plan  = S.abonnement?.plan || S.profile?.plan || 'standard';
  const badge = document.getElementById('plan-badge');
  if (badge) {
    const labels = { standard:'Standard', premium:'Premium ✦', extra:'Extra ✦✦' };
    badge.textContent   = labels[plan] ?? plan;
    badge.className     = `badge ${plan}`;
    badge.style.opacity = '1';
  }

  // ── Appliquer le thème plan sur <body> ──────────────────────
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
        s.style.cssText = [
          `width:${sz}px`, `height:${sz}px`,
          `left:${Math.random()*100}%`,
          `animation-duration:${6+Math.random()*10}s`,
          `animation-delay:${Math.random()*8}s`,
          `background:${['#fb923c','#fbbf24','#f97316'][Math.floor(Math.random()*3)]}`,
          `opacity:${0.3+Math.random()*.5}`,
        ].join(';');
        particles.appendChild(s);
      }
      document.body.appendChild(particles);
    }
    particles.style.display = '';
  } else if (particles) {
    particles.style.display = 'none';
  }

  // ── Trial countdown banner ───────────────────────────────────
  const banner = document.getElementById('trial-banner');
  if (banner) {
    const isTrial = S.abonnement?.status === 'trial';
    const trialEnd = S.abonnement?.trialEnd;
    if (isTrial && trialEnd && plan !== 'standard') {
      const msLeft  = (trialEnd?.seconds ? trialEnd.seconds*1000 : new Date(trialEnd).getTime()) - Date.now();
      const daysLeft = Math.max(0, Math.ceil(msLeft / 86400000));
      const daysEl   = document.getElementById('trial-days-count');
      if (daysEl) daysEl.textContent = daysLeft;
      banner.className = plan === 'extra' ? 'ext' : 'prm';
      banner.style.display = 'flex';
      if (daysLeft <= 0) {
        banner.style.display = 'none';
        showToast('Votre essai gratuit est terminé. Activez votre plan pour continuer.', 'warn');
      }
    } else {
      banner.style.display = 'none';
    }
  }

  // ── What-If visible pour tous (Phase 1) ─────────────────────
  const wiSec = document.getElementById('wi-sec');
  if (wiSec) wiSec.style.display = 'block';
}

// ── Horloge topbar — mise à jour toutes les 60s exactement ────
function _tickClock() {
  const el = document.getElementById('topbar-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false});
}

// Démarrer l'horloge synchronisée à la prochaine minute pleine
(function _startClock() {
  _tickClock();
  const now = new Date();
  const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
  setTimeout(function() {
    _tickClock();
    // Aussi re-calculer "Dernière analyse il y a X min" à chaque minute
    if (window._lastAnalyseDate) setTopbarDate(window._lastAnalyseDate);
    setInterval(function() {
      _tickClock();
      if (window._lastAnalyseDate) setTopbarDate(window._lastAnalyseDate);
    }, 60000);
  }, msToNextMinute);
})();


function setTopbarDate(lastAnalyseDate=null) {
  const now      = new Date();
  const rawLabel = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const label    = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  // Span principal — date du jour
  const el = document.getElementById('tdate');
  if (el) el.textContent = label;

  // Spans séparateur + "Dernière analyse il y a Xmin"
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

  // Quota analyses selon le plan
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
  // ── Afficher toutes les sections Phase 1 ──────────────────
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
  // chat-sec retiré du dashboard — accessible via vue Chat uniquement
  // bottom-sec en flex (contient des cartes empilées)
  const _bs = document.getElementById('bottom-sec');
  if (_bs) {
    _bs.style.display        = 'flex';
    _bs.style.flexDirection  = 'column';
    _bs.style.gap            = '16px';
    _bs.style.opacity        = '1';
    _bs.style.visibility     = 'visible';
  }
  document.getElementById('upload-sec') && (document.getElementById('upload-sec').style.display = 'none');
  // Cacher le mini chat du dashboard (retiré)
  const _chatSec = document.getElementById('chat-sec');
  if (_chatSec) _chatSec.style.display = 'none';
  window._planChatQuota = { standard:30, premium:200, extra:Infinity }[plan] ?? 30;

  // ── Déclarer et calculer toutes les variables d'analyse ────────
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
  // Chat IA : uniquement via la vue Chat (pas le mini dashboard)
  if (S.convId !== a.id) window.DS_CHAT?.initChat(a, zone);
  // Scatter — render sur dashboard ET visuels
  setTimeout(() => _initScatterBoth(a), 200);
  setTimeout(() => _initScatterBoth(a), 800); // retry si supplement.js pas encore chargé
  fu();
  // Cache globaux pour les visualisations
  const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  const prob=Math.round((100-score)*(ZM[zone]||1)*.85);
  window._lastTimeline=tl; window._lastRatios=ratios; window._lastScore=score;
  window._lastZone=zone; window._lastAnalyse=a; window._lastShap=shap;
  const gPct=document.getElementById('gauge-pct');
  if(gPct){gPct.textContent=prob+'%'; gPct.style.color=prob>60?'#ef4444':prob>35?'#f59e0b':'#10b981';}
  setTimeout(()=>{
    const vizView=document.getElementById('view-visualisations');
    if(vizView?.classList.contains('active')&&window.DS_EXTRA){
      window.DS_VIEWS?.renderVisualisations();
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
    container.innerHTML=`<div style="padding:20px 8px;text-align:center;font-size:10px;color:var(--muted);">Aucune analyse trouvée</div>`;
    return;
  }
  container.innerHTML=list.map(a=>{
    const zone=a.zone??zoneFromScore(a.score??0), date=tsToString(a.createdAt);
    const model=(a.model||'').split('+')[0].trim()||'ML', active=S.currentAnalyse?.id===a.id?' active':'';
    // Nom principal : entreprise si dispo, sinon filename nettoyé, sinon ID court
    const rawFile = a.filename||a.sourceFile||'';
    const fileLabel = rawFile ? rawFile.replace(/\.[^.]+$/,'').replace(/[-_]/g,' ').slice(0,28) : '';
    const mainName = a.entreprise||a.company||fileLabel||('Analyse '+a.id.slice(-5));
    // Sous-label : fichier source si différent du nom principal
    const showFile = fileLabel && fileLabel.toLowerCase() !== mainName.toLowerCase();
    return `<div class="ac${active}" data-id="${a.id}">
      <div class="ac-top">
        <div class="ac-name">${mainName}</div>
        <div class="ac-score s-${zone}">${a.score??'—'}</div>
      </div>
      ${showFile ? `<div style="font-size:7.5px;color:rgba(255,255,255,.28);padding:0 8px 2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><i class="fa-solid fa-file" style="margin-right:3px;font-size:7px;"></i>${fileLabel}</div>` : ''}
      <div class="ac-meta">
        <i class="fa-solid fa-calendar" style="font-size:8px;"></i>${date}
        <i class="fa-solid fa-circle" style="font-size:3px;opacity:.4;"></i>${model}
      </div>
      <button class="ac-del" data-did="${a.id}" data-dnom="${a.entreprise??''}"
        style="position:absolute;top:7px;right:7px;opacity:0;background:rgba(239,68,68,.1);
        border:1px solid rgba(239,68,68,.2);border-radius:5px;padding:2px 7px;color:rgba(239,68,68,.7);
        font-size:9px;cursor:pointer;font-family:'Syne',sans-serif;transition:opacity .2s,background .15s;"
        onmouseover="this.style.background='rgba(239,68,68,.25)'"
        onmouseout="this.style.background='rgba(239,68,68,.1)'">✕</button>
    </div>`;
  }).join('');
  container.querySelectorAll('.ac[data-id]').forEach(el=>{
    el.addEventListener('click',()=>{const found=S.analyses.find(a=>a.id===el.dataset.id);if(found)loadAnalyse(found);});
  });
  container.querySelectorAll('.ac-del[data-did]').forEach(btn=>{
    btn.addEventListener('click',(e)=>{e.stopPropagation();window.DS_EXTRA?.deleteAnalyse(btn.dataset.did,btn.dataset.dnom);});
  });
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
  const CM={green:'#10b981',yellow:'#f59e0b',orange:'#f97316',red:'#ef4444'};
  return raw.map(r=>({
    n:r.name??r.n??'Ratio', v:r.value??r.v??0, u:r.unit??r.u??'',
    b:r.benchmark??r.b??'—', c:CM[r.status]??r.color??r.c??'#7DD3FC', p:r.score??r.p??50,
  }));
}

function normalizeRadar(raw) {
  return raw.map(r=>({l:r.label??r.l??r.dimension??'Dim',v:r.value??r.v??r.score??50}));
}

function normalizeRecos(raw) {
  const LM={high:'high',medium:'medium',low:'low',critical:'high',warning:'medium',info:'low'};
  const ICON={
    high:'triangle-exclamation',
    medium:'chart-line',
    low:'seedling'
  };
  const CATS={
    high:   { label:'Urgent',   color:'#ef4444', bg:'rgba(239,68,68,.1)',   ring:'rgba(239,68,68,.35)'  },
    medium: { label:'Important',color:'#f59e0b', bg:'rgba(245,158,11,.1)',  ring:'rgba(245,158,11,.35)' },
    low:    { label:'Conseil',  color:'#10b981', bg:'rgba(16,185,129,.1)',  ring:'rgba(16,185,129,.35)' },
  };
  // Poids criticité pour la barre de progression
  const WEIGHT={high:3,medium:2,low:1};
  return raw.map((r,i)=>{
    const lvl  = LM[r.level??r.lvl??r.priority]??'medium';
    const cat  = CATS[lvl];
    const icon = r.icon??(ICON[lvl]??'lightbulb');
    // Extraire les étapes d'action si présentes dans la description
    const rawDesc = r.description??r.desc??r.d??'';
    // Détecter les étapes numérotées ou bullets existantes
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
  const numEl=document.getElementById('snum'); if(numEl) numEl.style.color=zc.t;
  const b=document.getElementById('zbadge');
  if(b){b.textContent=zc.l;b.style.background=zc.bg;b.style.color=zc.t;b.style.border=`1px solid ${zc.s}44`;}
}

function renderMeta(a,zone) {
  const zc=ZC[zone]??ZC.vigilance, el=document.getElementById('smeta'); if(!el) return;
  const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  const prob=a.probabiliteDefaut??a.probDefault??Math.round((100-(a.score??50))*(ZM[zone]||1)*.85);
  const pc=prob>60?'#ef4444':prob>35?'#f59e0b':'#10b981';
  el.innerHTML=`
    <div class="score-meta-row"><span class="sml">Probabilité défaut</span><span class="smv" style="color:${pc};font-weight:900;">${prob}%</span></div>
    <div class="score-meta-row"><span class="sml">Indice confiance</span><span class="smv" style="color:var(--ice)">${a.confidence??a.conf??'—'}%</span></div>
    <div class="score-meta-row"><span class="sml">Modèle ensemble</span><span class="smv" style="color:var(--muted);font-size:8px;">${a.model??'—'}</span></div>
    <div class="score-meta-row"><span class="sml">AUC ROC</span><span class="smv" style="color:var(--gold)">${a.auc??'—'}</span></div>`;
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
    g+=`<polygon points="${pts}" fill="none" stroke="rgba(255,255,255,.048)" stroke-width="1"/>`;
  });
  ang.forEach((a,i)=>{
    ax+=`<line x1="${cx}" y1="${cy}" x2="${cx+r*Math.cos(a)}" y2="${cy+r*Math.sin(a)}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
    const lx=cx+(r+16)*Math.cos(a),ly=cy+(r+16)*Math.sin(a);
    ax+=`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" font-family="Syne,sans-serif" font-size="8" font-weight="700" letter-spacing="1" fill="rgba(255,255,255,.38)">${dims[i].l.toUpperCase()}</text>`;
  });
  const bench=ang.map(a=>{const d=r*.7;return `${cx+d*Math.cos(a)},${cy+d*Math.sin(a)}`;}).join(' ');
  const data=dims.map((d,i)=>{const dr=r*d.v/100;return `${cx+dr*Math.cos(ang[i])},${cy+dr*Math.sin(ang[i])}`;}).join(' ');
  svg.innerHTML=`<defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgba(125,211,252,.3)"/><stop offset="1" stop-color="rgba(56,189,248,.06)"/></linearGradient></defs>
    ${g}${ax}
    <polygon points="${bench}" fill="none" stroke="rgba(255,215,0,.18)" stroke-width="1" stroke-dasharray="4,3"/>
    <polygon points="${data}" fill="url(#rg2)" stroke="rgba(125,211,252,.75)" stroke-width="1.5"/>
    ${dims.map((d,i)=>{const dr=r*d.v/100,px=cx+dr*Math.cos(ang[i]),py=cy+dr*Math.sin(ang[i]);return `<circle cx="${px}" cy="${py}" r="3.5" fill="#7DD3FC" stroke="rgba(2,4,11,.8)" stroke-width="1.5"/>`;}).join('')}`;
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
  // Forcer wi-sec visible
  const sec = document.getElementById('wi-sec');
  if (sec) { sec.style.display = 'block'; sec.style.opacity = '1'; sec.style.visibility = 'visible'; }
  if (!items || !items.length) {
    el.innerHTML = '<div style="padding:16px;text-align:center;color:rgba(255,255,255,.3);font-size:10px;font-family:var(--fd);">Importez une analyse pour accéder au simulateur What-If.</div>';
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
  const zc = s => s>=75?'#10b981':s>=50?'#f59e0b':s>=25?'#f97316':'#ef4444';

  const same  = peers.filter(p => p.secteur === current.secteur);
  const other = peers.filter(p => p.secteur !== current.secteur);

  const quadrants = [
    {x:PL,      y:PT,      w:CW/2, h:CH/2, f:'rgba(239,68,68,.04)',   l:'Risque élevé'},
    {x:PL+CW/2, y:PT,      w:CW/2, h:CH/2, f:'rgba(245,158,11,.03)',  l:'Vigilance'},
    {x:PL,      y:PT+CH/2, w:CW/2, h:CH/2, f:'rgba(245,158,11,.025)', l:'Sous-performant'},
    {x:PL+CW/2, y:PT+CH/2, w:CW/2, h:CH/2, f:'rgba(16,185,129,.04)', l:'Zone saine'},
  ].map(q=>`<rect x="${q.x}" y="${q.y}" width="${q.w}" height="${q.h}" fill="${q.f}"/>
    <text x="${q.x+q.w/2}" y="${q.y+13}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.1)"
      font-weight="800" letter-spacing="1">${q.l.toUpperCase()}</text>`).join('');

  const grid = [0,25,50,75,100].map(v=>`
    <line x1="${sx(v)}" y1="${PT}" x2="${sx(v)}" y2="${PT+CH}"
      stroke="rgba(255,255,255,.06)" stroke-width=".5" stroke-dasharray="3,5"/>
    <line x1="${PL}" y1="${sy(v)}" x2="${PL+CW}" y2="${sy(v)}"
      stroke="rgba(255,255,255,.06)" stroke-width=".5" stroke-dasharray="3,5"/>
    <text x="${sx(v)}" y="${PT+CH+13}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="7.5" fill="rgba(255,255,255,.22)">${v}</text>
    <text x="${PL-6}" y="${sy(v)+3}" text-anchor="end"
      font-family="Syne,sans-serif" font-size="7" fill="rgba(255,255,255,.18)">${v}</text>`).join('');

  const axes = `
    <line x1="${PL}" y1="${PT}" x2="${PL}" y2="${PT+CH}" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
    <line x1="${PL}" y1="${PT+CH}" x2="${PL+CW}" y2="${PT+CH}" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
    <text x="${PL+CW/2}" y="${H-4}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.3)">
      ← Doctor Score™ →
    </text>
    <text x="10" y="${PT+CH/2}" text-anchor="middle"
      font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.3)"
      transform="rotate(-90,10,${PT+CH/2})">← Risque →</text>`;

  const otherDots = other.map(p=>`<circle cx="${sx(p.score||50)}" cy="${sy(p.y||50)}"
    r="4" fill="${zc(p.score||50)}" opacity=".2"/>`).join('');

  const sameDots = same.map(p=>`<circle cx="${sx(p.score||50)}" cy="${sy(p.y||50)}"
    r="5.5" fill="${zc(p.score||50)}" opacity=".5"
    stroke="rgba(255,255,255,.2)" stroke-width=".8"/>`).join('');

  const cx = sx(current.x||current.score||50);
  const cy = sy(current.y||50);
  const cc = zc(current.x||current.score||50);
  const guides = `
    <line x1="${cx}" y1="${PT}" x2="${cx}" y2="${cy}"
      stroke="rgba(255,215,0,.2)" stroke-width="1" stroke-dasharray="4,4"/>
    <line x1="${PL}" y1="${cy}" x2="${cx}" y2="${cy}"
      stroke="rgba(255,215,0,.2)" stroke-width="1" stroke-dasharray="4,4"/>`;

  const label = (current.entreprise||'Vous').slice(0,16);
  const star = `
    <g transform="translate(${cx},${cy})">
      <circle r="20" fill="${cc}" opacity=".08"/>
      <circle r="11" fill="${cc}" opacity=".15"/>
      <circle r="7" fill="${cc}" opacity=".9"
        style="filter:drop-shadow(0 0 8px ${cc})"/>
      <path d="M0,-6.5 L1.5,-2 L6,-2 L2.5,1.2 L3.8,5.5 L0,3.2 L-3.8,5.5 L-2.5,1.2 L-6,-2 L-1.5,-2 Z"
        fill="#fff" opacity=".95"/>
      <text y="-16" text-anchor="middle"
        font-family="Syne,sans-serif" font-size="8.5" font-weight="900"
        fill="#fff" letter-spacing=".5">${label}</text>
      <text y="22" text-anchor="middle"
        font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.6)">
        ${current.score||current.x||'—'}/100
      </text>
    </g>`;

  const legend = `
    <g transform="translate(${PL+4},${PT+6})">
      <circle cx="5" cy="5" r="5" fill="#10b981" opacity=".5"/>
      <text x="14" y="9" font-family="Syne,sans-serif" font-size="7.5"
        fill="rgba(255,255,255,.4)">Même secteur</text>
    </g>
    <g transform="translate(${PL+90},${PT+6})">
      <circle cx="5" cy="5" r="3.5" fill="rgba(255,255,255,.3)"/>
      <text x="14" y="9" font-family="Syne,sans-serif" font-size="7.5"
        fill="rgba(255,255,255,.4)">Autres secteurs</text>
    </g>`;

  wrap.innerHTML = `<svg width="100%" height="${H}" viewBox="0 0 ${W} ${H}"
    style="display:block;overflow:visible;">
    ${quadrants}${grid}${axes}${otherDots}${sameDots}${guides}${star}${legend}
  </svg>`;

  // Badges
  const sTag = document.getElementById('sc-sector-tag');
  if (sTag && current.secteur) { sTag.textContent = current.secteur; sTag.style.display = 'inline-block'; }
  const dTag = document.getElementById('sc-demo-badge');
  if (dTag) dTag.style.display = window._lastAnalyse?.score != null ? 'none' : 'inline-block';

  // Rendre la section visible
  const sec = document.getElementById('sc-section') || document.getElementById('scatter-dash-sec');
  if (sec) { sec.style.display = 'block'; sec.style.opacity = '1'; }
}

// Lancer scatter sur les deux wraps
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

  // Render dashboard scatter — toujours visible
  // FIX: scatter-dash-wrap → scatter-plot-wrap
  const dashWrap = document.getElementById('scatter-plot-wrap');
  if (dashWrap && !window._SCATTER_RENDER) _renderScatterOnDash(cur, peers, dashWrap);

  // FIX: render scatter robuste avec forcedW
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
  svg.innerHTML=`<defs><linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgba(125,211,252,.22)"/><stop offset="1" stop-color="rgba(125,211,252,0)"/>
  </linearGradient></defs>
  <path d="${ad}" fill="url(#tlg)"/>
  <path d="${pd}" fill="none" stroke="rgba(125,211,252,.65)" stroke-width="1.8" stroke-linecap="round"/>
  ${pts.map((p,i)=>`
    <text x="${p.x}" y="${TH-2}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" fill="rgba(255,255,255,.28)" letter-spacing="1">${labels[i]?.toUpperCase()}</text>
    <text x="${p.x}" y="${p.y-9}" text-anchor="middle" font-family="Syne,sans-serif" font-size="8" font-weight="700" fill="rgba(255,255,255,.45)">${data[i]}</text>
    <circle cx="${p.x}" cy="${p.y}" r="${i===pts.length-1?5:2.8}" fill="${i===pts.length-1?'#FFD700':'#7DD3FC'}" stroke="rgba(2,4,11,.8)" stroke-width="1.5"/>
  `).join('')}`;
}

function renderRecos(recos) {
  const el = document.getElementById('reco-list'); if (!el) return;
  if (!recos.length) {
    el.innerHTML = `<div style="padding:28px;text-align:center;color:rgba(255,255,255,.2);font-size:11px;">
      <i class="fa-solid fa-circle-check" style="font-size:28px;display:block;margin-bottom:10px;color:rgba(16,185,129,.3);"></i>
      Aucune recommandation critique détectée.</div>`;
    return;
  }

  // Mise à jour du badge compteur
  const badge = document.getElementById('reco-badge');
  if (badge) {
    const nHigh = recos.filter(r=>r.lvl==='high').length;
    badge.textContent = nHigh ? `${nHigh} urgente${nHigh>1?'s':''}` : `${recos.length} conseil${recos.length>1?'s':''}`;
    badge.style.display = 'inline-block';
    badge.style.background = nHigh ? 'rgba(239,68,68,.1)' : 'rgba(255,215,0,.08)';
    badge.style.color = nHigh ? '#ef4444' : '#FFD700';
    badge.style.borderColor = nHigh ? 'rgba(239,68,68,.25)' : 'rgba(255,215,0,.18)';
  }

  // Barre de progression globale
  const totalWeight   = recos.reduce((s,r)=>s+r.weight,0);
  const resolvedCount = parseInt(localStorage.getItem(`reco-resolved-${S.currentAnalyse?.id}`) || '0');
  const resolvedPct   = Math.min(100, Math.round((resolvedCount / Math.max(recos.length,1)) * 100));

  // Filtres actifs
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

    return `
    <div class="reco2 ${r.lvl}${isResolved ? ' reco2-done' : ''} fu"
      data-idx="${r.idx}"
      style="animation-delay:${i * 0.06}s">

      <!-- En-tête cliquable -->
      <div class="reco2-head" onclick="window._toggleReco(this)">
        <div class="reco2-icon-wrap">
          <div class="reco2-icon">
            <i class="fa-solid fa-${r.icon}"></i>
          </div>
          <!-- Anneau de criticité animé -->
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
            <span class="reco2-tag" style="background:${r.cat.bg};color:${r.cat.color};border-color:${r.cat.color}44;">
              ${r.cat.label}
            </span>
            ${metaHtml}
          </div>
          <div class="reco2-title">${r.t}</div>
          <div class="reco2-desc">${r.d}</div>
        </div>

        <div class="reco2-chevron">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </div>

      <!-- Corps accordéon -->
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
    : `<div style="padding:24px;text-align:center;font-size:10px;color:rgba(255,255,255,.25);">
        Aucune recommandation dans cette catégorie.</div>`);

  // Stocker pour les re-rendus (filtres)
  window._lastRecos = recos;
  window.renderRecos = renderRecos;

  // Animation d'entrée séquentielle
  requestAnimationFrame(() => {
    el.querySelectorAll('.reco2.fu').forEach((card, i) => {
      setTimeout(() => card.classList.add('on'), i * 60);
    });
  });
}

// Toggle accordéon d'une recommandation
window._toggleReco = function(head) {
  const card   = head.closest('.reco2');
  const body   = card.querySelector('.reco2-body');
  const chev   = card.querySelector('.reco2-chevron i');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chev) chev.style.transform = isOpen ? '' : 'rotate(180deg)';
  card.classList.toggle('reco2-open', !isOpen);
};

// Marquer une reco comme traitée
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
  showToast(isDone ? 'Recommandation remise en cours' : 'Recommandation marquée traitée ✓', 'ok');
};

function drawSparks(sc,nb,cf,ms) {
  spk('sp0',sc.length?sc:[0,0,0,0,0,0],'#7DD3FC');
  spk('sp1',nb.length?nb:[0,0,0,0,0,0],'#FFD700');
  spk('sp2',cf.length?cf:[0,0,0,0,0,0],'#10b981');
  spk('sp3',ms.length?ms:[0,0,0,0,0,0],'#8B5CF6');
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

function downloadReport(analyseId,type) {
  const a=S.analyses.find(x=>x.id===analyseId)||S.currentAnalyse;
  if(!a){showToast('Analyse introuvable','err');return;}
  const zone=a.zone??zoneFromScore(a.score??0), zc=ZC[zone];
  const date=new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
  const ratios=normalizeRatios(a.ratios||a.financialRatios||[]);
  const recos =normalizeRecos(a.recommendations||a.recos||[]);
  window.DS_NOTIFS?.shareReport(analyseId);
}

// ════════════════════════════════════════════════════════════════
//  EXPOSITION PUBLIQUE window.DS
// ════════════════════════════════════════════════════════════════
window.DS = {
  // Upload
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
  // Chat
  sendChat:             ()   => window.DS_CHAT?.sendChat(),
  chatKeydown:          (e)  => window.DS_CHAT?.chatKeydown(e),
  autoResize:           (el) => window.DS_CHAT?.autoResize(el),
  sendChatFull:         ()   => window.DS_CHAT?.sendChatFull(),
  chatKeydownFull:      (e)  => window.DS_CHAT?.chatKeydownFull(e),
  // Navigation
  navTo:                (v)  => window.DS_VIEWS?.navTo(v),
  // WI display
  updateWIDisplay,
  // Sidebar filter
  filterSidebar: debounce((v)=>{S.filterText=v;renderSidebar(v);},200),
  // Paramètres
  saveProfile,
  changePasswordFlow,
  showToastUpgrade,
  downloadReport,
  // Notifs
  toggleNotifPanel:     ()   => window.DS_NOTIFS?.togglePanel(),
  _markAllRead:         ()   => window.DS_NOTIFS?.markAllRead(),
  // Rapport
  shareReport:          (id) => window.DS_NOTIFS?.shareReport(id),
  // Visualisations
  renderViewVisualisations: () => window.DS_VIEWS?.renderVisualisations(),
};

// Garder DS_DASH à jour avec les fonctions internes
window.DS_DASH.loadAnalyse = loadAnalyse;

// ════════════════════════════════════════════════════════════════
//  DÉMARRAGE
// ════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', init);