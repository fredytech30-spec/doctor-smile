// ════════════════════════════════════════════════════════════════
//  firebase-firestore.js — Doctor Smile
//  Couche d'abstraction Firestore complète
//
//  Collections :
//    users/{uid}                        ← profil utilisateur
//    users/{uid}/abonnements/current    ← plan actif
//    analyses/{id}                      ← analyses SYSCOHADA
//    conversations/{id}                 ← conversations chat
//    conversations/{id}/messages/{id}   ← messages d'une conv
//
//  GESTION CONVERSATIONS :
//    - Chaque conversation est liée à une analyse (analyseId)
//    - getUserConversations() charge TOUTES les convs de l'utilisateur
//    - Les messages sont persistés en temps réel
//    - Le cache local (sessionStorage) évite les re-lectures inutiles
//    - À l'actualisation, tout est rechargé depuis Firestore
// ════════════════════════════════════════════════════════════════

import { db } from './firebase-config.js';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, limit, serverTimestamp, Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════

/** Convertit un Timestamp Firestore en Date JS. */
export function tsToDate(ts) {
  if (!ts)              return new Date();
  if (ts.toDate)        return ts.toDate();
  if (ts.seconds)       return new Date(ts.seconds * 1000);
  if (ts instanceof Date) return ts;
  return new Date(ts);
}

/** Formate un Timestamp en chaîne lisible "12 janv." */
export function tsToString(ts) {
  try {
    const d = tsToDate(ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  } catch { return '—'; }
}

/** Supprime les champs undefined (Firestore les rejette). */
function _clean(obj) {
  return JSON.parse(JSON.stringify(obj, (_, v) => v === undefined ? null : v));
}

// ════════════════════════════════════════════════════════════════
//  PROFIL UTILISATEUR
// ════════════════════════════════════════════════════════════════

export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.warn('[FS] getUserProfile:', e);
    return null;
  }
}

export function listenUserProfile(uid, callback) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err)  => console.warn('[FS] listenUserProfile:', err)
  );
}

export async function saveUserProfile(uid, data) {
  try {
    await setDoc(doc(db, 'users', uid), _clean(data), { merge: true });
    return true;
  } catch (e) {
    console.warn('[FS] saveUserProfile:', e);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
//  ABONNEMENTS
// ════════════════════════════════════════════════════════════════

export async function getAbonnement(uid) {
  try {
    // Essayer d'abord abonnements/{uid}
    let snap = await getDoc(doc(db, 'abonnements', uid));
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    // Fallback : lire depuis le profil users/{uid}
    snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      const d = snap.data();
      // Remonter les données trial depuis le profil si présentes
      const ab = {
        plan:      d.plan        || 'standard',
        status:    d.trialStatus || 'active',
        trialEnd:  d.trialEnd    || null,
        trialDays: d.trialDays   || 0,
      };
      // Créer le doc abonnements manquant pour les prochaines écoutes
      if (d.plan && d.plan !== 'standard') {
        saveAbonnement(uid, ab).catch(() => {});
      }
      return ab;
    }
    return { plan: 'standard', status: 'active' };
  } catch (e) {
    console.warn('[FS] getAbonnement:', e);
    return { plan: 'standard', status: 'active' };
  }
}

export function listenAbonnement(uid, callback) {
  return onSnapshot(
    doc(db, 'abonnements', uid),
    (snap) => {
      if (snap.exists()) {
        callback({ id: snap.id, ...snap.data() });
      } else {
        // Doc absent → lire le plan depuis users/{uid} comme fallback
        getDoc(doc(db, 'users', uid)).then(uSnap => {
          if (uSnap.exists()) {
            const d = uSnap.data();
            callback({
              plan:        d.plan        || 'standard',
              status:      d.trialStatus || 'active',
              trialEnd:    d.trialEnd    || null,
              trialDays:   d.trialDays   || 0,
            });
          } else {
            callback({ plan: 'standard', status: 'active' });
          }
        }).catch(() => callback({ plan: 'standard', status: 'active' }));
      }
    },
    (err) => {
      console.warn('[FS] listenAbonnement:', err);
      callback({ plan: 'standard', status: 'active' });
    }
  );
}

// ── Créer ou mettre à jour l'abonnement ──────────────────────────
export async function saveAbonnement(uid, data) {
  try {
    const ref = doc(db, 'abonnements', uid);
    await setDoc(ref, {
      ...data,
      userId:    uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (e) {
    console.error('[FS] saveAbonnement:', e);
    return { success: false, error: e.message };
  }
}

// ════════════════════════════════════════════════════════════════
//  ANALYSES
// ════════════════════════════════════════════════════════════════

export function listenUserAnalyses(uid, callback) {
  // Charger TOUT l'historique d'analyses de l'utilisateur sans limite
  // Utiliser query simple sans orderBy pour éviter l'erreur d'index composite
  const qSimple = query(
    collection(db, 'analyses'),
    where('userId', '==', uid)
  );

  let unsub = null;

  try {
    unsub = onSnapshot(
      qSimple,
      (snap) => {
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.seconds ?? a.createdAt?.toDate?.()?.getTime?.()/1000 ?? 0;
            const tb = b.createdAt?.seconds ?? b.createdAt?.toDate?.()?.getTime?.()/1000 ?? 0;
            return tb - ta;
          });
        console.log('[FS] listenUserAnalyses: chargé', results.length, 'analyses (historique complet)');
        callback(results);
      },
      (err) => {
        console.error('[FS] listenUserAnalyses error:', err);
        callback([]);
      }
    );
  } catch (initErr) {
    console.error('[FS] listenUserAnalyses init error:', initErr);
    callback([]);
  }

  // Retourner une fonction de désabonnement
  return () => { if (unsub) unsub(); };
}

export async function saveAnalysis(id, data) {
  try {
    await setDoc(doc(db, 'analyses', id), _clean(data));
    return true;
  } catch (e) {
    console.warn('[FS] saveAnalysis:', e);
    return false;
  }
}

export async function getAnalysis(id) {
  try {
    const snap = await getDoc(doc(db, 'analyses', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.warn('[FS] getAnalysis:', e);
    return null;
  }
}

export async function deleteAnalysis(id) {
  try {
    await deleteDoc(doc(db, 'analyses', id));
    return true;
  } catch (e) {
    console.warn('[FS] deleteAnalysis:', e);
    return false;
  }
}

export async function getScoreHistory(uid, entreprise) {
  try {
    // Essayer avec index, fallback sans orderBy
    let snap;
    try {
      const q = query(
        collection(db, 'analyses'),
        where('userId',     '==', uid),
        where('entreprise', '==', entreprise),
        orderBy('createdAt', 'asc'),
        limit(7)
      );
      snap = await getDocs(q);
    } catch {
      const q2 = query(
        collection(db, 'analyses'),
        where('userId',     '==', uid),
        where('entreprise', '==', entreprise),
        limit(7)
      );
      snap = await getDocs(q2);
    }
    return snap.docs
      .map(d => ({ score: d.data().score || 0, ts: d.data().createdAt?.seconds ?? 0 }))
      .sort((a, b) => a.ts - b.ts)
      .map(d => d.score);
  } catch (e) {
    console.warn('[FS] getScoreHistory:', e);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
//  CONVERSATIONS — Logique principale
// ════════════════════════════════════════════════════════════════

/**
 * Charge TOUTES les conversations d'un utilisateur depuis Firestore.
 * Triées par updatedAt desc (plus récente en premier).
 *
 * Structure d'une conversation dans Firestore :
 *   conversations/{convId} {
 *     userId:    string
 *     analyseId: string | null
 *     name:      string
 *     createdAt: Timestamp
 *     updatedAt: Timestamp
 *     msgCount:  number
 *     lastMsg:   string   ← preview du dernier message
 *     lastRole:  string   ← 'user' | 'assistant'
 *   }
 */
export async function getUserConversations(uid) {
  try {
    // Charger TOUTES les conversations de l'utilisateur sans limite
    // Utiliser query simple sans orderBy pour éviter l'erreur d'index composite
    const q = query(
      collection(db, 'conversations'),
      where('userId', '==', uid)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Tri côté client (robuste)
    return docs.sort((a, b) => {
      const ta = a.updatedAt?.seconds ?? a.createdAt?.seconds ?? 0;
      const tb = b.updatedAt?.seconds ?? b.createdAt?.seconds ?? 0;
      return tb - ta;
    });
  } catch (e) {
    console.warn('[FS] getUserConversations:', e);
    return [];
  }
}

/**
 * Crée une nouvelle conversation et retourne { convId }.
 * Si une conversation pour cet analyseId existe déjà, la retourne.
 */
export async function createConversation(uid, analyseId, name = null) {
  try {
    // Vérifier si une conv existe déjà pour cette analyse
    if (analyseId) {
      const existing = await _findConvByAnalyse(uid, analyseId);
      if (existing) {
        console.info('[FS] Conv existante trouvée pour analyseId:', analyseId, '→', existing.id);
        return { convId: existing.id, existing: true };
      }
    }

    // Générer un nom automatique si non fourni
    const convName = name || _autoConvName(analyseId);

    const convData = _clean({
      userId:    uid,
      analyseId: analyseId || null,
      name:      convName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      msgCount:  0,
      lastMsg:   null,
      lastRole:  null,
    });

    const ref = await addDoc(collection(db, 'conversations'), convData);
    console.info('[FS] Nouvelle conv créée:', ref.id, '— analyseId:', analyseId);
    return { convId: ref.id, existing: false };
  } catch (e) {
    console.warn('[FS] createConversation:', e);
    return { convId: null };
  }
}

/** Cherche une conversation existante par analyseId. */
async function _findConvByAnalyse(uid, analyseId) {
  try {
    // where sur 2 champs différents peut nécessiter un index composite
    // Fallback : filtrer côté client si l'index manque
    let snap;
    try {
      const q = query(
        collection(db, 'conversations'),
        where('userId',    '==', uid),
        where('analyseId', '==', analyseId),
        limit(1)
      );
      snap = await getDocs(q);
    } catch {
      // Fallback : charger toutes les convs de l'uid et filtrer
      const q2 = query(
        collection(db, 'conversations'),
        where('userId', '==', uid),
        limit(100)
      );
      snap = await getDocs(q2);
      const found = snap.docs.find(d => d.data().analyseId === analyseId);
      return found ? { id: found.id, ...found.data() } : null;
    }
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
    return null;
  } catch (e) {
    console.warn('[FS] _findConvByAnalyse:', e);
    return null;
  }
}

/** Génère un nom de conversation automatique. */
function _autoConvName(analyseId) {
  const now = new Date();
  const date = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  return `Conversation du ${date}`;
}

/**
 * Ajoute un message à une conversation.
 * Met à jour les métadonnées (lastMsg, msgCount, updatedAt).
 */
export async function addMessage(convId, { role, content }) {
  if (!convId) return null;
  try {
    const msgData = _clean({
      role,
      content,
      createdAt: serverTimestamp(),
    });

    // Ajouter le message
    const ref = await addDoc(
      collection(db, 'conversations', convId, 'messages'),
      msgData
    );

    // Mettre à jour les métadonnées de la conversation
    const preview = String(content).replace(/<[^>]+>/g, '').slice(0, 80);
    await updateDoc(doc(db, 'conversations', convId), {
      updatedAt: serverTimestamp(),
      lastMsg:   preview,
      lastRole:  role,
      msgCount:  await _incrementMsgCount(convId),
    });

    return ref.id;
  } catch (e) {
    console.warn('[FS] addMessage:', e);
    return null;
  }
}

/** Compte les messages d'une conversation (pour msgCount). */
async function _incrementMsgCount(convId) {
  try {
    const snap = await getDoc(doc(db, 'conversations', convId));
    return (snap.data()?.msgCount || 0) + 1;
  } catch { return 1; }
}

/**
 * Charge TOUS les messages d'une conversation, triés par date.
 */
export async function getMessages(convId) {
  if (!convId) return [];
  try {
    // Charger TOUS les messages sans limite
    // Utiliser query simple sans orderBy pour éviter l'erreur d'index composite
    const snap = await getDocs(
      collection(db, 'conversations', convId, 'messages')
    );
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
  } catch (e) {
    console.warn('[FS] getMessages error:', e);
    return [];
  }
}

/**
 * Écoute les nouveaux messages en temps réel.
 * Retourne une fonction de désabonnement.
 */
export function listenMessages(convId, callback) {
  if (!convId) return () => {};
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err)  => console.warn('[FS] listenMessages:', err)
  );
}

/**
 * Renomme une conversation.
 */
export async function renameConversation(convId, newName) {
  try {
    await updateDoc(doc(db, 'conversations', convId), {
      name:      newName,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.warn('[FS] renameConversation:', e);
    return false;
  }
}

/**
 * Supprime une conversation et tous ses messages.
 */
export async function deleteConversation(convId) {
  if (!convId) return false;
  try {
    // Supprimer tous les messages d'abord
    const msgs = await getDocs(collection(db, 'conversations', convId, 'messages'));
    await Promise.all(msgs.docs.map(d =>
      deleteDoc(doc(db, 'conversations', convId, 'messages', d.id))
    ));
    // Supprimer la conversation
    await deleteDoc(doc(db, 'conversations', convId));
    console.info('[FS] Conv supprimée:', convId);
    return true;
  } catch (e) {
    console.warn('[FS] deleteConversation:', e);
    return false;
  }
}

/**
 * Charge la conversation liée à une analyse.
 * Crée une nouvelle conversation si elle n'existe pas.
 */
export async function getOrCreateConvForAnalyse(uid, analyseId) {
  try {
    const existing = await _findConvByAnalyse(uid, analyseId);
    if (existing) return { conv: existing, created: false };

    const { convId } = await createConversation(uid, analyseId);
    if (!convId) return { conv: null, created: false };

    const newConv = await getDoc(doc(db, 'conversations', convId));
    return {
      conv:    { id: convId, ...newConv.data() },
      created: true,
    };
  } catch (e) {
    console.warn('[FS] getOrCreateConvForAnalyse:', e);
    return { conv: null, created: false };
  }
}

// ════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════════

export async function getNotifications(uid, count = 20) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn('[FS] getNotifications:', e);
    return [];
  }
}

export function listenNotifications(uid, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    (err)  => console.warn('[FS] listenNotifications:', err)
  );
}

export async function markNotificationRead(notifId) {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { read: true });
    return true;
  } catch (e) {
    console.warn('[FS] markNotificationRead:', e);
    return false;
  }
}

export async function markAllNotificationsRead(uid) {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d =>
      updateDoc(doc(db, 'notifications', d.id), { read: true })
    ));
    return true;
  } catch (e) {
    console.warn('[FS] markAllNotificationsRead:', e);
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
//  PARTAGE
// ════════════════════════════════════════════════════════════════

export async function createShareLink(analyseId, uid) {
  try {
    const shareId = `${analyseId}_${Date.now()}`;
    await setDoc(doc(db, 'shares', shareId), _clean({
      analyseId,
      userId:    uid,
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      views:     0,
    }));
    return { shareId, url: `${window.location.origin}/share/${shareId}` };
  } catch (e) {
    console.warn('[FS] createShareLink:', e);
    return null;
  }
}

export async function getSharedAnalyse(shareId) {
  try {
    const shareSnap = await getDoc(doc(db, 'shares', shareId));
    if (!shareSnap.exists()) return null;
    const share = shareSnap.data();
    if (share.expiresAt?.toDate?.() < new Date()) return null;
    // Incrémenter le compteur de vues
    await updateDoc(doc(db, 'shares', shareId), { views: (share.views || 0) + 1 });
    const analyseSnap = await getDoc(doc(db, 'analyses', share.analyseId));
    return analyseSnap.exists() ? { id: analyseSnap.id, ...analyseSnap.data() } : null;
  } catch (e) {
    console.warn('[FS] getSharedAnalyse:', e);
    return null;
  }
}

console.log('[firebase-firestore.js] ✓ Chargé — getUserConversations, createConversation, getMessages, addMessage');