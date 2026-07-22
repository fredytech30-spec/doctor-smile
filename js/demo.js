// ════════════════════════════════════════════════════════════════
//  demo.js — Doctor Smile
//  Gestion complète des CTAs :
//  • "Démarrer gratuitement" → modal inscription standard
//  • "Réserver une démo"    → modal démo avec créneaux agenda
//  • Boutons pricing cards  → modal inscription avec plan pré-sélectionné
// ════════════════════════════════════════════════════════════════

import { auth } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

(function () {

  // ── CSS ──────────────────────────────────────────────────────
  const css = `
  .dsm-overlay {
    position: fixed; inset: 0; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,.80); backdrop-filter: blur(18px);
    padding: 16px;
    opacity: 0; pointer-events: none;
    transition: opacity .28s ease;
  }
  .dsm-overlay.open { opacity: 1; pointer-events: all; }

  .dsm-box {
    background: linear-gradient(145deg, #060A14 0%, #0A1020 100%);
    border: 1px solid rgba(139,127,240,.18);
    border-radius: 22px; padding: 34px 30px;
    max-width: 520px; width: 100%;
    max-height: 92vh; overflow-y: auto;
    transform: translateY(28px) scale(.96);
    transition: transform .32s cubic-bezier(.16,1,.3,1);
    box-shadow: 0 40px 80px rgba(0,0,0,.65), 0 0 0 1px rgba(139,127,240,.05);
    scrollbar-width: thin; scrollbar-color: rgba(139,127,240,.2) transparent;
  }
  .dsm-overlay.open .dsm-box { transform: translateY(0) scale(1); }

  .dsm-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
  .dsm-title { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 900; color: #fff; line-height: 1.25; }
  .dsm-title em { color: #FFD700; font-style: normal; }
  .dsm-sub { font-size: 12px; color: rgba(255,255,255,.4); margin-top: 6px; line-height: 1.55; }
  .dsm-close {
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
    border-radius: 9px; padding: 7px 13px; color: rgba(255,255,255,.5);
    cursor: pointer; font-size: 14px; flex-shrink: 0; margin-left: 12px;
    font-family: inherit; transition: background .15s;
  }
  .dsm-close:hover { background: rgba(255,255,255,.14); }

  .dsm-form { display: flex; flex-direction: column; gap: 13px; }
  .dsm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
  @media(max-width: 480px) { .dsm-row { grid-template-columns: 1fr; } }
  .dsm-field { display: flex; flex-direction: column; gap: 5px; }
  .dsm-label {
    font-family: 'Syne', sans-serif; font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; color: rgba(255,255,255,.4);
  }
  .dsm-input, .dsm-select, .dsm-textarea {
    background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px; padding: 11px 14px; color: #fff;
    font-family: 'Instrument Sans', sans-serif; font-size: 13px;
    outline: none; transition: border-color .18s, box-shadow .18s; width: 100%;
  }
  .dsm-input:focus, .dsm-select:focus, .dsm-textarea:focus {
    border-color: rgba(139,127,240,.45);
    box-shadow: 0 0 0 3px rgba(139,127,240,.1);
  }
  .dsm-input::placeholder, .dsm-textarea::placeholder { color: rgba(255,255,255,.22); }
  .dsm-select option { background: #0A1020; color: #fff; }
  .dsm-textarea { resize: vertical; min-height: 80px; }

  /* Créneaux */
  .dsm-slots { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  @media(max-width: 380px) { .dsm-slots { grid-template-columns: repeat(2,1fr); } }
  .dsm-slot {
    padding: 10px 6px; border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.04);
    cursor: pointer; text-align: center; transition: all .15s;
    font-family: 'Syne', sans-serif;
  }
  .dsm-slot:hover { background: rgba(139,127,240,.1); border-color: rgba(139,127,240,.35); }
  .dsm-slot.selected {
    background: rgba(139,127,240,.15); border-color: rgba(139,127,240,.55);
    box-shadow: 0 0 14px rgba(139,127,240,.2);
  }
  .dsm-slot-day  { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.38); margin-bottom: 3px; }
  .dsm-slot-time { font-size: 12px; font-weight: 800; color: #fff; }
  .dsm-slot-ok   { font-size: 8px; color: #10b981; margin-top: 2px; }

  /* Bouton submit */
  .dsm-btn {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    padding: 14px 20px; border-radius: 12px; border: none; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800;
    letter-spacing: .04em; transition: all .2s; width: 100%; margin-top: 2px;
  }
  .dsm-btn-gold {
    background: linear-gradient(135deg, #FFD700, #FFC107); color: #03060D;
    box-shadow: 0 0 28px rgba(255,215,0,.3);
  }
  .dsm-btn-gold:hover { transform: translateY(-2px); box-shadow: 0 6px 32px rgba(255,215,0,.5); }
  .dsm-btn-ice {
    background: rgba(139,127,240,.12); color: #8B7FF0;
    border: 1px solid rgba(139,127,240,.3);
  }
  .dsm-btn-ice:hover { background: rgba(139,127,240,.22); }
  .dsm-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

  /* Succès */
  .dsm-success { text-align: center; padding: 16px 0; animation: dsmIn .38s cubic-bezier(.16,1,.3,1); }
  @keyframes dsmIn { from{opacity:0;transform:scale(.88)} to{opacity:1;transform:scale(1)} }
  .dsm-ok-icon {
    width: 62px; height: 62px; border-radius: 50%;
    background: rgba(16,185,129,.15); border: 2px solid rgba(16,185,129,.4);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px; margin: 0 auto 16px;
  }
  .dsm-success h3 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 900; margin-bottom: 8px; }
  .dsm-success p  { font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.6; }

  /* Garanties */
  .dsm-trust {
    display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
    margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,.06);
  }
  .dsm-trust span { display: flex; align-items: center; gap: 5px; font-size: 11px; color: rgba(255,255,255,.35); }
  .dsm-trust i { color: #10b981; }

  .dsm-divider { height: 1px; background: rgba(255,255,255,.07); margin: 4px 0; }
  .dsm-hint { font-size: 11px; color: rgba(255,255,255,.3); text-align: center; line-height: 1.5; }
  .dsm-hint a { color: rgba(139,127,240,.7); }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Génération des créneaux ───────────────────────────────────
  function buildSlots() {
    const times = ['09h30','10h00','11h00','14h00','14h30','15h30','16h00'];
    const result = [];
    let d = new Date(); d.setHours(0,0,0,0);
    let idx = 0;
    while (result.length < 7) {
      d = new Date(d.getTime() + 86400000);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;
      const day  = ['Lun','Mar','Mer','Jeu','Ven'][dow-1];
      const dd   = String(d.getDate()).padStart(2,'0');
      const mm   = String(d.getMonth()+1).padStart(2,'0');
      result.push({ label:`${day} ${dd}/${mm}`, time: times[idx % times.length], value:`${day} ${dd}/${mm} à ${times[idx%times.length]}` });
      idx++;
    }
    return result;
  }

  // ── HTML des deux modaux ──────────────────────────────────────
  document.body.insertAdjacentHTML('beforeend', `

  <!-- ── MODAL INSCRIPTION ── -->
  <div id="dsm-signup" class="dsm-overlay" role="dialog" aria-modal="true">
    <div class="dsm-box">
      <div class="dsm-head">
        <div>
          <div class="dsm-title">Démarrer <em>gratuitement</em></div>
          <div class="dsm-sub">14 jours d'essai · Sans carte bancaire · Accès immédiat</div>
        </div>
        <button class="dsm-close" onclick="DS_MODALS.closeSignup()">✕</button>
      </div>
      <div id="dsm-signup-body">
        <form class="dsm-form" id="dsm-signup-form" novalidate autocomplete="on">
          <div class="dsm-row">
            <div class="dsm-field">
              <label class="dsm-label" for="su-prenom">Prénom *</label>
              <input class="dsm-input" id="su-prenom" type="text" placeholder="Jean" required autocomplete="given-name">
            </div>
            <div class="dsm-field">
              <label class="dsm-label" for="su-nom">Nom *</label>
              <input class="dsm-input" id="su-nom" type="text" placeholder="Dupont" required autocomplete="family-name">
            </div>
          </div>
          <div class="dsm-field">
            <label class="dsm-label" for="su-email">Email *</label>
            <input class="dsm-input" id="su-email" type="email" placeholder="jean@entreprise.fr" required autocomplete="email">
          </div>
          <div class="dsm-field">
            <label class="dsm-label" for="su-pass">Mot de passe *</label>
            <input class="dsm-input" id="su-pass" type="password" placeholder="8 caractères minimum" required minlength="8" autocomplete="new-password">
          </div>
          <div class="dsm-row">
            <div class="dsm-field">
              <label class="dsm-label" for="su-company">Entreprise</label>
              <input class="dsm-input" id="su-company" type="text" placeholder="Ma Société SAS" autocomplete="organization">
            </div>
            <div class="dsm-field">
              <label class="dsm-label" for="su-plan">Plan</label>
              <select class="dsm-select" id="su-plan">
                <option value="standard">Standard — 39€/mois</option>
                <option value="premium">Premium — 79€/mois</option>
                <option value="extra">Extra — 159€/mois</option>
              </select>
            </div>
          </div>
          <button type="submit" class="dsm-btn dsm-btn-gold" id="dsm-signup-btn">
            <i class="fa-solid fa-rocket" style="font-size:15px;"></i>
            Créer mon compte gratuit
          </button>
          <div class="dsm-divider"></div>
          <p class="dsm-hint">
            En vous inscrivant, vous acceptez nos
            <a href="#">Conditions d'utilisation</a> et notre
            <a href="#">Politique de confidentialité</a>.
          </p>
          <p class="dsm-hint" style="margin-top:6px;">
            Déjà un compte ? <a href="./auth.html" style="color:#8B7FF0;font-weight:700;">Se connecter</a>
          </p>
          <div class="dsm-trust">
            <span><i class="fa-solid fa-shield-halved"></i> RGPD</span>
            <span><i class="fa-solid fa-lock"></i> AES-256</span>
            <span><i class="fa-solid fa-circle-xmark"></i> Sans carte</span>
            <span><i class="fa-solid fa-clock"></i> 14 jours gratuits</span>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ── MODAL DÉMO ── -->
  <div id="dsm-demo" class="dsm-overlay" role="dialog" aria-modal="true">
    <div class="dsm-box">
      <div class="dsm-head">
        <div>
          <div class="dsm-title">Réserver votre <em>démo</em></div>
          <div class="dsm-sub">30 min avec notre équipe · Personnalisée · Sans engagement</div>
        </div>
        <button class="dsm-close" onclick="DS_MODALS.closeDemo()">✕</button>
      </div>
      <div id="dsm-demo-body">
        <form class="dsm-form" id="dsm-demo-form" novalidate autocomplete="on">
          <div class="dsm-row">
            <div class="dsm-field">
              <label class="dsm-label" for="dm-prenom">Prénom *</label>
              <input class="dsm-input" id="dm-prenom" type="text" placeholder="Jean" required autocomplete="given-name">
            </div>
            <div class="dsm-field">
              <label class="dsm-label" for="dm-nom">Nom *</label>
              <input class="dsm-input" id="dm-nom" type="text" placeholder="Dupont" required autocomplete="family-name">
            </div>
          </div>
          <div class="dsm-field">
            <label class="dsm-label" for="dm-email">Email professionnel *</label>
            <input class="dsm-input" id="dm-email" type="email" placeholder="jean.dupont@entreprise.fr" required autocomplete="email">
          </div>
          <div class="dsm-row">
            <div class="dsm-field">
              <label class="dsm-label" for="dm-company">Entreprise *</label>
              <input class="dsm-input" id="dm-company" type="text" placeholder="Ma Société SAS" required autocomplete="organization">
            </div>
            <div class="dsm-field">
              <label class="dsm-label" for="dm-role">Fonction</label>
              <select class="dsm-select" id="dm-role">
                <option value="">Choisir…</option>
                <option>Directeur Financier / CFO</option>
                <option>Analyste Financier</option>
                <option>Expert-Comptable</option>
                <option>Dirigeant / CEO</option>
                <option>Risk Manager</option>
                <option>Autre</option>
              </select>
            </div>
          </div>
          <div class="dsm-field">
            <label class="dsm-label">Créneau souhaité *</label>
            <div class="dsm-slots" id="dsm-slots-grid"></div>
            <input type="hidden" id="dm-slot">
          </div>
          <div class="dsm-field">
            <label class="dsm-label" for="dm-msg">Ce que vous souhaitez voir (optionnel)</label>
            <textarea class="dsm-textarea" id="dm-msg" placeholder="Ex : analyser un portefeuille de 50 PME, automatiser nos rapports trimestriels…"></textarea>
          </div>
          <button type="submit" class="dsm-btn dsm-btn-ice" id="dsm-demo-btn">
            <i class="fa-solid fa-calendar-check" style="font-size:15px;"></i>
            Confirmer ma démo
          </button>
          <div class="dsm-trust">
            <span><i class="fa-solid fa-shield-halved"></i> RGPD</span>
            <span><i class="fa-solid fa-clock"></i> Réponse sous 2h</span>
            <span><i class="fa-solid fa-circle-xmark"></i> Sans engagement</span>
          </div>
        </form>
      </div>
    </div>
  </div>
  `);

  // ── API publique ──────────────────────────────────────────────
  window.DS_MODALS = {

    openSignup(plan) {
      if (plan) {
        const sel = document.getElementById('su-plan');
        if (sel) sel.value = plan;
      }
      document.getElementById('dsm-signup').classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    closeSignup() {
      document.getElementById('dsm-signup').classList.remove('open');
      document.body.style.overflow = '';
    },

    openDemo() {
      document.getElementById('dsm-demo').classList.add('open');
      document.body.style.overflow = 'hidden';
      this._fillSlots();
    },

    closeDemo() {
      document.getElementById('dsm-demo').classList.remove('open');
      document.body.style.overflow = '';
    },

    _fillSlots() {
      const grid = document.getElementById('dsm-slots-grid');
      if (!grid || grid.children.length) return;
      buildSlots().forEach(s => {
        const btn = document.createElement('div');
        btn.className = 'dsm-slot';
        btn.innerHTML = `<div class="dsm-slot-day">${s.label}</div><div class="dsm-slot-time">${s.time}</div><div class="dsm-slot-ok">Disponible</div>`;
        btn.addEventListener('click', () => {
          grid.querySelectorAll('.dsm-slot').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('dm-slot').value = s.value;
        });
        grid.appendChild(btn);
      });
    },

    _err(btn, msg) {
      const orig = btn.innerHTML;
      btn.style.cssText += ';background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);color:#ef4444;';
      btn.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${msg}`;
      btn.disabled = true;
      setTimeout(() => { btn.innerHTML = orig; btn.removeAttribute('style'); btn.disabled = false; }, 3000);
    },

    _success(bodyId, title, msg, closeFn) {
      document.getElementById(bodyId).innerHTML = `
        <div class="dsm-success">
          <div class="dsm-ok-icon">✓</div>
          <h3>${title}</h3>
          <p>${msg}</p>
          <button class="dsm-btn dsm-btn-ice" style="max-width:180px;margin:20px auto 0;"
            onclick="${closeFn}">Fermer</button>
        </div>`;
    }
  };

  // ── Fermer en cliquant l'overlay ou Escape ────────────────────
  ['dsm-signup','dsm-demo'].forEach(id => {
    document.getElementById(id).addEventListener('click', function(e) {
      if (e.target === this) {
        if (id === 'dsm-signup') DS_MODALS.closeSignup();
        else DS_MODALS.closeDemo();
      }
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { DS_MODALS.closeSignup(); DS_MODALS.closeDemo(); }
  });

  // ── Soumission inscription ────────────────────────────────────
  document.getElementById('dsm-signup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn    = document.getElementById('dsm-signup-btn');
    const prenom = document.getElementById('su-prenom').value.trim();
    const nom    = document.getElementById('su-nom').value.trim();
    const email  = document.getElementById('su-email').value.trim();
    const pass   = document.getElementById('su-pass').value;
    const plan   = document.getElementById('su-plan').value;

    if (!prenom || !nom || !email || !pass) return DS_MODALS._err(btn, 'Champs obligatoires manquants');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return DS_MODALS._err(btn, 'Email invalide');
    if (pass.length < 8) return DS_MODALS._err(btn, 'Mot de passe trop court (8 min.)');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Création du compte…';

    // Firebase Auth si disponible
    if (auth) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: `${prenom} ${nom}` });
        window.location.href = './dashboard.html';
        return;
      } catch (err) {
        const ERRS = {
          'auth/email-already-in-use': 'Email déjà utilisé — <a href="./auth.html" style="color:#8B7FF0">Se connecter</a>',
          'auth/weak-password': 'Mot de passe trop faible',
          'auth/invalid-email': 'Email invalide',
        };
        return DS_MODALS._err(btn, ERRS[err.code] || 'Erreur — réessayez');
      }
    }

    // Fallback → rediriger vers auth.html avec paramètres pré-remplis
    await new Promise(r => setTimeout(r, 800));
    const q = new URLSearchParams({ email, prenom, nom, plan, mode: 'signup' });
    window.location.href = `./auth.html?${q}`;
  });

  // ── Soumission démo ───────────────────────────────────────────
  document.getElementById('dsm-demo-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn     = document.getElementById('dsm-demo-btn');
    const prenom  = document.getElementById('dm-prenom').value.trim();
    const nom     = document.getElementById('dm-nom').value.trim();
    const email   = document.getElementById('dm-email').value.trim();
    const company = document.getElementById('dm-company').value.trim();
    const slot    = document.getElementById('dm-slot').value;

    if (!prenom || !nom || !email || !company) return DS_MODALS._err(btn, 'Champs obligatoires manquants');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return DS_MODALS._err(btn, 'Email invalide');
    if (!slot) return DS_MODALS._err(btn, 'Sélectionnez un créneau');

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Envoi en cours…';

    // Ici : remplacer par un vrai appel API (ex. fetch('/api/book-demo', {...}))
    await new Promise(r => setTimeout(r, 1000));

    DS_MODALS._success(
      'dsm-demo-body',
      'Démo confirmée ! 🎉',
      `Un email de confirmation a été envoyé à <strong>${email}</strong>.<br>
       Créneau réservé : <strong>${slot}</strong>.<br>
       Notre équipe vous contactera dans les 2h.`,
      'DS_MODALS.closeDemo()'
    );
  });

  // ── Binding automatique des boutons CTA ──────────────────────
  function bindAll() {
    document.querySelectorAll('a[href], button').forEach(el => {
      if (el.dataset.dsmBound) return;
      const txt = el.textContent.trim().toLowerCase();
      const href = el.getAttribute('href') || '';

      // Démarrer gratuitement / Essai / plan buttons
      if (
        (txt.includes('démarrer') && txt.includes('gratuit')) ||
        txt.includes('essai gratuit') ||
        txt.includes('commencer avec') ||
        txt.includes('accéder à') ||
        (txt === 'parler à un expert') ||
        (href === '#' && el.classList.contains('btn-gold') && txt.includes('rocket'))
      ) {
        el.dataset.dsmBound = '1';
        const plan = el.closest('[class*="standard"]') ? 'standard'
                   : el.closest('[class*="premium"]') ? 'premium'
                   : el.closest('[class*="extra"]') ? 'extra'
                   : 'standard';
        el.addEventListener('click', ev => { ev.preventDefault(); DS_MODALS.openSignup(plan); });
      }

      // Réserver / démo
      if (
        txt.includes('réserver') ||
        txt.includes('démo gratuite') ||
        txt.includes('voir la démo') ||
        txt.includes('voir la documentation')
      ) {
        el.dataset.dsmBound = '1';
        el.addEventListener('click', ev => { ev.preventDefault(); DS_MODALS.openDemo(); });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll);
  } else {
    bindAll();
  }

  // Observer les mutations pour les éléments ajoutés dynamiquement
  new MutationObserver(bindAll).observe(document.body, { childList: true, subtree: true });

})();