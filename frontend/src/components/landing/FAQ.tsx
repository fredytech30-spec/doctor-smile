'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { TechnicalGrid } from './TechnicalGrid';

const faqs = [
  {
    question: 'Comment fonctionne l\'analyse IA ?',
    answer: 'Notre ML Ensemble combine plusieurs algorithmes (Random Forest, XGBoost, LightGBM) pour analyser vos données financières en 0.3 seconde. Le système est entraîné sur des milliers de rapports conformes aux normes OHADA/SYSCOHADA.',
  },
  {
    question: 'Mes données sont-elles sécurisées ?',
    answer: 'Absolument. Toutes vos données sont chiffrées et stockées sur des serveurs sécurisés. Nous ne partageons jamais vos informations avec des tiers sans votre consentement explicite.',
  },
  {
    question: 'Puis-je annuler mon abonnement à tout moment ?',
    answer: 'Oui, vous pouvez annuler votre abonnement à tout moment sans frais cachés. Votre accès reste actif jusqu\'à la fin de la période facturée.',
  },
  {
    question: 'Doctor Smile est-il adapté aux petites entreprises ?',
    answer: 'Absolument. Notre solution est conçue pour les entreprises de toutes tailles, des startups aux grandes entreprises. Les plans sont adaptés à vos besoins spécifiques.',
  },
  {
    question: 'Comment s\'intègre Doctor Smile avec mes outils existants ?',
    answer: 'Doctor Smile s\'intègre facilement avec Excel, CSV et les formats comptables standards. Pour les entreprises, nous proposons également une API et des intégrations personnalisées.',
  },
  {
    question: 'Quel type de support est disponible ?',
    answer: 'Nous offrons un support par email pour tous les plans, avec un support prioritaire et dédié pour les plans Premium et Extra. Notre équipe est disponible pour répondre à toutes vos questions.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
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

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 bg-gradient-to-br from-violet-primary/15 via-violet-secondary/10 to-violet-primary/20 relative overflow-hidden" id="faq">
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
            FAQ
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-text-primary mb-4"
          >
            Questions fréquentes
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-text-secondary max-w-2xl mx-auto text-lg"
          >
            Tout ce que vous devez savoir sur Doctor Smile.
          </motion.p>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-xl overflow-hidden hover:border-violet-primary/50 transition-all duration-300 group ${
                openIndex === index ? 'border-violet-primary/50 shadow-lg shadow-violet-primary/20' : ''
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full p-6 text-left flex items-center justify-between"
              >
                <span className="font-display font-semibold text-text-primary group-hover:text-violet-tertiary transition-colors">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-violet-tertiary transition-transform duration-300 group-hover:text-violet-secondary ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pb-6"
                >
                  <p className="text-text-secondary leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
