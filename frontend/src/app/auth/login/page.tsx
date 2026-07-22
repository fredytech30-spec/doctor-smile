'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle, Eye, EyeOff, ChevronRight, Sparkles, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success('Code de vérification envoyé');
      router.push('/auth/otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(msg);
      toast.error('Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await signInWithGoogle();
      toast.success('Code de vérification envoyé');
      router.push('/auth/otp');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur avec Google';
      setError(msg);
      toast.error('Connexion Google impossible');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      badge="Sécurité renforcée"
      title="Connexion"
      subtitle="Accédez à votre espace Doctor Smile — vérification 2FA par email"
    >
      <div className="space-y-6">
        {/* Google Login Button with Glass Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.button
            whileHover={{ scale: 1.02, boxShadow: "0 10px 40px -10px rgba(124,58,237,0.3)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="group relative w-full h-14 inline-flex items-center justify-center gap-3 rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--bg-muted)] to-[var(--bg-card)] text-[var(--text)] shadow-lg shadow-[var(--violet)]/5 font-semibold transition-all duration-300 hover:border-[var(--violet-border)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--violet)]/0 via-[var(--violet)]/5 to-[var(--violet)]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <motion.div 
              className="relative z-10"
              animate={{ rotate: googleLoading ? 360 : 0 }}
              transition={{ duration: 1, repeat: googleLoading ? Infinity : 0, ease: "linear" }}
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            </motion.div>
            <span className="relative z-10">
              {googleLoading ? 'Connexion en cours...' : 'Continuer avec Google'}
            </span>
            <motion.div 
              className="absolute right-4 z-10"
              animate={{ x: googleLoading ? [0, 10, 0] : 0 }}
              transition={{ duration: 0.5, repeat: googleLoading ? Infinity : 0 }}
            >
              <Sparkles className="w-5 h-5 text-[var(--violet)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Divider with Animation */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="absolute inset-0 flex items-center">
            <motion.div 
              className="w-full border-t border-[var(--border)]/50"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[var(--bg-card)] text-[var(--text-3)] font-medium">ou</span>
          </div>
        </motion.div>

        {/* Form with Enhanced Design */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-[var(--text-2)] flex items-center gap-2">
              <Mail className="w-4 h-4 text-[var(--violet)]" />
              Email professionnel
            </Label>
            <motion.div 
              className="relative group"
              animate={{ scale: isFocused === 'email' ? 1.01 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[var(--violet)]/20 to-[var(--violet)]/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ opacity: isFocused === 'email' ? 1 : 0 }}
              />
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--violet)]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@entreprise.cm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused('email')}
                  onBlur={() => setIsFocused('')}
                  className="pl-12 pr-4 py-4 h-12 text-base rounded-xl bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet)]/20 transition-all shadow-sm"
                  required
                />
              </div>
            </motion.div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-semibold text-[var(--text-2)] flex items-center gap-2">
              <Lock className="w-4 h-4 text-[var(--violet)]" />
              Mot de passe
            </Label>
            <motion.div 
              className="relative group"
              animate={{ scale: isFocused === 'password' ? 1.01 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-[var(--violet)]/20 to-[var(--violet)]/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                animate={{ opacity: isFocused === 'password' ? 1 : 0 }}
              />
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--violet)]" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setIsFocused('password')}
                  onBlur={() => setIsFocused('')}
                  className="pl-12 pr-14 py-4 h-12 text-base rounded-xl bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)] focus:border-[var(--violet)] focus:ring-2 focus:ring-[var(--violet)]/20 transition-all shadow-sm"
                  required
                />
                <motion.button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl hover:bg-[var(--violet-soft)] transition-colors text-[var(--text-muted)] hover:text-[var(--violet)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
            </motion.div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-start gap-3 text-sm p-4 rounded-xl border border-[var(--error)]/20 bg-gradient-to-r from-[var(--error-soft)] to-transparent text-[var(--error)] shadow-lg"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between text-sm">
            <motion.div 
              className="flex items-center gap-2 text-[var(--text-2)]"
              whileHover={{ scale: 1.05 }}
            >
              <ShieldCheck className="w-4 h-4 text-[var(--violet)]" />
              <span>Accès protégé par 2FA</span>
            </motion.div>
            <Link 
              href="/auth/reset-password" 
              className="font-semibold text-[var(--violet)] hover:opacity-80 transition-opacity inline-flex items-center gap-1 group"
            >
              Mot de passe oublié ?
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-[var(--violet)]/20 hover:shadow-[var(--violet)]/30 transition-all" 
              disabled={loading}
            >
              {loading ? (
                <motion.div 
                  className="inline-flex items-center gap-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Sparkles className="w-5 h-5" />
                  Connexion en cours...
                </motion.div>
              ) : (
                <span className="inline-flex items-center justify-center gap-2">
                  Se connecter
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.form>

        <motion.div 
          className="pt-5 border-t border-[var(--border)]/50 text-center text-sm text-[var(--text-2)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Pas encore de compte ?{' '}
          <Link 
            href="/auth/register" 
            className="font-semibold text-[var(--violet)] hover:opacity-80 transition-opacity inline-flex items-center gap-1 group"
          >
            Créer un compte
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </AuthShell>
  );
}
