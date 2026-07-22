'use client';

import { motion } from 'framer-motion';
import { HeartPulse, ChartPie, FileUp, Brain, MessageSquare, FileText, TrendingUp, Shield, Lightbulb, Clock, Activity, DollarSign, Zap } from 'lucide-react';
import { TechnicalGrid } from './TechnicalGrid';

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

export function DashboardPreview() {
  return (
    <section className="py-20 bg-gradient-to-br from-violet-primary/15 via-violet-secondary/10 to-violet-primary/20 relative overflow-hidden" id="dashboard">
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
            Dashboard
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-text-primary mb-4"
          >
            Interface professionnelle
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-text-secondary max-w-2xl mx-auto text-lg"
          >
            Découvrez notre dashboard interactif avec toutes les fonctionnalités d'analyse financière.
          </motion.p>
        </div>

        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl overflow-hidden shadow-2xl shadow-violet-primary/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-gradient-to-r from-surface-bg to-surface-tertiary">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-primary to-violet-secondary flex items-center justify-center shadow-lg shadow-violet-primary/30">
                <HeartPulse className="w-4 h-4 text-white" />
              </div>
              <span className="font-display font-bold text-sm text-text-primary">Doctor Smile</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-sm text-violet-tertiary font-medium">Dashboard</span>
              <span className="text-sm text-text-secondary">Analyses</span>
              <span className="text-sm text-text-secondary">Rapports</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-primary to-violet-secondary shadow-lg shadow-violet-primary/30" />
          </div>

          {/* Body */}
          <div className="flex">
            {/* Sidebar */}
            <div className="w-48 p-4 border-r border-border-subtle bg-gradient-to-b from-surface-tertiary to-surface-elevated hidden md:block">
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-violet-primary/20 to-violet-secondary/20 border border-violet-primary/30 text-violet-tertiary shadow-sm shadow-violet-primary/10">
                  <ChartPie className="w-5 h-5" />
                  <span className="text-sm font-medium">Vue d'ensemble</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-violet-primary/10 transition-colors cursor-pointer group">
                  <FileUp className="w-5 h-5 group-hover:text-violet-tertiary transition-colors" />
                  <span className="text-sm">Upload</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-violet-primary/10 transition-colors cursor-pointer group">
                  <Brain className="w-5 h-5 group-hover:text-violet-tertiary transition-colors" />
                  <span className="text-sm">Analyses IA</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-violet-primary/10 transition-colors cursor-pointer group">
                  <MessageSquare className="w-5 h-5 group-hover:text-violet-tertiary transition-colors" />
                  <span className="text-sm">Chat IA</span>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg text-text-secondary hover:bg-violet-primary/10 transition-colors cursor-pointer group">
                  <FileText className="w-5 h-5 group-hover:text-violet-tertiary transition-colors" />
                  <span className="text-sm">Exports</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-primary/20 to-violet-secondary/20 border border-violet-primary/30 flex items-center justify-center shadow-sm shadow-violet-primary/10 group-hover:scale-110 transition-transform">
                      <HeartPulse className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Score Santé</p>
                      <p className="font-display font-bold text-lg bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">78/100</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">+5%</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-secondary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-secondary/20 to-violet-tertiary/20 border border-violet-secondary/30 flex items-center justify-center shadow-sm shadow-violet-secondary/10 group-hover:scale-110 transition-transform">
                      <DollarSign className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Revenus</p>
                      <p className="font-display font-bold text-lg bg-gradient-to-r from-violet-secondary to-violet-tertiary bg-clip-text text-transparent">2.4M€</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs text-emerald-400">+12%</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-primary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-primary/20 to-success-primary/20 border border-violet-primary/30 flex items-center justify-center shadow-sm shadow-violet-primary/10 group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5 text-violet-tertiary group-hover:text-success-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Risque</p>
                      <p className="font-display font-bold text-lg text-text-primary">Faible</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-violet-tertiary" />
                    <span className="text-xs text-violet-tertiary">Stable</span>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-violet-secondary/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-secondary/20 to-violet-primary/20 border border-violet-secondary/30 flex items-center justify-center shadow-sm shadow-violet-secondary/10 group-hover:scale-110 transition-transform">
                      <Clock className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Temps</p>
                      <p className="font-display font-bold text-lg bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">0.3s</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="w-3 h-3 text-violet-tertiary" />
                    <span className="text-xs text-violet-tertiary">Ultra-rapide</span>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 mb-6 hover:border-violet-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display font-bold text-sm text-text-primary">Évolution du score</span>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-primary to-violet-secondary" />
                      <span className="text-xs text-text-secondary">Score</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-secondary to-violet-tertiary" />
                      <span className="text-xs text-text-secondary">Prévision</span>
                    </div>
                  </div>
                </div>
                <div className="h-24 relative">
                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7C3AED" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#A78BFA" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 Q50,70 100,60 T200,40 T300,30 T400,20"
                      fill="none"
                      stroke="url(#chartGradient)"
                      strokeWidth="3"
                      className="drop-shadow-lg"
                    />
                    <path
                      d="M0,85 Q50,75 100,65 T200,45 T300,35 T400,25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="text-violet-tertiary/50"
                    />
                  </svg>
                </div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recommandations */}
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group">
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                    <span className="font-display font-bold text-sm text-text-primary">Recommandations</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-primary to-violet-secondary" />
                      <span className="text-sm text-text-secondary">Optimiser la trésorerie</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-secondary to-violet-tertiary" />
                      <span className="text-sm text-text-secondary">Réduire les coûts fixes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-violet-tertiary to-violet-primary" />
                      <span className="text-sm text-text-secondary">Diversifier les revenus</span>
                    </div>
                  </div>
                </div>

                {/* Benchmark sectoriel anonymisé (landing) */}
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ChartPie className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                      <span className="font-display font-bold text-sm text-text-primary">Benchmark sectoriel</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-violet-soft/40 border border-violet-border/40 text-violet-tertiary">
                      Anonymisé
                    </span>
                  </div>

                  {/* Visuel explicatif */}
                  <div className="space-y-3">
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Positionnez-vous par rapport au secteur (CEMAC) sur les ratios clés. Le diagnostic reste anonymisé et orienté action.
                    </p>

                    <div className="rounded-xl border border-border-subtle bg-[rgba(124,58,237,0.04)] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] text-text-secondary">Liquidité générale</span>
                        <span className="text-[11px] font-bold text-text-primary">Au-dessus de la moyenne</span>
                      </div>
                      <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
                        <div className="h-full w-[72%] bg-gradient-to-r from-violet-primary to-violet-secondary" />
                      </div>

                      <div className="flex items-center justify-between mt-3 mb-2">
                        <span className="text-[11px] text-text-secondary">DSO (recouvrement)</span>
                        <span className="text-[11px] font-bold text-violet-tertiary">À optimiser</span>
                      </div>
                      <div className="h-2 bg-border-subtle rounded-full overflow-hidden">
                        <div className="h-full w-[48%] bg-gradient-to-r from-violet-secondary to-violet-tertiary" />
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-[11px] text-text-secondary">Endettement</span>
                        <span className="text-[11px] font-bold text-text-secondary">Sous contrôle</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-text-secondary pt-1">
                      <Lightbulb className="w-4 h-4 text-violet-tertiary" />
                      <span>
                        Idéal pour préparer vos échanges bancaires avec des axes concrets.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Analyses récentes */}
                <div className="bg-gradient-to-br from-surface-bg to-surface-tertiary border border-border-subtle rounded-xl p-4 hover:border-violet-primary/30 transition-colors group">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-violet-tertiary group-hover:text-violet-secondary transition-colors" />
                    <span className="font-display font-bold text-sm text-text-primary">Analyses récentes</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Q4 2025</span>
                      <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">82/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Q3 2025</span>
                      <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">75/100</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary">Q2 2025</span>
                      <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">71/100</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
