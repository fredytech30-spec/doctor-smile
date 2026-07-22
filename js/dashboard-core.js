// ════════════════════════════════════════════════════════════════
//  dashboard-core.js — Doctor Smile (module core)
//  Initialisation, état global, listeners Firestore
//  Extrait de dashboard.js pour modularisation
// ════════════════════════════════════════════════════════════════

import { auth, db }                   from './firebase-config.js';
import { getAuthToken, onAuthChange } from './firebase-auth.js';
import {
  getUserProfile,
  listenUserProfile,
  listenUserAnalyses,
  getAbonnement,
  listenAbonnement,
  tsToString,
}                                     from './firebase-firestore.js';
import { requireAuth, checkPlan }     from './auth-guard.js';
import './utils.js';

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

// ── Exposition des fonctions core ─────────────────────────────
window.DS_CORE = {
  getState: () => S,
  getToken: _getToken,
  init: initDashboard,
  cleanup: cleanupRealtimeListeners,
};

// ════════════════════════════════════════════════════════════════
//  INITIALISATION DU DASHBOARD
// ════════════════════════════════════════════════════════════════
async function initDashboard() {
  console.log('[dashboard-core.js] Initialisation démarrée');

  const overlay = document.getElementById('loading-overlay');
  
  // S'assurer que les composants UI de base sont injectés
  if (typeof window._ds_injectContrastToggleUI === 'function') {
    window._ds_injectContrastToggleUI();
  }

  const entry = await window.DS_NAV?.handleDashboardEntry();
  if (entry?.action === 'demo') {
    window.DS_DASH?.loadAnalyse(window.DEMO_DATA);
  }

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

    // Appeler les fonctions UI si disponibles
    if (window.DS_DASH_UI?.updateUserUI) {
      window.DS_DASH_UI.updateUserUI();
    }
    
    if (window.DS_DASH_UI?.setTopbarDate) {
      window.DS_DASH_UI.setTopbarDate();
    }
    
    if (window.DS_DASH_KPI?.drawSparks) {
      window.DS_DASH_KPI.drawSparks([],[],[],[]);
    }

    setupRealtimeListeners(user.uid);
    
    // Animation d'entrée
    if (typeof fu === 'function') fu();
    
    setTimeout(() => window.DS_PROFILE?.initFromProfile(), 200);
    console.log('[Dashboard] Initialisé ✓');
  });
}

// ════════════════════════════════════════════════════════════════
//  ÉCOUTEURS FIRESTORE
// ════════════════════════════════════════════════════════════════
function setupRealtimeListeners(uid) {
  window.DS_NOTIFS?.init(uid);

  S._unsubProfile = listenUserProfile(uid, (profile) => {
    S.profile = profile;
    if (window.DS_DASH_UI?.updateUserUI) {
      window.DS_DASH_UI.updateUserUI();
    }
    getAbonnement(uid).then(ab => {
      S.abonnement = ab||{plan:'standard'};
      if (window.DS_DASH_UI?.updateUserUI) {
        window.DS_DASH_UI.updateUserUI();
      }
    }).catch(() => { 
      S.abonnement={plan:'standard'}; 
      if (window.DS_DASH_UI?.updateUserUI) {
        window.DS_DASH_UI.updateUserUI();
      }
    });
  });

  S._unsubAbonnement = listenAbonnement(uid, (ab) => {
    S.abonnement = ab||{plan:'standard'};
    if (window.DS_DASH_UI?.updateUserUI) {
      window.DS_DASH_UI.updateUserUI();
    }
    if (ab?.plan && ab.plan!==S.profile?.plan) {
      if (window.showToast) showToast(`🎉 Plan mis à jour : ${ab.plan}`,'ok');
    }
  });

  S._unsubAnalyses = listenUserAnalyses(uid, (analyses) => {
    S.analyses = analyses||[];
    console.log('[dashboard-core] Analyses reçues:', S.analyses.length, 'currentAnalyse:', S.currentAnalyse?.id);

    if (window.DS_DASH_UI?.renderSidebar) {
      window.DS_DASH_UI.renderSidebar();
    }

    if (window.DS_DASH_KPI?.updateKPIs) {
      window.DS_DASH_KPI.updateKPIs();
    }

    _checkProactiveAlerts(S.analyses);

    if (!S.analyses.length) {
      if (window.DS_DASH_UI?.showEmptyState) {
        window.DS_DASH_UI.showEmptyState();
      }
      return;
    }

    if (S.waitingForResult && S.pendingAnalyseId) {
      const fresh = S.analyses.find(a=>a.id===S.pendingAnalyseId&&a.status==='completed');
      if (fresh) {
        S.waitingForResult=false;
        window.DS_UPLOAD?.hidePipeline();
        if (window.DS_DASH?.loadAnalyse) {
          window.DS_DASH.loadAnalyse(fresh);
        }
        if (window.showToast) showToast('✓ Analyse terminée','ok');
        if (window._DS_notifyAnalyseDone) window._DS_notifyAnalyseDone(fresh);
        return;
      }
    }

    // Charger automatiquement la première analyse si aucune n'est chargée
    if (!S.currentAnalyse && S.analyses.length>0) {
      console.log('[dashboard-core] Chargement automatique première analyse:', S.analyses[0].id);
      if (window.DS_DASH?.loadAnalyse) {
        window.DS_DASH.loadAnalyse(S.analyses[0]);
      } else if (window.DS?.loadAnalyse) {
        window.DS.loadAnalyse(S.analyses[0]);
      }
    }
  });
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

// Auto-initialisation
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}

export { S, initDashboard, cleanupRealtimeListeners, _getToken };
