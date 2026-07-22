'use client';

import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, PieChart, Activity } from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Analyse approfondie',
    description: 'Diagnostics détaillés avec décomposition par zone SYSCOHADA',
    gradient: 'from-[var(--violet)] to-[var(--cyan)]',
  },
  {
    icon: TrendingUp,
    title: 'Suivi en temps réel',
    description: 'Tendances et évolutions financières en direct',
    gradient: 'from-[var(--gold)] to-[var(--violet)]',
  },
  {
    icon: PieChart,
    title: 'Répartition visuelle',
    description: 'Graphes interactifs et comparaisons intelligentes',
    gradient: 'from-[var(--success)] to-[var(--gold)]',
  },
  {
    icon: Activity,
    title: 'Intelligence continue',
    description: 'Apprentissage machine pour prédictions précises',
    gradient: 'from-[var(--cyan)] to-[var(--success)]',
  },
];

export function FeatureshowCase() {
  return (
    <section className="relative py-24 md:py-40 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-[10%] w-80 h-80 bg-[var(--violet)]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-[10%] w-80 h-80 bg-[var(--gold)]/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            <span className="block text-[var(--text)]">Capacités avancées</span>
            <span className="bg-gradient-to-r from-[var(--violet)] via-[var(--gold)] to-[var(--cyan)] bg-clip-text text-transparent">
              extraordinaires
            </span>
          </h2>
          <p className="text-[var(--text-2)] text-lg max-w-2xl mx-auto">
            Une plateforme complète pour tous vos besoins d'analyse financière
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative rounded-3xl overflow-hidden border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-8 backdrop-blur hover:bg-[rgba(255,255,255,0.08)] transition-all duration-300"
              >
                {/* Gradient background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(135deg, ${feature.gradient.split(' ')[1]} 0%, ${feature.gradient.split(' ')[3]} 100%)`,
                    opacity: '0.05',
                  }}
                />

                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ duration: 0.3 }}
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-3 mb-6 flex items-center justify-center`}
                >
                  <Icon className="w-7 h-7 text-white" />
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-[var(--text)] mb-2">{feature.title}</h3>
                  <p className="text-[var(--text-2)] text-sm leading-relaxed">{feature.description}</p>
                </div>

                {/* Arrow indicator */}
                <motion.div
                  className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ x: 4 }}
                >
                  <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </motion.div>
              </motion.div>
            );
          })}
        </div>

        {/* Large showcase card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl overflow-hidden border border-[var(--border)] bg-gradient-to-br from-[rgba(124,58,237,0.1)] via-[rgba(255,255,255,0.03)] to-[rgba(255,215,0,0.05)] p-8 md:p-12 backdrop-blur-md"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-96 h-96 bg-[var(--violet)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-[var(--gold)]/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
          </div>

          <div className="relative z-10 text-center">
            <h3 className="text-3xl md:text-4xl font-black mb-4 text-[var(--text)]">
              Dashboard intuitif et puissant
            </h3>
            <p className="text-[var(--text-2)] text-lg mb-8 max-w-2xl mx-auto">
              Visualisez vos données financières avec des graphes interactifs, des indicateurs KPI en temps réel et des recommandations intelligentes.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[var(--violet)] to-[var(--gold)] hover:shadow-lg transition-all"
              >
                Voir la démo
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-3 rounded-xl font-bold border border-[var(--violet)] text-[var(--violet)] bg-[rgba(124,58,237,0.1)] hover:bg-[rgba(124,58,237,0.2)] transition-all"
              >
                Essayer maintenant
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
