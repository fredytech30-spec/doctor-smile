'use client';

import { motion } from 'framer-motion';
import { Upload, Cpu, Sparkles, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Upload,
    title: 'Importez vos données',
    description: 'Glissez-déposez vos fichiers Excel, CSV ou comptables SYSCOHADA. Notre parseur intelligent reconnaît automatiquement la structure.',
    badge: 'Excel · CSV · ODS',
    color: 'var(--violet)',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'Le ML analyse en 0.3s',
    description: 'Notre ensemble Random Forest + XGBoost + LightGBM calcule 47 ratios financiers calibrés sur les normes OHADA et génère un score de santé.',
    badge: 'ML Ensemble · SHAP',
    color: 'var(--gold)',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Insights actionnables',
    description: 'Recevez un rapport complet avec score, zone de risque, explications SHAP détaillées et recommandations priorisées par l\'IA.',
    badge: 'PDF · Chat IA · API',
    color: 'var(--success)',
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" id="how"
      style={{ background: 'var(--bg)' }}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `
            linear-gradient(var(--violet-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--violet-border) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Glow ambiance */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(124,58,237,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{
              background: 'var(--violet-soft)',
              border: '1px solid var(--violet-border)',
              color: 'var(--violet)',
            }}
          >
            Comment ça marche
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-[var(--text)] mb-4 tracking-tight">
            De vos données à l&apos;action{' '}
            <span className="gradient-text">en 30 secondes</span>
          </h2>
          <p className="text-[var(--text-2)] max-w-xl mx-auto text-lg leading-relaxed">
            Pas de configuration complexe. Pas de formation requise. Un workflow pensé pour les professionnels financiers africains.
          </p>
        </motion.div>

        {/* Steps — horizontal connector on desktop */}
        <div className="relative">
          {/* Connector line */}
          <div
            className="absolute top-[52px] left-[calc(16.66%+32px)] right-[calc(16.66%+32px)] h-px hidden lg:block"
            style={{
              background: 'linear-gradient(90deg, var(--violet-border), var(--violet), var(--violet-border))',
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  className="relative flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                >
                  {/* Icon bubble */}
                  <div className="relative mb-8">
                    {/* Number */}
                    <span
                      className="absolute -top-3 -right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold font-mono"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--violet-border)',
                        color: 'var(--violet)',
                      }}
                    >
                      {step.number}
                    </span>
                    <div
                      className="w-[104px] h-[104px] rounded-2xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        boxShadow: `0 0 40px rgba(124,58,237,0.12)`,
                      }}
                    >
                      {/* Glow inner */}
                      <div
                        className="absolute inset-0"
                        style={{
                          background: `radial-gradient(circle at center, rgba(124,58,237,0.15), transparent 70%)`,
                        }}
                      />
                      <Icon className="w-10 h-10 relative z-10" style={{ color: step.color }} />
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="font-display font-bold text-xl text-[var(--text)] mb-3">
                    {step.title}
                  </h3>
                  <p className="text-[var(--text-2)] text-sm leading-relaxed max-w-[280px]">
                    {step.description}
                  </p>
                  <span
                    className="mt-4 inline-flex px-3 py-1 rounded-full text-[11px] font-bold font-mono"
                    style={{
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {step.badge}
                  </span>

                  {/* Arrow on mobile */}
                  {i < steps.length - 1 && (
                    <ArrowRight
                      className="mt-8 text-[var(--violet-border)] lg:hidden"
                      style={{ rotate: '90deg' }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
