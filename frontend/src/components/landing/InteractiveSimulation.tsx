'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Wallet, AlertCircle } from 'lucide-react';
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

export function InteractiveSimulation() {
  const [revenue, setRevenue] = useState(50);
  const [margin, setMargin] = useState(50);
  const [cash, setCash] = useState(50);
  const [debt, setDebt] = useState(30);

  const score = Math.round(
    (revenue * 0.3) +
    (margin * 0.25) +
    (cash * 0.3) +
    ((100 - debt) * 0.15)
  );

  const getScoreColor = () => {
    if (score >= 80) return 'from-success-primary to-emerald-400';
    if (score >= 60) return 'from-violet-tertiary to-violet-secondary';
    if (score >= 40) return 'from-violet-secondary to-violet-primary';
    return 'from-error-primary to-red-400';
  };

  const getScoreStatus = () => {
    if (score >= 80) return 'Santé financière excellente';
    if (score >= 60) return 'Santé financière solide';
    if (score >= 40) return 'Santé financière moyenne';
    return 'Santé financière fragile';
  };

  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;

  return (
    <section className="py-20 bg-gradient-to-br from-violet-primary/15 via-violet-secondary/10 to-violet-primary/20 relative overflow-hidden" id="simulation">
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
            Simulation
          </motion.div>
          <motion.h2
            variants={itemVariants}
            className="font-display font-bold text-3xl sm:text-4xl lg:text-5xl text-text-primary mb-4"
          >
            Testez en temps réel
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-text-secondary max-w-2xl mx-auto text-lg"
          >
            Ajustez les paramètres financiers et voyez l'impact sur le score de santé en temps réel.
          </motion.p>
        </div>

        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-br from-surface-secondary to-surface-tertiary border border-border-subtle rounded-2xl p-8 shadow-2xl shadow-violet-primary/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Controls */}
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-violet-tertiary" />
                    Revenu
                  </label>
                  <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">
                    {revenue * 10}K€
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={revenue}
                  onChange={(e) => setRevenue(Number(e.target.value))}
                  className="w-full h-2 bg-surface-bg rounded-lg appearance-none cursor-pointer accent-violet-primary"
                  style={{
                    background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${revenue}%, #1A1A3A ${revenue}%, #1A1A3A 100%)`
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-tertiary" />
                    Marge brute
                  </label>
                  <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">
                    {margin}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full h-2 bg-surface-bg rounded-lg appearance-none cursor-pointer accent-violet-primary"
                  style={{
                    background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${margin}%, #1A1A3A ${margin}%, #1A1A3A 100%)`
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-violet-tertiary" />
                    Trésorerie
                  </label>
                  <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">
                    {cash}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={cash}
                  onChange={(e) => setCash(Number(e.target.value))}
                  className="w-full h-2 bg-surface-bg rounded-lg appearance-none cursor-pointer accent-violet-primary"
                  style={{
                    background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${cash}%, #1A1A3A ${cash}%, #1A1A3A 100%)`
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-semibold text-text-primary flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-violet-tertiary" />
                    Ratio d'endettement
                  </label>
                  <span className="text-sm font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">
                    {debt}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={debt}
                  onChange={(e) => setDebt(Number(e.target.value))}
                  className="w-full h-2 bg-surface-bg rounded-lg appearance-none cursor-pointer accent-violet-primary"
                  style={{
                    background: `linear-gradient(to right, #7C3AED 0%, #7C3AED ${debt}%, #1A1A3A ${debt}%, #1A1A3A 100%)`
                  }}
                />
              </div>
            </div>

            {/* Score Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-full h-full transform -rotate-90">
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#7C3AED" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="96"
                    cy="96"
                    r="45"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-surface-bg"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="45"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    className="drop-shadow-lg"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-display font-bold bg-gradient-to-r from-violet-tertiary to-violet-secondary bg-clip-text text-transparent">
                    {score}
                  </span>
                  <span className="text-sm text-text-secondary mt-2">/100</span>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className={`text-lg font-semibold bg-gradient-to-r ${getScoreColor()} bg-clip-text text-transparent mb-2`}>
                  {getScoreStatus()}
                </p>
                <p className="text-sm text-text-secondary">
                  Ajustez les paramètres pour voir l'impact sur votre score
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
