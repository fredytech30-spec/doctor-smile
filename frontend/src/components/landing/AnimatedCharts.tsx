'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';
import { Statistical3D } from './Statistical3D';

export function AnimatedCharts() {
  return (
    <section className="py-20 bg-gradient-to-br from-violet-primary/15 via-violet-secondary/10 to-violet-primary/20 relative overflow-hidden">
      <Statistical3D />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-text-primary mb-4">
            Statistiques en temps réel
          </h2>
          <p className="text-text-secondary text-lg">
            Visualisez vos données financières avec des graphiques dynamiques et interactifs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl p-6 shadow-xl shadow-violet-primary/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-primary/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-violet-tertiary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-text-primary">Revenus</h3>
                  <p className="text-sm text-text-secondary">+24.5% ce mois</p>
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">+24.5%</span>
            </div>
            <div className="h-48 relative">
              <svg className="w-full h-full" viewBox="0 0 300 150">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0,120 Q30,100 60,90 T120,70 T180,50 T240,30 T300,20"
                  fill="url(#lineGradient)"
                  stroke="none"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5 }}
                />
                <motion.path
                  d="M0,120 Q30,100 60,90 T120,70 T180,50 T240,30 T300,20"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.5, delay: 0.2 }}
                />
                {[0, 60, 120, 180, 240, 300].map((x, i) => (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={120 - i * 20}
                    r="4"
                    fill="#7C3AED"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                  />
                ))}
              </svg>
            </div>
          </motion.div>

          {/* Bar Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl p-6 shadow-xl shadow-violet-primary/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-secondary/20 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-violet-tertiary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-text-primary">Dépenses</h3>
                  <p className="text-sm text-text-secondary">-12.3% ce mois</p>
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">-12.3%</span>
            </div>
            <div className="h-48 flex items-end justify-between gap-4">
              {[65, 85, 45, 95, 55, 75, 40].map((height, i) => (
                <motion.div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-violet-primary to-violet-secondary rounded-t-lg relative group"
                  initial={{ height: 0 }}
                  whileInView={{ height: `${height}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-tertiary/20 to-transparent rounded-t-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Pie Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl p-6 shadow-xl shadow-violet-primary/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-violet-primary/20 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-violet-tertiary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-text-primary">Répartition</h3>
                  <p className="text-sm text-text-secondary">Par catégorie</p>
                </div>
              </div>
            </div>
            <div className="h-48 flex items-center justify-center">
              <svg className="w-40 h-40" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#7C3AED" strokeWidth="20" strokeDasharray="75.4 251.2" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#8B5CF6" strokeWidth="20" strokeDasharray="62.8 251.2" strokeDashoffset="-75.4" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#A78BFA" strokeWidth="20" strokeDasharray="50.2 251.2" strokeDashoffset="-138.2" transform="rotate(-90 50 50)" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#C4B5FD" strokeWidth="20" strokeDasharray="62.8 251.2" strokeDashoffset="-188.4" transform="rotate(-90 50 50)" />
              </svg>
            </div>
          </motion.div>

          {/* Stats Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl p-6 shadow-xl shadow-violet-primary/10"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-text-primary">Rentabilité</h3>
                  <p className="text-sm text-text-secondary">Marge nette</p>
                </div>
              </div>
              <span className="text-emerald-400 font-semibold">+18.7%</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Q1</span>
                  <span className="text-sm font-semibold text-text-primary">15.2%</span>
                </div>
                <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-primary to-violet-secondary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '15.2%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.7 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Q2</span>
                  <span className="text-sm font-semibold text-text-primary">22.8%</span>
                </div>
                <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-primary to-violet-tertiary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '22.8%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.8 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-text-secondary">Q3</span>
                  <span className="text-sm font-semibold text-text-primary">18.7%</span>
                </div>
                <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-secondary to-violet-tertiary rounded-full"
                    initial={{ width: 0 }}
                    whileInView={{ width: '18.7%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.9 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
