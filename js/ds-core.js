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
  currency: 'FCFA', // valeur par défaut de monnaie demandée
  admin:            null, // Ajouté pour centraliser l'état admin

  // Getters helpers
  get plan() { return this.abonnement?.plan || this.profile?.plan || 'standard'; },
  get uid() { return this.user?.uid; }
};

// ── Couleurs zones ────────────────────────────────────────────
window.ZC = {
  saine:    { s:'var(--color-success)', bg:'var(--success-bg)',  t:'var(--color-success)', l:'Zone Saine'     },
  vigilance:{ s:'var(--color-accent)', bg:'var(--accent-bg)',  t:'var(--color-accent)', l:'Zone Vigilance' },
  risque:   { s:'var(--color-risque)', bg:'var(--risque-bg)',  t:'var(--color-risque)', l:'Zone Risque'    },
  critique: { s:'var(--color-error)', bg:'var(--error-bg)',   t:'var(--color-error)', l:'Zone Critique'  },
};

// ── API Base (Auto-switch entre local et production) ──────────
window.API_BASE = (() => {
  if (window.__DOCTOR_SMILE_API_BASE__) return window.__DOCTOR_SMILE_API_BASE__;
  const saved = localStorage.getItem('ds_api_base');
  if (saved) return saved;
  if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
    return 'http://127.0.0.1:8000';
  }
  if (window.location.origin && !window.location.origin.startsWith('file')) {
    return window.location.origin;
  }
  return 'http://127.0.0.1:8000';
})();

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
  const typeMap = {
    ok:   'success',
    warn: 'warning',
    err:  'error',
    info: 'info'
  };
  const dsType = typeMap[type] || 'info';
  if (window.Toast) {
    window.Toast.show(msg, { type: dsType });
  } else {
    console.log(`[Toast Fallback] ${type}: ${msg}`);
  }
};

// Ajouter l'animation toastIn au head
if (!document.getElementById('ds-toast-anim')) {
  const s = document.createElement('style');
  s.id = 'ds-toast-anim';
  s.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(40px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

// ── Background canvas animé ───────────────────────────────────
window.initBgCanvas = function() {
  const cv = document.getElementById('bg-canvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H;
  const rsz = () => { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; };
  window.addEventListener('resize', rsz); rsz();

  const pts = [];
  const orbs = [
    { x:.14, y:.22, r:.38, c:'rgba(139,127,240,', s:.0009 },
    { x:.8,  y:.6,  r:.3,  c:'rgba(255,215,0,',  s:.0007 },
    { x:.48, y:.88, r:.24, c:'rgba(139,127,240,',  s:.001  },
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
    ctx.save(); ctx.strokeStyle='rgba(139,127,240,.016)'; ctx.lineWidth=1;
    for(let x=0;x<W;x+=56){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=56){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.restore();
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
      const a=p.a*(.5+.5*Math.sin(tt+p.r*7));
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=p.g?`rgba(255,215,0,${a})`:`rgba(139,127,240,${a})`;
      ctx.fill();
    });
  })();
};

// ── Curseur personnalisé ──────────────────────────────────────
window.initCursor = function() {
  // Désactivé pour des raisons de performance (lag cursor supprimé dans le CSS)
  return;
};

console.log('[ds-core] ✓ Chargé');

// ── Mode accessibilité / contraste élevé (toggle global) ─────
window._ds_injectHighContrast = function() {
  if (document.getElementById('_ds_high_contrast')) return;
  const s = document.createElement('style');
  s.id = '_ds_high_contrast';
  s.textContent = `
:root.ds-high-contrast { 
  --text: #ffffff;
  --text-2: #eeeeee;
  --text-hint: #cccccc;
  --bg: #000000;
  --surface: #111111;
  --border: rgba(255,255,255,0.4);
}
:root.ds-high-contrast body { background: #000 !important; color: #fff !important; }
:root.ds-high-contrast .card, :root.ds-high-contrast .chat-card, :root.ds-high-contrast .ppq-window { 
  background: #111 !important; 
  border: 2px solid #fff !important; 
}
:root.ds-high-contrast button, :root.ds-high-contrast .msg-act-btn { 
  background: #fff !important; 
  color: #000 !important; 
  font-weight: 900 !important;
}
:root.ds-high-contrast input, :root.ds-high-contrast textarea {
  background: #000 !important;
  color: #fff !important;
  border: 1px solid #fff !important;
}
`;
  document.head.appendChild(s);
};

window.toggleHighContrast = function(on) {
  try {
    if (!document.getElementById('_ds_high_contrast')) window._ds_injectHighContrast();
    const root = document.documentElement;
    if (typeof on === 'boolean') {
      root.classList.toggle('ds-high-contrast', on);
      return on;
    }
    const newState = !root.classList.contains('ds-high-contrast');
    root.classList.toggle('ds-high-contrast', newState);
    return newState;
  } catch (e) { console.error('toggleHighContrast', e); return false; }
};

// Floating toggle button (non-intrusive) — injection à l'init
window._ds_injectContrastToggleUI = function() {
  if (document.getElementById('_ds_ac_toggle')) return;
  const btn = document.createElement('button');
  btn.id = '_ds_ac_toggle';
  btn.title = 'Mode contraste élevé';
  btn.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:12000;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.06);font-weight:700;cursor:pointer;backdrop-filter:blur(6px);';
  btn.textContent = 'Contraste';
  btn.addEventListener('click', () => {
    const on = window.toggleHighContrast();
    btn.style.background = on ? '#fff' : 'rgba(255,255,255,.08)';
    btn.style.color = on ? '#000' : '#fff';
  });
  document.body.appendChild(btn);
};

// Appeler l'inject UI après chargement (si body déjà disponible)
if (document.readyState !== 'loading') window._ds_injectContrastToggleUI();
else document.addEventListener('DOMContentLoaded', window._ds_injectContrastToggleUI);

// ── Délégation pour boutons "Appeler IA" (capture clics et déclenche le chat)
window._ds_attachCallIA = function() {
  if (window.__ds_callia_attached) return;
  window.__ds_callia_attached = true;

  // Queue pour actions demandées avant initialisation du chat
  window.__ds_callia_queue = window.__ds_callia_queue || [];

  const tryExecute = (el) => {
    // Choisir l'input disponible
    const inpMain = document.getElementById('chat-inp');
    const inpFull = document.getElementById('chat-inp-full');
    const cid = inpMain ? 'chat-msgs' : (inpFull ? 'chat-msgs-full' : null);
    if (!cid || !window.DS_CHAT) return false;
    const inp = cid === 'chat-msgs' ? inpMain : inpFull;
    if (inp && !inp.value) inp.value = '';
    if (typeof window.DS_CHAT._sendMsg === 'function') {
      window.DS_CHAT._sendMsg(cid);
      return true;
    }
    if (typeof window.DS_CHAT.sendChat === 'function') {
      window.DS_CHAT.sendChat();
      return true;
    }
    return false;
  };

  // Attempt to flush queue periodically
  const _flushQueue = () => {
    if (!window.__ds_callia_queue.length) return;
    while (window.__ds_callia_queue.length) {
      const el = window.__ds_callia_queue.shift();
      if (!tryExecute(el)) {
        // push back and stop trying for now
        window.__ds_callia_queue.unshift(el);
        break;
      }
    }
  };
  window.__ds_callia_flushInt = window.__ds_callia_flushInt || setInterval(_flushQueue, 600);

  document.body.addEventListener('click', function(e) {
    try {
      const el = e.target.closest && e.target.closest('[data-action],[data-call],[role="button"],button,a,[class]');
      // Fallback to any button/anchor if above fails
      const candidate = e.target.closest && (e.target.closest('button') || e.target.closest('a'));
      const node = el || candidate;
      if (!node) return;

      // Boutons TTS / appel vocal gérés par ds-call.js
      if (node.id === 'tts-call' || node.id === 'tts-auto' || node.closest?.('#tts-call,#tts-auto,.tts-btn,#_cmod')) return;

      const txt = (node.textContent || node.innerText || '').trim();
      const da = (node.dataset && (node.dataset.action || node.dataset.call)) || '';
      const cls = node.className || '';

      const isCall = /appel(?:er)?\s*ia/i.test(txt)
                     || /call\s*ia/i.test(txt)
                     || /\bcall-?ia\b/i.test(da)
                     || /\bappeler-?ia\b/i.test(da)
                     || /\bcall-?ia\b/i.test(cls)
                     || /\bcallia\b/i.test(cls)
                     || /\bappeleria\b/i.test(cls)
                     || /data-call\=(?:\")?call-?ia/i.test(node.outerHTML || '');

      if (!isCall) return;
      e.preventDefault();

      // Try immediately, else queue
      const executed = tryExecute(node);
      if (!executed) {
        window.__ds_callia_queue.push(node);
        window.showToast && window.showToast('Chat non prêt — action mise en file', 'info');
      }
    } catch (err) { console.error('callIA handler', err); }
  }, true);
};

if (document.readyState !== 'loading') window._ds_attachCallIA();
else document.addEventListener('DOMContentLoaded', window._ds_attachCallIA);
