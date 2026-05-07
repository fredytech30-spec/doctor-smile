// ════════════════════════════════════════════════════════════════
//  ds-core.js — Doctor Smile
//  État global, helpers partagés, effets visuels
//  Chargé EN PREMIER par dashboard.html
// ════════════════════════════════════════════════════════════════

// ── État centralisé (partagé par tous les modules) ────────────
window.S = {
  user:             null,
  profile:          null,
  abonnement:       null,
  analyses:         [],
  currentAnalyse:   null,
  rawFileData:      null,
  convId:           null,
  chatHistory:      [],
  filterText:       '',
  waitingForResult: false,
  pendingAnalyseId: null,
  pipelineTimer:    null,
  pipelineStep:     0,
  firestoreConvId:  null,
  _unsubProfile:    null,
  _unsubAnalyses:   null,
  _unsubAbonnement: null,
  _benchmarkSector: 'Services',
};
import { initI18n, t, setLang, renderLangSection } from './ds-i18n.js';

// Au chargement, après auth :
await initI18n(db, user.uid);

// Dans la vue Paramètres, injecter le sélecteur :
document.getElementById('parametres-content').innerHTML += renderLangSection();

// Écouter les changements pour re-rendre l'UI :
window.addEventListener('ds-lang-change', ({ detail }) => {
  // ex: mettre à jour les labels nav
  document.querySelector('[data-view="dashboard"] .nav-tip')
    .textContent = t('nav.dashboard');
});
// ── Couleurs zones ────────────────────────────────────────────
window.ZC = {
  saine:    { s:'#10b981', bg:'rgba(16,185,129,.1)',  t:'#10b981', l:'Zone Saine'     },
  vigilance:{ s:'#f59e0b', bg:'rgba(245,158,11,.1)',  t:'#f59e0b', l:'Zone Vigilance' },
  risque:   { s:'#f97316', bg:'rgba(249,115,22,.1)',  t:'#f97316', l:'Zone Risque'    },
  critique: { s:'#ef4444', bg:'rgba(239,68,68,.1)',   t:'#ef4444', l:'Zone Critique'  },
};

// ── API Base ──────────────────────────────────────────────────
window.API_BASE = 'http://127.0.0.1:8000';

// ── Zone depuis score ─────────────────────────────────────────
window.zoneFromScore = function(score) {
  if (score >= 75) return 'saine';
  if (score >= 50) return 'vigilance';
  if (score >= 25) return 'risque';
  return 'critique';
};

// ── Escape HTML ───────────────────────────────────────────────
window.escHtml = function(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
};

// ── Durée lisible ─────────────────────────────────────────────
window.msToHuman = function(ms) {
  const s=ms/1000, m=s/60, h=m/60, d=h/24;
  if (d>=1) return `il y a ${Math.floor(d)}j`;
  if (h>=1) return `il y a ${Math.floor(h)}h`;
  if (m>=1) return `il y a ${Math.floor(m)}min`;
  return 'à l\'instant';
};

// ── Timestamp → Date ──────────────────────────────────────────
window.tsToDate = function(ts) {
  if (!ts) return new Date();
  if (ts.toDate)  return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return new Date(ts);
};

// ── Animation compteur ────────────────────────────────────────
window.anim = function(id, from, to, ms) {
  const el = document.getElementById(id); if (!el) return;
  const st = performance.now();
  (function step(now) {
    const p = Math.min((now - st) / ms, 1), e = 1 - Math.pow(1-p, 3);
    el.textContent = Math.round(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(step);
  })(st);
};

// ── Fade-up des cartes ────────────────────────────────────────
window.fu = function() {
  setTimeout(() =>
    document.querySelectorAll('.fu:not(.on)').forEach((el, i) =>
      setTimeout(() => el.classList.add('on'), i * 55)
    ), 40);
};

// ── Toast ─────────────────────────────────────────────────────
window.showToast = function(msg, type = 'ok') {
  const COLORS = {
    ok:   { bg:'rgba(16,185,129,.1)',  border:'rgba(16,185,129,.25)',  text:'#10b981' },
    warn: { bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.25)',  text:'#f59e0b' },
    err:  { bg:'rgba(239,68,68,.1)',   border:'rgba(239,68,68,.25)',   text:'#ef4444' },
    info: { bg:'rgba(125,211,252,.1)', border:'rgba(125,211,252,.25)', text:'#7DD3FC' },
  };
  const c = COLORS[type] ?? COLORS.info;
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    z-index:10000;padding:10px 22px;border-radius:9px;
    background:${c.bg};border:1px solid ${c.border};color:${c.text};
    font-family:'Syne',sans-serif;font-size:11px;font-weight:700;
    backdrop-filter:blur(14px);white-space:nowrap;
    animation:mIn .28s var(--spring);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity='0'; t.style.transition='opacity .28s';
    setTimeout(() => t.remove(), 300);
  }, 3500);
};

// ── Background canvas animé ───────────────────────────────────
window.initBgCanvas = function() {
  const cv = document.getElementById('bg-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  const rsz = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
  window.addEventListener('resize', rsz); rsz();

  const pts = Array.from({ length: 100 }, () => ({
    x: Math.random()*2000, y: Math.random()*1200,
    r: .3+Math.random()*1.1, vx:(Math.random()-.5)*.07, vy:(Math.random()-.5)*.07,
    a: Math.random()*.28, g: Math.random()>.75,
  }));
  const orbs = [
    { x:.14, y:.22, r:.38, c:'rgba(125,211,252,', s:.0009 },
    { x:.8,  y:.6,  r:.3,  c:'rgba(255,215,0,',  s:.0007 },
    { x:.48, y:.88, r:.24, c:'rgba(139,92,246,',  s:.001  },
  ];
  let tt = 0;
  (function bgL() {
    requestAnimationFrame(bgL); tt+=.003; ctx.clearRect(0,0,W,H);
    orbs.forEach(o => {
      const px=W*(o.x+Math.sin(tt*o.s*900)*.04), py=H*(o.y+Math.cos(tt*o.s*700)*.03);
      const g=ctx.createRadialGradient(px,py,0,px,py,W*o.r);
      g.addColorStop(0,o.c+'0.035)'); g.addColorStop(1,'transparent');
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });
    ctx.save(); ctx.strokeStyle='rgba(125,211,252,.016)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=56){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=56){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      const a=p.a*(.5+.5*Math.sin(tt+p.r*7));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.g?`rgba(255,215,0,${a})`:`rgba(125,211,252,${a})`;
      ctx.fill();
    });
  })();
};

// ── Curseur personnalisé ──────────────────────────────────────
window.initCursor = function() {
  const cur=document.getElementById('cur');
  const curR=document.getElementById('curR');
  if (!cur||!curR) return;
  let mx=0, my=0;
  document.addEventListener('mousemove', e => {
    mx=e.clientX; my=e.clientY;
    cur.style.left=mx+'px'; cur.style.top=my+'px';
  });
  setInterval(() => { curR.style.left=mx+'px'; curR.style.top=my+'px'; }, 11);
  const SEL='button,a,.nav-item,.kpi,.ac,.reco,.oauth-btn,.tab-btn,.plan-btn';
  document.addEventListener('mouseover', e => {
    if(e.target.closest(SEL)){
      curR.style.width='42px'; curR.style.height='42px';
      curR.style.borderColor='rgba(255,215,0,.45)';
    }
  });
  document.addEventListener('mouseout', e => {
    if(e.target.closest(SEL)){
      curR.style.width='30px'; curR.style.height='30px';
      curR.style.borderColor='rgba(125,211,252,.35)';
    }
  });
  document.addEventListener('mouseleave', () => { cur.style.opacity='0'; curR.style.opacity='0'; });
  document.addEventListener('mouseenter', () => { cur.style.opacity='1'; curR.style.opacity='1'; });
};

console.log('[ds-core] ✓ Chargé');
