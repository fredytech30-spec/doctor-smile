'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Zap,
  Server,
  Database,
  Users,
  HeartPulse,
  ChartLine,
  Rocket,
  Play,
  Target,
  Bolt,
} from 'lucide-react';
import Image from 'next/image';
import { CubeLogo } from './CubeLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function PremiumNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: 'Fonctionnalités' },
    { href: '#how', label: 'Comment ça marche' },
    { href: '#dashboard', label: 'Dashboard' },
    { href: '#pricing', label: 'Tarifs' },
    { href: '#faq', label: 'FAQ' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 pt-4 px-0 sm:px-0">
      <div className="w-full">
        <div
          className="relative flex items-center justify-between py-3 px-6 border transition-all duration-[var(--dur-normal)]"
          style={{
            background: isScrolled ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.02)',
            borderColor: isScrolled ? 'var(--border)' : 'var(--border-subtle)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: isScrolled ? 'var(--shadow-md)' : 'none',
          }}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setSpot({
              x: ((e.clientX - r.left) / r.width) * 100,
              y: ((e.clientY - r.top) / r.height) * 100,
            });
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              background: `radial-gradient(120px circle at ${spot.x}% ${spot.y}%, var(--violet-glow), transparent)`,
            }}
          />

          <div className="max-w-[1160px] mx-auto w-full flex items-center justify-between">
            <Link href="/" className="relative flex items-center gap-2.5 no-underline">
            <CubeLogo />
            <span className="font-display font-bold text-base text-[var(--text)] hidden sm:inline">
              Doctor Smile
            </span>
            </Link>

          <ul className="hidden lg:flex items-center gap-1 list-none relative">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="px-3.5 py-1.5 rounded-full text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--violet-soft)] transition-colors duration-[var(--dur-fast)] no-underline"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

            <div className="relative flex items-center gap-2">
            <div
              className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-default relative"
              style={{
                background: 'rgba(5, 150, 105, 0.1)',
                border: '1px solid rgba(5, 150, 105, 0.25)',
                color: 'var(--success)',
              }}
              onMouseEnter={() => setIsLiveOpen(true)}
              onMouseLeave={() => setIsLiveOpen(false)}
            >
              <span
                className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"
                style={{ animation: 'pulse-live 1.8s infinite' }}
              />
              Live
              {isLiveOpen && (
                <div
                  className="absolute top-[calc(100%+12px)] right-0 w-56 rounded-2xl p-4 z-50 glass"
                  style={{ boxShadow: 'var(--shadow-lg)' }}
                >
                  <div className="flex justify-between text-xs mb-3 pb-2 border-b border-[var(--border)]">
                    <span className="font-bold text-[var(--text)]">Système</span>
                    <span className="text-[var(--success)] font-bold">OK</span>
                  </div>
                  <ul className="space-y-2 text-xs text-[var(--text-2)]">
                    <li className="flex justify-between"><span className="flex items-center gap-1"><Server className="w-3 h-3" /> API</span><span className="text-[var(--success)] font-bold">99.9%</span></li>
                    <li className="flex justify-between"><span className="flex items-center gap-1"><Database className="w-3 h-3" /> ML</span><span className="text-[var(--gold)] font-bold">Actif</span></li>
                    <li className="flex justify-between"><span className="flex items-center gap-1"><Users className="w-3 h-3" /> Analystes</span><span className="font-bold text-[var(--text)]">+120</span></li>
                  </ul>
                </div>
              )}
            </div>

            <ThemeToggle />

            <a
              href="/auth/login"
              className="hidden sm:inline-flex text-sm font-medium text-[var(--text-2)] hover:text-[var(--text)] px-3 py-2 no-underline transition-colors"
            >
              Connexion
            </a>

            <a href="/auth/register" className="btn-gold inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs no-underline">
              <Rocket className="w-3.5 h-3.5" />
              Essai gratuit
            </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
