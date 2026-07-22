// ════════════════════════════════════════════════════════════════
//  dashboard-ui.js — Doctor Smile (module UI)
//  Fonctions d'interface utilisateur du dashboard
//  Extrait de dashboard.js pour modularisation
// ════════════════════════════════════════════════════════════════

import { S } from './dashboard-core.js';

// ── Exposition des fonctions UI ─────────────────────────────────────
window.DS_DASH_UI = {
  updateUserUI,
  syncPlanBadges,
  updatePlanCards,
  renderSidebar,
  showEmptyState,
  setTopbarDate,
};

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
    av.onclick = (e) => { 
      e.stopPropagation(); 
      if (window.DS_EXTRA?.showProfileDrawer) window.DS_EXTRA.showProfileDrawer(); 
      else if (window.DS_PROFILE?.openDrawer) window.DS_PROFILE.openDrawer(); 
    };
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

  // Race-condition guard : Source-of-truth = Firestore abonnement quand dispo
  const planFromAb = S.abonnement?.plan;
  const plan = (planFromAb && ['standard','premium','extra'].includes(planFromAb))
    ? planFromAb
    : (S.profile?.plan && ['standard','premium','extra'].includes(S.profile.plan))
      ? S.profile.plan
      : 'standard';

  delete S._lastKnownPlan;

  syncPlanBadges(plan);
  updatePlanCards(plan);

  document.body.setAttribute('data-plan', plan);

  // Particules Extra
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
    }
  } else {
    const existing = document.getElementById('plan-particles');
    if (existing) existing.remove();
  }
}

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
    const msToHuman = (ms) => {
      const s = Math.floor(ms/1000);
      const m = Math.floor(s/60);
      const h = Math.floor(m/60);
      const d = Math.floor(h/24);
      if (d > 0) return `${d}j`;
      if (h > 0) return `${h}h`;
      if (m > 0) return `${m}min`;
      return `${s}s`;
    };
    last.textContent   = 'Dernière analyse ' + msToHuman(now - lastAnalyseDate);
  } else {
    if (sep)  sep.style.display  = 'none';
    if (last) last.style.display = 'none';
  }
}

// ════════════════════════════════════════════════════════════════
//  SIDEBAR
// ════════════════════════════════════════════════════════════════
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  const list = document.getElementById('analyses-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  const filtered = S.analyses.filter(a => {
    if (!S.filterText) return true;
    const txt = S.filterText.toLowerCase();
    return (a.entreprise||'').toLowerCase().includes(txt) || 
           (a.id||'').toLowerCase().includes(txt);
  });
  
  filtered.forEach((a, idx) => {
    const isActive = S.currentAnalyse?.id === a.id;
    const div = document.createElement('div');
    div.className = `sidebar-item ${isActive ? 'active' : ''}`;
    div.style.animationDelay = `${idx * 30}ms`;
    div.innerHTML = `
      <div class="sidebar-item-header">
        <span class="sidebar-item-title">${a.entreprise || 'Analyse sans nom'}</span>
        <span class="sidebar-item-score score-${a.zone || 'saine'}">${a.score || '—'}</span>
      </div>
      <div class="sidebar-item-meta">
        <span>${new Date(a.createdAt?.toDate?.() || a.createdAt).toLocaleDateString('fr-FR')}</span>
        <span class="sidebar-item-status">${a.status === 'completed' ? '✓' : '⏳'}</span>
      </div>
    `;
    div.onclick = () => {
      if (window.DS_DASH?.loadAnalyse) {
        window.DS_DASH.loadAnalyse(a);
      }
    };
    list.appendChild(div);
  });
  
  const emptyMsg = document.getElementById('sidebar-empty');
  if (emptyMsg) {
    emptyMsg.style.display = filtered.length ? 'none' : 'block';
  }
}

function showEmptyState() {
  const uploadSec = document.getElementById('upload-sec');
  if (uploadSec) {
    uploadSec.style.display = 'block';
    uploadSec.style.opacity = '1';
    uploadSec.style.visibility = 'visible';
  }
  
  const sections = ['score-sec', 'ratios-sec', 'wi-sec', 'bottom-sec', 'chat-sec'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

export { updateUserUI, syncPlanBadges, updatePlanCards, renderSidebar, showEmptyState, setTopbarDate };
