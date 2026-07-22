'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();
  
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (tokenParam) {
      setToken(tokenParam);
      setStep('reset');
      if (emailParam) setEmail(emailParam);
    }
  }, [searchParams]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
      toast.success('Email de réinitialisation envoyé');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'envoi';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001';
      const response = await fetch(`${apiUrl}/reset-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Erreur lors de la réinitialisation');
      }

      toast.success('Mot de passe réinitialisé avec succès');
      router.push('/auth/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur technique';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const pwdOk = newPassword.length >= 6;
  const pwdMatch = newPassword === confirmPassword && newPassword !== '';

  return (
    <AuthShell
      badge="Sécurité"
      title={step === 'request' ? 'Réinitialiser le mot de passe' : 'Nouveau mot de passe'}
      subtitle={step === 'request' ? 'Entrez votre email pour recevoir un lien de réinitialisation' : 'Définissez votre nouveau mot de passe sécurisé'}
    >
      <div className="space-y-6">
        {/* STEP 1: Request Reset */}
        {step === 'request' && (
          <>
            {success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                    Email envoyé !
                  </h3>
                  <p className="text-sm text-[var(--text-2)]">
                    Si un compte existe avec {email}, vous recevrez un email avec les instructions.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  Retour à la connexion
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="email" style={{ color: 'var(--text-2)' }}>Email professionnel</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@entreprise.cm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      style={{
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                      }}
                      required
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 text-sm p-3 rounded-xl border"
                      style={{
                        borderColor: 'var(--error)',
                        background: 'color-mix(in srgb, var(--error) 8%, transparent)',
                        color: 'var(--error)',
                      }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>

                <div className="text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
          </>
        )}

        {/* STEP 2: Reset Password */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div className="space-y-2.5">
              <Label htmlFor="newPassword" style={{ color: 'var(--text-2)' }}>Nouveau mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-10"
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="confirmPassword" style={{ color: 'var(--text-2)' }}>Confirmer le mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  style={{
                    background: 'var(--bg-muted)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  required
                />
              </div>
            </div>

            {/* Password strength indicators */}
            <div className="space-y-2 pt-1">
              {[
                { ok: pwdOk, label: 'Au moins 6 caractères' },
                { ok: pwdMatch, label: 'Les mots de passe correspondent' },
              ].map(({ ok, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{ background: ok ? 'var(--violet)' : 'var(--bg-muted)', border: `1px solid ${ok ? 'var(--violet)' : 'var(--border)'}` }}
                  >
                    {ok && <CheckCircle className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span style={{ color: ok ? 'var(--violet)' : 'var(--text-muted)' }}>{label}</span>
                </div>
              ))}
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-sm p-3 rounded-xl border"
                  style={{
                    borderColor: 'var(--error)',
                    background: 'color-mix(in srgb, var(--error) 8%, transparent)',
                    color: 'var(--error)',
                  }}
                >
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </Button>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1 text-sm text-[var(--text-2)] hover:text-[var(--text)] transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
