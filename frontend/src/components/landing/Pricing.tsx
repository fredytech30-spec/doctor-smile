'use client';

import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

const plans = [
  {
    name: 'Standard',
    price: '25 000',
    period: 'FCFA/mois',
    description: 'Pour démarrer avec les essentiels',
    features: [
      '10 analyses par mois',
      'Score IVF SYSCOHADA',
      'Alertes DGI (TVA · DSF · IS · Patente)',
      'Export PDF basique',
      'Support email',
    ],
    popular: false,
    color: '#8B5CF6',
  },
  {
    name: 'Premium',
    price: '50 000',
    period: 'FCFA/mois',
    description: 'Pour les PME en croissance',
    features: [
      'Tout Standard +',
      'Simulateur What-If scénarios',
      'Dossier Crédit format BEAC',
      'Benchmarks sectoriels CEMAC',
      'Score de Crédit Prédictif (Afriland, SGBC, UBC)',
      'Support prioritaire',
    ],
    popular: true,
    color: '#8B5CF6',
  },
  {
    name: 'Extra',
    price: '100 000',
    period: 'FCFA/mois',
    description: 'Pour les grandes structures',
    features: [
      'Tout Premium +',
      'Accès API complet',
      'Hub Expert ONECCA intégré',
      'Analyses illimitées',
      'Multi-utilisateurs',
      'Formation & onboarding dédié',
    ],
    popular: false,
    color: '#D4AF37',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 60,
    scale: 0.9,
    rotateX: 10,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    rotateX: 0,
    transition: {
      duration: 0.6,
      type: 'spring' as const,
      damping: 15,
      stiffness: 100,
    },
  },
};

export function Pricing() {
  const router = useRouter();

  return (
    <section className="py-20 relative overflow-hidden" id="pricing">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--violet)', border: '1px solid rgba(139,92,246,0.3)' }}
          >
            💰 Tarifs
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="font-display font-black text-3xl sm:text-4xl lg:text-5xl mb-4"
            style={{ color: 'var(--text)' }}
          >
            Choisissez votre plan
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="max-w-2xl mx-auto text-lg"
            style={{ color: 'var(--text-2)' }}
          >
            Des tarifs conçus pour les PME camerounaises. Payez en Mobile Money. Annulez à tout moment.
          </motion.p>
        </div>

        {/* Cards */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                transition: { duration: 0.3 },
              }}
              style={{ perspective: 1000 }}
              className={`relative backdrop-blur-xl rounded-3xl p-8 flex flex-col transition-all duration-500 group ${
                plan.popular
                  ? 'shadow-lg'
                  : 'hover:shadow-lg'
              }`}
            >
              {/* Card background via inline style to use CSS vars */}
              <div
                className="absolute inset-0 rounded-3xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: plan.popular
                    ? '1px solid rgba(139,92,246,0.6)'
                    : '1px solid var(--border)',
                  borderRadius: 'inherit',
                }}
              />

              {/* Hover shimmer */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 px-4 py-1.5 rounded-full text-white text-xs font-bold shadow-lg"
                    style={{ background: 'linear-gradient(135deg, var(--violet), #a855f7)' }}>
                    <Star className="w-3.5 h-3.5 fill-current" />
                    POPULAIRE
                  </div>
                </div>
              )}

              <div className="relative z-10 flex flex-col flex-1">
                {/* Plan name & price */}
                <div className="text-center mb-8">
                  <h3
                    className="font-display font-bold text-2xl mb-2 transition-colors"
                    style={{ color: 'var(--text)' }}
                  >
                    {plan.name}
                  </h3>
                  <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className="font-display font-black text-4xl"
                      style={{ color: plan.popular ? 'var(--violet)' : plan.color }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>
                      {plan.period}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, fi) => (
                    <li key={fi} className="flex items-start gap-3">
                      <Check
                        className="w-4 h-4 flex-shrink-0 mt-0.5"
                        style={{ color: plan.popular ? 'var(--violet)' : plan.color }}
                      />
                      <span className="text-sm" style={{ color: 'var(--text-2)' }}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Button
                  variant={plan.popular ? 'primary' : 'secondary'}
                  size="lg"
                  className="w-full mb-4"
                  onClick={() => router.push('/auth')}
                >
                  Commencer maintenant
                </Button>

                {/* Mobile Money logos */}
                <div className="flex items-center justify-center gap-3 pt-1">
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,204,0,0.12)', color: '#D4A800', border: '1px solid rgba(255,204,0,0.25)' }}
                  >
                    💛 MTN MoMo
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(255,102,0,0.12)', color: '#ff6600', border: '1px solid rgba(255,102,0,0.25)' }}
                  >
                    🟠 Orange Money
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Fapshi banner */}
        <motion.div
          variants={itemVariants}
          className="mt-14 flex items-center justify-center"
        >
          <div
            className="inline-flex flex-wrap items-center justify-center gap-2 px-6 py-3 rounded-2xl text-sm font-medium"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}
          >
            <span className="text-base">📱</span>
            <span>Paiement Mobile Money uniquement</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span>Aucune carte bancaire requise</span>
            <span style={{ color: 'var(--border)' }}>·</span>
            <span className="font-bold" style={{ color: 'var(--violet)' }}>Via Fapshi</span>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
