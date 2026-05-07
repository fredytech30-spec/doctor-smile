// ════════════════════════════════════════════════════════════════
//  utils.js — Doctor Smile
//  Fonctions utilitaires partagées
// ════════════════════════════════════════════════════════════════

// ── Formatage ────────────────────────────────────────────────────
export function formatDate(date, locale = "fr-FR") {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export function formatScore(score) {
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function formatCurrency(val, currency = "EUR") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(val);
}

export function formatPercent(val, decimals = 1) {
  return `${(val * 100).toFixed(decimals)}%`;
}

// ── Zone de risque ───────────────────────────────────────────────
export function getZoneRisque(score) {
  if (score >= 75) return { label: "Zone Saine",     color: "#10b981", icon: "fa-shield-check" };
  if (score >= 50) return { label: "Zone Vigilance", color: "#f59e0b", icon: "fa-triangle-exclamation" };
  if (score >= 25) return { label: "Zone Risque",    color: "#f97316", icon: "fa-circle-exclamation" };
  return             { label: "Zone Critique",       color: "#ef4444", icon: "fa-skull-crossbones" };
}

// ── Validation ───────────────────────────────────────────────────
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidSiret(siret) {
  return /^\d{14}$/.test(siret.replace(/\s/g, ""));
}

// ════════════════════════════════════════════════════════════════
//  fetchWithAuth — version corrigée et robuste
// ════════════════════════════════════════════════════════════════

/**
 * Attend que auth.currentUser soit disponible et rafraîchit le token
 */
async function waitForAuthUser(timeoutMs = 8000) {
  const { auth } = await import("./firebase-config.js");

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
}

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
      const user = await waitForAuthUser(8000);

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

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers || {})
  };

  // ✅ Retourner la Response brute — dashboard.js gère response.ok et response.json()
  return fetch(url, { ...options, headers });
}

// ── Debounce ─────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Copier dans le presse-papier ─────────────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}