// ════════════════════════════════════════════════════════════════
//  firebase-config.js
//  Initialisation Firebase App — Doctor Smile
//  ⚠️  Remplace les valeurs ci-dessous par ta firebaseConfig Firebase
// ════════════════════════════════════════════════════════════════

import { initializeApp }        from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth }              from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore }         from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAnalytics }         from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";

// ── Ta configuration Firebase ────────────────────────────────────
// Copie-colle exactement ce que Firebase t'a donné à l'étape 6
const firebaseConfig = {
  apiKey:            "AIzaSyCYvKl0hePImcRQ48vLAhkhVGX7a62Wh44",
  authDomain:        "doctorsmile-d8d8f.firebaseapp.com",
  projectId:         "doctorsmile-d8d8f",
  storageBucket:     "doctorsmile-d8d8f.firebasestorage.app",
  messagingSenderId: "75568990441",
  appId:             "1:75568990441:web:f9c3ffa689a4ff5b080878"
};

// ── Initialisation ───────────────────────────────────────────────
const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const analytics = getAnalytics(app);

// ── Export pour tous les autres fichiers ─────────────────────────
export { app, auth, db, analytics };
