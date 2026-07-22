'use client';

import { motion } from 'framer-motion';
import { LayoutDashboard, Brain, FileText, Sparkles } from 'lucide-react';
import Image from 'next/image';

const visuals = [
  {
    icon: LayoutDashboard,
    title: 'Tableau de bord intelligent',
    description: 'Visualisez vos KPIs financiers clés, le Doctor Score™, votre cash burn et votre runway en temps réel avec des indicateurs clairs.',
    image: '/images/premium_vector-1682310918818-6e9a96a3ca2e.png',
    size: 'large',
  },
  {
    icon: Brain,
    title: 'Explicabilité SHAP intégrée',
    description: 'Comprenez instantanément chaque prédiction de l\'IA grâce à l\'analyse de contribution des ratios clés sur les normes SYSCOHADA.',
    image: '/images/premium_vector-1682309420112-0f15593f4273.png',
    size: 'wide',
  },
  {
    icon: FileText,
    title: 'Rapports d\'audit PDF pro',
    description: 'Générez des dossiers financiers et des synthèses graphiques de niveau expert à partager avec vos banques et partenaires.',
    image: '/images/premium_vector-1682311049701-65f58c32a00d.png',
    size: 'large',
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
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      type: 'spring' as const,
      damping: 18,
      stiffness: 90,
    },
  },
} as const;

const getGridClass = (size: string) => {
  if (size === 'large') return 'lg:col-span-6 lg:row-span-2';
  return 'lg:col-span-6';
};

export function VisualShowcase() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--violet-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--violet-border) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
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
            <Sparkles className="w-3.5 h-3.5" />
            Visualisations de données
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-[var(--text)] mb-4 tracking-tight">
            Des rapports financiers{' '}
            <span className="gradient-text">plus limpides que jamais</span>
          </h2>
          <p className="text-[var(--text-2)] max-w-xl mx-auto text-lg leading-relaxed">
            L&apos;interface de Doctor Smile convertit les chiffres complexes du SYSCOHADA en graphiques et insights clairs, directement exploitables.
          </p>
        </motion.div>

        {/* Visuals Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8"
        >
          {visuals.map((visual, index) => {
            const Icon = visual.icon;
            return (
              <motion.div
                key={visual.title}
                className={`${getGridClass(visual.size)} relative flex flex-col rounded-3xl overflow-hidden border transition-all duration-300 group`}
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
                variants={itemVariants}
                whileHover={{ y: -3 }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border-strong)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Visual Image container with overlay */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
                  <Image
                    src={visual.image}
                    alt={visual.title}
                    fill
                    className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t opacity-40 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to top, var(--bg-card), transparent 50%)',
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          background: 'var(--violet-soft)',
                          border: '1px solid var(--violet-border)',
                        }}
                      >
                        <Icon className="w-5 h-5 text-[var(--violet)]" />
                      </div>
                      <h3 className="font-display font-bold text-xl text-[var(--text)] group-hover:text-[var(--violet)] transition-colors">
                        {visual.title}
                      </h3>
                    </div>
                    <p className="text-[var(--text-2)] text-sm leading-relaxed">
                      {visual.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
