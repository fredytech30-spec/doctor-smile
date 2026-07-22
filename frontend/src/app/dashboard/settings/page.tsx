'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useTheme } from '@/components/theme/ThemeProvider';
import {
  User,
  Building2,
  ShieldCheck,
  CreditCard,
  Save,
  LogOut,
  SunMedium,
  Moon,
  Check,
  ChevronRight,
  Smartphone,
  Star,
  Zap,
  Rocket,
  Lock,
  Mail,
  Briefcase,
  Globe,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAbonnement } from '@/hooks/useAbonnement';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

const PLANS_INFO = [
  {
    id: 'standard',
    name: 'Standard',
    price: '25 000',
    icon: ChevronRight,
    description: 'Score financier et ratios de base SYSCOHADA.',
    features: ['3 analyses / mois', 'Score financier global', 'Export PDF standard', 'Accès au tableau de bord'],
    color: 'var(--text-muted)',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '50 000',
    icon: Star,
    description: 'Assistant IA + Marketplace experts ONECCA + simulateur.',
    features: ['10 analyses / mois', 'Assistant Chatbot IA', 'Simulateur What-If', 'Marketplace Experts ONECCA', 'Rapport bancaire & investisseur'],
    recommended: true,
    color: 'var(--violet)',
  },
  {
    id: 'extra',
    name: 'Extra',
    price: '100 000',
    icon: Rocket,
    description: 'Analyses illimitées, support prioritaire et API REST dédiée.',
    features: ['Analyses illimitées', 'API REST dédiée', 'Support Prioritaire 24/7', 'Simulations complexes', 'Accès multi-entités'],
    color: 'var(--gold-strong)',
  },
];

const GATEWAYS = [
  {
    id: 'notchpay',
    name: 'Notch Pay',
    subtitle: 'Mobile Money · Cartes Bancaires',
    methods: ['MTN Mobile Money', 'Orange Money', 'Visa / Mastercard'],
  },
  {
    id: 'fapshi',
    name: 'Fapshi',
    subtitle: 'Mobile Money Cameroun Direct',
    methods: ['MTN Mobile Money', 'Orange Money'],
  },
];

const TAB_ITEMS = [
  { id: 'profile', label: 'Profil personnel', icon: User },
  { id: 'entreprise', label: 'Entreprise', icon: Building2 },
  { id: 'theme', label: 'Apparence', icon: SunMedium },
  { id: 'security', label: 'Sécurité', icon: ShieldCheck },
  { id: 'billing', label: 'Plans & Facturation', icon: CreditCard },
];

const fadeUp: any = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-[var(--text-2)] mb-1.5">{children}</label>;
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}>
        <Icon className="w-5 h-5" style={{ color: 'var(--violet)' }} />
      </div>
      <div>
        <h2 className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>{title}</h2>
        {subtitle && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useUserProfile(user);
  const { abonnement, isTrialActive, getDaysRemaining } = useAbonnement(user);
  const { theme, toggleTheme } = useTheme();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [formData, setFormData] = useState({
    prenom: '', nom: '', email: '', poste: '',
    entreprise: { nom: '', secteur: 'tech', taille: '1-10', pays: 'Cameroun' },
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        email: profile.email || user?.email || '',
        poste: profile.poste || '',
        entreprise: {
          nom: profile.entreprise?.nom || '',
          secteur: profile.entreprise?.secteur || 'tech',
          taille: profile.entreprise?.taille || '1-10',
          pays: profile.entreprise?.pays || 'Cameroun',
        },
      });
    }
  }, [profile, user]);

  const [selectedPlan, setSelectedPlan] = useState('premium');
  const [selectedGateway, setSelectedGateway] = useState('notchpay');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const reference = params.get('reference') || params.get('ref');
    const operator = params.get('operator') || 'notchpay';
    const plan = params.get('plan') || 'premium';

    if (status === 'success' && reference) {
      const verify = async () => {
        try {
          toast.loading("Validation du paiement en cours…");
          const res = await apiClient<any>('/payment/verify-payment', {
            method: 'POST',
            body: JSON.stringify({ reference, operator, plan }),
          });
          toast.dismiss();
          toast.success(`Abonnement ${res.plan} activé avec succès.`);
          router.replace('/dashboard/settings?tab=billing');
        } catch {
          toast.dismiss();
          toast.error("Échec de la validation. Contactez le support.");
        }
      };
      verify();
    } else if (status === 'cancel') {
      toast.warning("Le paiement a été annulé.");
      router.replace('/dashboard/settings');
    }
  }, [router]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      toast.success("Modifications sauvegardées avec succès.");
    } catch {
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = '/';
    } catch {
      toast.error("Erreur lors de la déconnexion.");
    }
  };

  const handleCheckout = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const res = await apiClient<{ checkout_url: string; session_id: string }>('/payment/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: selectedPlan,
          operator: selectedGateway,
          currency: 'XAF',
          success_url: `${window.location.origin}/dashboard/settings?status=success&operator=${selectedGateway}&plan=${selectedPlan}`,
          cancel_url: `${window.location.origin}/dashboard/settings?status=cancel`,
        }),
      });
      if (res.checkout_url) {
        toast.success("Redirection vers la passerelle sécurisée…");
        window.location.href = res.checkout_url;
      } else {
        toast.error("Impossible d'initialiser le paiement.");
      }
    } catch {
      toast.error("Erreur lors de l'initialisation du paiement.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <>
      <DashboardHeader
        title="Paramètres"
        subtitle="Compte, entreprise, apparence et facturation"
      />

      <main className="p-6 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Sidebar */}
          <motion.div custom={0} initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-1">
            <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
              {/* Profil avatar */}
              <div className="px-5 py-6 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-display font-bold text-base text-white shrink-0"
                    style={{ background: 'var(--violet)' }}
                  >
                    {(formData.prenom?.[0] || formData.nom?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--text)] truncate">
                      {formData.prenom || formData.nom ? `${formData.prenom} ${formData.nom}`.trim() : 'Mon compte'}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{formData.email || user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="p-3 space-y-0.5">
                {TAB_ITEMS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: activeTab === id ? 'var(--violet-soft)' : 'transparent',
                      color: activeTab === id ? 'var(--violet)' : 'var(--text-2)',
                      border: `1px solid ${activeTab === id ? 'var(--violet-border)' : 'transparent'}`,
                    }}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </nav>

              <div className="p-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all text-[var(--error)] hover:bg-[var(--error)]/8"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  Se déconnecter
                </button>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="lg:col-span-3">

            {/* Profil */}
            {activeTab === 'profile' && (
              <div className="rounded-3xl border p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <SectionTitle icon={User} title="Informations Personnelles" subtitle="Votre identité sur Doctor Smile" />
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Prénom</FieldLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <Input
                          value={formData.prenom}
                          onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                          className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)]"
                        />
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Nom de famille</FieldLabel>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <Input
                          value={formData.nom}
                          onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                          className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Adresse email</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <Input
                        type="email"
                        value={formData.email}
                        disabled
                        className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)] opacity-60 cursor-not-allowed"
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1.5">L'email est géré par votre fournisseur d'authentification.</p>
                  </div>

                  <div>
                    <FieldLabel>Poste occupé</FieldLabel>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <Input
                        value={formData.poste}
                        placeholder="Directeur Financier, Comptable, PDG…"
                        onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                        className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <Button variant="primary" onClick={handleSave} disabled={loading} className="gap-2">
                      <Save className="w-4 h-4" />
                      {loading ? 'Sauvegarde…' : 'Enregistrer les modifications'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Entreprise */}
            {activeTab === 'entreprise' && (
              <div className="rounded-3xl border p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <SectionTitle icon={Building2} title="Informations de l'Entreprise" subtitle="Données utilisées dans les rapports générés" />
                <div className="space-y-5">
                  <div>
                    <FieldLabel>Raison sociale</FieldLabel>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <Input
                        value={formData.entreprise.nom}
                        placeholder="Nom légal de votre entreprise"
                        onChange={(e) => setFormData({ ...formData, entreprise: { ...formData.entreprise, nom: e.target.value } })}
                        className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Secteur d'activité</FieldLabel>
                      <select
                        value={formData.entreprise.secteur}
                        onChange={(e) => setFormData({ ...formData, entreprise: { ...formData.entreprise, secteur: e.target.value } })}
                        className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                      >
                        <option value="tech">Technologie & Innovation</option>
                        <option value="finance">Services Financiers & Bancaires</option>
                        <option value="retail">Commerce & Distribution</option>
                        <option value="manufacturing">Industrie & Production</option>
                        <option value="services">Services aux Entreprises</option>
                        <option value="agro">Agro-alimentaire & Agriculture</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Taille de l'entreprise</FieldLabel>
                      <select
                        value={formData.entreprise.taille}
                        onChange={(e) => setFormData({ ...formData, entreprise: { ...formData.entreprise, taille: e.target.value } })}
                        className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                      >
                        <option value="1-10">1 — 10 employés (TPE)</option>
                        <option value="11-50">11 — 50 employés (Petite)</option>
                        <option value="51-200">51 — 200 employés (Moyenne)</option>
                        <option value="500+">500+ employés (Grande entreprise)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Pays d'exercice</FieldLabel>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                      <select
                        value={formData.entreprise.pays}
                        onChange={(e) => setFormData({ ...formData, entreprise: { ...formData.entreprise, pays: e.target.value } })}
                        className="w-full pl-9 bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                      >
                        <option value="Cameroun">Cameroun</option>
                        <option value="Côte d'Ivoire">Côte d&apos;Ivoire</option>
                        <option value="Sénégal">Sénégal</option>
                        <option value="Mali">Mali</option>
                        <option value="Burkina Faso">Burkina Faso</option>
                        <option value="Gabon">Gabon</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                    <Button variant="primary" onClick={handleSave} disabled={loading} className="gap-2">
                      <Save className="w-4 h-4" />
                      {loading ? 'Sauvegarde…' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Apparence */}
            {activeTab === 'theme' && (
              <div className="rounded-3xl border p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <SectionTitle icon={SunMedium} title="Thème & Apparence" subtitle="Personnalisez l'affichage de l'interface" />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'light', label: 'Clair', desc: 'Fond blanc, idéal en journée', icon: SunMedium },
                    { id: 'dark', label: 'Sombre', desc: 'Fond foncé, confort nocturne', icon: Moon },
                  ].map(({ id, label, desc, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { if (theme !== id) toggleTheme(); }}
                      className="flex items-start gap-4 p-5 rounded-2xl border text-left transition-all"
                      style={{
                        background: theme === id ? 'var(--violet-soft)' : 'var(--bg-muted)',
                        borderColor: theme === id ? 'var(--violet-border)' : 'var(--border)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: theme === id ? 'var(--violet)' : 'var(--bg-card)',
                          border: `1px solid ${theme === id ? 'transparent' : 'var(--border)'}`,
                        }}
                      >
                        <Icon className="w-4 h-4" style={{ color: theme === id ? 'white' : 'var(--text-muted)' }} />
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: theme === id ? 'var(--violet)' : 'var(--text)' }}>{label}</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{desc}</p>
                      </div>
                      {theme === id && (
                        <Check className="w-4 h-4 text-[var(--violet)] ml-auto shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sécurité */}
            {activeTab === 'security' && (
              <div className="rounded-3xl border p-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <SectionTitle icon={ShieldCheck} title="Sécurité du Compte" subtitle="Mettez à jour votre mot de passe de connexion" />
                <div className="space-y-5 max-w-md">
                  {[
                    { label: 'Mot de passe actuel', placeholder: '••••••••••••' },
                    { label: 'Nouveau mot de passe', placeholder: '••••••••••••' },
                    { label: 'Confirmer le nouveau mot de passe', placeholder: '••••••••••••' },
                  ].map(({ label, placeholder }) => (
                    <div key={label}>
                      <FieldLabel>{label}</FieldLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                        <Input type="password" placeholder={placeholder} className="pl-9 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)]" />
                      </div>
                    </div>
                  ))}
                  <Button variant="primary" className="gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Mettre à jour le mot de passe
                  </Button>
                </div>
              </div>
            )}

            {/* Facturation */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                {/* Statut actuel */}
                <div
                  className="rounded-3xl border p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  style={{ background: 'var(--violet-soft)', borderColor: 'var(--violet-border)' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'var(--violet)', boxShadow: '0 4px 16px var(--violet-glow)' }}>
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--violet)]">Abonnement actif</span>
                      <h3 className="font-display font-bold text-base text-[var(--text)] mt-0.5 capitalize">
                        Plan {abonnement?.plan || 'Standard'}
                      </h3>
                      <p className="text-[10px] text-[var(--text-2)] mt-0.5">
                        {isTrialActive() ? `Essai gratuit · ${getDaysRemaining()} jours restants` : 'Abonnement actif'}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success" size="sm">
                    {abonnement?.status || 'Actif'}
                  </Badge>
                </div>

                {/* Sélection de plan */}
                <div className="rounded-3xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <h3 className="font-display font-bold text-base text-[var(--text)] mb-5">Choisir un plan</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PLANS_INFO.map((p) => {
                      const Icon = p.icon;
                      const isSelected = selectedPlan === p.id;
                      const isCurrent = abonnement?.plan === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSelectedPlan(p.id)}
                          className="relative flex flex-col text-left p-5 rounded-2xl border transition-all"
                          style={{
                            background: isSelected ? 'var(--bg-muted)' : 'var(--bg-muted)',
                            borderColor: isSelected ? p.color : 'var(--border)',
                            boxShadow: isSelected ? `0 0 0 1px ${p.color}` : 'none',
                          }}
                        >
                          {p.recommended && (
                            <div
                              className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                              style={{ background: 'var(--violet)', color: 'white' }}
                            >
                              <Zap className="w-2.5 h-2.5" />
                              Recommandé
                            </div>
                          )}

                          <div className="flex items-center justify-between mb-3">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}>
                              <Icon className="w-4 h-4" style={{ color: p.color }} />
                            </div>
                            {isCurrent && (
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' }}>
                                Actuel
                              </span>
                            )}
                          </div>

                          <h4 className="font-display font-bold text-sm text-[var(--text)] mb-0.5">{p.name}</h4>
                          <p className="text-[10px] text-[var(--text-muted)] mb-3 leading-relaxed">{p.description}</p>

                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="font-display font-bold text-xl" style={{ color: p.color }}>{p.price}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">FCFA / mois</span>
                          </div>

                          <ul className="space-y-1.5 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                            {p.features.map((f) => (
                              <li key={f} className="flex items-center gap-2">
                                <Check className="w-3 h-3 shrink-0" style={{ color: p.color }} />
                                <span className="text-[10px] text-[var(--text-2)]">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Passerelle */}
                <div className="rounded-3xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <Smartphone className="w-4 h-4 text-[var(--violet)]" />
                    <h3 className="font-display font-bold text-base text-[var(--text)]">Mode de paiement</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {GATEWAYS.map((gw) => {
                      const isSelected = selectedGateway === gw.id;
                      return (
                        <button
                          key={gw.id}
                          onClick={() => setSelectedGateway(gw.id)}
                          className="flex items-start gap-4 p-5 rounded-2xl border text-left transition-all"
                          style={{
                            background: isSelected ? 'var(--violet-soft)' : 'var(--bg-muted)',
                            borderColor: isSelected ? 'var(--violet-border)' : 'var(--border)',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                            style={{ borderColor: isSelected ? 'var(--violet)' : 'var(--border)' }}
                          >
                            {isSelected && <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--violet)' }} />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--text)]">{gw.name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 mb-2">{gw.subtitle}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {gw.methods.map((m) => (
                                <span key={m} className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex justify-end mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading || selectedPlan === abonnement?.plan}
                      className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-40"
                      style={{ background: 'var(--violet)', boxShadow: '0 4px 16px var(--violet-glow)' }}
                    >
                      {checkoutLoading ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                      {checkoutLoading
                        ? 'Initialisation…'
                        : selectedPlan === abonnement?.plan
                          ? 'Vous êtes sur ce plan'
                          : `Souscrire au plan ${PLANS_INFO.find(p => p.id === selectedPlan)?.name} — ${PLANS_INFO.find(p => p.id === selectedPlan)?.price} FCFA`
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}

          </motion.div>
        </div>
      </main>
    </>
  );
}
