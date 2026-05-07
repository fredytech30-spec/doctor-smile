// ════════════════════════════════════════════════════════════════
//  navigation.js — Doctor Smile
//  Logique de navigation globale entre toutes les pages
//  À inclure dans : doctorSmile_v4.html + auth.html
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  FONCTIONS DE NAVIGATION — Site vitrine (doctorSmile_v4.html)
// ════════════════════════════════════════════════════════════════

/**
 * Connexion simple → page auth
 */
function goToLogin() {
  window.location.href = 'auth.html?mode=login';
}

/**
 * Inscription simple → page auth
 */
function goToSignup() {
  window.location.href = 'auth.html?mode=signup';
}

/**
 * Démo gratuite → auth avec mode démo
 * Après connexion → dashboard avec démo chargée
 */
function goToDemo() {
  window.location.href = 'auth.html?mode=signup&redirect=demo';
}

/**
 * Démarrer gratuitement → inscription plan Standard
 */
function goToStandard() {
  window.location.href = 'auth.html?mode=signup&plan=standard';
}

/**
 * Plan Premium → inscription puis Stripe
 */
function goToPremium() {
  window.location.href = 'auth.html?mode=signup&plan=premium';
}

/**
 * Plan Extra → inscription puis Stripe
 */
function goToExtra() {
  window.location.href = 'auth.html?mode=signup&plan=extra';
}

/**
 * Réserver une démo → scroll vers #contact
 */
function goToContact() {
  const el = document.getElementById('contact');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  else window.location.href = 'doctorSmile_v4.html#contact';
}

// ════════════════════════════════════════════════════════════════
//  LECTURE DES PARAMÈTRES URL — auth.html
// ════════════════════════════════════════════════════════════════

function getAuthParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    mode:     p.get('mode')     || 'login',     // login | signup
    plan:     p.get('plan')     || 'standard',  // standard | premium | extra
    redirect: p.get('redirect') || '',          // demo | ''
  };
}

/**
 * Appelé après une authentification réussie (login ou signup)
 * Gère la redirection selon le plan choisi
 */
async function handlePostAuth(user, plan, redirect) {
  // Sauvegarder le plan choisi en localStorage (temporaire)
  if (plan && plan !== 'standard') {
    localStorage.setItem('ds_pending_plan', plan);
  }
  if (redirect === 'demo') {
    localStorage.setItem('ds_load_demo', '1');
  }

  // Toujours aller vers le dashboard d'abord
  window.location.href = 'dashboard.html';
}

// ════════════════════════════════════════════════════════════════
//  LOGIQUE AU CHARGEMENT DU DASHBOARD
//  À appeler dans init() de dashboard.js
// ════════════════════════════════════════════════════════════════

async function handleDashboardEntry() {
  const pendingPlan = localStorage.getItem('ds_pending_plan');
  const loadDemo    = localStorage.getItem('ds_load_demo');

  // Nettoyer le localStorage
  localStorage.removeItem('ds_pending_plan');
  localStorage.removeItem('ds_load_demo');

  // Charger la démo si demandé
  if (loadDemo === '1') {
    console.log('[Nav] Mode démo activé');
    return { action: 'demo' };
  }

  // Lancer Stripe si plan payant en attente
  if (pendingPlan && pendingPlan !== 'standard') {
    console.log('[Nav] Plan payant en attente :', pendingPlan);
    // Petit délai pour laisser le dashboard charger
    setTimeout(() => {
      window.DS_PAYMENT?.showPaymentModal(pendingPlan);
    }, 1500);
    return { action: 'payment', plan: pendingPlan };
  }

  return { action: 'normal' };
}

// ════════════════════════════════════════════════════════════════
//  PATCH DU SITE VITRINE
//  Remplace tous les href="#" et boutons statiques par des actions
// ════════════════════════════════════════════════════════════════

function patchVitrine() {
  // Nav → Connexion
  const connexionBtn = document.querySelector('a[href="./auth.html"]');
  if (connexionBtn) {
    connexionBtn.href = 'auth.html?mode=login';
  }

  // Nav → Démo gratuite
  document.querySelectorAll('a[href="#contact"].btn-gold').forEach(btn => {
    btn.removeAttribute('href');
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => { e.preventDefault(); goToDemo(); });
  });

  // Hero → Démarrer gratuitement
  document.querySelectorAll('.cta-btns .btn-gold').forEach(btn => {
    btn.removeAttribute('href');
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => { e.preventDefault(); goToStandard(); });
  });

  // Hero → Réserver une démo
  document.querySelectorAll('.cta-btns .btn-glass').forEach(btn => {
    btn.removeAttribute('href');
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => { e.preventDefault(); goToContact(); });
  });

  // Pricing → boutons des cartes
  const pricingBtns = document.querySelectorAll('.p-btn');
  pricingBtns.forEach(btn => {
    const card = btn.closest('.p-card');
    if (!card) return;

    if (card.classList.contains('standard')) {
      btn.addEventListener('click', () => goToStandard());
    } else if (card.classList.contains('premium')) {
      btn.addEventListener('click', () => goToPremium());
    } else if (card.classList.contains('extra')) {
      btn.addEventListener('click', () => goToExtra());
    }
  });

  // Mobile menu → Démo gratuite
  document.querySelectorAll('.mobile-nav .btn-gold').forEach(btn => {
    btn.removeAttribute('href');
    btn.addEventListener('click', (e) => { e.preventDefault(); goToDemo(); });
  });

  console.log('[Nav] Vitrine patchée ✅');
}

// ════════════════════════════════════════════════════════════════
//  PATCH DE AUTH.HTML
//  Adapte le formulaire selon les paramètres URL
// ════════════════════════════════════════════════════════════════

function patchAuth() {
  const { mode, plan, redirect } = getAuthParams();

  // Afficher le bon onglet (login ou signup)
  if (mode === 'signup') {
    // Cliquer sur l'onglet inscription si disponible
    const signupTab = document.querySelector('[data-tab="signup"], #tab-signup, .tab-signup');
    if (signupTab) signupTab.click();
  }

  // Afficher le plan choisi dans le formulaire
  if (plan && plan !== 'standard') {
    const planBadge = document.getElementById('auth-plan-badge');
    const planNames = { premium: 'Premium — 79€/mois', extra: 'Extra — 159€/mois' };
    const planColors = { premium: '#FFD700', extra: '#a78bfa' };

    if (planBadge) {
      planBadge.textContent = `Plan sélectionné : ${planNames[plan] || plan}`;
      planBadge.style.color = planColors[plan] || '#7DD3FC';
      planBadge.style.display = 'block';
    } else {
      // Créer le badge si absent
      const form = document.querySelector('form, .auth-form, .auth-card');
      if (form) {
        const badge = document.createElement('div');
        badge.style.cssText = `
          text-align:center;padding:8px 16px;margin-bottom:16px;
          border-radius:8px;font-size:11px;font-weight:700;
          background:rgba(255,215,0,.08);
          color:${planColors[plan] || '#7DD3FC'};
          border:1px solid ${planColors[plan] || '#7DD3FC'}33;
        `;
        badge.textContent = `✦ Plan sélectionné : ${planNames[plan] || plan}`;
        form.insertBefore(badge, form.firstChild);
      }
    }
  }

  // Message si mode démo
  if (redirect === 'demo') {
    const subtitle = document.querySelector('.auth-subtitle, .auth-desc, h2 + p');
    if (subtitle) {
      subtitle.textContent = 'Créez votre compte gratuit pour accéder à la démo interactive.';
    }
  }

  console.log('[Nav] Auth patchée ✅ mode=%s plan=%s', mode, plan);
}

// ════════════════════════════════════════════════════════════════
//  AUTO-INIT selon la page courante
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const page = window.location.pathname.split('/').pop();

  if (page === 'doctorSmile_v4.html' || page === '') {
    patchVitrine();
  } else if (page === 'auth.html') {
    patchAuth();
  }
});

// ── Exposition globale ─────────────────────────────────────────
window.DS_NAV = {
  goToLogin,
  goToSignup,
  goToDemo,
  goToStandard,
  goToPremium,
  goToExtra,
  goToContact,
  handlePostAuth,
  handleDashboardEntry,
};
