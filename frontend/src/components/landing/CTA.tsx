'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Rocket, ArrowRight, Shield, Clock } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Multi-layer ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%,
              rgba(124,58,237,0.15) 0%,
              rgba(109,40,217,0.08) 40%,
              transparent 70%
            )
          `,
        }}
      />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--violet-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--violet-border) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* Decorative glowing orbs */}
      <div
        className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.06), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 relative z-10">
        {/* Main card */}
        <motion.div
          className="relative rounded-3xl overflow-hidden p-10 sm:p-16 text-center"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--violet-border)',
            boxShadow: 'var(--shadow-xl), 0 0 80px rgba(124,58,237,0.1)',
          }}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Top highlight strip */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[1px]"
            style={{
              background: 'linear-gradient(90deg, transparent, var(--violet), transparent)',
            }}
          />

          {/* Corner decorations */}
          <div
            className="absolute top-0 left-0 w-40 h-40 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at top left, rgba(124,58,237,0.12), transparent 60%)',
            }}
          />
          <div
            className="absolute bottom-0 right-0 w-40 h-40 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at bottom right, rgba(212,175,55,0.08), transparent 60%)',
            }}
          />

          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8"
            style={{
              background: 'var(--violet-soft)',
              border: '1px solid var(--violet-border)',
              color: 'var(--violet)',
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Rocket className="w-3 h-3" />
            Commencez dès aujourd&apos;hui
          </motion.div>

          {/* Heading */}
          <motion.h2
            className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-[var(--text)] mb-6 tracking-tight leading-[1.05]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            Prêt à diagnostiquer
            <br />
            <span className="gradient-text">la santé de votre PME ?</span>
          </motion.h2>

          <motion.p
            className="text-[var(--text-2)] text-lg sm:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            Rejoignez +120 analystes financiers qui utilisent Doctor Smile pour prendre des décisions éclairées en zone OHADA.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            <a
              href="/auth/register"
              className="btn-gold inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-base font-bold no-underline"
            >
              <Rocket className="w-5 h-5" />
              Essai gratuit 14 jours
              <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="/auth/login"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-sm font-semibold no-underline transition-all duration-200"
              style={{
                background: 'var(--bg-muted)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              }}
            >
              J&apos;ai déjà un compte
            </a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-muted)]"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35 }}
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[var(--success)]" />
              Aucune carte bancaire
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[var(--violet)]" />
              Analyse en 0.3 seconde
            </span>
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[var(--gold)]" fill="currentColor">
                <path d="M8 1l1.9 4.1 4.5.3-3.4 3 1 4.4L8 10.6l-4 2.2 1-4.4-3.4-3 4.5-.3z" />
              </svg>
              Conforme OHADA/SYSCOHADA
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
