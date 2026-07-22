'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Zap, Rocket, Play, Target, Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HERO_IMG = '/images/premium_vector-1682310719865-81e889f9a624.png';
const OVERLAY_IMG = '/images/premium_vector-1682306625339-8bc4b938545a.png';

const fadeUp: any = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
};

export function PremiumHero() {
  return (
    <section className="relative min-h-screen flex items-center pt-28 pb-16 overflow-hidden bg-[var(--bg)]" id="hero">
      
      {/* Dynamic Background Grid Pattern with Perspective */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[48%] pointer-events-none opacity-20 dark:opacity-30"
        style={{
          background: `
            linear-gradient(to bottom, transparent, var(--bg)),
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          transform: 'perspective(800px) rotateX(60deg)',
          transformOrigin: 'bottom',
        }}
      />

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[20%] left-[-10%] w-[35rem] h-[35rem] rounded-full bg-[var(--violet-soft)] opacity-25 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-[var(--gold-soft)] opacity-20 blur-[100px] pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 w-full relative z-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
          
          {/* Left Hero Column */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
          >
            {/* Status Tags */}
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                style={{
                  background: 'var(--violet-soft)',
                  border: '1px solid var(--violet-border)',
                  color: 'var(--violet)'
                }}
              >
                <Zap className="w-3.5 h-3.5" />
                Moteur ML Ensemble + SHAP
              </span>
              <span className="text-xs font-medium text-[var(--text-muted)] tracking-wider uppercase border-l pl-3 border-[var(--border)]">
                Audits SYSCOHADA v5.0
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-display font-black tracking-tight mb-6">
              <span className="block text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] text-[var(--text)]">
                Analysez la santé financière
              </span>
              <span className="block text-[clamp(2rem,4.5vw,4rem)] leading-[1.05] gradient-text mt-1">
                en un instant
              </span>
            </h1>

            {/* Description */}
            <p className="text-[var(--text-2)] text-base sm:text-lg leading-relaxed max-w-lg mb-8">
              Diagnostic intelligent de la solvabilité, de la liquidité et de la structure de vos entités. Obtenez un diagnostic immédiat basé sur les normes OHADA avec <strong className="text-[var(--violet)] font-bold">95%+ de précision</strong>.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap gap-4.5 mb-10">
              <a href="/auth/register">
                <button
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300"
                  style={{
                    background: 'var(--violet)',
                    boxShadow: '0 4px 20px var(--violet-glow)'
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                >
                  <Rocket className="w-4 h-4" />
                  Essai gratuit 14 jours
                </button>
              </a>
              <button
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-[var(--text)] bg-[var(--bg-muted)] border border-[var(--border)] hover:border-[var(--violet-border)] transition-all duration-300"
                onClick={() => {
                  const demoSection = document.getElementById('demo') || document.getElementById('features');
                  demoSection?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Play className="w-4 h-4 text-[var(--violet)]" />
                Découvrir la démo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex -space-x-2">
                {['Cabinet Cabinet A', 'Cabinet B', 'Analyste C'].map((cabinets, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-[var(--bg)] flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                    style={{
                      background: i === 2 ? 'var(--gold-strong)' : i === 1 ? 'var(--violet-deep)' : 'var(--violet)',
                      color: i === 2 ? '#09080F' : '#fff',
                    }}
                  >
                    {cabinets[0]}
                  </div>
                ))}
                <div className="w-9 h-9 rounded-full border-2 border-[var(--bg)] flex items-center justify-center text-[9px] font-black bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]">
                  +150
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-snug max-w-xl">
                <strong className="block text-[var(--text)] font-semibold">+150 experts-comptables</strong>
                nous font confiance pour leurs diagnostics.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 mt-10">
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.34em] text-[var(--violet)] font-semibold">Précision</p>
                <p className="mt-4 text-2xl font-display font-bold text-[var(--text)]">95.4%</p>
                <p className="mt-2 text-sm text-[var(--text-2)]">Diagnostic IA conforme OHADA.</p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.34em] text-[var(--violet)] font-semibold">Réactivité</p>
                <p className="mt-4 text-2xl font-display font-bold text-[var(--text)]">0.3s</p>
                <p className="mt-2 text-sm text-[var(--text-2)]">Réponse temps réel pour chaque demande.</p>
              </div>
              <div className="rounded-3xl border border-[var(--border)] bg-[rgba(255,255,255,0.05)] p-5 shadow-sm">
                <p className="text-xs uppercase tracking-[0.34em] text-[var(--violet)] font-semibold">Audit</p>
                <p className="mt-4 text-2xl font-display font-bold text-[var(--text)]">100%</p>
                <p className="mt-2 text-sm text-[var(--text-2)]">Rapports prêts à partager avec vos partenaires.</p>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Column (Visual Mockups) */}
          <motion.div
            className="relative h-[440px] sm:h-[500px] hidden lg:block"
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Main Dashboard Preview Card */}
            <div
              className="absolute w-[92%] top-0 left-0 z-10 rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--bg-card)]"
              style={{
                boxShadow: 'var(--shadow-2xl)',
                animation: 'float-slow 9s ease-in-out infinite'
              }}
            >
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-muted)]">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--error)] opacity-70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] opacity-70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--success)] opacity-70" />
                </div>
                <span className="text-[9px] font-mono text-[var(--text-muted)] px-3 py-0.5 rounded-full bg-[var(--bg-card)] border">
                  app.doctor-smile.com/dashboard
                </span>
              </div>
              <div className="relative h-[280px] bg-[var(--bg-muted)]">
                <Image
                  src={HERO_IMG}
                  alt="Aperçu du dashboard Doctor Smile"
                  fill
                  className="object-cover object-top"
                  priority
                  sizes="40vw"
                />
              </div>
            </div>

            {/* Overlapping SHAP graph Preview Card */}
            <div
              className="absolute w-[60%] bottom-0 right-0 z-20 rounded-2xl overflow-hidden border border-[var(--violet-border-strong)] bg-[var(--bg-card)]"
              style={{
                boxShadow: 'var(--shadow-xl)',
                animation: 'float-slow 7s ease-in-out infinite',
                animationDelay: '1s'
              }}
            >
              <div className="relative h-[190px]">
                <Image
                  src={OVERLAY_IMG}
                  alt="Analyse d'importance des features SHAP"
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
              </div>
            </div>

            {/* Floating accuracy chip */}
            <div
              className="absolute bottom-16 left-[-16px] z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)',
                animation: 'float-slow 5s ease-in-out infinite',
                animationDelay: '0.5s'
              }}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--success-bg)] border border-[var(--success-border)] shrink-0">
                <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
              </div>
              <div>
                <strong className="font-display text-xs font-black block text-[var(--text)]">95.4%</strong>
                <span className="text-[9px] text-[var(--text-muted)] tracking-wide font-medium">Précision ML</span>
              </div>
            </div>

            {/* Floating processing speed chip */}
            <div
              className="absolute top-10 right-[-10px] z-30 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border"
              style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border)',
                boxShadow: 'var(--shadow-lg)',
                animation: 'float-slow 6s ease-in-out infinite',
                animationDelay: '1.5s'
              }}
            >
              <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[var(--violet-soft)] border border-[var(--violet-border)] shrink-0">
                <Activity className="w-4 h-4 text-[var(--violet)]" />
              </div>
              <div>
                <strong className="font-display text-xs font-black block text-[var(--text)]">0.3s</strong>
                <span className="text-[9px] text-[var(--text-muted)] tracking-wide font-medium">Traitement</span>
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </section>
  );
}
