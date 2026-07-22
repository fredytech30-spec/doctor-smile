'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { fetchFiscalCalendar, fetchFiscalAlerts, FiscalEvent } from '@/lib/api-client';
import { CalendarDays, AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const GRAVITE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  critique: { bg: 'rgba(239,68,68,0.08)', text: '#ef4444', border: 'rgba(239,68,68,0.25)', label: 'CRITIQUE' },
  haute:    { bg: 'rgba(245,158,11,0.08)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)', label: 'HAUTE' },
  moyenne:  { bg: 'rgba(99,102,241,0.08)', text: '#6366f1', border: 'rgba(99,102,241,0.25)', label: 'MOYENNE' },
};

const TYPE_LABELS: Record<string, string> = {
  tva:     'TVA',
  dsf:     'DSF',
  is:      'IS',
  patente: 'Patente',
};

function StatusBadge({ statut, jours }: { statut: string; jours: number }) {
  if (statut === 'passee') return (
    <span style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.25)', borderRadius: 99 }}
      className="text-[10px] font-bold uppercase px-2 py-0.5">Passée</span>
  );
  if (statut === 'urgente') return (
    <span style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 99 }}
      className="text-[10px] font-bold uppercase px-2 py-0.5 animate-pulse">Urgente — {jours}j</span>
  );
  if (statut === 'proche') return (
    <span style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 99 }}
      className="text-[10px] font-bold uppercase px-2 py-0.5">Proche — {jours}j</span>
  );
  return (
    <span style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 99 }}
      className="text-[10px] font-bold uppercase px-2 py-0.5">{jours > 0 ? `Dans ${jours}j` : 'Aujourd\'hui'}</span>
  );
}

function EventCard({ ev, expanded, onToggle }: { ev: FiscalEvent; expanded: boolean; onToggle: () => void }) {
  const g = GRAVITE_CONFIG[ev.gravite] || GRAVITE_CONFIG.moyenne;
  const d = new Date(ev.date);
  const dateStr = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div
      style={{ background: g.bg, border: `1px solid ${g.border}`, borderRadius: 14 }}
      className="p-4 cursor-pointer select-none"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div style={{ background: g.bg, border: `1px solid ${g.border}`, borderRadius: 8, color: g.text }}
            className="px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 mt-0.5">
            {TYPE_LABELS[ev.type] || ev.type.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] leading-snug">{ev.titre}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{dateStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge statut={ev.statut} jours={ev.jours_restants} />
          {expanded
            ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 pt-3" style={{ borderTop: `1px solid ${g.border}` }}>
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Description</p>
            <p className="text-sm text-[var(--text-2)] leading-relaxed">{ev.description}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Action à entreprendre</p>
            <p className="text-sm text-[var(--text)] leading-relaxed font-medium">{ev.action}</p>
          </div>
          <div
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 8 }}
            className="px-3 py-2"
          >
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Pénalités de retard
            </p>
            <p className="text-xs text-red-300">{ev.penalite}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function FiscalPage() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const { data: calendar, isLoading } = useQuery({
    queryKey: ['fiscal-calendar'],
    queryFn: () => fetchFiscalCalendar(),
    enabled: !!user,
    staleTime: 60_000 * 10, // 10 min
  });

  const { data: alerts } = useQuery({
    queryKey: ['fiscal-alerts'],
    queryFn: () => fetchFiscalAlerts(),
    enabled: !!user,
    staleTime: 60_000 * 5,
    refetchInterval: 60_000 * 5,
  });

  const echeances = calendar?.echeances ?? [];
  const filtered = filterType === 'all'
    ? echeances
    : echeances.filter((e) => e.type === filterType);

  const upcoming = filtered.filter((e) => e.statut !== 'passee');
  const passed = filtered.filter((e) => e.statut === 'passee');

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)', borderRadius: 14 }}
          className="w-12 h-12 flex items-center justify-center shrink-0">
          <CalendarDays className="w-6 h-6 text-[var(--violet)]" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-[var(--text)]">Calendrier Fiscal DGI</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Toutes les échéances fiscales camerounaises — {calendar?.annee ?? new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Alertes urgentes */}
      {(alerts?.nb_alertes ?? 0) > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14 }}
          className="p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <p className="text-sm font-bold text-red-300">
              {alerts!.nb_alertes} échéance{alerts!.nb_alertes > 1 ? 's' : ''} urgente{alerts!.nb_alertes > 1 ? 's' : ''} dans les 7 prochains jours
            </p>
            {alerts?.alertes_urgentes.map((a) => (
              <p key={a.id} className="text-xs text-red-400/80 mt-1">• {a.titre} — J-{a.jours_restants}</p>
            ))}
          </div>
        </div>
      )}

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total échéances', value: calendar?.total_echeances ?? '—', icon: CalendarDays, color: 'var(--violet)' },
          { label: 'Alertes urgentes', value: alerts?.nb_alertes ?? 0, icon: AlertTriangle, color: '#ef4444' },
          { label: 'À venir', value: upcoming.length, icon: Clock, color: '#f59e0b' },
          { label: 'Passées', value: passed.length, icon: CheckCircle2, color: '#10b981' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14 }}
            className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" style={{ color }} />
              <span className="text-xs text-[var(--text-muted)]">{label}</span>
            </div>
            <p className="text-2xl font-display font-bold text-[var(--text)]">{value}</p>
          </div>
        ))}
      </div>

      {/* Filtres par type */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'tva', 'dsf', 'is', 'patente'].map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === t
                ? 'bg-[var(--violet)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border)] hover:border-[var(--violet-border)]'
            }`}
          >
            {t === 'all' ? 'Toutes' : TYPE_LABELS[t] ?? t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Liste des échéances */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: 14, height: 72 }}
              className="animate-pulse border border-[var(--border)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.length === 0 && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14 }}
              className="p-8 text-center">
              <Info className="w-8 h-8 text-[var(--violet)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-muted)]">Aucune échéance à venir pour ce filtre.</p>
            </div>
          )}
          {upcoming.map((ev) => (
            <EventCard
              key={ev.id}
              ev={ev}
              expanded={expandedId === ev.id}
              onToggle={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
            />
          ))}

          {passed.length > 0 && (
            <>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pt-4 pb-1">
                Échéances passées
              </p>
              {passed.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  expanded={expandedId === ev.id}
                  onToggle={() => setExpandedId(expandedId === ev.id ? null : ev.id)}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Note légale */}
      <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed pt-2">
        Données basées sur le code général des impôts camerounais et la DGI. Non substitut à un conseil fiscal certifié.
        <br />Consultez un expert-comptable ONECCA pour votre situation spécifique.
      </p>
    </div>
  );
}
