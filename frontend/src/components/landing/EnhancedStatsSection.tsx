'use client';

import { motion, Variants } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, TrendingUp, CheckCircle } from 'lucide-react';

const stats = [
  { label: 'Analyses complétées', value: '50,000+', icon: TrendingUp, color: 'var(--violet)' },
  { label: 'Précision moyenne', value: '96.2%', icon: CheckCircle, color: 'var(--gold)' },
  { label: 'Temps moyen', value: '2.3s', icon: Zap, color: 'var(--success)' },
  { label: 'Utilisateurs satisfaits', value: '99%', icon: Sparkles, color: 'var(--cyan)' },
];

const container: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6 },
  },
};

export function EnhancedStatsSection() {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden bg-gradient-to-b from-[rgba(124,58,237,0.08)] via-[var(--bg)] to-[rgba(255,215,0,0.04)]">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-96 h-96 rounded-full bg-gradient-radial from-[var(--violet)]/20 via-[var(--violet)]/5 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-20%] w-96 h-96 rounded-full bg-gradient-radial from-[var(--gold)]/15 via-[var(--gold)]/5 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(124,58,237,0.1)] border border-[var(--violet-border)] mb-4">
            <Sparkles className="w-4 h-4 text-[var(--violet)]" />
            <span className="text-sm font-medium text-[var(--violet)]">Statistiques en direct</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            <span className="block text-[var(--text)]">La plateforme de diagnostic</span>
            <span className="block bg-gradient-to-r from-[var(--violet)] via-[var(--gold)] to-[var(--cyan)] bg-clip-text text-transparent">
              la plus fiable d&apos;Afrique
            </span>
          </h2>

          <p className="text-[var(--text-2)] text-lg max-w-2xl mx-auto">
            Rejoignez des milliers d&apos;entreprises qui font confiance à Developer Smile pour optimiser leur santé financière
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={idx}
                variants={item}
                className="group relative rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-sm hover:bg-[rgba(255,255,255,0.08)] transition-all duration-300 overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${stat.color}15 0%, transparent 70%)`,
                  }}
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center"
                    style={{
                      background: `${stat.color}20`,
                      border: `1px solid ${stat.color}40`,
                    }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </motion.div>

                  {/* Value */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-4xl font-black mb-1"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </motion.p>

                  {/* Label */}
                  <p className="text-sm text-[var(--text-2)] font-medium">{stat.label}</p>
                </div>

                {/* Border animation */}
                <div className="absolute inset-0 rounded-2xl border border-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    borderColor: stat.color,
                    boxShadow: `inset 0 0 20px ${stat.color}10`,
                  }}
                />
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center"
        >
          <a href="/auth/register">
            <button type="button" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all duration-300 hover:scale-105 hover:shadow-xl group"
              style={{
                background: 'linear-gradient(135deg, var(--violet) 0%, var(--gold) 100%)',
                boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
              }}
            >
              <span>Découvrir la plateforme</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
