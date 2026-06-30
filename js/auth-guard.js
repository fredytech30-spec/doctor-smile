// ════════════════════════════════════════════════════════════════
//  auth-guard.js
//  Protection des routes — Doctor Smile
//  Empêche les utilisateurs non connectés d'accéder au dashboard
//  et redirige les utilisateurs connectés hors de la page auth
// ════════════════════════════════════════════════════════════════

import { onAuthChange }  from "./firebase-auth.js";
import { getAbonnement } from "./firebase-firestore.js";

// ════════════════════════════════════════════════════════════════
//  requireAuth()
//  À appeler sur dashboard.html et toutes les pages protégées
//  → Si non connecté : redirige vers auth.html
//  → Si connecté    : retourne { user, profile, abonnement }
// ════════════════════════════════════════════════════════════════
function requireAuth(onReady) {
  // Afficher un loader pendant la vérification
  showPageLoader();

  // ── FIX : Timeout de sécurité si Firebase ne répond pas
  let resolved = false;
  const timeout = setTimeout(() => {
    if (!resolved) {
      console.warn('[auth-guard] Firebase timeout — redirection vers auth.html');
      window.location.href = '/auth.html';
    }
  }, 8000);

  const unsubscribe = onAuthChange(async ({ loggedIn, user, profile }) => {
    if (resolved) return;
    resolved = true;
    clearTimeout(timeout);
    unsubscribe();

    if (!loggedIn) {
      window.location.href = '/auth.html';
      return;
    }

    // ⚠️ DÉSACTIVER LA REDIRECTION OTP DANS LE GUARD POUR ÉVITER LA BOUCLE
    // La redirection OTP est déjà gérée dans auth-ui.js après login volontaire
    console.log('[auth-guard] Session active, mais pas de redirection OTP automatique');

    // Connecté — récupérer l'abonnement Firestore
    const abonnement = await getAbonnement(user.uid);

    // ── FIX : Vérifier si le profil est complet
    if (profile && profile.profileComplete === false) {
      console.warn('[auth-guard] Profil incomplet — redirection vers finalisation');
      window.location.href = '/auth.html?complete=true';
      return;
    }

    hidePageLoader();

    if (onReady) {
      onReady({ user, profile, abonnement });
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  requireAdmin()
//  À appeler sur les pages admin uniquement
// ════════════════════════════════════════════════════════════════
function requireAdmin(onReady) {
  showPageLoader();

  const unsubscribe = onAuthChange(async ({ loggedIn, user, profile }) => {
    unsubscribe();

    if (!loggedIn) {
      window.location.href = "/auth.html";
      return;
    }

    // Vérifier le rôle admin dans le profil Firestore
    if (!profile || profile.role !== "admin") {
      // Pas admin → rediriger vers dashboard normal
      window.location.href = "/dashboard.html";
      return;
    }

    hidePageLoader();
    if (onReady) onReady({ user, profile });
  });
}

// ════════════════════════════════════════════════════════════════
//  redirectIfLoggedIn()
//  À appeler sur auth.html
//  → Si déjà connecté : redirige vers dashboard.html
// ════════════════════════════════════════════════════════════════
function redirectIfLoggedIn() {
  // Vérifier si on est en mode "complete profile" (Google login)
  const params = new URLSearchParams(window.location.search);
  if (params.get("complete") === "true") return; // laisser passer

  // NE PAS rediriger automatiquement au chargement de la page.
  // Le redirection vers OTP doit être déclenchée uniquement après un login volontaire
  // via `handleLogin()` dans `auth-ui.js` pour éviter les boucles causées
  // par la restauration automatique de session Firebase.
  return;
}

// ════════════════════════════════════════════════════════════════
//  checkPlan()
//  Vérifie si l'utilisateur a accès à une feature selon son plan
//  @param {string} plan      — plan actuel de l'utilisateur
//  @param {string} required  — plan minimum requis
// ════════════════════════════════════════════════════════════════
function checkPlan(plan, required) {
  const levels = { standard: 1, premium: 2, extra: 3 };
  return (levels[plan] || 0) >= (levels[required] || 0);
}

// ════════════════════════════════════════════════════════════════
//  HELPERS — Loader page
// ════════════════════════════════════════════════════════════════
function showPageLoader() {
  // Créer un overlay de chargement s'il n'existe pas
  if (document.getElementById("ds-page-loader")) return;
  const loader = document.createElement("div");
  loader.id = "ds-page-loader";
  loader.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #03060D;
    display: flex; align-items: center; justify-content: center;
    flex-direction: column; gap: 16px;
  `;
  loader.innerHTML = `
    <div style="
      width: 40px; height: 40px; border-radius: 50%;
      border: 2px solid rgba(139,127,240,0.15);
      border-top-color: #8B7FF0;
      animation: dspin 0.7s linear infinite;
    "></div>
    <div style="font-family:'Syne',sans-serif;font-size:11px;
      letter-spacing:0.2em;text-transform:uppercase;
      color:rgba(255,255,255,0.3);">
      Chargement…
    </div>
    <style>@keyframes dspin{to{transform:rotate(360deg);}}</style>
  `;
  document.body.appendChild(loader);
}

function hidePageLoader() {
  const loader = document.getElementById("ds-page-loader");
  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s ease";
    setTimeout(() => loader.remove(), 300);
  }
}

// ════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════
export {
  requireAuth,
  requireAdmin,
  redirectIfLoggedIn,
  checkPlan
};
