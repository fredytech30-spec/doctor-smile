'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface UserProfile {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  poste: string;
  plan: string;
  source: string;
  profileComplete: boolean;
  trialStatus?: string;
  trialEnd?: Date;
  trialDays?: number;
  entreprise: {
    nom: string;
    secteur: string;
    taille: string;
    pays: string;
    siret?: string;
  };
  emailVerified: boolean;
  createdAt: Date;
  lastLogin: Date;
}

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(firestore, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({
            id: snapshot.id,
            prenom: data.prenom || '',
            nom: data.nom || '',
            email: data.email || user.email || '',
            role: data.role || 'analyst',
            poste: data.poste || '',
            plan: data.plan || 'standard',
            source: data.source || '',
            profileComplete: data.profileComplete || false,
            trialStatus: data.trialStatus,
            trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
            trialDays: data.trialDays,
            entreprise: {
              nom: data.entreprise?.nom || '',
              secteur: data.entreprise?.secteur || '',
              taille: data.entreprise?.taille || '',
              pays: data.entreprise?.pays || '',
              siret: data.entreprise?.siret,
            },
            emailVerified: data.emailVerified || false,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
            lastLogin: data.lastLogin ? new Date(data.lastLogin) : new Date(),
          });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        ...data,
        lastLogin: new Date(),
      });
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}
