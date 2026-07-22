'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileBarChart,
  MessageSquare,
  Store,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
} from 'lucide-react';
import { useState } from 'react';
import { CubeLogo } from '@/components/landing/CubeLogo';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const nav = [
  { href: '/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/dashboard/analyses', label: 'Analyses', icon: FileBarChart },
  { href: '/dashboard/chatbot', label: 'Chat IA', icon: MessageSquare },
  { href: '/dashboard/marketplace', label: 'Marketplace', icon: Store },
  { href: '/dashboard/notifications', label: 'Alertes', icon: Bell },
  { href: '/dashboard/fiscal', label: 'Calendrier Fiscal', icon: CalendarDays },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

interface DashboardSidebarProps {
  onSignOut: () => void;
  plan?: string;
}

export function DashboardSidebar({ onSignOut, plan = 'standard' }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-[var(--border)] bg-[var(--bg-elevated)] transition-all duration-[var(--dur-normal)] ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 p-4 border-b border-[var(--border)]">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 no-underline">
          <CubeLogo />
          {!collapsed && (
            <span className="font-display font-bold text-sm text-[var(--text)] truncate">
              Doctor Smile
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--violet-soft)] hover:text-[var(--violet)] transition-colors"
          aria-label={collapsed ? 'Étendre' : 'Réduire'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3">
          <span
            className="inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{ background: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid var(--violet-border)' }}
          >
            Plan {plan}
          </span>
        </div>
      )}

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium no-underline transition-colors duration-[var(--dur-fast)] ${
                active
                  ? 'bg-[var(--violet-soft)] text-[var(--violet)] border border-[var(--violet-border)]'
                  : 'text-[var(--text-2)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] border border-transparent'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-2">
        <div className={`flex ${collapsed ? 'justify-center' : 'justify-between px-2'} items-center`}>
          {!collapsed && <span className="text-xs text-[var(--text-muted)]">Thème</span>}
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-[var(--text-2)] hover:bg-[var(--error)]/10 hover:text-[var(--error)] transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && 'Déconnexion'}
        </button>
      </div>
    </aside>
  );
}
