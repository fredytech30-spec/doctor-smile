'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// RunwayWidget types are imported by component itself

import { RunwayWidget } from '@/components/dashboard/RunwayWidget';
import { CashBurnWidget } from '@/components/dashboard/CashBurnWidget';
import { ExplicabilityWidget } from '@/components/dashboard/ExplicabilityWidget';
import { ActionPlansWidget } from '@/components/dashboard/ActionPlansWidget';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { Info, AlertTriangle } from 'lucide-react';


type AnalysisZone = 'saine' | 'vigilance' | 'risque' | 'critique' | string;

function mapZoneToWidget(status: AnalysisZone): 'critical' | 'warning' | 'healthy' {

  // Backend uses zone: saine/vigilance/risque/critique
  // Frontend RunwayWidget expects: critical|warning|healthy
  const z = String(status || '').toLowerCase();
  if (z === 'critique') return 'critical';
  if (z === 'vigilance' || z === 'risque') return 'warning';
  if (z === 'saine') return 'healthy';
  return 'healthy';
}

export default function AnalyseDetailPage() {
  const params = useParams<{ id: string }>();
  const analysisId = params?.id;
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analysis', analysisId, user?.uid],
    queryFn: () => apiClient(`/analyses/${String(analysisId)}`),
    enabled: !!analysisId && !!user,
    retry: 1,
    staleTime: 30_000,
  });

  const mapped = useMemo(() => {
    const d = (data as any) || {};
    const cash = d.cash_burn_runway || {};
    const runway = cash;

    const cashBurn = {
      monthlyBurn: Number(cash.cash_burn_mensuel || cash.cash_burn_mensuel || cash.cash_burn_mensuel || 0),
      runway: Number(cash.runway_mois || cash.runway_mois || 0),
      cashOnHand: Number(cash.tresorerie_actuelle || 0),
      trend:
        cash.alerte_niveau === 'CRITIQUE'
          ? 'up'
          : cash.alerte_niveau === 'ELEVE'
            ? 'up'
            : 'stable' as 'up' | 'down' | 'stable',
    };

    const runwayWidget: {
      months: number;
      percentage: number;
      status: 'critical' | 'warning' | 'healthy';
    } = {
      months: Number(runway.runway_mois || 0),
      percentage: Math.round(
        Math.min(100, Math.max(0, (Number(runway.runway_mois || 0) / 12) * 100))
      ),
      status: mapZoneToWidget(d.zone),
    };

    const actionPlan = d.action_plan || {};
    const actions = Array.isArray(actionPlan.actions) ? actionPlan.actions : [];
    const completionRate = actionPlan?.stats?.terminees
      ? Math.round(
          (actionPlan.stats.terminees / Math.max(1, actionPlan.stats.total_actions)) * 100
        )
      : 0;

    const actionPlans = {
      actions: actions.map((a: any) => ({
        id: String(a.id),
        title: String(a.titre || a.title || 'Action'),
        description: String(a.description || a.detail || ''),
        priority: (a.priorite || a.priority || 'low') as 'high' | 'medium' | 'low',
        completed: a.statut === 'TERMINEE' || a.completed === true,
        dueDate: a.date_echeance ? new Date(a.date_echeance * 1000).toISOString() : undefined,
        impact: String(a.impact_estime || a.impact || ''),
      })),
      totalActions: actions.length,
      completedActions: actions.filter((a: any) => a.statut === 'TERMINEE' || a.completed).length,
      completionRate: completionRate,
    };

    const explicability = {
      explanations: (d.alertes || []).slice(0, 8).map((al: any, idx: number) => ({
        id: String(al.id || al.rule || idx),
        indicator: String(al.titre || al.name || 'Indicateur'),
        currentValue: '',
        targetValue: '',
        explanation: String(al.desc || al.description || ''),
        impact: String(al.action || al.detail || ''),
        severity:
          al.niveau === 'EXTREME' || al.niveau === 'CRITIQUE'
            ? 'high'
            : al.niveau === 'ELEVE'
              ? 'medium'
              : 'low',
        category:
          al.type === 'DSO' || al.rule?.includes('dso')
            ? 'profitability'
            : al.type === 'ENDETTEMENT'
              ? 'solvency'
              : al.type === 'LIQUIDITE'
                ? 'liquidity'
                : 'efficiency',
      })),
      totalAlerts: Number(d.nb_alertes || d.alertes?.length || 0),
      criticalAlerts: Number(d.alertes_niveaux?.CRITIQUE || d.alertes_niveaux?.EXTREME || 0),
    };

    return {
      cashBurn,
      runwayWidget,
      actionPlans,
      explicability,
      earlyWarnings: d.early_warnings || [],
      sectorBenchmark: d.sector_benchmark || null,
    };
  }, [data]);

  if (!analysisId) notFound();
  if (error) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>Analyse introuvable</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
            <AlertTriangle className="w-4 h-4 text-[var(--error)]" />
            Impossible de charger l'analyse demandée.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <DashboardHeader title="Détails du diagnostic" subtitle="Logique IA, explications & recommandations" />
      <main className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6">
            <RunwayWidget data={mapped?.runwayWidget} />
          </div>
          <div className="lg:col-span-6">
            <CashBurnWidget data={mapped?.cashBurn} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7">
            <ExplicabilityWidget data={mapped?.explicability} />
          </div>
          <div className="lg:col-span-5">
            <ActionPlansWidget data={mapped?.actionPlans} />
          </div>
        </div>

        <Card variant="default" padding="md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-[var(--violet)]" />
              Alertes proactives (Early Warnings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mapped?.earlyWarnings?.length ? (
              <div className="space-y-3">
                {mapped.earlyWarnings.slice(0, 10).map((w: any, i: number) => (
                  <div
                    key={w.id || i}
                    className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{w.titre || w.title || 'Alerte'}</p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">{w.message || w.desc || ''}</p>
                      </div>
                      <Badge variant={w.niveau === 'CRITIQUE' ? 'error' : w.niveau === 'ELEVE' ? 'warning' : 'default'} size="sm">
                        {String(w.niveau || w.level || '')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">Aucune alerte précoce détectée pour cette analyse.</p>
            )}
          </CardContent>
        </Card>

        <Card variant="default" padding="md">
          <CardHeader>
            <CardTitle>Benchmark sectoriel anonymisé</CardTitle>
          </CardHeader>
          <CardContent>
            {!mapped?.sectorBenchmark ? (
              <p className="text-sm text-[var(--text-muted)]">Non disponible pour cette analyse.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm">{mapped.sectorBenchmark.message || 'Positionnement sectoriel prêt.'}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(mapped.sectorBenchmark.comparisons || []).slice(0, 8).map((c: any, idx: number) => {
                    // Détecte une catégorie pour associer une icône pro (sans emojis)
                    const ratioKey = String(c.ratio || '').toLowerCase();
                    const iconVariant = ratioKey.includes('dso') || ratioKey.includes('recouvrement')
                      ? 'Clock'
                      : ratioKey.includes('endettement')
                        ? 'Scale'
                        : ratioKey.includes('solvabil')
                          ? 'Building'
                          : ratioKey.includes('liquid') || ratioKey.includes('cash')
                            ? 'Droplet'
                            : 'TrendingUp';

                    // Import dynamique évité : on réutilise des icônes déjà disponibles via lucide-react
                    // (ici on map sur un composant existant dans ce fichier)
                    // NB: si l’icône n’est pas trouvée, on retombe sur un style neutre.
                    const Icon = ((): any => {
                      switch (iconVariant) {
                        case 'Clock':
                          return require('lucide-react').Clock;
                        case 'Scale':
                          return require('lucide-react').Scale;
                        case 'Building':
                          return require('lucide-react').Building2;
                        case 'Droplet':
                          return require('lucide-react').Droplet;
                        case 'TrendingUp':
                        default:
                          return require('lucide-react').TrendingUp;
                      }
                    })();

                    const perf = String(c.performance || '').toLowerCase();
                    const perfLabel = perf === 'excellent' ? 'Excellent' : perf === 'bon' ? 'Bon' : perf === 'moyen' ? 'Moyen' : 'Faible';

                    return (
                      <div key={idx} className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-[var(--text-muted)]">{c.ratio}</p>
                            <p className="font-bold text-lg">
                              {c.valeur} {c.unite}
                            </p>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                              Moyenne: {c.moyenne_secteur} {c.unite}
                            </p>
                          </div>

                          <div
                            className="shrink-0 p-2 rounded-xl border"
                            style={{
                              borderColor: c.couleur,
                              background: 'var(--bg-muted)',
                              boxShadow: `0 0 0 1px rgba(0,0,0,0.0), 0 0 18px ${c.couleur}22`,
                            }}
                          >
                            <Icon className="w-5 h-5" style={{ color: c.couleur }} />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <p className="text-xs" style={{ color: c.couleur }}>
                            Performance: {perfLabel}
                          </p>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
          </Card>

        <div className="flex justify-between items-center">
          <Link href="/dashboard/analyses">
            <Button variant="secondary">Retour</Button>
          </Link>
          <div className="text-xs text-[var(--text-muted)]">
            {isLoading ? 'Chargement…' : 'Diagnostic chargé.'}
          </div>
        </div>
      </main>
    </>
  );
}

