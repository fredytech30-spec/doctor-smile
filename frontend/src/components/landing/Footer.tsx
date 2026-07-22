'use client';

import { CubeLogo } from './CubeLogo';
import Link from 'next/link';
import { Globe2, Mail, MapPin } from 'lucide-react';

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={{ width: '100%', height: '100%' }}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={{ width: '100%', height: '100%' }}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={{ width: '100%', height: '100%' }}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className} style={{ width: '100%', height: '100%' }}>
    <rect width="20" height="16" x="2" y="4" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const footerLinks = {
  Produit: [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#pricing' },
    { label: 'Démo interactive', href: '#how' },
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'FAQ', href: '#faq' },
  ],
  Ressources: [
    { label: 'Documentation', href: '#' },
    { label: 'Guide SYSCOHADA', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'API Reference', href: '#' },
  ],
  Entreprise: [
    { label: 'À propos', href: '#' },
    { label: 'Partenaires', href: '#' },
    { label: 'Experts ONECCA', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Carrières', href: '#' },
  ],
  Légal: [
    { label: 'Confidentialité', href: '#' },
    { label: 'CGU', href: '#' },
    { label: 'Cookies', href: '#' },
    { label: 'Mention légales', href: '#' },
  ],
};

const socials = [
  { icon: TwitterIcon, href: '#', label: 'Twitter / X' },
  { icon: LinkedinIcon, href: '#', label: 'LinkedIn' },
  { icon: GithubIcon, href: '#', label: 'GitHub' },
  { icon: MailIcon, href: 'mailto:contact@doctorsmile.cm', label: 'Email' },
];

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden border-t"
      style={{
        background: 'var(--bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Ambient glow top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(124,58,237,0.06), transparent 70%)',
        }}
      />

      <div className="max-w-[1160px] mx-auto px-4 sm:px-7 py-16 relative z-10">
        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 no-underline mb-4">
              <CubeLogo />
              <span className="font-display font-bold text-base text-[var(--text)]">Doctor Smile</span>
            </Link>
            <p className="text-sm text-[var(--text-2)] leading-relaxed mb-5 max-w-[220px]">
              L&apos;IA qui diagnostique la santé financière des PME africaines en 0.3 seconde.
            </p>

            {/* Location */}
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-6">
              <MapPin className="w-3.5 h-3.5" />
              Douala, Cameroun · Zone OHADA
            </div>

            {/* Social links */}
            <div className="flex gap-2.5">
              {socials.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--violet)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--violet-soft)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
                  }}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-[var(--text-2)] no-underline transition-colors duration-150"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div
          className="w-full h-px mb-8"
          style={{ background: 'var(--border)' }}
        />

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
            © 2026 Doctor Smile SAS. Tous droits réservés.
            <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
              <Globe2 className="w-3.5 h-3.5" />
              Conçu pour la zone OHADA
            </span>
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--success)', boxShadow: '0 0 6px var(--success)' }}
            />
            <span className="text-xs text-[var(--text-muted)]">Tous les systèmes opérationnels</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
