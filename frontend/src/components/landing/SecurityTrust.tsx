'use client';

import { motion } from 'framer-motion';
import { Shield, Lock, FileCheck, Eye, Database, Key } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Chiffrement AES-256',
    description: 'Données chiffrées de bout en bout lors du transfert et du stockage. Zero-knowledge architecture.',
  },
  {
    icon: Lock,
    title: 'Authentification 2FA',
    description: 'Code OTP par email obligatoire. Sessions sécurisées avec révocation instantanée.',
  },
  {
    icon: FileCheck,
    title: 'Conformité OHADA',
    description: 'Respect strict des normes SYSCOHADA. Audit trail complet conforme aux exigences réglementaires.',
  },
  {
    icon: Eye,
    title: 'Audit en temps réel',
    description: 'Logs immuables de toutes les actions. Traçabilité complète pour vos équipes et auditeurs.',
  },
  {
    icon: Database,
    title: 'Backups automatiques',
    description: 'Sauvegardes quotidiennes chiffrées. Rétention 90 jours avec restauration point-in-time.',
  },
  {
    icon: Key,
    title: 'Contrôle d\'accès RBAC',
    description: 'Permissions granulaires par rôle. Isolation complète des données entre utilisateurs.',
  },
];

const badges = [
  { label: '99.9%', sub: 'Uptime SLA' },
  { label: 'ISO 27001', sub: 'Certifié' },
  { label: 'GDPR', sub: 'Conforme' },
  { label: 'RGPD', sub: 'Africain' },
];

export function SecurityTrust() {
  return (
    <section
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ background: 'var(--bg-elevated)' }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--violet-border) 1px, transparent 1px),
            linear-gradient(90deg, var(--violet-border) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 relative z-10">
        {/* Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            style={{
              background: 'rgba(5,150,105,0.1)',
              border: '1px solid rgba(5,150,105,0.25)',
              color: 'var(--success)',
            }}
          >
            <Shield className="w-3 h-3" />
            Sécurité &amp; Confiance
          </span>
          <h2 className="font-display font-bold text-4xl sm:text-5xl text-[var(--text)] mb-4 tracking-tight">
            Vos données financières,{' '}
            <span className="gradient-text">protégées à chaque instant</span>
          </h2>
          <p className="text-[var(--text-2)] max-w-xl mx-auto text-lg leading-relaxed">
            Nous appliquons les standards de sécurité bancaire pour protéger les informations les plus sensibles de vos entreprises.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                className="group relative p-7 rounded-2xl border transition-all duration-300 cursor-default"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                }}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                whileHover={{ y: -3 }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border-strong)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-lg)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Inner glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at top left, var(--violet-soft), transparent 60%)',
                  }}
                />
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 relative z-10"
                  style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}
                >
                  <Icon className="w-5 h-5 text-[var(--violet)]" />
                </div>
                <h3 className="font-display font-bold text-lg text-[var(--text)] mb-2 relative z-10">
                  {feat.title}
                </h3>
                <p className="text-[var(--text-2)] text-sm leading-relaxed relative z-10">
                  {feat.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Trust badges */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {badges.map((b) => (
            <div
              key={b.label}
              className="flex items-center gap-3 px-6 py-4 rounded-2xl"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }}
              />
              <div>
                <div className="font-display font-bold text-lg text-[var(--text)] leading-none">{b.label}</div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">{b.sub}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
