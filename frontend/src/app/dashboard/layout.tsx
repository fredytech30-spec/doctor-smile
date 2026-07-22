'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { is2FAVerified } from '@/lib/auth-session';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useAbonnement } from '@/hooks/useAbonnement';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { abonnement } = useAbonnement(user);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (!loading && user && !is2FAVerified()) {
      router.replace('/auth/otp');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/login');
  };

  if (loading || !user || !is2FAVerified()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-center animate-fade-in-up">
          <div
            className="w-12 h-12 rounded-full border-2 border-[var(--violet-border)] border-t-[var(--violet)] animate-spin mx-auto mb-4"
          />
          <p className="text-[var(--text-2)] text-sm">Chargement sécurisé…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <DashboardSidebar onSignOut={handleSignOut} plan={abonnement?.plan || 'standard'} />
      <div className="pl-[260px] min-h-screen transition-all max-lg:pl-[72px]">
        {children}
      </div>
    </div>
  );
}
