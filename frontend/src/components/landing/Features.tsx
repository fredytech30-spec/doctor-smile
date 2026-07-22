'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Microchip,
  Upload,
  Bolt,
  ChartLine,
  FileText,
  Bot,
  GraduationCap,
  Bell,
} from 'lucide-react';
import { SpotlightCard } from './SpotlightCard';

const features = [
  {
    icon: Microchip,
    title: 'ML Ensemble',
    description: 'Random Forest, XGBoost et LightGBM calibrés pour 95%+ de précision sur les données SYSCOHADA.',
    size: 'large' as const,
    image: '/images/premium_vector-1682306625339-8bc4b938545a.png',
  },
  {
    icon: Upload,
    title: 'Upload Intelligent',
    description: 'Importez Excel, CSV et formats comptables en un clic.',
    size: 'normal' as const,
    image: '/images/premium_vector-1730976373107-50ac894217b3.png',
  },
  {
    icon: Bolt,
    title: 'Rapidité',
    description: 'Analyse complète en 0.3 seconde grâce à une architecture optimisée.',
    size: 'normal' as const,
    image: '/images/premium_vector-1712694179179-f18fd818419d.png',
  },
  {
    icon: ChartLine,
    title: 'Explicabilité SHAP',
    description: 'Comprenez chaque décision avec des visualisations interactives des facteurs clés.',
    size: 'wide' as const,
    image: '/images/premium_vector-1761146643557-4df60ab44065.png',
  },
  {
    icon: FileText,
    title: 'Export PDF',
    description: 'Rapports professionnels prêts à partager avec banques et investisseurs.',
    size: 'normal' as const,
    image: '/images/premium_vector-1710425435116-13abfd442d48.png',
  },
  {
    icon: Bot,
    title: 'Chat IA',
    description: 'Assistant financier en langage naturel, connecté à vos analyses en temps réel.',
    size: 'tall' as const,
    image: '/images/premium_vector-1727280158584-5f41b182d5b3.png',
  },
  {
    icon: GraduationCap,
    title: 'Marketplace ONECCA',
    description: 'Smart Matching IA vers des experts-comptables certifiés.',
    size: 'normal' as const,
    image: '/images/OIP-2276345979.webp',
  },
  {
    icon: Bell,
    title: 'Alertes proactives',
    description: 'Notifications WhatsApp, SMS et email sur anomalies critiques.',
    size: 'normal' as const,
    image: '/images/OIP-2539275137.webp',
  },
];

function gridClass(size: string) {
  if (size === 'large') return 'md:col-span-2 md:row-span-2';
  if (size === 'wide') return 'md:col-span-2';
  if (size === 'tall') return 'md:row-span-2';
  return '';
}

export function Features() {
  return (
    <section className="py-20 sm:py-28 section-elevated relative overflow-hidden" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-14 sm:mb-16">
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-5"
            style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', color: 'var(--violet)' }}
          >
            <Bolt className="w-3.5 h-3.5" />
            Fonctionnalités
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-[var(--text)] mb-4">
            Tout ce dont votre PME a besoin
          </h2>
          <p className="text-[var(--text-2)] max-w-2xl mx-auto text-lg">
            Une suite complète pour analyser, comprendre et agir sur la santé financière.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {features.map((f, index) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className={gridClass(f.size)}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: index * 0.06, duration: 0.45 }}
                whileHover={{ y: -2 }}
              >
                <SpotlightCard className="h-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--violet-border)] transition-colors duration-[var(--dur-fast)]">
                  <div className="relative h-44 overflow-hidden">
                    <Image src={f.image} alt={f.title} fill className="object-cover opacity-90" sizes="(max-width:768px) 100vw, 33vw" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
                  </div>
                  <div className="p-6 sm:p-7">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}
                    >
                      <Icon className="w-6 h-6 text-[var(--violet)]" />
                    </div>
                    <h3 className="font-display font-bold text-xl text-[var(--text)] mb-2">{f.title}</h3>
                    <p className="text-[var(--text-2)] leading-relaxed">{f.description}</p>
                  </div>
                </SpotlightCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
