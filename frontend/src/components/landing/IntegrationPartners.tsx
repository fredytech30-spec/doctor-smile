'use client';

import { motion } from 'framer-motion';
import { Globe, Zap, Code, Plug } from 'lucide-react';
import { TechnicalGrid } from './TechnicalGrid';

const integrations = [
  {
    icon: Globe,
    name: 'API RESTful',
    description: 'Intégration facile avec votre système existant via notre API documentée.',
  },
  {
    icon: Zap,
    name: 'Webhooks',
    description: 'Notifications en temps réel pour les événements importants.',
  },
  {
    icon: Code,
    name: 'SDK Multi-langage',
    description: 'Librairies disponibles pour Python, JavaScript, PHP et Java.',
  },
  {
    icon: Plug,
    name: 'Connecteurs',
    description: 'Intégrations natives avec Excel, QuickBooks et Sage.',
  },
];

const partners = [
  { name: 'ONECCA', category: 'Expertise Comptable' },
  { name: 'OHADA', category: 'Normes Comptables' },
  { name: 'SYSCOHADA', category: 'Système Comptable' },
  { name: 'World Bank', category: 'Partenariat' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export function IntegrationPartners() {
  return (
    <section className="py-20 bg-gradient-to-br from-violet-primary/15 via-violet-secondary/10 to-violet-primary/20 relative overflow-hidden">
      <TechnicalGrid opacity={0.02} />
      <div className="absolute inset-0 bg-gradient-to-br from-violet-primary/5 via-transparent to-violet-secondary/5"></div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="text-center mb-16">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-primary/20 to-violet-secondary/20 border border-violet-primary/30 text-violet-tertiary text-sm font-semibold mb-6 shadow-lg shadow-violet-primary/20"
          >
            Intégrations & Partenaires
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="font-display font-bold text-4xl sm:text-5xl text-text-primary mb-4"
          >
            S\'intègre parfaitement à votre écosystème
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-text-secondary max-w-2xl mx-auto text-lg"
          >
            Connectez Doctor Smile à vos outils existants en quelques minutes grâce à nos solutions d\'intégration flexibles.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
        >
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-xl p-6 hover:border-violet-primary/50 hover:shadow-lg hover:shadow-violet-primary/20 transition-all duration-300 group text-center"
              >
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-primary/20 to-violet-secondary/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-violet-tertiary" />
                </div>
                <h3 className="font-display font-semibold text-lg text-text-primary mb-2">
                  {integration.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {integration.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="text-center"
        >
          <h3 className="font-display font-semibold text-2xl text-text-primary mb-8">
            Nos partenaires de confiance
          </h3>
          <div className="flex flex-wrap justify-center gap-8">
            {partners.map((partner, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="px-8 py-4 bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-xl hover:border-violet-primary/50 hover:shadow-lg hover:shadow-violet-primary/20 transition-all duration-300"
              >
                <div className="font-display font-bold text-xl text-violet-tertiary">
                  {partner.name}
                </div>
                <div className="text-sm text-text-secondary mt-1">
                  {partner.category}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
