'use client';

import { Bell, Search, Command } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  trialDays?: number;
  displayName?: string;
  children?: React.ReactNode;
}

function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.replace('/dashboard', '').split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <Link href="/dashboard" className="hover:text-[var(--text)] transition-colors no-underline">
        Dashboard
      </Link>
      {segments.map((seg, i) => (
        <span key={seg} className="flex items-center gap-1.5">
          <span className="text-[var(--border)]">/</span>
          <span
            className="capitalize"
            style={{ color: i === segments.length - 1 ? 'var(--text-2)' : 'var(--text-muted)' }}
          >
            {seg}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function DashboardHeader({
  title,
  subtitle,
  trialDays,
  displayName,
  children,
}: DashboardHeaderProps) {
  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-xl"
      style={{
        background: 'rgba(12,11,16,0.88)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Top highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{
          background: 'linear-gradient(90deg, transparent, var(--violet-border), transparent)',
        }}
      />

      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        {/* Left — Title + breadcrumb */}
        <div className="min-w-0 flex items-center gap-3">
          {children}
          <div className="min-w-0">
            <Breadcrumb />
            <h1 className="font-display font-bold text-lg sm:text-xl text-[var(--text)] mt-0.5 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Trial badge */}
          {trialDays !== undefined && trialDays > 0 && (
            <Badge variant="warning" className="text-[10px] hidden sm:inline-flex">
              Essai · {trialDays}j restants
            </Badge>
          )}

          {/* Search */}
          <button
            type="button"
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-150"
            style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              minWidth: 200,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
            aria-label="Rechercher"
          >
            <Search style={{ width: 14, height: 14 }} />
            <span className="text-sm flex-1 text-left">Rechercher…</span>
            <kbd
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)',
              }}
            >
              <Command style={{ width: 10, height: 10 }} />K
            </kbd>
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative p-2.5 rounded-xl transition-all duration-150"
            style={{
              background: 'var(--bg-muted)',
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}
            aria-label="Notifications"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--violet-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--violet)';
              (e.currentTarget as HTMLElement).style.background = 'var(--violet-soft)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-2)';
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-muted)';
            }}
          >
            <Bell style={{ width: 17, height: 17 }} />
            {/* Live dot */}
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{
                background: 'var(--violet)',
                boxShadow: '0 0 6px var(--violet-glow)',
                animation: 'pulse-live 2s infinite',
              }}
            />
          </button>

          {/* Avatar */}
          {displayName && (
            <div
              className="hidden sm:flex items-center gap-2.5 pl-2.5 border-l"
              style={{ borderColor: 'var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{
                  background: 'linear-gradient(135deg, var(--violet-deep), var(--violet))',
                  boxShadow: '0 0 12px var(--violet-glow)',
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block">
                <p className="text-xs font-semibold text-[var(--text)] leading-none truncate max-w-[100px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Connecté</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
