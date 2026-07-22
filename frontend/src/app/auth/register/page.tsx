'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Lock, User, Building, ArrowRight, AlertCircle, Check, ChevronLeft } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { RegisterFormData } from '@/types';

const SECTEURS = [
  { value: 'tech', label: 'Technologie' },
  { value: 'finance', label: 'Finance & Banque' },
  { value: 'retail', label: 'Commerce & Distribution' },
  { value: 'manufacturing', label: 'Industrie & Production' },
  { value: 'services', label: 'Services aux entreprises' },
  { value: 'agriculture', label: 'Agriculture & Agroalimentaire' },
  { value: 'btp', label: 'BTP & Immobilier' },
  { value: 'sante', label: 'Santé & Pharmacie' },
  { value: 'other', label: 'Autre' },
];

const TAILLES = [
  { value: '1-10', label: '1 – 10 employés' },
  { value: '11-50', label: '11 – 50 employés' },
  { value: '51-200', label: '51 – 200 employés' },
  { value: '201-500', label: '201 – 500 employés' },
  { value: '500+', label: '500+ employés' },
];

const PAYS = [
  { value: 'cm', label: 'Cameroun' },
  { value: 'sn', label: 'Sénégal' },
  { value: 'ci', label: 'Côte d\'Ivoire' },
  { value: 'ga', label: 'Gabon' },
  { value: 'ml', label: 'Mali' },
  { value: 'bf', label: 'Burkina Faso' },
  { value: 'ne', label: 'Niger' },
  { value: 'td', label: 'Tchad' },
  { value: 'cg', label: 'Congo-Brazzaville' },
  { value: 'cd', label: 'RDC' },
  { value: 'other', label: 'Autre' },
];

const STEPS = ['Identité', 'Sécurité', 'Entreprise'];

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState<RegisterFormData>({
    prenom: '',
    nom: '',
    email: '',
    password: '',
    confirmPassword: '',
    entreprise: { nom: '', secteur: '', taille: '', pays: '' },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes('entreprise.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, entreprise: { ...prev.entreprise, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelect = (name: string, value: string) => {
    if (name.includes('entreprise.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({ ...prev, entreprise: { ...prev.entreprise, [field]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    setError('');
    if (step === 1) {
      if (!formData.prenom || !formData.nom || !formData.email) {
        setError('Tous les champs sont obligatoires'); return false;
      }
      if (!formData.email.includes('@')) { setError('Email invalide'); return false; }
    }
    if (step === 2) {
      if (!formData.password || !formData.confirmPassword) {
        setError('Veuillez remplir les deux champs'); return false;
      }
      if (formData.password.length < 8) {
        setError('Minimum 8 caractères requis'); return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Les mots de passe ne correspondent pas'); return false;
      }
    }
    if (step === 3) {
      const { nom, secteur, taille, pays } = formData.entreprise;
      if (!nom || !secteur || !taille || !pays) {
        setError('Veuillez compléter tous les champs'); return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (step < 3) { setStep(s => s + 1); return; }

    setLoading(true);
    try {
      await signUp(formData);
      toast.success('Compte créé avec succès ! Code OTP envoyé.');
      router.push('/auth/otp');
    } catch (err: any) {
      const msg = err.message || 'Erreur lors de la création du compte';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const pwdOk = formData.password.length >= 8;
  const pwdMatch = formData.password === formData.confirmPassword && formData.password !== '';

  return (
    <AuthShell
      badge="Inscription · Doctor Smile"
      title="Créer un compte"
      subtitle={`Étape ${step}/3 — ${STEPS[step - 1]}`}
    >
      <div className="border border-[var(--border)] bg-[var(--bg-muted)] rounded-3xl p-5 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-3xl bg-[rgba(139,127,240,0.14)] flex items-center justify-center text-[var(--violet)] shadow-sm shadow-[var(--violet)]/10">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[var(--violet)] font-semibold">Inscription</p>
            <p className="text-sm text-[var(--text-2)]">Complétez ces 3 étapes pour accéder au dashboard premium.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((label, i) => {
            const s = i + 1;
            const done = s < step;
            const active = s === step;
            return (
              <div
                key={s}
                className={`rounded-2xl p-3 border ${done ? 'border-[var(--violet)] bg-[rgba(139,127,240,0.12)]' : active ? 'border-[var(--violet-border)] bg-[rgba(139,127,240,0.08)]' : 'border-[var(--border)] bg-[var(--bg)]'} transition-all`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center ${done ? 'bg-[var(--violet)] text-white' : 'bg-[var(--bg-muted)] text-[var(--text-2)]'}`}>
                    {done ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className="text-xs font-semibold" style={{ color: active ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                <p className="text-[11px] text-[var(--text-2)]">{active ? 'En cours' : done ? 'Terminé' : 'À venir'}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2 text-sm p-3 rounded-xl border mb-5"
            style={{
              borderColor: 'var(--error)',
              background: 'color-mix(in srgb, var(--error) 8%, transparent)',
              color: 'var(--error)',
            }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatePresence mode="wait">
          {/* ─── STEP 1: Identité ─── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="prenom" style={{ color: 'var(--text-2)' }}>Prénom</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    <Input
                      id="prenom"
                      name="prenom"
                      placeholder="Jean"
                      value={formData.prenom}
                      onChange={handleChange}
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
                <div className="space-y-1.5">
                  <Label htmlFor="nom" style={{ color: 'var(--text-2)' }}>Nom</Label>
                  <Input
                    id="nom"
                    name="nom"
                    placeholder="Dupont"
                    value={formData.nom}
                    onChange={handleChange}
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" style={{ color: 'var(--text-2)' }}>Email professionnel</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="vous@entreprise.cm"
                    value={formData.email}
                    onChange={handleChange}
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
            </motion.div>
          )}

          {/* ─── STEP 2: Sécurité ─── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="password" style={{ color: 'var(--text-2)' }}>Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" style={{ color: 'var(--text-2)' }}>Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
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
              {/* Strength indicators */}
              <div className="space-y-1.5 pt-1">
                {[
                  { ok: pwdOk, label: 'Au moins 8 caractères' },
                  { ok: pwdMatch, label: 'Les mots de passe correspondent' },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: ok ? 'var(--violet)' : 'var(--bg-muted)', border: `1px solid ${ok ? 'var(--violet)' : 'var(--border)'}` }}
                    >
                      {ok && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span style={{ color: ok ? 'var(--violet)' : 'var(--text-muted)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── STEP 3: Entreprise ─── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="entreprise.nom" style={{ color: 'var(--text-2)' }}>Nom de l&apos;entreprise</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    id="entreprise.nom"
                    name="entreprise.nom"
                    placeholder="Ma Société SARL"
                    value={formData.entreprise.nom}
                    onChange={handleChange}
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

              <div className="space-y-1.5">
                <Label style={{ color: 'var(--text-2)' }}>Secteur d&apos;activité</Label>
                <Select onValueChange={(v) => handleSelect('entreprise.secteur', v)}>
                  <SelectTrigger
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: formData.entreprise.secteur ? 'var(--text)' : 'var(--text-muted)',
                    }}
                  >
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {SECTEURS.map(({ value, label }) => (
                      <SelectItem key={value} value={value} style={{ color: 'var(--text)' }}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text-2)' }}>Taille</Label>
                  <Select onValueChange={(v) => handleSelect('entreprise.taille', v)}>
                    <SelectTrigger
                      style={{
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border)',
                        color: formData.entreprise.taille ? 'var(--text)' : 'var(--text-muted)',
                      }}
                    >
                      <SelectValue placeholder="Effectif" />
                    </SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {TAILLES.map(({ value, label }) => (
                        <SelectItem key={value} value={value} style={{ color: 'var(--text)' }}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label style={{ color: 'var(--text-2)' }}>Pays</Label>
                  <Select onValueChange={(v) => handleSelect('entreprise.pays', v)}>
                    <SelectTrigger
                      style={{
                        background: 'var(--bg-muted)',
                        border: '1px solid var(--border)',
                        color: formData.entreprise.pays ? 'var(--text)' : 'var(--text-muted)',
                      }}
                    >
                      <SelectValue placeholder="Pays" />
                    </SelectTrigger>
                    <SelectContent style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                      {PAYS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} style={{ color: 'var(--text)' }}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => { setError(''); setStep(s => s - 1); }}
              className="flex-none px-4"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="flex-1"
            disabled={loading}
          >
            {loading ? 'Création du compte...' : step === 3 ? 'Créer mon compte' : 'Continuer'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-2)' }}>
        Déjà un compte ?{' '}
        <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: 'var(--violet)' }}>
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
