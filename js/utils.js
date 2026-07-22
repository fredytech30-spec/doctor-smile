// ════════════════════════════════════════════════════════════════
//  utils.js — Doctor Smile
//  Fonctions utilitaires partagées
// ════════════════════════════════════════════════════════════════

import { auth } from './firebase-config.js';

// ── Formatage ────────────────────────────────────────────────────
window.formatDate = function(date, locale = "fr-FR") {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
};

window.formatScore = function(score) {
  return Math.round(Math.max(0, Math.min(100, score)));
};

window.formatCurrency = function(val, currency = "EUR") {
  if (currency === 'FCFA') {
    // Formattage simple puis suffixe 'FCFA' pour une homogénéité lisible
    const fmt = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(val);
    return fmt + ' FCFA';
  }
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(val);
};

window.formatPercent = function(val, decimals = 1) {
  return `${(val * 100).toFixed(decimals)}%`;
};

// ── Zone de risque ───────────────────────────────────────────────
window.getZoneRisque = function(score) {
  if (score >= 75) return { label: "Zone Saine",     color: "#10b981", icon: "fa-shield-check" };
  if (score >= 50) return { label: "Zone Vigilance", color: "#f59e0b", icon: "fa-triangle-exclamation" };
  if (score >= 25) return { label: "Zone Risque",    color: "#f97316", icon: "fa-circle-exclamation" };
  return             { label: "Zone Critique",       color: "#ef4444", icon: "fa-skull-crossbones" };
};

// ── Validation ───────────────────────────────────────────────────
window.isValidEmail = function(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

window.isValidSiret = function(siret) {
  return /^\d{14}$/.test(siret.replace(/\s/g, ""));
};

// ════════════════════════════════════════════════════════════════
//  fetchWithAuth — version corrigée et robuste
// ════════════════════════════════════════════════════════════════

/**
 * Attend que auth.currentUser soit disponible et rafraîchit le token
 */
window.waitForAuthUser = async function(timeoutMs = 8000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.warn("[waitForAuthUser] Timeout — aucun utilisateur trouvé");
      resolve(null);
    }, timeoutMs);

    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        clearTimeout(timer);
        unsub();

        try {
          // Force refresh pour token frais
          const token = await user.getIdToken(true);
          console.log("[waitForAuthUser] Token frais obtenu");
          resolve(user);
        } catch (e) {
          console.error("[waitForAuthUser] Erreur getIdToken:", e);
          resolve(null);
        }
      }
    });
  });
};

/**
 * Fetch avec token Firebase frais (attente + retry si besoin)
 */
export async function fetchWithAuth(url, options = {}) {
  let token = null;
  let retries = 0;
  const maxRetries = 2;

  while (retries <= maxRetries) {
    try {
      // Attendre authentification + token frais
      const user = await window.waitForAuthUser(8000);

      if (user) {
        token = await user.getIdToken(true); // force refresh à chaque appel
        console.log("[fetchWithAuth] Token obtenu — longueur:", token.length);
        break;
      } else {
        console.warn("[fetchWithAuth] Pas d'utilisateur connecté (retry", retries + 1, ")");
      }
    } catch (e) {
      console.error("[fetchWithAuth] Erreur auth:", e);
    }

    retries++;
    await new Promise(r => setTimeout(r, 1000 * retries)); // backoff
  }

  if (!token) {
    console.error("[fetchWithAuth] Échec définitif de récupération token");
    throw new Error("Authentification requise");
  }

  // ── Headers de base ───────────────────────────────────────────
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // ── Header 2FA — injecté automatiquement si session active ────
  const twoFAToken = sessionStorage.getItem('2fa_verified');
  const twoFAUid   = sessionStorage.getItem('2fa_uid');
  if (twoFAToken) {
    headers['X-2FA-Verified'] = twoFAToken;
  }
  if (twoFAUid) {
    headers['X-User-UID'] = twoFAUid;
  }

  // ── Fusion avec les headers fournis ───────────────────────────
  Object.assign(headers, options.headers || {});

  // ✅ Retourner la Response brute — dashboard.js gère response.ok et response.json()
  return fetch(url, { ...options, headers, credentials: 'same-origin' });
};

window.fetchWithAuth = fetchWithAuth;

// ── Debounce ─────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

window.debounce = debounce;

// ── Copier dans le presse-papier ─────────────────────────────────
window.copyToClipboard = async function(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
