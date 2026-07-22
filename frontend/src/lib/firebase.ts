import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCYvKl0hePImcRQ48vLAhkhVGX7a62Wh44",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "doctorsmile-d8d8f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "doctorsmile-d8d8f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "doctorsmile-d8d8f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "75568990441",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:75568990441:web:f9c3ffa689a4ff5b080878",
};

// ── Singleton SSR-safe ────────────────────────────────────────────
// Firebase SDK must never be initialized server-side (Admin SDK is used there).
// All client-side modules import from this file; if window is absent, they get
// null-stubs and must guard with `if (auth)` before calling Firebase methods.

function _initApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

const app: FirebaseApp = typeof window !== 'undefined' ? _initApp() : (null as unknown as FirebaseApp);
const auth: Auth = typeof window !== 'undefined' ? getAuth(app) : (null as unknown as Auth);
const firestore: Firestore = typeof window !== 'undefined' ? getFirestore(app) : (null as unknown as Firestore);
const storage: FirebaseStorage = typeof window !== 'undefined' ? getStorage(app) : (null as unknown as FirebaseStorage);

const googleProvider: GoogleAuthProvider = typeof window !== 'undefined'
  ? (() => {
      const p = new GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    })()
  : (null as unknown as GoogleAuthProvider);

// Add redirect provider as fallback
const googleRedirectProvider: GoogleAuthProvider = typeof window !== 'undefined'
  ? (() => {
      const p = new GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      return p;
    })()
  : (null as unknown as GoogleAuthProvider);

export { app, auth, firestore, storage, googleProvider, googleRedirectProvider };
