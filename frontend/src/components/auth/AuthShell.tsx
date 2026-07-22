'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChevronLeft, ChartPie, Zap, ShieldCheck, Globe2 } from 'lucide-react';
import { CubeLogo } from '@/components/landing/CubeLogo';
import { MeshGradient } from '@/components/landing/MeshGradient';

interface AuthShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  badge?: string;
}

export function AuthShell({ children, title, subtitle, badge }: AuthShellProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex bg-[var(--bg)]">
      <MeshGradient />
      
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--violet)]/5 via-transparent to-[var(--gold)]/5 pointer-events-none" />
      
      <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-[var(--violet)] blur-[150px] opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[var(--gold)] blur-[130px] opacity-15 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[var(--violet-secondary)] blur-[200px] opacity-10 pointer-events-none" />

      <div className="relative z-10 flex w-full">
        <motion.div
          initial={{ x: -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex lg:w-1/2 flex-col justify-between p-14 relative"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-[var(--violet)] to-[var(--violet-secondary)] flex items-center justify-center shadow-xl shadow-[var(--violet)]/20">
              <CubeLogo />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] font-semibold text-[var(--violet)]">Doctor Smile</p>
              <span className="text-2xl font-display font-bold text-[var(--text)] tracking-tight">Sécurité & performance</span>
            </div>
          </div>

          <div className="space-y-10 max-w-lg">
            <div>
              <motion.h2
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="text-5xl font-display font-bold leading-[1.05]"
              >
                <span className="text-[var(--text)]">Accès sécurisé à</span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--violet)] to-[var(--violet-secondary)]">Doctor Smile</span>
              </motion.h2>
              <motion.p
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.25 }}
                className="text-[var(--text-2)] text-lg mt-6 leading-relaxed"
              >
                Plateforme d’analyse intelligente, conforme OHADA, pour piloter la santé financière et les recommandations IA de votre cabinet.
              </motion.p>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: ChartPie, title: 'Clarté immédiate', desc: 'Un accès visuel aux KPI, aux tendances et au Doctor Score™.' },
                { icon: Zap, title: 'Réactivité IA', desc: 'Authentification rapide, compatible 2FA, pour un flux sécurisé.' },
                { icon: ShieldCheck, title: 'Confiance renforcée', desc: 'Connexion protégée, contrôles d’accès et expérience premium.' },
                { icon: Globe2, title: 'Contextualisation OHADA', desc: 'Solutions pensées pour les cabinets d’Afrique Centrale.' },
              ].map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.35 + idx * 0.08 }}
                    className="backdrop-blur-xl bg-[rgba(255,255,255,0.06)] rounded-3xl p-6 border border-[rgba(255,255,255,0.08)] hover:border-[var(--violet-border)] transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-3xl flex items-center justify-center mb-3" style={{ background: 'rgba(124, 58, 237, 0.14)' }}>
                      <Icon className="w-5 h-5 text-[var(--violet)]" />
                    </div>
                    <h3 className="font-semibold text-[var(--text)] mb-2 text-sm">{feature.title}</h3>
                    <p className="text-xs text-[var(--text-2)] leading-5">{feature.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="text-sm text-[var(--text-3)] border-t border-white/5 pt-6">
            © 2026 Doctor Smile. Tous droits réservés.
          </div>
        </motion.div>

        <div className="flex-1 flex flex-col p-6 lg:p-12">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex justify-end"
          >
            <Link href="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 hover:bg-white/5 text-[var(--text-2)] hover:text-[var(--text)] border border-transparent hover:border-white/10">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="flex-1 flex items-center justify-center w-full max-w-md mx-auto py-8"
          >
            <div className="w-full">
              <div className="lg:hidden flex justify-center mb-10">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--violet)] to-[var(--violet-secondary)] flex items-center justify-center shadow-xl shadow-[var(--violet)]/30">
                    <CubeLogo />
                  </div>
                </motion.div>
              </div>

              <div className="flex flex-col items-center mb-8">
                {badge && (
                  <motion.span
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase border"
                    style={{
                      background: 'color-mix(in srgb, var(--violet) 12%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--violet) 25%, var(--border))',
                      color: 'var(--violet)',
                    }}
                  >
                    {badge}
                  </motion.span>
                )}
                
                <motion.h1
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="font-display font-bold text-3xl sm:text-4xl text-[var(--text)] mt-5 text-center"
                >
                  {title}
                </motion.h1>
                
                <motion.p
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-[var(--text-2)] text-sm sm:text-base mt-2 text-center max-w-sm"
                >
                  {subtitle}
                </motion.p>
              </div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-3xl p-8 sm:p-10 backdrop-blur-2xl bg-white/5 border border-white/10 shadow-2xl"
                style={{
                  boxShadow: '0 30px 80px -30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) inset',
                }}
              >
                {children}
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
