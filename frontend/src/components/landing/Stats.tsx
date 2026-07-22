'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Clock, Database, Users } from 'lucide-react';
import { AnimatedCounter } from './AnimatedCounter';
import { TechnicalGrid } from './TechnicalGrid';

const stats = [
  {
    value: 95,
    suffix: '%+',
    label: 'Précision prédictive',
    icon: TrendingUp,
  },
  {
    value: 0.3,
    suffix: 's',
    label: 'Temps d\'analyse',
    icon: Clock,
  },
  {
    value: 5,
    suffix: '+',
    label: 'Sources de données',
    icon: Database,
  },
  {
    value: 120,
    suffix: '+',
    label: 'Analystes actifs',
    icon: Users,
  },
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

export function Stats() {
  return (
    <section className="py-16 bg-gradient-to-br from-violet-primary/25 via-violet-secondary/20 to-violet-primary/30 relative overflow-hidden">
      <TechnicalGrid opacity={0.025} />
      <div className="absolute inset-0 bg-gradient-to-b from-violet-primary/15 via-transparent to-violet-primary/15"></div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="text-center group"
              >
                <div className="flex items-center justify-center mb-3">
                  <div className="w-16 h-16 rounded-2xl bg-violet-primary/10 flex items-center justify-center group-hover:bg-violet-primary/20 transition-all duration-300 group-hover:scale-110">
                    <Icon className="w-8 h-8 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                  </div>
                </div>
                <div className="text-4xl sm:text-5xl font-display font-bold gradient-text mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} duration={2} />
                </div>
                <p className="text-sm sm:text-base text-text-secondary">
                  {stat.label}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
