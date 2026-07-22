'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface Abonnement {
  id: string;
  plan: string;
  status: string;
  trialEnd?: Date;
  trialDays?: number;
  startedAt: Date;
  nextBilling?: Date;
}

export function useAbonnement(user: User | null) {
  const [abonnement, setAbonnement] = useState<Abonnement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAbonnement(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      doc(firestore, 'abonnements', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setAbonnement({
            id: snapshot.id,
            plan: data.plan || 'standard',
            status: data.status || 'active',
            trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
            trialDays: data.trialDays,
            startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
            nextBilling: data.nextBilling ? new Date(data.nextBilling) : undefined,
          });
        } else {
          setAbonnement({
            id: user.uid,
            plan: 'standard',
            status: 'active',
            startedAt: new Date(),
          });
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

  const updateAbonnement = async (data: Partial<Abonnement>) => {
    if (!user) throw new Error('User not authenticated');
    
    // SÉCURITÉ : Interdire la modification des champs critiques (plan, status) côté client.
    // Toute modification d'abonnement doit passer par le flux de paiement sécurisé (FastAPI backend + webhooks NotchPay/Fapshi).
    if ('plan' in data || 'status' in data) {
      const err = new Error("Sécurité : La modification directe du plan ou du statut d'abonnement depuis le client est interdite.");
      setError(err.message);
      throw err;
    }

    try {
      await updateDoc(doc(firestore, 'abonnements', user.uid), data);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const isTrialActive = () => {
    if (!abonnement?.trialEnd) return false;
    return new Date() < abonnement.trialEnd;
  };

  const getDaysRemaining = () => {
    if (!abonnement?.trialEnd) return 0;
    const now = new Date();
    const diff = abonnement.trialEnd.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return {
    abonnement,
    loading,
    error,
    updateAbonnement,
    isTrialActive,
    getDaysRemaining,
  };
}
