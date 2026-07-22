'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function VerifyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 900));
      setResent(true);
      toast.success('Email de vérification renvoyé');
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Vérification email"
      title="Vérifiez votre boîte"
      subtitle="Un lien d'activation a été envoyé à votre adresse email"
    >
      {/* Animated envelope icon */}
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
        className="flex justify-center mb-6"
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--violet-soft)',
            border: '1.5px solid var(--violet-border)',
          }}
        >
          <Mail className="w-10 h-10" style={{ color: 'var(--violet)' }} />
        </div>
      </motion.div>

      {user?.email && (
        <p className="text-center text-sm mb-6" style={{ color: 'var(--text-2)' }}>
          Lien envoyé à{' '}
          <span className="font-semibold" style={{ color: 'var(--violet)' }}>
            {user.email}
          </span>
        </p>
      )}

      {/* Instructions */}
      <div className="space-y-3 mb-7">
        {[
          'Cliquez sur le lien dans l\'email pour activer votre compte. Il expire dans 24 heures.',
          'Vérifiez vos spams si vous ne recevez rien dans 2 minutes.',
        ].map((text, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3.5 rounded-xl text-sm"
            style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}
          >
            <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--violet)' }} />
            {text}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={handleResend}
          disabled={loading || resent}
          className="w-full"
        >
          {loading ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours…</>
          ) : resent ? (
            <><CheckCircle className="w-4 h-4" /> Email renvoyé !</>
          ) : (
            'Renvoyer l\'email'
          )}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push('/dashboard')}
          className="w-full"
        >
          J&apos;ai activé mon compte
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Mauvaise adresse ?{' '}
        <a href="/auth/register" className="font-semibold hover:underline" style={{ color: 'var(--violet)' }}>
          Modifier
        </a>
      </p>
    </AuthShell>
  );
}
