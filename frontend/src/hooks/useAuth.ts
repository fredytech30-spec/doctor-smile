'use client';

import { useEffect, useState } from 'react';
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { brevoService } from '@/lib/brevo';
import { otpService } from '@/lib/otp';
import {
  setPendingOtp,
  set2FAVerified,
  clearAuthSession,
  get2FAUid,
} from '@/lib/auth-session';

export interface RegisterData {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: string;
  poste?: string;
  plan?: string;
  source?: string;
  entreprise: {
    nom: string;
    secteur: string;
    taille: string;
    pays: string;
    siret?: string;
  };
  trialDays?: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          // Vérifier si l'email est vérifié
          if (!currentUser.emailVerified) {
            // Rafraîchir le token pour vérifier l'email
            await currentUser.getIdToken(true);
          }
        }
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(
        doc(firestore, 'users', user.uid),
        { lastLogin: new Date() },
        { merge: true }
      );

      setPendingOtp(user.uid, email);

      // Send OTP via backend (secure, no client-side generation)
      const token = await user.getIdToken();
      const response = await fetch('/auth/2fa/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.uid, email: email, name: user.displayName || '' }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend OTP error:', errorData);
        // Continue anyway - OTP failure shouldn't block login
        console.warn('OTP send failed, but login succeeded');
      }

      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signUp = async (userData: RegisterData) => {
    try {
      setError(null);
      
      // Validation des mots de passe
      if (userData.password !== userData.confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      
      if (userData.password.length < 8) {
        throw new Error('Le mot de passe doit contenir au moins 8 caractères');
      }
      
      // 1. Créer le compte Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      const user = userCredential.user;

      // 2. Mettre à jour le displayName Firebase
      await updateProfile(user, {
        displayName: `${userData.prenom} ${userData.nom}`
      });

      // 3. Email de vérification via Brevo
      const verificationLink = `${window.location.origin}/auth/verify?uid=${user.uid}`;
      await brevoService.sendVerificationEmail(userData.email, verificationLink);

      // 4. Calculer trialEnd pour les plans payants
      const plan = userData.plan || 'standard';
      const trialDays = plan !== 'standard' ? (userData.trialDays || 14) : 0;
      const trialEnd = plan !== 'standard'
        ? new Date(Date.now() + trialDays * 24 * 3600 * 1000)
        : null;
      const trialStatus = plan !== 'standard' ? 'trial' : 'active';

      // 5. Sauvegarder le profil complet dans Firestore (users/{uid})
      await setDoc(doc(firestore, 'users', user.uid), {
        uid: user.uid,
        prenom: userData.prenom,
        nom: userData.nom,
        email: userData.email,
        role: userData.role || 'analyst',
        poste: userData.poste || '',
        plan: plan,
        source: userData.source || '',
        profileComplete: true,
        trialStatus,
        trialEnd,
        trialDays,
        entreprise: {
          nom: userData.entreprise.nom,
          secteur: userData.entreprise.secteur,
          taille: userData.entreprise.taille,
          pays: userData.entreprise.pays,
          siret: userData.entreprise.siret || null
        },
        emailVerified: false,
        createdAt: new Date(),
        lastLogin: new Date()
      });

      // 6. Créer abonnements/{uid}
      await setDoc(doc(firestore, 'abonnements', user.uid), {
        uid: user.uid,
        plan,
        status: trialStatus,
        trialEnd,
        trialDays,
        startedAt: new Date(),
        nextBilling: trialEnd,
      });

      setPendingOtp(user.uid, userData.email);

      // Send OTP via backend (secure, no client-side generation)
      const token = await user.getIdToken();
      const response = await fetch('/auth/2fa/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          uid: user.uid, 
          email: userData.email, 
          name: `${userData.prenom} ${userData.nom}` 
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend OTP error:', errorData);
        // Continue anyway - OTP failure shouldn't block signup
        console.warn('OTP send failed, but signup succeeded');
      }

      return user;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      
      // Check if auth is available (SSR guard)
      if (!auth || !googleProvider) {
        throw new Error('Firebase Auth non initialisé. Veuillez réessayer.');
      }

      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if user already exists in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Create new user profile
        const displayName = user.displayName || '';
        const prenom = displayName.split(' ')[0] || '';
        const nom = displayName.split(' ').slice(1).join(' ') || '';

        await setDoc(userRef, {
          uid: user.uid,
          prenom,
          nom,
          email: user.email || '',
          role: 'analyst',
          plan: 'standard',
          profileComplete: false,
          emailVerified: user.emailVerified,
          createdAt: new Date(),
          lastLogin: new Date(),
        });

        // Create abonnement document too
        await setDoc(doc(firestore, 'abonnements', user.uid), {
          uid: user.uid,
          plan: 'standard',
          status: 'active',
          startedAt: new Date(),
        });
      } else {
        // Update last login
        await updateDoc(userRef, {
          lastLogin: new Date(),
        });
      }

      setPendingOtp(user.uid, user.email || '');
      
      // Send OTP via backend (secure, no client-side generation)
      if (user.email) {
        console.log('🔗 [FRONTEND] Starting OTP send request...');
        const token = await user.getIdToken();
        console.log('🔗 [FRONTEND] Firebase token obtained, user:', user.email);
        
        try {
          // Use Next.js rewrite to avoid CORS and network issues
          console.log('🔗 [FRONTEND] Fetching /auth/2fa/send via Next.js rewrite');
          const response = await fetch('/auth/2fa/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ 
              uid: user.uid, 
              email: user.email, 
              name: user.displayName || '' 
            }),
            signal: AbortSignal.timeout(20000), // 20 second timeout
          });

          console.log('🔗 [FRONTEND] Response status:', response.status, response.statusText);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('❌ [FRONTEND] Backend OTP error:', errorData);
            // Continue anyway - OTP failure shouldn't block login
            console.warn('⚠️ [FRONTEND] OTP send failed, but login succeeded');
          } else {
            const successData = await response.json().catch(() => ({}));
            console.log('✅ [FRONTEND] OTP send successful:', successData);
          }
        } catch (fetchError: any) {
          console.error('❌ [FRONTEND] Fetch error:', fetchError);
          console.error('❌ [FRONTEND] Error details:', {
            message: fetchError.message,
            name: fetchError.name,
            stack: fetchError.stack
          });
          // Continue even if OTP fails - user can still proceed
          console.warn('⚠️ [FRONTEND] OTP send failed, but login succeeded');
        }
      }

      return user;
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      const errorMessage = err.code === 'auth/popup-closed-by-user' 
        ? 'Connexion annulée'
        : err.code === 'auth/popup-blocked'
        ? 'Popup bloqué par le navigateur. Veuillez autoriser les popups.'
        : err.code === 'auth/unauthorized-domain'
        ? 'Domaine non autorisé. Vérifiez la configuration Firebase.'
        : err.message || 'Erreur de connexion Google';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      const resetLink = `${window.location.origin}/auth/reset-password?email=${email}`;
      await brevoService.sendPasswordResetEmail(email, resetLink);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      setError(null);

      console.log('🔗 [FRONTEND] Starting OTP verification...');

      // Appel backend pour générer le token de session 2FA + cookie HttpOnly ds_2fa
      const currentUid = auth.currentUser?.uid;
      const userUid = currentUid || get2FAUid();
      if (!userUid) {
        throw new Error('Utilisateur non connecté');
      }

      const authHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        authHeaders.Authorization = `Bearer ${token}`;
        console.log('🔗 [FRONTEND] Firebase token obtained for verification');
      }

      console.log('🔗 [FRONTEND] Fetching /auth/2fa/verify via Next.js rewrite');
      
      let resp: Response;
      try {
        resp = await fetch('/auth/2fa/verify', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ uid: userUid, code: otp }),
          credentials: 'include',
          signal: AbortSignal.timeout(20000), // 20 second timeout
        });
        console.log('🔗 [FRONTEND] Verify response status:', resp.status);
      } catch (networkErr: any) {
        console.error('Fetch réseau échoué pour 2FA:', networkErr);
        throw new Error('Erreur réseau: impossible de joindre le serveur d’authentification');
      }

      let data: any = {};
      try {
        const text = await resp.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch { data = { raw: text }; }
      } catch (err) {
        console.warn('Impossible de lire le corps de la réponse 2FA', err);
      }

      if (!resp.ok) {
        console.error('Erreur 2FA:', resp.status, data);
        throw new Error(data?.message || data?.detail || `Erreur de vérification (status ${resp.status})`);
      }

      // Optionnel : conserver aussi en sessionStorage côté UI
      const verificationToken = data?.verification_token || Math.random().toString(36).substring(2);
      set2FAVerified(verificationToken, userUid);

      // Récupérer les données utilisateur après vérification
      await loadUserProfile(userUid);

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const loadUserProfile = async (uid: string) => {
    try {
      const userRef = doc(firestore, 'users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        // Les données sont disponibles et peuvent être utilisées par les hooks useUserProfile
        return userSnap.data();
      }
    } catch (err: any) {
      console.error('Erreur chargement profil:', err);
    }
  };

  const resendOTP = async (uid: string, email: string, name: string) => {
    try {
      setError(null);
      
      console.log('🔗 [FRONTEND] Starting OTP resend request...');
      
      // Send OTP via backend using Next.js rewrite
      const currentUser = auth.currentUser;
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentUser && currentUser.uid === uid) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔗 [FRONTEND] Firebase token obtained for resend');
      }
      
      console.log('🔗 [FRONTEND] Fetching /auth/2fa/send via Next.js rewrite');
      const response = await fetch('/auth/2fa/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({ uid, email, name }),
        signal: AbortSignal.timeout(20000), // 20 second timeout
      });

      console.log('🔗 [FRONTEND] Resend response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [FRONTEND] Backend OTP resend error:', errorData);
        throw new Error('Échec de la réexpédition du code OTP');
      } else {
        const successData = await response.json().catch(() => ({}));
        console.log('✅ [FRONTEND] OTP resend successful:', successData);
      }
    } catch (err: any) {
      console.error('❌ [FRONTEND] OTP resend error:', err);
      setError(err.message);
      throw err;
    }
  };

  const updatePasswordUser = async (currentPassword: string, newPassword: string) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Réauthentifier l'utilisateur
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      
      // Mettre à jour le mot de passe
      await updatePassword(user, newPassword);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateProfileUser = async (data: Partial<RegisterData>) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      // Mettre à jour le profil Firebase Auth si nécessaire
      if (data.prenom || data.nom) {
        const displayName = `${data.prenom || user.displayName?.split(' ')[0]} ${data.nom || user.displayName?.split(' ')[1] || ''}`;
        await updateProfile(user, { displayName });
      }

      // Mettre à jour Firestore
      const userRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          ...(data.prenom && { prenom: data.prenom }),
          ...(data.nom && { nom: data.nom }),
          ...(data.poste !== undefined && { poste: data.poste }),
          ...(data.entreprise && { entreprise: data.entreprise }),
          updatedAt: new Date()
        });
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const signOut = async () => {
    try {
      setError(null);
      clearAuthSession();
      await firebaseSignOut(auth);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    resetPassword,
    verifyOTP,
    resendOTP,
    updatePassword: updatePasswordUser,
    updateProfile: updateProfileUser,
  };
}

async function getIdToken(userUid: string): Promise<string> {
  const user = auth.currentUser;
  if (!user || user.uid !== userUid) {
    throw new Error('User not authenticated or UID mismatch');
  }
  return await user.getIdToken();
}

