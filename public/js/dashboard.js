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
    const heure = new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',hour12:false});
    el.innerHTML = `${prenom} – ${heure}
      <span style="display:inline-block;width:8px;height:8px;background:#10b981;border-radius:50%;margin-left:8px;vertical-align:middle;box-shadow:0 0 8px rgba(16,185,129,0.7);animation:pulseOnline 2s infinite ease-in-out;"></span>
      <span style="font-size:11px;color:#10b981;margin-left:4px;vertical-align:middle;opacity:0.9;">En ligne</span>`;
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
    badge.textContent = plan.charAt(0).toUpperCase()+plan.slice(1);
    badge.className   = `badge ${plan}`;
    badge.style.opacity = '1';
  }
  const wiSec = document.getElementById('wi-sec');
  if (wiSec) wiSec.style.display = checkPlan(plan,'premium')?'block':'none';
}

function setTopbarDate(lastAnalyseDate=null) {
  const now   = new Date();
  const label = now.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const suffix= lastAnalyseDate?` · Dernière analyse ${msToHuman(now-lastAnalyseDate)}`:'';
  const el = document.getElementById('tdate');
  if (el) el.textContent = label+suffix;
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
  // FIX : utiliser currentAnalyse pour le score KPI si disponible
  const current = S.currentAnalyse || analyses[0];
  const latest  = analyses[0];
  const now=new Date();
  const ceJour=analyses.filter(a=>{const d=tsToDate(a.createdAt);return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();}).length;
  const avgConf=Math.round(analyses.reduce((s,a)=>s+(a.confidence||94),0)/analyses.length);
  const lastMs=current?.processingMs||latest?.processingMs||340;
  // Score KPI = score de l'analyse actuellement affichée
  anim('kv-score',0,current?.score??0,1000);
  anim('kv-nb',   0,ceJour||analyses.length,800);
  anim('kv-conf', 0,current?.confidence??avgConf,1200);
  const kvTime=document.getElementById('kv-time'); if(kvTime) kvTime.textContent=lastMs+'ms';
  const hist=analyses.slice(0,6).reverse();
  drawSparks(hist.map(a=>a.score||0),hist.map((_,i)=>i+1),hist.map(a=>a.confidence||90),hist.map(a=>a.processingMs||340));
}

// ════════════════════════════════════════════════════════════════
//  CHARGER UNE ANALYSE
// ════════════════════════════════════════════════════════════════
function loadAnalyse(a) {
  S.currentAnalyse=a;
  // Sync KPI immédiatement avec l'analyse chargée
  setTimeout(()=>updateKPIs(), 0);
  renderSidebar();
  const plan=S.abonnement?.plan||S.profile?.plan||'standard';
  const sections={'score-sec':'grid','ratios-sec':'block','wi-sec':checkPlan(plan,'premium')?'block':'none','bottom-sec':'grid','chat-sec':'block'};
  Object.entries(sections).forEach(([id,disp])=>{const el=document.getElementById(id);if(el)el.style.display=disp;});
  const upSec=document.getElementById('upload-sec'); if(upSec) upSec.style.display='none';
  const score=a.score??0, zone=a.zone??zoneFromScore(score);
  const shap  =normalizeShap(a.shapValues||a.shap||[]);
  const ratios=normalizeRatios(a.ratios||a.financialRatios||[]);
  const radar =normalizeRadar(a.radarDimensions||a.radar||[]);
  const tl    =a.scoreHistory||a.tl||[score];
  const recos =normalizeRecos(a.recommendations||a.recos||[]);
  const wi    =normalizeWI(a.whatifParams||a.wi||[],ratios);
  setTopbarDate(tsToDate(a.createdAt));
  renderRing(score,zone);
  renderMeta(a,zone);
  renderShap(shap);
  setTimeout(()=>renderRadar(radar),180);
  renderRatios(ratios);
  renderWI(wi);
  setTimeout(()=>renderTimeline(tl),280);
  renderRecos(recos);
  if (S.convId!==a.id) window.DS_CHAT?.initChat(a,zone);
  fu();
  // Cache globaux pour les visualisations
  const ZM={saine:.6,vigilance:1.0,risque:1.3,critique:1.6};
  const prob=Math.round((100-score)*(ZM[zone]||1)*.85);
  window._lastTimeline=tl; window._lastRatios=ratios; window._lastScore=score;
  window._lastZone=zone; window._lastAnalyse=a;
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
  const list=S.analyses.filter(a=>(a.entreprise||a.company||'').toLowerCase().includes(filter.toLowerCase()));
  const container=document.getElementById('sb-list'); if(!container) return;
  if(!list.length){
    container.innerHTML=`<div style="padding:20px 8px;text-align:center;font-size:10px;color:var(--muted);">Aucune analyse trouvée</div>`;
    return;
  }
  container.innerHTML=list.map(a=>{
    const zone=a.zone??zoneFromScore(a.score??0), date=tsToString(a.createdAt);
    const model=(a.model||'').split('+')[0].trim()||'ML', active=S.currentAnalyse?.id===a.id?' active':'';
    return `<div class="ac${active}" data-id="${a.id}">
      <div class="ac-top">
        <div class="ac-name">${a.entreprise??a.company??'Sans nom'}</div>
        <div class="ac-score s-${zone}">${a.score??'—'}</div>
      </div>
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
  const ICON={high:'fa-exclamation',medium:'fa-chart-line',low:'fa-seedling'};
  return raw.map(r=>{
    const lvl=LM[r.level??r.lvl??r.priority]??'medium';
    return {lvl,t:r.title??r.t??'Recommandation',d:r.description??r.desc??r.d??'',icon:r.icon??ICON[lvl]??'fa-lightbulb'};
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
  const el=document.getElementById('wi-grid'); if(!el) return;
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
  const el=document.getElementById('reco-list'); if(!el) return;
  el.innerHTML=recos.map(r=>`
    <div class="reco ${r.lvl}">
      <div class="reco-icon"><i class="fa-solid fa-${r.icon}"></i></div>
      <div class="reco-body"><div class="reco-title">${r.t}</div><div class="reco-desc">${r.d}</div></div>
      <div class="reco-tag">${r.lvl==='high'?'Urgent':r.lvl==='medium'?'Moyen':'Info'}</div>
    </div>`).join('');
}

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