// ════════════════════════════════════════════════════════════════
//  firebase-firestore.js
//  Toute la logique Firestore — Doctor Smile
//  Gère : profils users, analyses, conversations, abonnements
// ════════════════════════════════════════════════════════════════

import { db } from "./firebase-config.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// ════════════════════════════════════════════════════════════════
//  USERS — Profils utilisateurs
// ════════════════════════════════════════════════════════════════

/**
 * Sauvegarder ou mettre à jour le profil d'un utilisateur
 * @param {string}  uid        — UID Firebase Auth
 * @param {object}  data       — données à sauvegarder
 * @param {boolean} mergeOnly  — true = merge (update), false = set complet
 */
async function saveUserProfile(uid, data, mergeOnly = false) {
  try {
    const ref = doc(db, "users", uid);
    if (mergeOnly) {
      await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
    } else {
      await setDoc(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
    }
    return { success: true };
  } catch (error) {
    console.error("saveUserProfile:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer le profil complet d'un utilisateur
 * @param {string} uid
 * @returns {object|null} profil ou null
 */
async function getUserProfile(uid) {
  try {
    const ref  = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { uid, ...snap.data() };
    }
    return null;
  } catch (error) {
    console.error("getUserProfile:", error);
    return null;
  }
}

/**
 * Écouter les changements du profil en temps réel
 * @param {string}   uid
 * @param {function} callback — appelé à chaque modification
 * @returns {function} unsubscribe — appelle pour arrêter l'écoute
 */
function listenUserProfile(uid, callback) {
  const ref = doc(db, "users", uid);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() });
    } else {
      callback(null);
    }
  });
}

/**
 * Mettre à jour uniquement l'entreprise
 */
async function updateEntreprise(uid, entrepriseData) {
  return saveUserProfile(uid, { entreprise: entrepriseData }, true);
}

/**
 * Mettre à jour le plan de l'utilisateur
 */
async function updateUserPlan(uid, plan) {
  return saveUserProfile(uid, { plan }, true);
}


// ════════════════════════════════════════════════════════════════
//  ANALYSES — Résultats du pipeline ML
// ════════════════════════════════════════════════════════════════

/**
 * Sauvegarder une analyse (appelé par le backend Python via Admin SDK
 * OU directement depuis JS après réponse FastAPI)
 * @param {string} userId
 * @param {object} analyseData
 * @returns {string} analyseId
 */
async function saveAnalyse(userId, analyseData) {
  try {
    const ref = await addDoc(collection(db, "analyses"), {
      userId,
      ...analyseData,
      createdAt: serverTimestamp()
    });
    return { success: true, analyseId: ref.id };
  } catch (error) {
    console.error("saveAnalyse:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer une analyse par son ID
 */
async function getAnalyse(analyseId) {
  try {
    const ref  = doc(db, "analyses", analyseId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    return null;
  } catch (error) {
    console.error("getAnalyse:", error);
    return null;
  }
}

/**
 * Récupérer toutes les analyses d'un utilisateur
 * @param {string} userId
 * @param {number} maxResults — nombre max (défaut 20)
 */
async function getUserAnalyses(userId, maxResults = 20) {
  try {
    const q = query(
      collection(db, "analyses"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    // ── FIX : Si l'index composite n'existe pas encore (erreur Firestore courante),
    // on retente sans orderBy comme fallback
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.warn("getUserAnalyses: index manquant, fallback sans tri", error.message);
      try {
        const q2 = query(
          collection(db, "analyses"),
          where("userId", "==", userId),
          limit(maxResults)
        );
        const snap2 = await getDocs(q2);
        const docs = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
        // Tri côté client si l'index n'est pas prêt
        return docs.sort((a, b) => {
          const da = a.createdAt?.seconds ?? 0;
          const db2 = b.createdAt?.seconds ?? 0;
          return db2 - da;
        });
      } catch (e2) {
        console.error("getUserAnalyses fallback:", e2);
        return [];
      }
    }
    console.error("getUserAnalyses:", error);
    return [];
  }
}

/**
 * Écouter les nouvelles analyses en temps réel
 * Utile pour afficher le résultat dès que FastAPI a fini
 * @param {string}   userId
 * @param {function} callback
 * @returns {function} unsubscribe
 */
function listenUserAnalyses(userId, callback) {
  const q = query(
    collection(db, "analyses"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  // ── FIX : Gestion d'erreur si index composite pas encore créé
  return onSnapshot(q,
    (snap) => {
      const analyses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(analyses);
    },
    (error) => {
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn("listenUserAnalyses: index manquant, fallback sans orderBy");
        // Fallback : écoute sans orderBy, tri côté client
        const q2 = query(
          collection(db, "analyses"),
          where("userId", "==", userId),
          limit(10)
        );
        onSnapshot(q2, (snap2) => {
          const analyses = snap2.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
          callback(analyses);
        });
      } else {
        console.error("listenUserAnalyses:", error);
        callback([]);
      }
    }
  );
}

/**
 * Supprimer une analyse
 */
async function deleteAnalyse(analyseId) {
  try {
    await deleteDoc(doc(db, "analyses", analyseId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// ════════════════════════════════════════════════════════════════
//  CONVERSATIONS — Chat LLM
// ════════════════════════════════════════════════════════════════

/**
 * Créer une nouvelle conversation
 * @param {string} userId
 * @param {string|null} analyseId — analyse liée (optionnel)
 */
async function createConversation(userId, analyseId = null) {
  try {
    const ref = await addDoc(collection(db, "conversations"), {
      userId,
      analyseId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, convId: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Ajouter un message à une conversation
 * @param {string} convId
 * @param {object} message — { role: "user"|"assistant", content, graphJson }
 */
async function addMessage(convId, message) {
  try {
    const ref = await addDoc(
      collection(db, "conversations", convId, "messages"),
      {
        role:      message.role,
        content:   message.content,
        graphJson: message.graphJson || null,
        createdAt: serverTimestamp()
      }
    );
    // Mettre à jour updatedAt de la conversation
    await updateDoc(doc(db, "conversations", convId), {
      updatedAt: serverTimestamp()
    });
    return { success: true, msgId: ref.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer tous les messages d'une conversation
 */
async function getMessages(convId) {
  try {
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("getMessages:", error);
    return [];
  }
}

/**
 * Écouter les messages en temps réel (streaming chat)
 */
function listenMessages(convId, callback) {
  const q = query(
    collection(db, "conversations", convId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}

/**
 * Récupérer toutes les conversations d'un utilisateur
 */
async function getUserConversations(userId) {
  try {
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", userId),
      orderBy("updatedAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    return [];
  }
}


// ════════════════════════════════════════════════════════════════
//  ABONNEMENTS — Plans et statuts
// ════════════════════════════════════════════════════════════════

/**
 * Récupérer l'abonnement d'un utilisateur
 * (lecture seule — l'écriture se fait uniquement via Admin SDK Python)
 */
async function getAbonnement(userId) {
  try {
    const ref  = doc(db, "abonnements", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) return { userId, ...snap.data() };
    // Si pas d'abonnement → retourne plan trial par défaut
    return {
      userId,
      plan:      "standard",
      status:    "trial",
      trialEnd:  null,
      nextBilling: null
    };
  } catch (error) {
    console.error("getAbonnement:", error);
    return null;
  }
}

/**
 * Écouter les changements d'abonnement en temps réel
 */
function listenAbonnement(userId, callback) {
  const ref = doc(db, "abonnements", userId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback({ userId, ...snap.data() });
    } else {
      callback({ userId, plan: "standard", status: "trial" });
    }
  });
}


// ════════════════════════════════════════════════════════════════
//  HELPER — Convertir Timestamp Firebase en Date JS lisible
// ════════════════════════════════════════════════════════════════
function tsToDate(timestamp) {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
  return new Date(timestamp);
}

function tsToString(timestamp, locale = "fr-FR") {
  const date = tsToDate(timestamp);
  if (!date) return "—";
  return date.toLocaleDateString(locale, {
    day:   "2-digit",
    month: "short",
    year:  "numeric"
  });
}


// ════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════
export {
  // Users
  saveUserProfile,
  getUserProfile,
  listenUserProfile,
  updateEntreprise,
  updateUserPlan,

  // Analyses
  saveAnalyse,
  getAnalyse,
  getUserAnalyses,
  listenUserAnalyses,
  deleteAnalyse,

  // Conversations
  createConversation,
  addMessage,
  getMessages,
  listenMessages,
  getUserConversations,

  // Abonnements
  getAbonnement,
  listenAbonnement,

  // Helpers
  tsToDate,
  tsToString
};
