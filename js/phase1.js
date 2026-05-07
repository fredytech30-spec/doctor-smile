// ════════════════════════════════════════════════════════════════
//  phase1.js — Doctor Smile  · Phase 1
//  ─────────────────────────────────────────────────────────────
//  ① Onboarding interactif       (checklist progress + tour guidé)
//  ② Emails transactionnels      (welcome, analyse prête, relance)
//  ③ Page Mon Abonnement         (factures, annulation, upgrade)
//  ④ 2FA Firebase TOTP           (activer/désactiver l'auth 2 facteurs)
//  ⑤ Export RGPD                 (toutes les données en JSON)
//  ─────────────────────────────────────────────────────────────
//  Intégration :
//    <script type="module" src="./js/phase1.js"></script>
//    (Ajouter dans dashboard.html juste avant </body>)
//
//  Aucune modification des fichiers existants requise.
//  S'auto-greffe sur DS_VIEWS.renderParametres et auth Firebase.
// ════════════════════════════════════════════════════════════════

// ── CSS injecté une seule fois ───────────────────────────────
(function _injectP1CSS() {
  if (document.getElementById('_p1_css')) return;
  const st = document.createElement('style');
  st.id = '_p1_css';
  st.textContent = `

/* ══ Onboarding checklist ══════════════════════════════════ */
#p1-onboarding-bar {
  position:fixed;bottom:24px;right:24px;z-index:8000;
  width:280px;background:rgba(6,10,20,.97);
  border:1px solid rgba(125,211,252,.18);border-radius:16px;
  box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:hidden;
  transition:all .3s cubic-bezier(.16,1,.3,1);
  animation:p1SlideIn .4s cubic-bezier(.16,1,.3,1);
}
@keyframes p1SlideIn{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:none}}
#p1-onboarding-bar.collapsed { height:52px; }
#p1-ob-header {
  display:flex;align-items:center;justify-content:space-between;
  padding:13px 16px;cursor:pointer;
  background:rgba(125,211,252,.04);
  border-bottom:1px solid rgba(125,211,252,.08);
}
#p1-ob-progress-ring { flex-shrink:0;margin-right:10px; }
#p1-ob-title {
  flex:1;font-family:Syne,sans-serif;font-size:10px;
  font-weight:800;color:#fff;letter-spacing:.04em;
}
#p1-ob-sub { font-size:8px;color:rgba(255,255,255,.35);margin-top:1px; }
#p1-ob-toggle {
  background:none;border:none;color:rgba(255,255,255,.3);
  cursor:pointer;font-size:12px;padding:2px 4px;transition:color .15s;
}
#p1-ob-toggle:hover { color:#7DD3FC; }
.p1-ob-item {
  display:flex;align-items:center;gap:10px;
  padding:10px 16px;cursor:pointer;
  border-bottom:1px solid rgba(255,255,255,.04);
  transition:background .15s;
}
.p1-ob-item:last-child { border-bottom:none; }
.p1-ob-item:hover { background:rgba(125,211,252,.04); }
.p1-ob-item.done { opacity:.5; }
.p1-ob-icon {
  width:26px;height:26px;border-radius:7px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;font-size:11px;
}
.p1-ob-item.done .p1-ob-icon { background:rgba(16,185,129,.12);color:#10b981; }
.p1-ob-item:not(.done) .p1-ob-icon { background:rgba(125,211,252,.08);color:#7DD3FC; }
.p1-ob-label {
  flex:1;font-family:Syne,sans-serif;font-size:9px;font-weight:700;
  color:rgba(255,255,255,.7);letter-spacing:.03em;
}
.p1-ob-item.done .p1-ob-label { text-decoration:line-through; }
.p1-ob-pts {
  font-family:"JetBrains Mono",monospace;font-size:8px;
  color:rgba(255,215,0,.6);font-weight:700;
}
#p1-ob-footer {
  padding:10px 16px;text-align:center;
  border-top:1px solid rgba(255,255,255,.05);
}
#p1-ob-close-btn {
  font-family:Syne,sans-serif;font-size:8px;font-weight:700;
  color:rgba(255,255,255,.25);background:none;border:none;cursor:pointer;
  letter-spacing:.06em;transition:color .15s;
}
#p1-ob-close-btn:hover { color:rgba(255,255,255,.5); }

/* ══ Toast email ═══════════════════════════════════════════ */
.p1-toast {
  position:fixed;top:20px;right:20px;z-index:10000;
  max-width:320px;padding:13px 18px;border-radius:13px;
  background:rgba(5,9,18,.97);
  font-family:"Instrument Sans",sans-serif;font-size:11px;
  color:rgba(255,255,255,.8);
  transform:translateX(340px);
  transition:transform .35s cubic-bezier(.34,1.56,.64,1);
  line-height:1.5;
}
.p1-toast.show { transform:translateX(0); }

/* ══ Modal générique Phase 1 ═══════════════════════════════ */
.p1-modal-overlay {
  position:fixed;inset:0;z-index:9800;
  display:flex;align-items:center;justify-content:center;
  background:rgba(2,4,11,.85);backdrop-filter:blur(14px);
  animation:mIn .25s ease;
}
.p1-modal {
  background:rgba(7,11,20,.99);
  border:1px solid rgba(125,211,252,.15);
  border-radius:20px;padding:32px;
  width:min(92vw,480px);
  box-shadow:0 40px 100px rgba(0,0,0,.7);
  max-height:90vh;overflow-y:auto;
}
.p1-modal-title {
  font-family:Syne,sans-serif;font-size:16px;font-weight:900;
  color:#fff;margin-bottom:6px;
  display:flex;align-items:center;gap:10px;
}
.p1-modal-sub {
  font-size:10px;color:rgba(255,255,255,.4);
  margin-bottom:24px;line-height:1.6;
}
.p1-section-title {
  font-family:Syne,sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.14em;text-transform:uppercase;
  color:rgba(255,255,255,.3);margin-bottom:8px;margin-top:16px;
}
.p1-row {
  display:flex;align-items:center;justify-content:space-between;
  padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05);gap:12px;
}
.p1-row:last-child { border-bottom:none; }
.p1-row-label {
  font-size:11px;color:rgba(255,255,255,.7);flex:1;
}
.p1-row-label small {
  display:block;font-size:9px;color:rgba(255,255,255,.3);margin-top:2px;
}
.p1-btn {
  padding:8px 16px;border-radius:9px;font-family:Syne,sans-serif;
  font-size:9px;font-weight:800;letter-spacing:.06em;cursor:pointer;
  transition:all .18s;border:1px solid transparent;white-space:nowrap;
}
.p1-btn-primary {
  background:rgba(125,211,252,.12);border-color:rgba(125,211,252,.3);
  color:#7DD3FC;
}
.p1-btn-primary:hover { background:rgba(125,211,252,.22);transform:translateY(-1px); }
.p1-btn-danger {
  background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.25);
  color:#ef4444;
}
.p1-btn-danger:hover { background:rgba(239,68,68,.18); }
.p1-btn-neutral {
  background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.12);
  color:rgba(255,255,255,.5);
}
.p1-btn-neutral:hover { background:rgba(255,255,255,.1);color:#fff; }
.p1-btn-gold {
  background:rgba(255,215,0,.1);border-color:rgba(255,215,0,.3);color:#FFD700;
}
.p1-btn-gold:hover { background:rgba(255,215,0,.2); }
.p1-input {
  width:100%;padding:10px 14px;background:rgba(255,255,255,.04);
  border:1px solid rgba(125,211,252,.2);border-radius:10px;color:#fff;
  font-family:"Instrument Sans",sans-serif;font-size:12px;outline:none;
  box-sizing:border-box;transition:border-color .15s;margin-bottom:10px;
}
.p1-input:focus { border-color:rgba(125,211,252,.5); }
.p1-badge {
  display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
  border-radius:100px;font-family:Syne,sans-serif;font-size:8px;font-weight:800;
  letter-spacing:.08em;
}
.p1-badge-ok { background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);color:#10b981; }
.p1-badge-warn { background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);color:#f59e0b; }
.p1-badge-info { background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.25);color:#7DD3FC; }

/* ══ 2FA ════════════════════════════════════════════════════ */
.p1-qr-wrap {
  display:flex;flex-direction:column;align-items:center;gap:12px;
  padding:20px;background:rgba(255,255,255,.03);
  border-radius:12px;border:1px solid rgba(255,255,255,.08);margin:14px 0;
}
.p1-qr-wrap img { border-radius:8px;border:3px solid #fff; }
.p1-code-display {
  font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;
  color:#7DD3FC;letter-spacing:.18em;background:rgba(125,211,252,.08);
  padding:8px 18px;border-radius:8px;border:1px solid rgba(125,211,252,.2);
  word-break:break-all;text-align:center;
}

/* ══ Factures ══════════════════════════════════════════════ */
.p1-invoice-row {
  display:flex;align-items:center;gap:12px;padding:11px 0;
  border-bottom:1px solid rgba(255,255,255,.05);
}
.p1-invoice-row:last-child { border-bottom:none; }
.p1-invoice-icon {
  width:36px;height:36px;border-radius:9px;flex-shrink:0;
  background:rgba(125,211,252,.08);border:1px solid rgba(125,211,252,.12);
  display:flex;align-items:center;justify-content:center;
  font-size:14px;color:#7DD3FC;
}
.p1-invoice-info { flex:1;min-width:0; }
.p1-invoice-name {
  font-family:Syne,sans-serif;font-size:10px;font-weight:700;
  color:#fff;margin-bottom:2px;
}
.p1-invoice-date { font-size:9px;color:rgba(255,255,255,.35); }
.p1-invoice-amount {
  font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:700;
  color:#10b981;flex-shrink:0;
}

/* ══ Intégration section Paramètres ═══════════════════════ */
#p1-param-inject { margin-top:0; }
  `;
  document.head.appendChild(st);
})();

// ════════════════════════════════════════════════════════════════
//  HELPERS GLOBAUX
// ════════════════════════════════════════════════════════════════

function _p1toast(msg, type = 'ok', dur = 4000) {
  const C = {
    ok:   'border:1px solid rgba(16,185,129,.3);box-shadow:0 8px 32px rgba(16,185,129,.15);',
    warn: 'border:1px solid rgba(245,158,11,.3);box-shadow:0 8px 32px rgba(245,158,11,.15);',
    err:  'border:1px solid rgba(239,68,68,.3);box-shadow:0 8px 32px rgba(239,68,68,.15);',
    info: 'border:1px solid rgba(125,211,252,.3);box-shadow:0 8px 32px rgba(125,211,252,.15);',
  };
  const t = document.createElement('div');
  t.className = 'p1-toast';
  t.style.cssText += C[type] || C.info;
  t.innerHTML = `<div style="display:flex;align-items:flex-start;gap:10px;">
    <div style="flex:1;">${msg}</div>
    <button onclick="this.closest('.p1-toast').remove()"
      style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;font-size:14px;line-height:1;flex-shrink:0;">×</button>
  </div>`;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.style.transform = 'translateX(340px)';
    setTimeout(() => t.remove(), 380);
  }, dur);
}

function _p1confirm(title, body, confirmLabel = 'Confirmer', danger = false) {
  return new Promise(resolve => {
    const o = document.createElement('div');
    o.className = 'p1-modal-overlay';
    o.innerHTML = `
      <div class="p1-modal" style="max-width:380px;">
        <div class="p1-modal-title">${title}</div>
        <div class="p1-modal-sub">${body}</div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="_p1c_no" class="p1-btn p1-btn-neutral">Annuler</button>
          <button id="_p1c_yes" class="p1-btn ${danger ? 'p1-btn-danger' : 'p1-btn-primary'}">${confirmLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.querySelector('#_p1c_no').onclick  = () => { o.remove(); resolve(false); };
    o.querySelector('#_p1c_yes').onclick = () => { o.remove(); resolve(true); };
    o.onclick = e => { if (e.target === o) { o.remove(); resolve(false); } };
  });
}

function _p1getFs() {
  return import('./firebase-firestore.js');
}

async function _p1uid() {
  return window.S?.user?.uid || null;
}

// ════════════════════════════════════════════════════════════════
//  ① ONBOARDING INTERACTIF
//  Checklist flottante · barre de progression · points XP
// ════════════════════════════════════════════════════════════════

const P1_ONBOARDING = (() => {

  const STEPS = [
    { id:'profile',  label:'Compléter votre profil',     icon:'fa-user',            pts:10, action:() => DS_PROFILE?.openDrawer() },
    { id:'analyse',  label:'Lancer votre 1ère analyse',  icon:'fa-microscope',      pts:20, action:() => DS_UPLOAD?.trigger() },
    { id:'chat',     label:'Poser une question à l\'IA', icon:'fa-comments',        pts:15, action:() => window.DS_VIEWS?.navTo('chat') },
    { id:'rapport',  label:'Télécharger un rapport PDF', icon:'fa-file-arrow-down', pts:15, action:() => window.DS_VIEWS?.navTo('rapports') },
    { id:'whatif',   label:'Essayer le simulateur What-If',icon:'fa-sliders',        pts:20, action:() => document.getElementById('wi-sec')?.scrollIntoView({behavior:'smooth'}) },
    { id:'upgrade',  label:'Découvrir les plans Premium', icon:'fa-rocket',          pts:10, action:() => window.DS_PAYMENT?.showPaymentModal(window.S?.abonnement?.plan) },
  ];

  let _done    = new Set();
  let _visible = true;

  function _saveProgress() {
    try { localStorage.setItem('ds_p1_onb', JSON.stringify([..._done])); } catch {}
  }

  function _loadProgress() {
    try {
      const raw = localStorage.getItem('ds_p1_onb');
      if (raw) _done = new Set(JSON.parse(raw));
    } catch {}
  }

  function _totalPts() {
    return STEPS.filter(s => _done.has(s.id)).reduce((a, s) => a + s.pts, 0);
  }

  function _maxPts() {
    return STEPS.reduce((a, s) => a + s.pts, 0);
  }

  function complete(stepId) {
    if (_done.has(stepId)) return;
    _done.add(stepId);
    _saveProgress();
    const step = STEPS.find(s => s.id === stepId);
    if (step) _p1toast(`✅ Étape complétée : <strong>${step.label}</strong> +${step.pts} pts`, 'ok');
    _render();
    // Si tout complété → célébration
    if (_done.size === STEPS.length) {
      setTimeout(_celebrate, 600);
    }
  }

  function _celebrate() {
    const el = document.getElementById('p1-onboarding-bar');
    if (el) {
      el.style.borderColor = 'rgba(255,215,0,.5)';
      el.style.boxShadow   = '0 0 40px rgba(255,215,0,.2)';
    }
    _p1toast('🎉 <strong>Félicitations !</strong> Vous maîtrisez Doctor Smile — 90 pts gagnés !', 'ok', 6000);
    setTimeout(() => { if (el) { el.style.borderColor = ''; el.style.boxShadow = ''; } }, 3000);
  }

  function _render() {
    let bar = document.getElementById('p1-onboarding-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'p1-onboarding-bar';
      document.body.appendChild(bar);
    }

    const done  = _done.size;
    const total = STEPS.length;
    const pct   = Math.round((done / total) * 100);
    const pts   = _totalPts();
    const circumf = 2 * Math.PI * 16;
    const dashOff = circumf * (1 - pct / 100);

    const collapsed = !_visible;

    bar.className = collapsed ? 'collapsed' : '';
    bar.innerHTML = `
      <!-- En-tête cliquable -->
      <div id="p1-ob-header" onclick="P1_ONBOARDING._toggle()">
        <svg id="p1-ob-progress-ring" width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="3"/>
          <circle cx="18" cy="18" r="16" fill="none"
            stroke="${pct === 100 ? '#FFD700' : '#7DD3FC'}" stroke-width="3"
            stroke-dasharray="${circumf}" stroke-dashoffset="${dashOff}"
            stroke-linecap="round" transform="rotate(-90 18 18)"
            style="transition:stroke-dashoffset .6s ease;"/>
          <text x="18" y="22" text-anchor="middle" font-family="Syne,sans-serif"
            font-size="9" font-weight="800"
            fill="${pct === 100 ? '#FFD700' : '#7DD3FC'}">${pct}%</text>
        </svg>
        <div>
          <div id="p1-ob-title">Prise en main</div>
          <div id="p1-ob-sub">${done}/${total} étapes · <span style="color:#FFD700;">${pts} pts</span></div>
        </div>
        <button id="p1-ob-toggle">
          <i class="fa-solid fa-chevron-${collapsed ? 'up' : 'down'}"></i>
        </button>
      </div>

      <!-- Liste des étapes (masquée si collapsed) -->
      ${!collapsed ? `
        ${STEPS.map(s => {
          const isDone = _done.has(s.id);
          return `
          <div class="p1-ob-item${isDone ? ' done' : ''}" onclick="P1_ONBOARDING._clickStep(this.dataset.sid)" data-sid="${s.id}">
            <div class="p1-ob-icon">
              <i class="fa-solid ${isDone ? 'fa-check' : s.icon}"></i>
            </div>
            <div class="p1-ob-label">${s.label}</div>
            <div class="p1-ob-pts">+${s.pts}</div>
          </div>`;
        }).join('')}
        <div id="p1-ob-footer">
          <button id="p1-ob-close-btn" onclick="P1_ONBOARDING.hide(event)">
            Masquer la checklist
          </button>
        </div>
      ` : ''}
    `;
  }

  function _toggle() {
    _visible = !_visible;
    _render();
  }

  function _clickStep(id) {
    const step = STEPS.find(s => s.id === id);
    if (!step) return;
    if (!_done.has(id)) step.action?.();
  }

  function hide(e) {
    e?.stopPropagation();
    document.getElementById('p1-onboarding-bar')?.remove();
    try { localStorage.setItem('ds_p1_onb_hidden', '1'); } catch {}
  }

  async function init() {
    // Ne pas afficher si déjà masqué manuellement
    try { if (localStorage.getItem('ds_p1_onb_hidden') === '1') return; } catch {}

    _loadProgress();

    // Détecter les étapes déjà complétées depuis l'état de l'app
    function _autoDetect() {
      if (window.S?.profile?.prenom || window.S?.user?.displayName) _done.add('profile');
      if (window.S?.analyses?.length > 0)                           _done.add('analyse');
      if (window.S?.chatHistory?.length > 0)                        _done.add('chat');
    }

    // Attendre que S soit prêt
    let tries = 0;
    const wait = setInterval(() => {
      tries++;
      if (tries > 20 || window.S?.user) {
        clearInterval(wait);
        _autoDetect();
        _render();
        _saveProgress();
      }
    }, 400);
  }

  // Hooks automatiques sur les actions du dashboard
  function _attachHooks() {
    // Analyse lancée
    const origLoad = window.DS_DASH?.loadAnalyse;
    if (origLoad && !window.DS_DASH?._p1hooked) {
      window.DS_DASH._p1hooked = true;
      const _orig = origLoad;
      window.DS_DASH.loadAnalyse = function(a) {
        _orig.call(window.DS_DASH, a);
        P1_ONBOARDING.complete('analyse');
      };
    }
    // Chat utilisé
    const origSend = window.DS_CHAT?._sendMsg;
    if (origSend && !window.DS_CHAT?._p1hooked) {
      window.DS_CHAT._p1hooked = true;
      const _orig2 = origSend;
      window.DS_CHAT._sendMsg = function(cid) {
        P1_ONBOARDING.complete('chat');
        return _orig2.call(window.DS_CHAT, cid);
      };
    }
    // Rapport téléchargé
    const origDL = window.DS?.downloadReport;
    if (origDL && !window.DS?._p1dl) {
      window.DS._p1dl = true;
      const _orig3 = origDL;
      window.DS.downloadReport = function(...a) {
        P1_ONBOARDING.complete('rapport');
        return _orig3.call(window.DS, ...a);
      };
    }
  }

  return { init, complete, hide, _toggle, _clickStep };
})();

window.P1_ONBOARDING = P1_ONBOARDING;

// ════════════════════════════════════════════════════════════════
//  ② EMAILS TRANSACTIONNELS
//  Appels au backend FastAPI qui envoie les emails via Resend/SendGrid
// ════════════════════════════════════════════════════════════════

const P1_EMAIL = (() => {

  const BASE = window.API_BASE || 'http://127.0.0.1:8000';

  async function _post(endpoint, body) {
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const r = await fetchWithAuth(`${BASE}/email/${endpoint}`, {
        method: 'POST',
        body:   JSON.stringify(body),
      });
      return r.ok;
    } catch (e) {
      console.warn('[P1 Email]', endpoint, e);
      return false;
    }
  }

  // Email de bienvenue (appelé après 1er login)
  async function sendWelcome() {
    const uid  = await _p1uid(); if (!uid) return;
    const name = window.S?.profile?.prenom || window.S?.user?.displayName?.split(' ')[0] || 'là';
    const sent = await _post('welcome', { uid, name });
    if (sent) {
      console.info('[P1 Email] Welcome envoyé');
      try { localStorage.setItem(`ds_welcome_sent_${uid}`, '1'); } catch {}
    }
  }

  // Email "analyse prête"
  async function sendAnalyseReady(analyse) {
    const uid = await _p1uid(); if (!uid) return;
    await _post('analyse-ready', {
      uid,
      entreprise: analyse.entreprise || 'votre entreprise',
      score:      analyse.score,
      zone:       analyse.zone,
      analyseId:  analyse.id,
    });
  }

  // Email de relance (appelé si inactif depuis 7j — logique backend)
  async function scheduleRelance() {
    const uid = await _p1uid(); if (!uid) return;
    await _post('schedule-relance', { uid, lastActivityAt: new Date().toISOString() });
  }

  // Vérification email (lien de vérification Firebase)
  async function sendVerificationEmail() {
    try {
      const { auth } = await import('./firebase-config.js');
      const user = auth.currentUser;
      if (!user || user.emailVerified) return;
      const { sendEmailVerification } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      await sendEmailVerification(user);
      _p1toast('📧 Email de vérification envoyé à <strong>' + user.email + '</strong>', 'info');
    } catch (e) {
      console.warn('[P1 Email] sendVerificationEmail:', e);
    }
  }

  async function checkWelcomeSent() {
    const uid = await _p1uid(); if (!uid) return;
    const key = `ds_welcome_sent_${uid}`;
    try {
      if (!localStorage.getItem(key)) {
        // Attendre 2s que S.profile soit chargé
        setTimeout(sendWelcome, 2000);
      }
    } catch {}
  }

  return { sendWelcome, sendAnalyseReady, scheduleRelance, sendVerificationEmail, checkWelcomeSent };
})();

window.P1_EMAIL = P1_EMAIL;

// ════════════════════════════════════════════════════════════════
//  ③ PAGE MON ABONNEMENT
//  Factures · Annulation · Upgrade · Portail Stripe
// ════════════════════════════════════════════════════════════════

const P1_BILLING = (() => {

  async function openModal() {
    document.getElementById('_p1_billing_modal')?.remove();

    const plan    = window.S?.abonnement?.plan || 'standard';
    const planLbl = { standard:'Standard', premium:'Premium', extra:'Extra' }[plan] ?? plan;
    const priceMap = { standard:0, premium:79, extra:159 };
    const price    = priceMap[plan] ?? 0;
    const nextDate = _nextBillingDate();

    // Charger les factures depuis Firestore
    const invoices = await _loadInvoices();

    const overlay = document.createElement('div');
    overlay.className = 'p1-modal-overlay';
    overlay.id        = '_p1_billing_modal';

    overlay.innerHTML = `
      <div class="p1-modal" style="max-width:520px;">
        <!-- En-tête -->
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;">
          <div class="p1-modal-title">
            <div style="width:38px;height:38px;border-radius:10px;
              background:rgba(255,215,0,.1);border:1px solid rgba(255,215,0,.2);
              display:flex;align-items:center;justify-content:center;font-size:16px;">💳</div>
            Mon Abonnement
          </div>
          <button onclick="document.getElementById('_p1_billing_modal').remove()"
            class="p1-btn p1-btn-neutral" style="padding:6px 12px;">✕</button>
        </div>

        <!-- Plan actuel -->
        <div style="padding:18px;border-radius:14px;
          background:rgba(${plan==='extra'?'167,139,250':plan==='premium'?'255,215,0':'125,211,252'},.06);
          border:1px solid rgba(${plan==='extra'?'167,139,250':plan==='premium'?'255,215,0':'125,211,252'},.2);
          margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-family:Syne,sans-serif;font-size:13px;font-weight:900;color:#fff;
                margin-bottom:4px;">Plan ${planLbl}</div>
              <div style="font-size:10px;color:rgba(255,255,255,.4);">
                ${price > 0 ? `${price}€/mois · Prochain prélèvement : ${nextDate}` : 'Gratuit — aucun prélèvement'}
              </div>
            </div>
            <div style="font-family:"JetBrains Mono",monospace;font-size:26px;font-weight:800;
              color:${plan==='extra'?'#a78bfa':plan==='premium'?'#FFD700':'#7DD3FC'};">
              ${price > 0 ? price+'€' : '0€'}
            </div>
          </div>
          ${plan !== 'extra' ? `
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.07);">
            <button onclick="window.DS_PAYMENT?.showPaymentModal(this.dataset.plan);document.getElementById('_p1_billing_modal')?.remove()" data-plan="${plan}"
              class="p1-btn p1-btn-gold" style="width:100%;justify-content:center;display:flex;gap:6px;">
              <i class="fa-solid fa-rocket"></i>
              Passer ${plan === 'standard' ? 'Premium · 79€/mois' : 'Extra · 159€/mois'}
            </button>
          </div>` : ''}
        </div>

        <!-- Usage ce mois -->
        <div class="p1-section-title">UTILISATION CE MOIS</div>
        <div id="_p1_usage_wrap">
          ${_renderUsage(plan)}
        </div>

        <!-- Factures -->
        <div class="p1-section-title" style="margin-top:20px;">HISTORIQUE DES PAIEMENTS</div>
        <div id="_p1_invoices_wrap">
          ${invoices.length ? invoices.map(inv => `
            <div class="p1-invoice-row">
              <div class="p1-invoice-icon"><i class="fa-solid fa-receipt"></i></div>
              <div class="p1-invoice-info">
                <div class="p1-invoice-name">Plan ${inv.plan}</div>
                <div class="p1-invoice-date">${inv.date}</div>
              </div>
              <div class="p1-invoice-amount">${inv.amount}€</div>
              ${inv.url ? `<a href="${inv.url}" target="_blank" class="p1-btn p1-btn-neutral"
                style="padding:5px 10px;text-decoration:none;font-size:8px;">
                <i class="fa-solid fa-download"></i>
              </a>` : ''}
            </div>
          `).join('') : `
            <div style="padding:20px;text-align:center;font-size:10px;color:rgba(255,255,255,.2);">
              <i class="fa-solid fa-receipt" style="font-size:22px;display:block;margin-bottom:8px;opacity:.2;"></i>
              Aucun paiement enregistré
            </div>`}
        </div>

        <!-- Portail Stripe + Annulation -->
        ${plan !== 'standard' ? `
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06);">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button onclick="P1_BILLING.openStripePortal()"
              class="p1-btn p1-btn-neutral" style="justify-content:center;display:flex;gap:6px;">
              <i class="fa-solid fa-arrow-up-right-from-square"></i>
              Gérer sur Stripe
            </button>
            <button onclick="P1_BILLING.cancelSubscription()"
              class="p1-btn p1-btn-danger" style="justify-content:center;display:flex;gap:6px;">
              <i class="fa-solid fa-ban"></i>
              Annuler l'abonnement
            </button>
          </div>
        </div>` : ''}
      </div>
    `;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  function _renderUsage(plan) {
    const analyses = window.S?.analyses?.length || 0;
    const limits   = { standard:5, premium:50, extra:999 };
    const limit    = limits[plan] ?? 5;
    const pct      = limit === 999 ? 100 : Math.min(100, Math.round((analyses / limit) * 100));
    const col      = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';
    const label    = limit === 999 ? 'Illimité' : `${analyses} / ${limit}`;

    return `
      <div class="p1-row" style="flex-direction:column;align-items:flex-start;gap:8px;border-bottom:none;">
        <div style="display:flex;justify-content:space-between;width:100%;">
          <span style="font-size:10px;color:rgba(255,255,255,.6);">Analyses réalisées</span>
          <span style="font-family:"JetBrains Mono",monospace;font-size:11px;color:${col};font-weight:700;">${label}</span>
        </div>
        <div style="width:100%;height:5px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:3px;transition:width .8s;"></div>
        </div>
        ${pct > 80 && limit !== 999 ? `
          <div style="font-size:9px;color:#f59e0b;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i>
            Vous approchez de votre limite mensuelle
          </div>` : ''}
      </div>`;
  }

  async function _loadInvoices() {
    try {
      const uid = await _p1uid(); if (!uid) return [];
      const fs  = await _p1getFs();
      const snap = await fs.getPaymentEvents?.(uid) || [];
      return snap.slice(0, 6).map(e => ({
        plan:   e.plan,
        date:   new Date(e.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('fr-FR'),
        amount: { premium:79, extra:159 }[e.plan] || 0,
        url:    e.invoiceUrl || null,
      }));
    } catch { return []; }
  }

  async function openStripePortal() {
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const resp = await fetchWithAuth(`${BASE}/payment/portal`, { method:'POST' });
      if (resp.ok) {
        const { url } = await resp.json();
        window.open(url, '_blank');
      } else {
        _p1toast('Portail Stripe indisponible. Contactez le support.', 'warn');
      }
    } catch {
      _p1toast('Contactez support@doctorsmile.io pour gérer votre abonnement.', 'info');
    }
  }

  async function cancelSubscription() {
    const ok = await _p1confirm(
      '⚠️ Annuler votre abonnement ?',
      `Votre plan restera actif jusqu'à la fin de la période en cours.
       Après cette date, vous passerez automatiquement au plan Gratuit.
       Vous pouvez vous réabonner à tout moment.`,
      'Confirmer l\'annulation',
      true
    );
    if (!ok) return;

    try {
      const { fetchWithAuth } = await import('./utils.js');
      const BASE = window.API_BASE || 'http://127.0.0.1:8000';
      const resp = await fetchWithAuth(`${BASE}/payment/cancel`, { method:'POST' });
      if (resp.ok) {
        _p1toast('✓ Abonnement annulé. Actif jusqu\'à fin de période.', 'warn', 6000);
        document.getElementById('_p1_billing_modal')?.remove();
      } else {
        _p1toast('Erreur lors de l\'annulation. Réessayez.', 'err');
      }
    } catch {
      _p1toast('Contactez support@doctorsmile.io pour annuler.', 'info');
    }
  }

  function _nextBillingDate() {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  }

  return { openModal, openStripePortal, cancelSubscription };
})();

window.P1_BILLING = P1_BILLING;

// ════════════════════════════════════════════════════════════════
//  ④ 2FA — Authentification à deux facteurs (TOTP Firebase)
//  Génère un QR code · Vérifie le code · Active/Désactive
// ════════════════════════════════════════════════════════════════

const P1_2FA = (() => {

  async function getStatus() {
    try {
      const { auth } = await import('./firebase-config.js');
      const user = auth.currentUser;
      if (!user) return { enabled: false };
      const factors = user.multiFactor?.enrolledFactors || [];
      return {
        enabled: factors.length > 0,
        factors: factors.map(f => ({ uid: f.uid, displayName: f.displayName, type: f.factorId })),
      };
    } catch { return { enabled: false, factors: [] }; }
  }

  async function openSetupModal() {
    document.getElementById('_p1_2fa_modal')?.remove();
    const status = await getStatus();

    const overlay = document.createElement('div');
    overlay.className = 'p1-modal-overlay';
    overlay.id        = '_p1_2fa_modal';
    overlay.innerHTML = `
      <div class="p1-modal" style="max-width:440px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div class="p1-modal-title">
            <div style="width:38px;height:38px;border-radius:10px;
              background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.2);
              display:flex;align-items:center;justify-content:center;font-size:16px;">🔐</div>
            Double authentification
          </div>
          <button onclick="document.getElementById('_p1_2fa_modal').remove()"
            class="p1-btn p1-btn-neutral" style="padding:6px 12px;">✕</button>
        </div>

        ${status.enabled ? _renderEnabled(status) : _renderSetup()}
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  function _renderEnabled(status) {
    return `
      <div style="padding:16px;border-radius:12px;background:rgba(16,185,129,.06);
        border:1px solid rgba(16,185,129,.2);margin-bottom:20px;
        display:flex;align-items:center;gap:12px;">
        <i class="fa-solid fa-shield-check" style="font-size:22px;color:#10b981;"></i>
        <div>
          <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:800;color:#10b981;">
            2FA activé</div>
          <div style="font-size:9px;color:rgba(255,255,255,.4);margin-top:2px;">
            ${status.factors.map(f => f.displayName || 'Application Authenticator').join(', ')}
          </div>
        </div>
      </div>
      <p style="font-size:10px;color:rgba(255,255,255,.5);line-height:1.7;margin-bottom:20px;">
        Votre compte est protégé. À chaque connexion, un code temporaire vous sera demandé
        en plus de votre mot de passe.
      </p>
      <button onclick="P1_2FA._disable()"
        class="p1-btn p1-btn-danger" style="width:100%;justify-content:center;display:flex;gap:8px;">
        <i class="fa-solid fa-shield-xmark"></i>
        Désactiver le 2FA
      </button>`;
  }

  function _renderSetup() {
    return `
      <div style="padding:14px;border-radius:12px;background:rgba(245,158,11,.05);
        border:1px solid rgba(245,158,11,.2);margin-bottom:18px;
        display:flex;align-items:flex-start;gap:10px;">
        <i class="fa-solid fa-triangle-exclamation" style="color:#f59e0b;font-size:14px;margin-top:2px;flex-shrink:0;"></i>
        <p style="font-size:9px;color:rgba(255,255,255,.5);line-height:1.65;margin:0;">
          Le 2FA ajoute une couche de sécurité essentielle. Sans lui, votre compte peut être
          compromis même si votre mot de passe est volé.
        </p>
      </div>

      <div class="p1-section-title">ÉTAPES D'ACTIVATION</div>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${[
          { n:1, t:'Installez une app Authenticator',
            d:'Google Authenticator, Authy, ou Microsoft Authenticator' },
          { n:2, t:'Entrez votre numéro de téléphone',
            d:'Pour recevoir le SMS de vérification initial' },
          { n:3, t:'Scannez le QR code',
            d:'L\'app génère un code à 6 chiffres toutes les 30s' },
        ].map(s => `
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="width:24px;height:24px;border-radius:50%;background:rgba(167,139,250,.12);
              border:1px solid rgba(167,139,250,.25);display:flex;align-items:center;
              justify-content:center;font-family:Syne,sans-serif;font-size:9px;
              font-weight:900;color:#a78bfa;flex-shrink:0;">${s.n}</div>
            <div>
              <div style="font-size:10px;color:#fff;font-family:Syne,sans-serif;font-weight:700;">
                ${s.t}</div>
              <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;">${s.d}</div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Input téléphone -->
      <div class="p1-section-title">VOTRE NUMÉRO</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <input id="_p1_2fa_phone" class="p1-input" style="margin-bottom:0;"
          type="tel" placeholder="+237 6XX XXX XXX"
          value="${window.S?.profile?.phone || ''}"/>
        <div id="recaptcha-2fa" style="display:none;"></div>
      </div>

      <button onclick="P1_2FA._startEnrollment()"
        class="p1-btn p1-btn-primary" id="_p1_2fa_start_btn"
        style="width:100%;justify-content:center;display:flex;gap:8px;padding:12px;">
        <i class="fa-solid fa-shield-plus"></i>
        Activer le 2FA →
      </button>`;
  }

  async function _startEnrollment() {
    const phone = document.getElementById('_p1_2fa_phone')?.value?.trim();
    if (!phone) {
      _p1toast('Entrez un numéro de téléphone valide', 'warn'); return;
    }

    const btn = document.getElementById('_p1_2fa_start_btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi SMS…'; }

    try {
      const { auth } = await import('./firebase-config.js');
      const { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator,
              RecaptchaVerifier } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

      // RecaptchaVerifier invisible
      if (!window._p1Recaptcha) {
        window._p1Recaptcha = new RecaptchaVerifier(auth, 'recaptcha-2fa', { size: 'invisible' });
        await window._p1Recaptcha.render();
      }

      const user    = auth.currentUser;
      const session = await multiFactor(user).getSession();
      const opts    = { phoneNumber: phone, session };
      const pap     = new PhoneAuthProvider(auth);
      const vid     = await pap.verifyPhoneNumber(opts, window._p1Recaptcha);

      // Afficher input code SMS
      const modal = document.querySelector('#_p1_2fa_modal .p1-modal');
      if (modal) {
        modal.innerHTML += `
          <div id="_p1_2fa_verify_wrap" style="margin-top:16px;">
            <div class="p1-section-title">CODE REÇU PAR SMS</div>
            <input id="_p1_2fa_code" class="p1-input" type="text" maxlength="6"
              placeholder="Code à 6 chiffres" style="letter-spacing:.2em;text-align:center;font-size:16px;"/>
            <button onclick="P1_2FA._finishEnrollment(this.dataset.vid)" data-vid="${vid}"
              class="p1-btn p1-btn-primary"
              style="width:100%;justify-content:center;display:flex;gap:8px;padding:12px;">
              <i class="fa-solid fa-check"></i>Vérifier et activer
            </button>
          </div>`;
      }
      _p1toast('📱 SMS envoyé à ' + phone, 'info');
    } catch (e) {
      console.error('[2FA]', e);
      _p1toast('Erreur : ' + (e.message || 'Impossible d\'envoyer le SMS'), 'err');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-shield-plus"></i> Activer le 2FA →'; }
    }
  }

  async function _finishEnrollment(verificationId) {
    const code = document.getElementById('_p1_2fa_code')?.value?.trim();
    if (!code || code.length < 6) { _p1toast('Code invalide', 'warn'); return; }

    try {
      const { auth } = await import('./firebase-config.js');
      const { multiFactor, PhoneAuthCredential, PhoneMultiFactorGenerator,
              PhoneAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

      const cred   = PhoneAuthProvider.credential(verificationId, code);
      const factor = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(auth.currentUser).enroll(factor, 'Téléphone');

      document.getElementById('_p1_2fa_modal')?.remove();
      _p1toast('🔐 2FA activé avec succès ! Votre compte est maintenant sécurisé.', 'ok', 5000);
      P1_ONBOARDING.complete('security');
    } catch (e) {
      console.error('[2FA finish]', e);
      _p1toast('Code incorrect. Réessayez.', 'err');
    }
  }

  async function _disable() {
    const ok = await _p1confirm(
      'Désactiver le 2FA ?',
      'Votre compte sera moins sécurisé. Confirmez-vous cette action ?',
      'Désactiver', true
    );
    if (!ok) return;
    try {
      const { auth } = await import('./firebase-config.js');
      const { multiFactor } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
      const mfa     = multiFactor(auth.currentUser);
      const factors = mfa.enrolledFactors;
      if (factors.length) await mfa.unenroll(factors[0]);
      document.getElementById('_p1_2fa_modal')?.remove();
      _p1toast('2FA désactivé.', 'warn');
    } catch (e) {
      _p1toast('Erreur : ' + e.message, 'err');
    }
  }

  return { getStatus, openSetupModal, _startEnrollment, _finishEnrollment, _disable };
})();

window.P1_2FA = P1_2FA;

// ════════════════════════════════════════════════════════════════
//  ⑤ EXPORT RGPD
//  Toutes les données personnelles en JSON · Droit à l'effacement
// ════════════════════════════════════════════════════════════════

const P1_RGPD = (() => {

  async function openModal() {
    document.getElementById('_p1_rgpd_modal')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'p1-modal-overlay';
    overlay.id        = '_p1_rgpd_modal';
    overlay.innerHTML = `
      <div class="p1-modal" style="max-width:480px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <div class="p1-modal-title">
            <div style="width:38px;height:38px;border-radius:10px;
              background:rgba(125,211,252,.1);border:1px solid rgba(125,211,252,.2);
              display:flex;align-items:center;justify-content:center;font-size:16px;">🛡️</div>
            Vos données personnelles
          </div>
          <button onclick="document.getElementById('_p1_rgpd_modal').remove()"
            class="p1-btn p1-btn-neutral" style="padding:6px 12px;">✕</button>
        </div>

        <div style="padding:14px;background:rgba(125,211,252,.04);border-radius:10px;
          border:1px solid rgba(125,211,252,.12);margin-bottom:20px;
          font-size:10px;color:rgba(255,255,255,.55);line-height:1.7;">
          Conformément au <strong style="color:#7DD3FC;">Règlement Général sur la Protection des Données (RGPD)</strong>,
          vous avez le droit d'accéder à vos données, de les exporter et de demander leur suppression.
        </div>

        <div class="p1-section-title">DONNÉES COLLECTÉES</div>
        ${[
          ['Profil',            'Prénom, nom, email, photo de profil'],
          ['Analyses ML',       'Fichiers soumis, ratios calculés, scores, recommandations'],
          ['Conversations IA',  'Historique des messages avec l\'IA'],
          ['Paiements',         'Historique des transactions (sans données de carte)'],
          ['Notifications',     'Alertes et notifications système'],
        ].map(([k,v]) => `
          <div class="p1-row">
            <div class="p1-row-label"><strong>${k}</strong><small>${v}</small></div>
            <span class="p1-badge p1-badge-info">Stocké</span>
          </div>`).join('')}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:20px;">
          <button onclick="P1_RGPD.exportData()"
            class="p1-btn p1-btn-primary" id="_p1_export_btn"
            style="justify-content:center;display:flex;gap:6px;padding:12px;">
            <i class="fa-solid fa-download"></i>
            Exporter mes données
          </button>
          <button onclick="P1_RGPD.requestDeletion()"
            class="p1-btn p1-btn-danger"
            style="justify-content:center;display:flex;gap:6px;padding:12px;">
            <i class="fa-solid fa-trash-can"></i>
            Supprimer mon compte
          </button>
        </div>

        <div style="margin-top:14px;font-size:9px;color:rgba(255,255,255,.2);text-align:center;line-height:1.6;">
          Doctor Smile · DPO : privacy@doctorsmile.io<br>
          Délai de réponse : 30 jours maximum (RGPD Art. 12)
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  async function exportData() {
    const btn = document.getElementById('_p1_export_btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Collecte…'; }

    try {
      const uid  = await _p1uid();
      const user = window.S?.user;

      // Collecter toutes les données
      const data = {
        _meta: {
          exportedAt:  new Date().toISOString(),
          exportedBy:  'Doctor Smile™ — Conformité RGPD',
          regulation:  'RGPD / GDPR Art. 20 — Droit à la portabilité',
          userId:      uid,
          version:     '1.0',
        },
        profile: {
          uid:         uid,
          email:       user?.email || null,
          displayName: user?.displayName || null,
          prenom:      window.S?.profile?.prenom || null,
          nom:         window.S?.profile?.nom    || null,
          plan:        window.S?.abonnement?.plan || 'standard',
          createdAt:   user?.metadata?.creationTime || null,
          lastLogin:   user?.metadata?.lastSignInTime || null,
          provider:    user?.providerData?.[0]?.providerId || null,
        },
        analyses: (window.S?.analyses || []).map(a => ({
          id:          a.id,
          entreprise:  a.entreprise,
          score:       a.score,
          zone:        a.zone,
          createdAt:   a.createdAt,
          model:       a.model,
          plan:        a.plan,
          ratios:      a.ratios,
        })),
        conversations: (window.DS_CHAT?._convCache || []).map(c => ({
          id:          c.id,
          name:        c.name,
          analyseId:   c.analyseId,
          msgCount:    c.msgCount,
          createdAt:   c.createdAt,
        })),
        preferences: {
          theme:     localStorage.getItem('ds_theme') || 'dark',
          lang:      localStorage.getItem('ds_lang')  || 'fr',
          onboarding: JSON.parse(localStorage.getItem('ds_p1_onb') || '[]'),
        },
      };

      // Télécharger en JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `doctorsmile-mes-donnees-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      _p1toast('✅ Export téléchargé — <strong>' + Object.keys(data).length + ' sections</strong> exportées', 'ok', 5000);
    } catch (e) {
      console.error('[RGPD export]', e);
      _p1toast('Erreur lors de l\'export. Réessayez.', 'err');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-download"></i> Exporter mes données'; }
    }
  }

  async function requestDeletion() {
    const ok = await _p1confirm(
      '🗑️ Supprimer votre compte ?',
      `<strong style="color:#ef4444;">Cette action est irréversible.</strong><br><br>
       Toutes vos analyses, conversations et données personnelles seront
       définitivement supprimées dans un délai de 30 jours.<br><br>
       Votre abonnement sera annulé immédiatement.`,
      'Demander la suppression',
      true
    );
    if (!ok) return;

    try {
      const { fetchWithAuth } = await import('./utils.js');
      const BASE = window.API_BASE || 'http://127.0.0.1:8000';
      await fetchWithAuth(`${BASE}/rgpd/delete-request`, { method:'POST' }).catch(() => {});

      // Enregistrer localement la demande
      const uid = await _p1uid();
      try { localStorage.setItem(`ds_delete_req_${uid}`, new Date().toISOString()); } catch {}

      document.getElementById('_p1_rgpd_modal')?.remove();
      _p1toast(
        '📧 Demande de suppression enregistrée. Vous recevrez un email de confirmation sous 48h.',
        'warn', 8000
      );

      // Déconnecter après 3s
      setTimeout(() => window.DS_PROFILE?.logout?.(), 3000);
    } catch (e) {
      _p1toast('Contactez privacy@doctorsmile.io pour demander la suppression.', 'info', 7000);
    }
  }

  return { openModal, exportData, requestDeletion };
})();

window.P1_RGPD = P1_RGPD;

// ════════════════════════════════════════════════════════════════
//  INTÉGRATION DANS DS_VIEWS.renderParametres
//  Injecte les nouvelles sections dans la page Paramètres
// ════════════════════════════════════════════════════════════════

function _injectParamSections() {
  const container = document.getElementById('parametres-content');
  if (!container || document.getElementById('p1-param-inject')) return;

  const wrap = document.createElement('div');
  wrap.id = 'p1-param-inject';

  const plan         = window.S?.abonnement?.plan || 'standard';
  const planLbl      = { standard:'Standard', premium:'Premium', extra:'Extra' }[plan] ?? plan;
  const isGoogle     = window.S?.user?.providerData?.[0]?.providerId === 'google.com';
  const emailVerif   = window.S?.user?.emailVerified;
  const analyses     = window.S?.analyses?.length || 0;
  const limits       = { standard:5, premium:50, extra:999 };
  const limit        = limits[plan] ?? 5;
  const usagePct     = limit === 999 ? 0 : Math.round((analyses / limit) * 100);
  const usageCol     = usagePct > 80 ? '#ef4444' : usagePct > 60 ? '#f59e0b' : '#10b981';

  wrap.innerHTML = `

    <!-- ═══ ABONNEMENT COMPLET ═══════════════════════════════════ -->
    <div class="param-section" style="border-color:rgba(255,215,0,.1);">
      <div class="param-section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>💳 Abonnement &amp; Facturation</span>
        <button onclick="P1_BILLING.openModal()"
          class="p1-btn p1-btn-neutral" style="font-size:8px;padding:4px 10px;">
          Gérer →
        </button>
      </div>
      <div class="param-row">
        <div class="param-label">Plan actuel<small>Détermine vos fonctionnalités</small></div>
        <div class="param-value">
          <span class="badge ${plan}" style="font-size:9px;">${planLbl}</span>
          ${plan !== 'extra' ? `
          <button onclick="window.DS_PAYMENT?.showPaymentModal(this.dataset.plan)" data-plan="${plan}"
            style="margin-left:8px;padding:3px 10px;border-radius:6px;font-family:Syne,sans-serif;
            font-size:8px;font-weight:800;background:rgba(255,215,0,.1);
            border:1px solid rgba(255,215,0,.25);color:#FFD700;cursor:pointer;">
            Upgrader
          </button>` : ''}
        </div>
      </div>
      <div class="param-row" style="flex-direction:column;align-items:flex-start;gap:6px;">
        <div style="display:flex;justify-content:space-between;width:100%;">
          <div class="param-label" style="border:none;padding:0;">Analyses ce mois</div>
          <span style="font-family:"JetBrains Mono",monospace;font-size:11px;
            color:${usageCol};font-weight:700;">
            ${limit === 999 ? '∞ illimitées' : analyses + ' / ' + limit}
          </span>
        </div>
        ${limit !== 999 ? `
        <div style="width:100%;height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;">
          <div style="width:${usagePct}%;height:100%;background:${usageCol};border-radius:2px;"></div>
        </div>` : ''}
      </div>
      ${plan !== 'standard' ? `
      <div class="param-row">
        <div class="param-label">Prochain prélèvement<small>Renouvellement automatique</small></div>
        <div class="param-value" style="font-family:"JetBrains Mono",monospace;font-size:10px;">
          ${new Date(new Date().setMonth(new Date().getMonth()+1)).toLocaleDateString('fr-FR')}
        </div>
      </div>` : ''}
    </div>

    <!-- ═══ SÉCURITÉ AVANCÉE ════════════════════════════════════ -->
    <div class="param-section">
      <div class="param-section-title">🔐 Sécurité avancée</div>

      <!-- Vérification email -->
      <div class="param-row">
        <div class="param-label">
          Email vérifié
          <small>${window.S?.user?.email || '—'}</small>
        </div>
        <div class="param-value" style="display:flex;align-items:center;gap:8px;">
          ${emailVerif
            ? `<span class="p1-badge p1-badge-ok"><i class="fa-solid fa-check"></i> Vérifié</span>`
            : `<span class="p1-badge p1-badge-warn"><i class="fa-solid fa-exclamation"></i> Non vérifié</span>
               <button onclick="P1_EMAIL.sendVerificationEmail()" class="p1-btn p1-btn-neutral" style="font-size:8px;padding:4px 10px;">
                 Renvoyer
               </button>`}
        </div>
      </div>

      <!-- 2FA -->
      <div class="param-row" id="p1-2fa-row">
        <div class="param-label">
          Double authentification (2FA)
          <small>Sécurisez votre connexion avec un code SMS</small>
        </div>
        <div class="param-value" id="p1-2fa-status">
          <span style="font-size:10px;color:rgba(255,255,255,.25);">Vérification…</span>
        </div>
      </div>

      <!-- Mot de passe -->
      ${!isGoogle ? `
      <div class="param-row">
        <div class="param-label">Mot de passe<small>Connexion Email / Mot de passe</small></div>
        <button onclick="DS_PROFILE?.sendResetEmail?.()" class="p1-btn p1-btn-neutral" style="font-size:8px;padding:6px 12px;">
          <i class="fa-solid fa-key" style="margin-right:4px;"></i>Réinitialiser
        </button>
      </div>` : ''}

      <!-- Sessions actives -->
      <div class="param-row">
        <div class="param-label">Sessions actives<small>Appareils connectés à votre compte</small></div>
        <button onclick="P1_SECURITY.openSessionsModal()"
          class="p1-btn p1-btn-neutral" style="font-size:8px;padding:6px 12px;">
          <i class="fa-solid fa-mobile-screen" style="margin-right:4px;"></i>Voir
        </button>
      </div>
    </div>

    <!-- ═══ CONFIDENTIALITÉ & RGPD ══════════════════════════════ -->
    <div class="param-section">
      <div class="param-section-title">🛡️ Confidentialité &amp; RGPD</div>
      <div class="param-row">
        <div class="param-label">
          Mes données personnelles
          <small>Export, portabilité, droit à l'oubli</small>
        </div>
        <button onclick="P1_RGPD.openModal()" class="p1-btn p1-btn-primary" style="font-size:8px;padding:6px 12px;">
          <i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i>Gérer
        </button>
      </div>
      <div class="param-row">
        <div class="param-label">
          Politique de confidentialité
          <small>Dernière mise à jour : janvier 2025</small>
        </div>
        <a href="/privacy.html" target="_blank" class="p1-btn p1-btn-neutral"
          style="font-size:8px;padding:6px 12px;text-decoration:none;">
          <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right:4px;"></i>Lire
        </a>
      </div>
      <div class="param-row" style="border-bottom:none;">
        <div class="param-label">
          Supprimer mon compte
          <small>Suppression définitive dans 30 jours</small>
        </div>
        <button onclick="P1_RGPD.requestDeletion()" class="p1-btn p1-btn-danger" style="font-size:8px;padding:6px 12px;">
          <i class="fa-solid fa-trash-can" style="margin-right:4px;"></i>Supprimer
        </button>
      </div>
    </div>
  `;

  // Injecter la section Agent IA de manière asynchrone
  P1_AGENT.renderParamSection().then(agentHTML => {
    const agentDiv = document.createElement('div');
    agentDiv.id = 'p1-agent-section';
    agentDiv.innerHTML = agentHTML;
    wrap.insertBefore(agentDiv, wrap.firstChild); // en premier
  });

  container.appendChild(wrap);

  // Vérifier le statut 2FA de manière asynchrone
  P1_2FA.getStatus().then(status => {
    const el = document.getElementById('p1-2fa-status');
    if (!el) return;
    if (status.enabled) {
      el.innerHTML = `
        <span class="p1-badge p1-badge-ok"><i class="fa-solid fa-shield-check"></i> Actif</span>
        <button onclick="P1_2FA.openSetupModal()" class="p1-btn p1-btn-neutral"
          style="font-size:8px;padding:4px 10px;margin-left:6px;">Gérer</button>`;
    } else {
      el.innerHTML = `
        <span class="p1-badge p1-badge-warn"><i class="fa-solid fa-shield-xmark"></i> Inactif</span>
        <button onclick="P1_2FA.openSetupModal()" class="p1-btn p1-btn-primary"
          style="font-size:8px;padding:4px 10px;margin-left:6px;">Activer</button>`;
    }
  });
}


// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  ⑥  P1_AGENT — Agent IA Autonome Doctor Smile
//  ─────────────────────────────────────────────────────────────
//  Capacités actives :
//    A. Surveillance des tendances (pente de score sur historique)
//    B. Simulation What-If automatique post-analyse
//    C. Benchmarking automatique vs pairs sectoriels
//    D. Suivi des recommandations appliquées (impact mesuré)
//    E. Règles d'alerte personnalisées (seuils utilisateur)
//    F. Rapport hebdomadaire déclenché au login du lundi
//    G. Actions sur commande naturelle depuis le chat
//    H. Panel de contrôle dans les Paramètres
//  ─────────────────────────────────────────────────────────────
//  Données Firestore utilisées :
//    agent_rules/{uid}         règles de surveillance perso
//    agent_memory/{uid}        mémoire des simulations & impacts
//    agent_reports/{uid}/last  dernier rapport hebdo mis en cache
//  ─────────────────────────────────────────────────────────────
//  Aucune dépendance externe. Fonctionne avec le dashboard existant.
// ════════════════════════════════════════════════════════════════

const P1_AGENT = (() => {
  'use strict';

  // ── Helpers internes ─────────────────────────────────────────
  const _uid  = () => window.S?.user?.uid ?? null;
  const _prof = () => window.S?.profile ?? {};
  const _plan = () => window.S?.abonnement?.plan ?? 'standard';
  const _now  = () => Date.now();
  const _fmt  = d => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' });
  const _fmtN = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n);
  const _BASE = () => window.API_BASE || 'http://127.0.0.1:8000';

  // Couleurs zones
  const ZC = {
    saine:     { col: '#10b981', bg: 'rgba(16,185,129,.12)',   label: 'Zone Saine'     },
    vigilance: { col: '#f59e0b', bg: 'rgba(245,158,11,.12)',   label: 'Zone Vigilance' },
    risque:    { col: '#f97316', bg: 'rgba(249,115,22,.12)',   label: 'Zone Risque'    },
    critique:  { col: '#ef4444', bg: 'rgba(239,68,68,.12)',    label: 'Zone Critique'  },
  };
  const _zoneOf = s => s >= 75 ? 'saine' : s >= 50 ? 'vigilance' : s >= 25 ? 'risque' : 'critique';

  // ── Accès Firestore ──────────────────────────────────────────
  async function _fs() {
    const { db, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, limit }
      = await import('./firebase-firestore.js');
    return { db, doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, orderBy, limit };
  }

  async function _fsGet(path) {
    try {
      const { db, doc, getDoc } = await _fs();
      const snap = await getDoc(doc(db, ...path.split('/')));
      return snap.exists() ? snap.data() : null;
    } catch { return null; }
  }

  async function _fsSet(path, data, merge = true) {
    try {
      const { db, doc, setDoc } = await _fs();
      await setDoc(doc(db, ...path.split('/')), data, { merge });
    } catch (e) { console.warn('[P1_AGENT] _fsSet:', e); }
  }

  // ── Appel API backend ────────────────────────────────────────
  async function _api(endpoint, body) {
    try {
      const { fetchWithAuth } = await import('./utils.js');
      const r = await fetchWithAuth(`${_BASE()}${endpoint}`, {
        method: 'POST', body: JSON.stringify(body),
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  // ─────────────────────────────────────────────────────────────
  //  A. SURVEILLANCE DES TENDANCES
  //  Calcule la pente de régression linéaire sur l'historique
  //  des scores et génère une alerte si trajectoire négative.
  // ─────────────────────────────────────────────────────────────
  function _slope(arr) {
    if (!arr || arr.length < 2) return 0;
    const n  = arr.length;
    const sx = arr.reduce((s, _, i) => s + i, 0);
    const sy = arr.reduce((s, v) => s + v, 0);
    const sx2 = arr.reduce((s, _, i) => s + i * i, 0);
    const sxy = arr.reduce((s, v, i) => s + i * v, 0);
    const d   = n * sx2 - sx * sx;
    return d === 0 ? 0 : (n * sxy - sx * sy) / d;
  }

  async function checkTrend(analyses) {
    if (!analyses || analyses.length < 3) return;
    const sorted = [...analyses]
      .filter(a => a.score != null)
      .sort((a, b) => {
        const ta = a.createdAt?.seconds ?? 0;
        const tb = b.createdAt?.seconds ?? 0;
        return ta - tb;
      });
    if (sorted.length < 3) return;

    const scores = sorted.map(a => a.score);
    const pente  = _slope(scores);
    const last   = scores[scores.length - 1];
    const prev   = scores[scores.length - 2];
    const prenom = _prof().prenom || '';

    // Alerte déclin : pente < -3 pts/analyse ET tendance sur 3+ analyses
    if (pente < -3) {
      const weeksLeft = Math.abs(Math.round(last / Math.abs(pente)));
      const nextZone  = _zoneOf(last + pente * 2);
      const curZone   = _zoneOf(last);
      const uid       = _uid();

      // Anti-doublon : envoyer max 1 fois toutes les 48h
      const memKey = `agent_trend_${uid}`;
      const lastSent = parseInt(sessionStorage.getItem(memKey) || '0');
      if (_now() - lastSent < 48 * 3600 * 1000) return;
      sessionStorage.setItem(memKey, String(_now()));

      const msg = `📉 <strong>Tendance négative détectée${prenom ? ' pour ' + prenom : ''}</strong>
        — Score en baisse de <strong>${Math.abs(pente).toFixed(1)} pts/analyse</strong>
        sur les ${sorted.length} dernières périodes.
        ${curZone !== nextZone
          ? `Projection : entrée en <strong>${ZC[nextZone]?.label}</strong> dans ~${weeksLeft} analyse(s).`
          : `Importez vos données récentes pour confirmer la tendance.`}`;

      _pushNotif(msg, 'warn', sorted[sorted.length - 1]);
      _saveMemory('trend_alert', { scores, pente, last, ts: _now() });
    }

    // Alerte rebond positif : dernière analyse remonte de ≥ 10 pts
    if (prev < 50 && last >= 50 && last - prev >= 8) {
      const msg = `✅ <strong>Redressement confirmé !</strong>
        Le score est passé de <strong>${prev}</strong> à <strong>${last}/100</strong>
        — entrée en ${ZC[_zoneOf(last)]?.label}.`;
      _pushNotif(msg, 'ok', sorted[sorted.length - 1]);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  B. SIMULATION WHAT-IF AUTOMATIQUE
  //  Post-analyse : calcule les 3 scénarios d'amélioration
  //  les plus impactants et les affiche proactivement.
  // ─────────────────────────────────────────────────────────────
  async function runAutoWhatIf(analyse) {
    if (!analyse) return;
    const score  = analyse.score ?? 0;
    const ratios = analyse.ratios ?? [];
    if (!ratios.length) return;

    // Identifier les 3 ratios les moins bons (statut rouge/orange)
    const weak = ratios
      .filter(r => r.status === 'red' || r.status === 'yellow' || r.status === 'orange')
      .slice(0, 3);
    if (!weak.length) return;

    // Simuler via l'API whatif
    const simulations = [];
    for (const r of weak) {
      const benchVal = parseFloat(r.benchmark ?? r.bench ?? 0);
      const curVal   = parseFloat(r.value ?? r.val ?? 0);
      if (!benchVal || !curVal) continue;

      // Calculer l'amélioration vers le benchmark
      const targetVal   = benchVal;
      const improvement = Math.abs(((targetVal - curVal) / Math.abs(curVal || 1)) * 100);

      simulations.push({
        ratio:      r.name,
        current:    curVal,
        target:     targetVal,
        improvement: Math.round(improvement),
      });
    }
    if (!simulations.length) return;

    // Appel backend whatif avec les paramètres simulés
    const payload = {
      analyseId: analyse.id,
      userId:    _uid(),
      params:    simulations.map(s => ({
        feature:  s.ratio,
        delta_pct: s.improvement,
      })),
    };
    const result = await _api('/analyses/whatif', payload);
    const deltaScore = result?.simulatedScore
      ? result.simulatedScore - score
      : simulations.reduce((acc, s) => acc + Math.round(s.improvement * 0.15), 0);

    if (deltaScore <= 0) return;

    // Mémoriser + afficher
    _saveMemory('whatif_auto', { analyse: analyse.id, sims: simulations, delta: deltaScore, ts: _now() });

    // Notification proactive avec lien vers le simulateur
    const topSim = simulations[0];
    const msg = `💡 <strong>Simulation automatique</strong> — Si vous améliorez
      votre <strong>${topSim.ratio}</strong> de ${topSim.improvement}%
      (vers la norme sectorielle), votre score pourrait gagner
      <strong>+${deltaScore} points</strong>.
      <span style="color:#7DD3FC;cursor:pointer;text-decoration:underline;"
        onclick="window.DS?.navTo?.('dashboard');window.DS?.simulate?.()">
        → Ouvrir le simulateur</span>`;

    _pushNotif(msg, 'info', null);
  }

  // ─────────────────────────────────────────────────────────────
  //  C. BENCHMARKING AUTOMATIQUE
  //  Compare l'entreprise à ses pairs sectoriels
  //  Utilise les analyses existantes de S.analyses comme peers
  // ─────────────────────────────────────────────────────────────
  function runAutoBenchmark(analyse) {
    if (!analyse) return;
    const allAnalyses = window.S?.analyses ?? [];
    const secteur     = analyse.secteur ?? '';
    const score       = analyse.score   ?? 0;

    if (allAnalyses.length < 2) return;

    // Pairs = autres analyses du même secteur
    const peers = allAnalyses.filter(a => a.id !== analyse.id && a.score != null);
    if (peers.length < 1) return;

    const scores    = peers.map(a => a.score);
    const avgScore  = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    const better    = scores.filter(s => s < score).length;
    const pctBetter = Math.round((better / scores.length) * 100);

    if (pctBetter < 30 || pctBetter > 70) {
      const msg = pctBetter >= 70
        ? `🏆 <strong>${analyse.entreprise || 'Votre entreprise'}</strong> est dans le
          <strong>top ${100 - pctBetter}%</strong> de votre portefeuille
          (score ${score} vs moyenne ${avgScore}).`
        : `📊 <strong>${analyse.entreprise || 'Votre entreprise'}</strong> est en dessous
          de <strong>${pctBetter}%</strong> de votre portefeuille.
          Score moyen : <strong>${avgScore}/100</strong>. 3 analyses ont de meilleures pratiques à explorer.`;
      _pushNotif(msg, pctBetter >= 70 ? 'ok' : 'warn', analyse);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  D. SUIVI POST-RECOMMANDATION
  //  Quand une recommandation est marquée "faite",
  //  la prochaine analyse compare les ratios concernés.
  // ─────────────────────────────────────────────────────────────
  async function trackRecoImpact(analyse) {
    if (!analyse) return;
    const uid   = _uid(); if (!uid) return;
    const mem   = await _fsGet(`agent_memory/${uid}`);
    if (!mem?.pending_recos) return;

    const ratios = Object.fromEntries(
      (analyse.ratios ?? []).map(r => [r.name, parseFloat(r.value ?? 0)])
    );

    const results = [];
    for (const reco of mem.pending_recos) {
      const { title, ratio_name, ratio_before, applied_ts } = reco;
      const current = ratios[ratio_name];
      if (current == null) continue;

      const delta = current - ratio_before;
      const deltaScore = analyse.score - (mem.score_before ?? analyse.score);
      const daysSince = Math.round((_now() - applied_ts) / 86400000);

      results.push({ title, ratio_name, ratio_before, current, delta, deltaScore, daysSince });

      if (Math.abs(delta) > 0.05 || deltaScore > 3) {
        const positive = (delta > 0 && title.toLowerCase().includes('liquid'))
          || (delta < 0 && title.toLowerCase().includes('endett'))
          || deltaScore > 0;

        const msg = positive
          ? `✅ <strong>Impact mesuré</strong> — "${title}" appliquée il y a ${daysSince}j.
            ${ratio_name} : <strong>${_fmtN(ratio_before)} → ${_fmtN(current)}</strong>.
            Score : <strong>+${Math.max(0, deltaScore)} pts</strong>.`
          : `💡 <strong>Suivi recommandation</strong> — "${title}" (${daysSince}j).
            L'impact n'est pas encore visible. Continuez les actions ou demandez conseil à l'IA.`;
        _pushNotif(msg, positive ? 'ok' : 'info', analyse);
      }
    }

    // Mettre à jour la mémoire
    if (results.length) {
      await _fsSet(`agent_memory/${uid}`, { reco_impacts: results, last_check: _now() });
    }
  }

  // Appelé quand l'utilisateur marque une recommandation "faite"
  async function markRecoDone(reco, currentAnalyse) {
    const uid = _uid(); if (!uid) return;
    const ratios = Object.fromEntries(
      (currentAnalyse?.ratios ?? []).map(r => [r.name, parseFloat(r.value ?? 0)])
    );
    const pending = (await _fsGet(`agent_memory/${uid}`))?.pending_recos ?? [];
    pending.push({
      title:       reco.title ?? reco.t ?? '—',
      ratio_name:  reco.targetRatio ?? '',
      ratio_before: ratios[reco.targetRatio ?? ''] ?? 0,
      score_before: currentAnalyse?.score ?? 0,
      applied_ts:  _now(),
    });
    await _fsSet(`agent_memory/${uid}`, { pending_recos: pending, score_before: currentAnalyse?.score ?? 0 });
    _p1toast('📌 Recommandation enregistrée — L\'impact sera mesuré à votre prochaine analyse.', 'info');
  }

  // ─────────────────────────────────────────────────────────────
  //  E. RÈGLES D'ALERTE PERSONNALISÉES
  //  L'utilisateur définit ses propres seuils de surveillance.
  // ─────────────────────────────────────────────────────────────
  async function _loadRules() {
    const uid = _uid(); if (!uid) return [];
    const data = await _fsGet(`agent_rules/${uid}`);
    return data?.rules ?? [];
  }

  async function _saveRules(rules) {
    const uid = _uid(); if (!uid) return;
    await _fsSet(`agent_rules/${uid}`, { rules, updatedAt: _now() });
  }

  async function addRule(rule) {
    // rule = { label, metric, operator, value, action }
    // metric   : 'score' | 'current_ratio' | 'roa' | ...
    // operator : '<' | '>' | '<='
    // value    : number
    // action   : 'notify' | 'email' | 'both'
    const rules = await _loadRules();
    const newRule = { ...rule, id: `r_${_now()}`, createdAt: _now(), enabled: true };
    rules.push(newRule);
    await _saveRules(rules);
    _p1toast(`🔔 Règle créée : "${rule.label}"`, 'ok');
    return newRule;
  }

  async function removeRule(id) {
    const rules = (await _loadRules()).filter(r => r.id !== id);
    await _saveRules(rules);
  }

  async function toggleRule(id) {
    const rules = await _loadRules();
    const r = rules.find(r => r.id === id);
    if (r) r.enabled = !r.enabled;
    await _saveRules(rules);
    return r?.enabled;
  }

  async function checkRules(analyse) {
    const rules = await _loadRules();
    if (!rules.length) return;

    const values = {
      score:         analyse.score ?? 0,
      ...Object.fromEntries((analyse.ratios ?? []).map(r => [
        (r.name ?? '').toLowerCase().replace(/\s+/g,'_'), parseFloat(r.value ?? 0)
      ])),
    };

    for (const rule of rules.filter(r => r.enabled)) {
      const actual = values[rule.metric];
      if (actual == null) continue;

      const triggered =
        (rule.operator === '<'  && actual <  rule.value) ||
        (rule.operator === '>'  && actual >  rule.value) ||
        (rule.operator === '<=' && actual <= rule.value) ||
        (rule.operator === '>=' && actual >= rule.value);

      if (!triggered) continue;

      const antiKey = `rule_${rule.id}_${analyse.id}`;
      if (sessionStorage.getItem(antiKey)) continue;
      sessionStorage.setItem(antiKey, '1');

      const metricLabel = rule.metric === 'score' ? 'Doctor Score' : rule.metric.replace(/_/g,' ');
      const msg = `🔔 <strong>Alerte personnalisée</strong> — "${rule.label}"
        · ${metricLabel} = <strong>${_fmtN(actual)}</strong>
        (seuil : ${rule.operator} ${_fmtN(rule.value)}).`;
      _pushNotif(msg, 'warn', analyse);

      if (rule.action === 'email' || rule.action === 'both') {
        const uid = _uid();
        if (uid) {
          try {
            const { fetchWithAuth } = await import('./utils.js');
            fetchWithAuth(`${_BASE()}/email/agent-alert`, {
              method: 'POST',
              body: JSON.stringify({ uid, rule: rule.label, metric: rule.metric, value: actual }),
            });
          } catch {}
        }
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  F. RAPPORT HEBDOMADAIRE AUTOMATIQUE
  //  Déclenché le lundi au premier login.
  //  Synthèse IA de la semaine en 5 points.
  // ─────────────────────────────────────────────────────────────
  async function checkWeeklyReport() {
    const uid = _uid(); if (!uid) return;
    const now = new Date();
    const day = now.getDay(); // 1 = lundi
    const key = `agent_weekly_${uid}_${now.getFullYear()}_W${_isoWeek(now)}`;

    // Déclencher uniquement le lundi (ou si forcé)
    if (day !== 1 && !sessionStorage.getItem('_agent_force_report')) return;
    if (localStorage.getItem(key)) return; // déjà envoyé cette semaine

    const analyses  = window.S?.analyses ?? [];
    if (!analyses.length) return;

    // Calculer les stats de la semaine
    const weekAgo  = _now() - 7 * 86400 * 1000;
    const recent   = analyses.filter(a => {
      const ts = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
      return ts >= weekAgo;
    });
    const allScores = analyses.filter(a => a.score != null).map(a => a.score);
    const lastScore = allScores[allScores.length - 1] ?? 0;
    const prevScore = allScores.length > 1 ? allScores[allScores.length - 2] : lastScore;
    const delta     = lastScore - prevScore;
    const pente     = _slope(allScores.slice(-5));

    const summary = _buildWeeklySummary(analyses, recent, lastScore, delta, pente);

    // Afficher le rapport dans l'interface
    _showWeeklyPanel(summary);

    // Envoyer par email (backend)
    const { email } = window.S?.user ?? {};
    if (email) {
      const prenom = _prof().prenom || '';
      await _api('/email/agent-weekly', {
        uid, email, prenom,
        score:       lastScore,
        delta,
        analysesCnt: recent.length,
        summary:     summary.text,
      });
    }

    localStorage.setItem(key, '1');
  }

  function _isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7);
  }

  function _buildWeeklySummary(all, recent, lastScore, delta, pente) {
    const prenom    = _prof().prenom || '';
    const zone      = _zoneOf(lastScore);
    const zConf     = ZC[zone];
    const best      = recent.reduce((b, a) => (!b || a.score > b.score) ? a : b, null);
    const recos     = all.flatMap(a => a.recommendations ?? []).filter(r => r.level === 'high');
    const topReco   = recos[0];
    const trendTxt  = pente >  2  ? '📈 tendance haussière'
                    : pente < -2  ? '📉 tendance baissière'
                    : '➡️ stabilisation';

    const lines = [
      `<strong>Bonjour${prenom ? ' ' + prenom : ''}</strong> — voici votre bilan de la semaine Doctor Smile.`,
      ``,
      `<strong>📊 Score actuel :</strong> ${lastScore}/100 — <span style="color:${zConf.col}">${zConf.label}</span>
        ${delta >= 0 ? `<span style="color:#10b981">(+${delta} pts)</span>` : `<span style="color:#ef4444">(${delta} pts)</span>`}`,
      `<strong>📈 Tendance :</strong> ${trendTxt} sur les 5 dernières analyses.`,
      recent.length
        ? `<strong>🔬 Analyses cette semaine :</strong> ${recent.length} analyse(s) — meilleure : <strong>${best?.entreprise ?? '—'}</strong> (${best?.score ?? '—'}/100).`
        : `<strong>🔬 Cette semaine :</strong> Aucune nouvelle analyse. Importez vos données fraîches.`,
      topReco
        ? `<strong>⚡ Priorité :</strong> ${topReco.title} — <em>${topReco.description}</em>`
        : `<strong>✅ Aucune alerte critique</strong> cette semaine.`,
    ];

    return {
      text:  lines.join('\n'),
      html:  lines.join('<br>'),
      score: lastScore,
      delta,
      zone,
    };
  }

  function _showWeeklyPanel(summary) {
    document.getElementById('_agent_weekly')?.remove();
    const zConf = ZC[summary.zone];
    const panel = document.createElement('div');
    panel.id = '_agent_weekly';
    panel.style.cssText = `
      position:fixed;bottom:84px;right:24px;z-index:8500;
      width:320px;background:rgba(6,10,20,.98);
      border:1px solid ${zConf.col}44;border-radius:18px;
      box-shadow:0 24px 60px rgba(0,0,0,.65),0 0 40px ${zConf.col}18;
      overflow:hidden;animation:p1SlideIn .4s cubic-bezier(.16,1,.3,1);
    `;
    panel.innerHTML = `
      <div style="padding:14px 16px;background:${zConf.bg};border-bottom:1px solid ${zConf.col}28;
        display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="font-size:20px;">📋</div>
          <div>
            <div style="font-family:Syne,sans-serif;font-size:11px;font-weight:900;color:#fff;">
              Rapport de la semaine
            </div>
            <div style="font-size:8.5px;color:rgba(255,255,255,.4);margin-top:1px;">
              Agent IA Autonome · Doctor Smile
            </div>
          </div>
        </div>
        <button onclick="document.getElementById('_agent_weekly')?.remove()"
          style="background:none;border:none;color:rgba(255,255,255,.3);cursor:pointer;
          font-size:14px;padding:4px;">&times;</button>
      </div>
      <div style="padding:14px 16px 8px;font-family:"Instrument Sans",sans-serif;
        font-size:10.5px;color:rgba(255,255,255,.65);line-height:1.75;">
        ${summary.html}
      </div>
      <div style="padding:8px 16px 14px;display:flex;gap:8px;">
        <button onclick="window.DS?.navTo?.('chat')"
          style="flex:1;padding:8px;border-radius:9px;border:1px solid rgba(125,211,252,.25);
          background:rgba(125,211,252,.08);color:#7DD3FC;font-family:Syne,sans-serif;
          font-size:9px;font-weight:800;cursor:pointer;letter-spacing:.04em;">
          💬 Approfondir avec l'IA
        </button>
        <button onclick="window.DS?.navTo?.('analyses')"
          style="flex:1;padding:8px;border-radius:9px;border:1px solid rgba(255,215,0,.25);
          background:rgba(255,215,0,.07);color:#FFD700;font-family:Syne,sans-serif;
          font-size:9px;font-weight:800;cursor:pointer;letter-spacing:.04em;">
          📊 Voir analyses
        </button>
      </div>
    `;
    document.body.appendChild(panel);
    setTimeout(() => panel.remove(), 30000); // auto-dismiss 30s
  }

  // ─────────────────────────────────────────────────────────────
  //  G. COMMANDES NATURELLES DEPUIS LE CHAT
  //  Intercepte des intentions claires dans les messages chat
  // ─────────────────────────────────────────────────────────────
  function parseChatCommand(message) {
    const m = message.toLowerCase().trim();

    if (/envoie.*(rapport|email|résumé)|rapport.*email|reçoi.*(email|rapport)/i.test(m)) {
      return { action: 'send_report' };
    }
    if (/compare.*(analys|entreprise)|comparaison/i.test(m)) {
      return { action: 'open_comparator' };
    }
    if (/export.*analys|exporte.*analys|télécharge.*analys/i.test(m)) {
      return { action: 'export_analyses' };
    }
    if (/alerte.*(si|quand).*score|surveille.*score|prévien.*/i.test(m)) {
      const valMatch = m.match(/\d+/);
      return { action: 'create_rule', value: valMatch ? parseInt(valMatch[0]) : null };
    }
    if (/simul|what.if|que se passe|si j.améliore|impact de/i.test(m)) {
      return { action: 'open_whatif' };
    }
    if (/bilan.*(semaine|hebdo)|rapport.*semaine/i.test(m)) {
      return { action: 'show_weekly' };
    }
    return null;
  }

  async function executeCommand(cmd, onReply) {
    switch (cmd.action) {

      case 'send_report': {
        const analyses = window.S?.analyses ?? [];
        if (!analyses.length) {
          onReply && onReply('❌ Aucune analyse disponible pour générer un rapport.');
          return;
        }
        const lastScore = analyses[0]?.score ?? 0;
        const summary   = _buildWeeklySummary(analyses, [], lastScore, 0, 0);
        const uid = _uid();
        if (uid) {
          const sent = await _api('/email/agent-weekly', {
            uid, email: window.S?.user?.email,
            prenom: _prof().prenom || '',
            score: lastScore, delta: 0, analysesCnt: analyses.length,
            summary: summary.text,
          });
          onReply && onReply(sent
            ? `✅ Rapport envoyé par email à <strong>${window.S?.user?.email}</strong>.`
            : `⚠️ Envoi en cours. Vérifiez votre boîte mail dans quelques minutes.`);
        }
        break;
      }

      case 'open_comparator': {
        window.DS_VIEWS?.navTo?.('visualisations');
        setTimeout(() => window.DS_EXTRA?.showComparator?.(), 500);
        onReply && onReply('📊 Ouverture du comparateur d\'analyses…');
        break;
      }

      case 'open_whatif': {
        window.DS?.navTo?.('dashboard');
        setTimeout(() => {
          const wi = document.getElementById('wi-sec');
          if (wi) wi.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 400);
        onReply && onReply('🎛️ Ouverture du simulateur What-If dans le dashboard…');
        break;
      }

      case 'create_rule': {
        const val = cmd.value ?? 50;
        await addRule({
          label:    `Alerte si score < ${val}`,
          metric:   'score',
          operator: '<',
          value:    val,
          action:   'notify',
        });
        onReply && onReply(`🔔 Règle créée : vous serez alerté si le score descend sous <strong>${val}/100</strong>.`);
        break;
      }

      case 'show_weekly': {
        const analyses = window.S?.analyses ?? [];
        const scores   = analyses.filter(a => a.score != null).map(a => a.score);
        const last     = scores[scores.length - 1] ?? 0;
        const prev     = scores.length > 1 ? scores[scores.length - 2] : last;
        const summary  = _buildWeeklySummary(analyses, [], last, last - prev, _slope(scores.slice(-5)));
        _showWeeklyPanel(summary);
        onReply && onReply('📋 Rapport hebdomadaire affiché.');
        break;
      }

      case 'export_analyses': {
        const analyses = window.S?.analyses ?? [];
        if (!analyses.length) {
          onReply && onReply('❌ Aucune analyse à exporter.');
          return;
        }
        const json = JSON.stringify(analyses, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `doctorsmile_analyses_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        onReply && onReply(`✅ Export de <strong>${analyses.length} analyses</strong> téléchargé.`);
        break;
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  HELPERS INTERNES
  // ─────────────────────────────────────────────────────────────
  function _pushNotif(html, level, analyse) {
    if (window.DS_NOTIFS?.push) {
      window.DS_NOTIFS.push({ html, level: level ?? 'info', ts: _now(), analyse });
    }
    _p1toast(html, level === 'ok' ? 'ok' : level === 'warn' ? 'warn' : 'info', 6000);
    const bell = document.getElementById('notif-bell');
    if (bell) {
      const cnt = (parseInt(bell.dataset.count || '0') + 1);
      bell.dataset.count = String(cnt);
    }
  }

  async function _saveMemory(key, data) {
    const uid = _uid(); if (!uid) return;
    await _fsSet(`agent_memory/${uid}`, { [key]: data, updatedAt: _now() });
  }

  // ─────────────────────────────────────────────────────────────
  //  H. PANEL DANS LES PARAMÈTRES
  // ─────────────────────────────────────────────────────────────
  async function renderParamSection() {
    const uid   = _uid();
    const rules = uid ? await _loadRules() : [];
    const mem   = uid ? await _fsGet(`agent_memory/${uid}`) : null;

    const pendingRecos = mem?.pending_recos?.length ?? 0;
    const lastWhatif   = mem?.whatif_auto;
    const lastTrend    = mem?.trend_alert;

    return `
    <!-- ═══ AGENT IA AUTONOME ══════════════════════════════════ -->
    <div class="param-section" style="border-color:rgba(139,92,246,.18);">
      <div class="param-section-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:7px;">
          <span style="display:inline-flex;align-items:center;justify-content:center;
            width:18px;height:18px;border-radius:50%;background:rgba(139,92,246,.25);
            font-size:9px;">🤖</span>
          Agent IA Autonome
          <span style="padding:2px 8px;border-radius:100px;background:rgba(16,185,129,.12);
            border:1px solid rgba(16,185,129,.25);color:#10b981;font-size:7.5px;font-weight:800;
            font-family:Syne,sans-serif;letter-spacing:.08em;">ACTIF</span>
        </span>
        <button onclick="window.P1_AGENT?.checkWeeklyReport(); sessionStorage.setItem('_agent_force_report','1');"
          class="p1-btn p1-btn-neutral" style="font-size:8px;padding:4px 10px;">
          📋 Rapport maintenant
        </button>
      </div>

      <!-- Statut des capacités -->
      <div class="param-row" style="flex-direction:column;align-items:flex-start;gap:10px;padding-bottom:14px;">
        <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
          letter-spacing:.04em;text-transform:uppercase;">Capacités actives</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;width:100%;">
          ${[
            ['📉', 'Détection de tendance', lastTrend ? 'Alerte envoyée ' + _fmt(lastTrend.ts) : 'Surveillance active'],
            ['💡', 'Simulation auto What-If', lastWhatif ? `+${lastWhatif.delta ?? '—'} pts calculés` : 'Prête'],
            ['📊', 'Benchmarking automatique', 'Post-analyse'],
            ['✅', 'Suivi recommandations', pendingRecos + ' en attente de mesure'],
            ['🔔', 'Règles personnalisées', rules.filter(r => r.enabled).length + ' active(s)'],
            ['📋', 'Rapport hebdomadaire', 'Chaque lundi au login'],
          ].map(([icon, title, status]) => `
            <div style="padding:9px 11px;background:rgba(139,92,246,.06);border-radius:10px;
              border:1px solid rgba(139,92,246,.14);">
              <div style="font-family:Syne,sans-serif;font-size:9px;font-weight:800;
                color:rgba(255,255,255,.75);margin-bottom:3px;">${icon} ${title}</div>
              <div style="font-size:8px;color:rgba(255,255,255,.35);">${status}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Règles personnalisées -->
      <div class="param-row" style="flex-direction:column;align-items:flex-start;gap:8px;padding-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
            letter-spacing:.04em;text-transform:uppercase;">Mes alertes personnalisées</div>
          <button id="_agent_add_rule_btn" onclick="window.P1_AGENT?.openRuleModal()"
            class="p1-btn p1-btn-primary" style="font-size:8px;padding:4px 10px;">
            + Nouvelle règle
          </button>
        </div>

        <div id="_agent_rules_list" style="width:100%;display:flex;flex-direction:column;gap:5px;">
          ${rules.length ? rules.map(r => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 11px;
              background:rgba(255,255,255,.03);border-radius:9px;
              border:1px solid rgba(255,255,255,.07);" data-rule-id="${r.id}">
              <div style="flex:1;font-size:9.5px;color:rgba(255,255,255,.65);">${r.label}</div>
              <button onclick="window.P1_AGENT?.toggleRule(this.dataset.rid).then(()=>window.P1_AGENT?.refreshRulesList())" data-rid="${r.id}"
                style="padding:3px 9px;border-radius:6px;font-size:8px;font-family:Syne,sans-serif;font-weight:800;
                cursor:pointer;border:1px solid ${r.enabled ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.1)'};
                background:${r.enabled ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.04)'};
                color:${r.enabled ? '#10b981' : 'rgba(255,255,255,.35)'};">
                ${r.enabled ? 'Activée' : 'Désactivée'}
              </button>
              <button onclick="window.P1_AGENT?.removeRule(this.dataset.rid).then(()=>window.P1_AGENT?.refreshRulesList())" data-rid="${r.id}"
                style="padding:3px 7px;border-radius:6px;font-size:8px;cursor:pointer;
                background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);color:#ef4444;">
                ✕
              </button>
            </div>
          `).join('') : `
            <div style="text-align:center;padding:14px;font-size:9px;
              color:rgba(255,255,255,.2);font-family:Syne,sans-serif;">
              Aucune règle — créez votre première alerte personnalisée
            </div>
          `}
        </div>
      </div>

      <!-- Commandes rapides -->
      <div class="param-row" style="border-bottom:none;flex-direction:column;align-items:flex-start;gap:8px;">
        <div style="font-size:9px;color:rgba(255,255,255,.35);font-family:Syne,sans-serif;
          letter-spacing:.04em;text-transform:uppercase;">Commandes rapides</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;">
          <button onclick="window.P1_AGENT?.executeCommand({action:'send_report'},msg=>window.DS_VIEWS?.showToast?.(msg,'ok'))"
            class="p1-btn p1-btn-neutral" style="font-size:8px;">📧 Rapport par email</button>
          <button onclick="window.P1_AGENT?.executeCommand({action:'show_weekly'},()=>{})"
            class="p1-btn p1-btn-neutral" style="font-size:8px;">📋 Bilan semaine</button>
          <button onclick="window.P1_AGENT?.executeCommand({action:'export_analyses'},msg=>window.DS_VIEWS?.showToast?.(msg,'ok'))"
            class="p1-btn p1-btn-neutral" style="font-size:8px;">⬇️ Exporter analyses</button>
          <button onclick="window.DS?.navTo?.('visualisations');setTimeout(()=>window.DS_EXTRA?.showComparator?.(),400)"
            class="p1-btn p1-btn-neutral" style="font-size:8px;">⚖️ Comparateur</button>
        </div>
      </div>
    </div>`;
  }

  // Modal ajout règle personnalisée
  function openRuleModal() {
    document.getElementById('_agent_rule_modal')?.remove();
    const o = document.createElement('div');
    o.className = 'p1-modal-overlay';
    o.id = '_agent_rule_modal';
    const metrics = [
      { key: 'score',                label: 'Doctor Score (0-100)' },
      { key: 'liquidité_générale',   label: 'Liquidité générale' },
      { key: 'ratio_endettement',    label: "Ratio d'endettement" },
      { key: 'roa',                  label: 'ROA (rentabilité actifs)' },
      { key: 'roe',                  label: 'ROE (rentabilité capitaux)' },
      { key: 'marge_ebitda',         label: 'Marge EBITDA (%)' },
      { key: 'altman_z',             label: 'Altman Z-Score' },
    ];
    o.innerHTML = `
      <div class="p1-modal" style="max-width:420px;">
        <div class="p1-modal-title">
          <span style="font-size:20px;">🔔</span> Nouvelle règle d'alerte
        </div>
        <div class="p1-modal-sub">
          Définissez un seuil : l'agent vous alertera dès qu'il est franchi lors d'une analyse.
        </div>

        <div class="p1-section-title">Indicateur surveillé</div>
        <select id="_rule_metric" class="p1-input" style="margin-bottom:10px;">
          ${metrics.map(m => `<option value="${m.key}">${m.label}</option>`).join('')}
        </select>

        <div style="display:flex;gap:10px;">
          <div style="flex:0 0 110px;">
            <div class="p1-section-title">Condition</div>
            <select id="_rule_op" class="p1-input">
              <option value="<">Inférieur à (&lt;)</option>
              <option value=">">Supérieur à (&gt;)</option>
              <option value="<=">Inférieur ou égal (≤)</option>
              <option value=">=">Supérieur ou égal (≥)</option>
            </select>
          </div>
          <div style="flex:1;">
            <div class="p1-section-title">Valeur seuil</div>
            <input id="_rule_val" type="number" class="p1-input"
              placeholder="ex: 50" value="50" step="0.1">
          </div>
        </div>

        <div class="p1-section-title">Action déclenchée</div>
        <select id="_rule_action" class="p1-input">
          <option value="notify">Notification dans l'interface</option>
          <option value="email">Email d'alerte uniquement</option>
          <option value="both">Notification + Email</option>
        </select>

        <div class="p1-section-title" style="margin-top:14px;">Nom de la règle</div>
        <input id="_rule_label" class="p1-input" placeholder="ex: Alerte liquidité critique">

        <div style="display:flex;gap:10px;margin-top:18px;">
          <button onclick="document.getElementById('_agent_rule_modal')?.remove()"
            class="p1-btn p1-btn-neutral" style="flex:1;">Annuler</button>
          <button onclick="window.P1_AGENT?._confirmRule()"
            class="p1-btn p1-btn-primary" style="flex:1;">
            <i class="fa-solid fa-bell" style="margin-right:5px;"></i>Créer la règle
          </button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o) o.remove(); });
  }

  async function _confirmRule() {
    const metric = document.getElementById('_rule_metric')?.value;
    const op     = document.getElementById('_rule_op')?.value;
    const val    = parseFloat(document.getElementById('_rule_val')?.value ?? '50');
    const action = document.getElementById('_rule_action')?.value;
    let   label  = document.getElementById('_rule_label')?.value?.trim();

    if (!metric || !op || isNaN(val)) {
      _p1toast('Remplissez tous les champs.', 'err'); return;
    }
    if (!label) {
      const metricLabel = document.getElementById('_rule_metric')
        ?.options[document.getElementById('_rule_metric').selectedIndex]?.text ?? metric;
      label = `Alerte ${metricLabel} ${op} ${val}`;
    }

    document.getElementById('_agent_rule_modal')?.remove();
    await addRule({ label, metric, operator: op, value: val, action });
    refreshRulesList();
  }

  async function refreshRulesList() {
    const container = document.getElementById('_agent_rules_list');
    if (!container) return;
    const rules = await _loadRules();
    container.innerHTML = rules.length ? rules.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 11px;
        background:rgba(255,255,255,.03);border-radius:9px;
        border:1px solid rgba(255,255,255,.07);">
        <div style="flex:1;font-size:9.5px;color:rgba(255,255,255,.65);">${r.label}</div>
        <button onclick="window.P1_AGENT?.toggleRule(this.dataset.rid).then(()=>window.P1_AGENT?.refreshRulesList())" data-rid="${r.id}"
          style="padding:3px 9px;border-radius:6px;font-size:8px;font-family:Syne,sans-serif;font-weight:800;
          cursor:pointer;border:1px solid ${r.enabled ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.1)'};
          background:${r.enabled ? 'rgba(16,185,129,.1)' : 'rgba(255,255,255,.04)'};
          color:${r.enabled ? '#10b981' : 'rgba(255,255,255,.35)'};">
          ${r.enabled ? 'Activée' : 'Désactivée'}
        </button>
        <button onclick="window.P1_AGENT?.removeRule(this.dataset.rid).then(()=>window.P1_AGENT?.refreshRulesList())" data-rid="${r.id}"
          style="padding:3px 7px;border-radius:6px;font-size:8px;cursor:pointer;
          background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);color:#ef4444;">✕</button>
      </div>
    `).join('') : `
      <div style="text-align:center;padding:14px;font-size:9px;
        color:rgba(255,255,255,.2);font-family:Syne,sans-serif;">
        Aucune règle active
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────
  //  INIT — Hooker sur loadAnalyse pour lancer les capacités
  // ─────────────────────────────────────────────────────────────
  function _hookAgent() {
    // 1. Hook loadAnalyse → lancer A, B, C, D, E post-analyse
    const dash = window.DS_DASH;
    if (dash && !dash._agentHooked) {
      dash._agentHooked = true;
      const origLoad = dash.loadAnalyse;
      if (origLoad) {
        dash.loadAnalyse = function(a) {
          origLoad.call(dash, a);
          // Déclencher toutes les capacités avec délai pour ne pas bloquer l'UI
          setTimeout(() => {
            const all = window.S?.analyses ?? [];
            checkTrend(all);
            runAutoWhatIf(a);
            runAutoBenchmark(a);
            trackRecoImpact(a);
            checkRules(a);
          }, 2000);
        };
      }
    }

    // 2. Hook chat → détecter les commandes naturelles
    const dsChat = window.DS_CHAT;
    if (dsChat && !dsChat._agentHooked) {
      dsChat._agentHooked = true;
      const origSend = dsChat._sendMsg?.bind(dsChat);
      if (origSend) {
        dsChat._sendMsg = async function(containerId) {
          const inp = document.getElementById(
            containerId === 'chat-msgs' ? 'chat-inp' : 'chat-inp-full'
          );
          const msg = inp?.value?.trim() ?? '';
          const cmd = parseChatCommand(msg);
          if (cmd) {
            // Exécuter la commande et injecter la réponse dans le chat
            await executeCommand(cmd, reply => {
              if (window.DS_NOTIFS?.push) {
                window.DS_NOTIFS.push({ html: reply, level: 'info', ts: _now() });
              }
              _p1toast(reply, 'info', 5000);
            });
          }
          return origSend(containerId);
        };
      }
    }

    // 3. Rapport hebdomadaire au login du lundi
    setTimeout(checkWeeklyReport, 5000);
  }

  // ─────────────────────────────────────────────────────────────
  //  API PUBLIQUE
  // ─────────────────────────────────────────────────────────────
  return {
    // Capacités
    checkTrend,
    runAutoWhatIf,
    runAutoBenchmark,
    trackRecoImpact,
    checkRules,
    checkWeeklyReport,
    // Règles
    addRule, removeRule, toggleRule,
    openRuleModal, _confirmRule, refreshRulesList,
    // Commandes
    parseChatCommand, executeCommand,
    // Recommandations suivi
    markRecoDone,
    // UI Paramètres
    renderParamSection,
    // Init
    _hookAgent,
  };
})();

window.P1_AGENT = P1_AGENT;

// ── Sécurité : Sessions actives (simple) ────────────────────
const P1_SECURITY = (() => {
  function openSessionsModal() {
    document.getElementById('_p1_sess')?.remove();
    const o = document.createElement('div');
    o.className = 'p1-modal-overlay'; o.id = '_p1_sess';
    o.innerHTML = `
      <div class="p1-modal" style="max-width:420px;">
        <div class="p1-modal-title" style="margin-bottom:6px;">
          <div style="width:38px;height:38px;border-radius:10px;background:rgba(125,211,252,.08);
            border:1px solid rgba(125,211,252,.15);display:flex;align-items:center;
            justify-content:center;font-size:16px;">📱</div>
          Sessions actives
        </div>
        <div class="p1-modal-sub">
          Session actuelle — seul appareil connecté détecté.
          Firebase gère automatiquement la révocation des sessions.
        </div>
        <div style="padding:14px;background:rgba(16,185,129,.05);border-radius:10px;
          border:1px solid rgba(16,185,129,.15);display:flex;gap:12px;align-items:center;">
          <i class="fa-solid fa-desktop" style="font-size:20px;color:#10b981;"></i>
          <div>
            <div style="font-family:Syne,sans-serif;font-size:10px;font-weight:700;color:#fff;">
              ${navigator.platform || 'Appareil actuel'}</div>
            <div style="font-size:9px;color:rgba(255,255,255,.35);margin-top:2px;">
              ${navigator.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥️ Ordinateur'}
              · Session active maintenant
            </div>
          </div>
          <span class="p1-badge p1-badge-ok" style="margin-left:auto;">Actif</span>
        </div>
        <div style="margin-top:14px;">
          <button onclick="window.DS_PROFILE?.logout?.()"
            class="p1-btn p1-btn-danger" style="width:100%;justify-content:center;display:flex;gap:6px;padding:11px;">
            <i class="fa-solid fa-right-from-bracket"></i>
            Déconnecter toutes les sessions
          </button>
        </div>
      </div>`;
    document.body.appendChild(o);
    o.addEventListener('click', e => { if (e.target === o) o.remove(); });
  }
  return { openSessionsModal };
})();
window.P1_SECURITY = P1_SECURITY;

// ════════════════════════════════════════════════════════════════
//  HOOK SUR DS_VIEWS.renderParametres
//  Injecte automatiquement les sections Phase 1
// ════════════════════════════════════════════════════════════════

function _hookRenderParametres() {
  const views = window.DS_VIEWS;
  if (!views || views._p1hooked) return;
  views._p1hooked = true;

  const orig = views.renderParametres.bind(views);
  views.renderParametres = function() {
    orig();
    // Attendre que le DOM soit rendu
    setTimeout(_injectParamSections, 50);
  };
}

// ════════════════════════════════════════════════════════════════
//  HOOK SUR loadAnalyse — email "analyse prête"
// ════════════════════════════════════════════════════════════════

function _hookLoadAnalyse() {
  const dash = window.DS_DASH;
  if (!dash || dash._p1emailHooked) return;
  dash._p1emailHooked = true;

  const orig = dash.loadAnalyse;
  if (!orig) return;

  dash.loadAnalyse = function(a) {
    orig.call(dash, a);
    // Email "analyse prête" uniquement si c'est une nouvelle analyse (< 5min)
    const ts  = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : Date.now();
    const age = Date.now() - ts;
    if (age < 5 * 60 * 1000) { // moins de 5 minutes = nouvelle analyse
      P1_EMAIL.sendAnalyseReady(a);
    }
  };
}

// ════════════════════════════════════════════════════════════════
//  INIT PRINCIPAL
// ════════════════════════════════════════════════════════════════

(function _p1init() {
  function _boot() {
    // 1. Onboarding checklist (après auth)
    let _tries = 0;
    const _waitAuth = setInterval(() => {
      _tries++;
      if (_tries > 40) { clearInterval(_waitAuth); return; }
      if (!window.S?.user) return;
      clearInterval(_waitAuth);

      // Init onboarding
      P1_ONBOARDING.init();

      // Email de bienvenue si premier login
      P1_EMAIL.checkWelcomeSent();

      // Planifier relance si inactif
      setTimeout(() => P1_EMAIL.scheduleRelance(), 3000);

      // Hooker les modules
      setTimeout(() => {
        _hookRenderParametres();
        _hookLoadAnalyse();
        P1_ONBOARDING._attachHooks();
        P1_AGENT._hookAgent();             // ← Agent IA Autonome
      }, 1500);
    }, 300);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }
})();

// ════════════════════════════════════════════════════════════════
//  API PUBLIQUE
// ════════════════════════════════════════════════════════════════

window.DS_PHASE1 = {
  onboarding: P1_ONBOARDING,
  email:      P1_EMAIL,
  billing:    P1_BILLING,
  twofa:      P1_2FA,
  rgpd:       P1_RGPD,
  security:   P1_SECURITY,
  agent:      P1_AGENT,
};

console.log('%c[phase1.js] ✓ Chargé — Onboarding · Emails · Facturation · 2FA · RGPD · Agent IA', 'color:#FFD700;font-weight:bold');