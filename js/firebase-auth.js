// ════════════════════════════════════════════════════════════════
//  firebase-auth.js
//  Toute la logique Authentication Firebase — Doctor Smile
//  Gère : inscription, connexion, déconnexion, reset password,
//         Google OAuth, écoute état auth, token pour FastAPI
// ════════════════════════════════════════════════════════════════

import { auth }                         from "./firebase-config.js";
import { saveUserProfile, getUserProfile, saveAbonnement } from "./firebase-firestore.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getIdToken,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ════════════════════════════════════════════════════════════════
//  1. INSCRIPTION — Email + Password
//     Crée le compte Firebase + sauvegarde profil dans Firestore
// ════════════════════════════════════════════════════════════════
async function registerUser(userData) {
  /*
    userData = {
      prenom, nom, email, password,
      role, entreprise: { nom, secteur, taille, pays, siret },
      poste, plan, source
    }
  */
  try {
    // 1a. Créer le compte Firebase Auth
    const credential = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    const user = credential.user;

    // 1b. Mettre à jour le displayName Firebase (prénom + nom)
    await updateProfile(user, {
      displayName: `${userData.prenom} ${userData.nom}`
    });

    // 1c. Envoyer l'email de vérification
    await sendEmailVerification(user);

    // 1d. Calculer trialEnd pour les plans payants
    const plan       = userData.plan || "standard";
    const trialDays  = plan !== "standard" ? (userData.trialDays || 45) : 0;
    const trialEnd   = plan !== "standard"
      ? new Date(Date.now() + trialDays * 24 * 3600 * 1000)
      : null;
    const trialStatus = plan !== "standard" ? "trial" : "active";

    // 1e. Sauvegarder le profil complet dans Firestore (users/{uid})
    await saveUserProfile(user.uid, {
      prenom:      userData.prenom,
      nom:         userData.nom,
      email:       userData.email,
      role:        userData.role   || "analyst",
      poste:       userData.poste  || "",
      plan:        plan,
      source:      userData.source || "",
      trialStatus, trialEnd, trialDays,
      entreprise: {
        nom:     userData.entreprise.nom,
        secteur: userData.entreprise.secteur,
        taille:  userData.entreprise.taille,
        pays:    userData.entreprise.pays,
        siret:   userData.entreprise.siret || null
      },
      emailVerified: false,
      createdAt:     new Date(),
      lastLogin:     new Date()
    });

    // 1f. CRITIQUE — Créer abonnements/{uid} que listenAbonnement écoute
    // Sans ce document, le dashboard revient toujours à "standard"
    await saveAbonnement(user.uid, {
      plan,
      status:      trialStatus,
      trialEnd,
      trialDays,
      startedAt:   new Date(),
      nextBilling: trialEnd,
    });

    return { success: true, user };

  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  2. CONNEXION — Email + Password
// ════════════════════════════════════════════════════════════════
async function loginUser(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Mettre à jour lastLogin dans Firestore
    await saveUserProfile(user.uid, { lastLogin: new Date() }, true);

    return { success: true, user };

  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  3. CONNEXION — Google OAuth
// ════════════════════════════════════════════════════════════════
async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");

    const result = await signInWithPopup(auth, provider);
    const user   = result.user;

    // Vérifie si c'est un nouvel utilisateur Google
    const isNew = result._tokenResponse?.isNewUser || false;

    if (isNew) {
      // Crée le profil minimal — l'utilisateur complétera à l'étape 2
      const nameParts = (user.displayName || "").split(" ");
      await saveUserProfile(user.uid, {
        prenom:        nameParts[0] || "",
        nom:           nameParts.slice(1).join(" ") || "",
        email:         user.email,
        role:          "analyst",
        poste:         "",
        plan:          "standard",
        source:        "google",
        entreprise:    { nom: "", secteur: "", taille: "", pays: "", siret: null },
        emailVerified: true,
        createdAt:     new Date(),
        lastLogin:     new Date(),
        profileComplete: false   // ← indique que l'étape 2 n'est pas faite
      });
    } else {
      await saveUserProfile(user.uid, { lastLogin: new Date() }, true);
    }

    return { success: true, user, isNew };

  } catch (error) {
    // L'utilisateur a fermé la popup — ne pas traiter comme une erreur
    if (error.code === "auth/popup-closed-by-user") {
      return { success: false, error: null, cancelled: true };
    }
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  4. DÉCONNEXION
// ════════════════════════════════════════════════════════════════
async function logoutUser() {
  try {
    await signOut(auth);
    // Nettoyer le localStorage
    localStorage.removeItem("ds_user");
    localStorage.removeItem("ds_token");
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ════════════════════════════════════════════════════════════════
//  5. RESET PASSWORD
// ════════════════════════════════════════════════════════════════
async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email, {
      // URL de redirection après reset (optionnel)
      url: window.location.origin + "/auth.html"
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  6. RENVOI EMAIL DE VÉRIFICATION
// ════════════════════════════════════════════════════════════════
async function resendVerificationEmail() {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Non connecté" };
    await sendEmailVerification(user);
    return { success: true };
  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  7. OBTENIR LE TOKEN JWT (pour appels FastAPI)
//     À appeler avant chaque requête vers le backend Python
// ════════════════════════════════════════════════════════════════
async function getAuthToken() {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    // forceRefresh = true renouvelle si expiré (expire après 1h)
    const token = await getIdToken(user, true);
    return token;
  } catch (error) {
    console.error("Erreur token:", error);
    return null;
  }
}

// ════════════════════════════════════════════════════════════════
//  8. ÉCOUTE ÉTAT AUTH — à appeler au chargement de chaque page
//     Callback appelé à chaque changement (login/logout/token refresh)
// ════════════════════════════════════════════════════════════════
function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Utilisateur connecté — récupère son profil Firestore
      // ── FIX : timeout de 5s sur getUserProfile pour éviter un blocage
      try {
        const profilePromise = getUserProfile(user.uid);
        const timeoutPromise = new Promise(resolve =>
          setTimeout(() => resolve(null), 5000)
        );
        const profile = await Promise.race([profilePromise, timeoutPromise]);
        callback({ loggedIn: true, user, profile });
      } catch (e) {
        // En cas d'erreur Firestore, continuer avec profile null
        // Le dashboard utilisera les données Firebase Auth comme fallback
        console.warn('[firebase-auth] getUserProfile failed:', e.message);
        callback({ loggedIn: true, user, profile: null });
      }
    } else {
      callback({ loggedIn: false, user: null, profile: null });
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  9. OBTENIR L'UTILISATEUR COURANT (synchrone)
// ════════════════════════════════════════════════════════════════
function getCurrentUser() {
  return auth.currentUser;
}

// ════════════════════════════════════════════════════════════════
//  10. CHANGER LE MOT DE PASSE (utilisateur connecté)
// ════════════════════════════════════════════════════════════════
async function changePassword(currentPassword, newPassword) {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Non connecté" };

    // Ré-authentifier d'abord (requis par Firebase)
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Mettre à jour
    const { updatePassword } = await import(
      "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
    );
    await updatePassword(user, newPassword);
    return { success: true };

  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  11. SUPPRIMER LE COMPTE
// ════════════════════════════════════════════════════════════════
async function deleteAccount(password) {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "Non connecté" };

    // Ré-authentifier avant suppression
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    await deleteUser(user);
    return { success: true };

  } catch (error) {
    return { success: false, error: parseAuthError(error.code) };
  }
}

// ════════════════════════════════════════════════════════════════
//  HELPER — Traduction des codes d'erreur Firebase en français
// ════════════════════════════════════════════════════════════════
function parseAuthError(code) {
  const errors = {
    "auth/email-already-in-use":    "Cette adresse e-mail est déjà utilisée.",
    "auth/invalid-email":           "Adresse e-mail invalide.",
    "auth/weak-password":           "Mot de passe trop faible (minimum 6 caractères).",
    "auth/user-not-found":          "Aucun compte trouvé avec cet e-mail.",
    "auth/wrong-password":          "Mot de passe incorrect.",
    "auth/invalid-credential":      "E-mail ou mot de passe incorrect.",
    "auth/too-many-requests":       "Trop de tentatives. Réessayez dans quelques minutes.",
    "auth/network-request-failed":  "Erreur réseau. Vérifiez votre connexion.",
    "auth/user-disabled":           "Ce compte a été désactivé.",
    "auth/requires-recent-login":   "Reconnectez-vous avant d'effectuer cette action.",
    "auth/popup-blocked":           "La popup a été bloquée. Autorisez les popups.",
    "auth/account-exists-with-different-credential":
                                    "Un compte existe déjà avec cet e-mail.",
  };
  return errors[code] || `Erreur inattendue (${code}). Réessayez.`;
}

// ════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════
export {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  resendVerificationEmail,
  getAuthToken,
  onAuthChange,
  getCurrentUser,
  changePassword,
  deleteAccount,
  parseAuthError
};