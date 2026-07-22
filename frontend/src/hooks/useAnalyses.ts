'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface Analyse {
  id: string;
  userId: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  score?: number;
  zone?: 'saine' | 'vigilance' | 'risque' | 'critique';
  createdAt: Date;
  completedAt?: Date;
  results?: any;
  entreprise?: string;
}

export function useAnalyses(user: User | null) {
  const [analyses, setAnalyses] = useState<Analyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAnalyses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const analysesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt ? new Date(doc.data().createdAt) : new Date(),
          completedAt: doc.data().completedAt ? new Date(doc.data().completedAt) : undefined,
        })) as Analyse[];
        
        setAnalyses(analysesData);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getZoneFromScore = (score: number): 'saine' | 'vigilance' | 'risque' | 'critique' => {
    if (score >= 75) return 'saine';
    if (score >= 50) return 'vigilance';
    if (score >= 25) return 'risque';
    return 'critique';
  };

  const getZoneColor = (zone: string) => {
    switch (zone) {
      case 'saine': return 'text-[var(--success)]';
      case 'vigilance': return 'text-[var(--violet)]';
      case 'risque': return 'text-[var(--warning)]';
      case 'critique': return 'text-[var(--error)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  const getZoneBg = (zone: string) => {
    switch (zone) {
      case 'saine': return 'bg-[var(--success)]/10 border-[var(--success)]/20';
      case 'vigilance': return 'bg-[var(--violet-soft)] border-[var(--violet-border)]';
      case 'risque': return 'bg-[var(--warning)]/10 border-[var(--warning)]/20';
      case 'critique': return 'bg-[var(--error)]/10 border-[var(--error)]/20';
      default: return 'bg-[var(--bg-muted)] border-[var(--border)]';
    }
  };

  return {
    analyses,
    loading,
    error,
    getZoneFromScore,
    getZoneColor,
    getZoneBg,
  };
}
