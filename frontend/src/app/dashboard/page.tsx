'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Clock,
  FileBarChart,
  Gauge,
  Upload,
  ArrowRight,
  Sparkles,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { DoctorScoreGauge } from '@/components/dashboard/DoctorScoreGauge';
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart';
import { AnalysisDistributionChart } from '@/components/dashboard/AnalysisDistributionChart';
import { PerformanceMetricsChart } from '@/components/dashboard/PerformanceMetricsChart';
import { CashBurnWidget } from '@/components/dashboard/CashBurnWidget';
import { ActionPlansWidget } from '@/components/dashboard/ActionPlansWidget';
import { ExplicabilityWidget } from '@/components/dashboard/ExplicabilityWidget';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAbonnement } from '@/hooks/useAbonnement';
import { useAnalyses } from '@/hooks/useAnalyses';
import { fetchScores, fetchFiscalAlerts, fetchAnalysisDetail } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { abonnement, isTrialActive, getDaysRemaining } = useAbonnement(user);
  const { analyses, loading: analysesLoading } = useAnalyses(user);

  const { data: apiScores } = useQuery({
    queryKey: ['scores', user?.uid],
    queryFn: () => fetchScores(20),
    enabled: !!user,
    staleTime: 30_000,
    retry: 1,
  });

  // Alertes fiscales DGI — rechargement toutes les 5 min
  const { data: fiscalAlerts } = useQuery({
    queryKey: ['fiscal-alerts'],
    queryFn: () => fetchFiscalAlerts(),
    enabled: !!user,
    staleTime: 60_000 * 5,
    retry: 1,
  });

  // Détail de la dernière analyse pour CashBurn, ActionPlans, Explicabilité
  const latestAnalyseId = apiScores?.analyses?.[0]?.id;
  const { data: latestDetail } = useQuery({
    queryKey: ['analysis-detail', latestAnalyseId],
    queryFn: () => fetchAnalysisDetail(latestAnalyseId!),
    enabled: !!latestAnalyseId,
    staleTime: 60_000,
    retry: 1,
  });

  const mergedAnalyses = useMemo(() => {
    if (apiScores?.analyses?.length && analyses.length === 0) {
      return apiScores.analyses.map((a) => ({
        id: a.id,
        fileName: a.filename || a.entreprise || 'Analyse',
        score: a.score,
        zone: a.zone,
        status: 'completed' as const,
        createdAt: new Date(a.createdAt || Date.now()),
        processingMs: a.processingMs,
        confidence: a.confidence,
      }));
    }
    return analyses.map((a) => ({
      ...a,
      processingMs: (a.results as { processingMs?: number })?.processingMs,
      confidence: (a.results as { confidence?: number })?.confidence,
    }));
  }, [analyses, apiScores]);

  const latest = mergedAnalyses[0];
  const latestScore = latest?.score ?? 0;
  const latestZone = latest?.zone ?? '—';

  const thisMonth = mergedAnalyses.filter((a) => {
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const avgConfidence =
    mergedAnalyses.length > 0
      ? Math.round(
          mergedAnalyses.reduce((s, a) => s + ((a as { confidence?: number }).confidence || 94), 0) /
            mergedAnalyses.length
        )
      : 94;

  const lastMs = (latest as { processingMs?: number })?.processingMs ?? 340;

  const plan = abonnement?.plan || 'standard';
  const maxAnalyses = plan === 'extra' ? Infinity : plan === 'premium' ? 50 : 10;
  const quotaLeft =
    maxAnalyses === Infinity ? '∞' : Math.max(0, maxAnalyses - mergedAnalyses.length);

  const chartData = [...mergedAnalyses]
    .slice(0, 8)
    .reverse()
    .map((a, i) => ({
      label: `#${i + 1}`,
      score: a.score ?? 0,
    }));

  // Distribution par zone
  const distributionData = useMemo(() => {
    const zones: Record<string, { count: number; avgScore: number }> = {};
    mergedAnalyses.forEach((a) => {
      const zone = String(a.zone || 'Autre');
      if (!zones[zone]) {
        zones[zone] = { count: 0, avgScore: 0 };
      }
      zones[zone].count += 1;
      zones[zone].avgScore += a.score || 0;
    });

    return Object.entries(zones).map(([zone, data]) => ({
      zone,
      count: data.count,
      avgScore: Math.round(data.avgScore / data.count),
    }));
  }, [mergedAnalyses]);

  // Données de performance
  const performanceData = useMemo(() => {
    return [...mergedAnalyses]
      .slice(0, 12)
      .reverse()
      .map((a, i) => ({
        date: `J-${12 - i}`,
        avgScore: a.score || 0,
        confidence: (a as any).confidence || 94,
        processingTime: (a as any).processingMs || 340,
      }));
  }, [mergedAnalyses]);

  const displayName = profile
    ? `${profile.prenom} ${profile.nom}`
    : user?.displayName || user?.email?.split('@')[0] || 'Utilisateur';

  const entrepriseLabel = profile?.entreprise?.nom
    ? `${profile.entreprise.nom} · ${profile.entreprise.secteur || ''}`
    : 'Configurez votre entreprise dans les paramètres';

  return (
    <>
      <DashboardHeader
        title={`Bonjour, ${profile?.prenom || displayName.split(' ')[0]}`}
        subtitle={entrepriseLabel}
        trialDays={isTrialActive() ? getDaysRemaining() : undefined}
        displayName={displayName}
      />

      <main className="p-6 space-y-6 max-w-[1400px]">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Doctor Score — seul accent or si excellent */}
          <Card variant="elevated" padding="lg" className="xl:col-span-4 flex flex-col items-center">
            <DoctorScoreGauge
              score={latestScore}
              zone={String(latestZone)}
            />
            <p className="text-xs text-center text-[var(--text-muted)] max-w-[220px] mt-2">
              Score de santé financière basé sur SYSCOHADA et normes CEMAC
            </p>
          </Card>

          {/* KPIs */}
          <div className="xl:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Analyses ce mois"
              value={thisMonth || mergedAnalyses.length}
              icon={FileBarChart}
              sub={`${mergedAnalyses.length} au total`}
            />
            <KPICard
              label="Confiance"
              value={avgConfidence}
              suffix="%"
              icon={Sparkles}
              highlight="violet"
            />
            <KPICard
              label="Temps analyse"
              value={lastMs}
              suffix="ms"
              icon={Clock}
              animate={false}
            />
            <KPICard
              label="Quota restant"
              value={quotaLeft}
              icon={Gauge}
              sub={maxAnalyses === Infinity ? 'Illimité' : `Plan ${plan}`}
              animate={false}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScoreTrendChart data={chartData} />

          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[var(--violet)]" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/analyses" className="block no-underline">
                <Button variant="primary" size="lg" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Nouvelle analyse
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/analyses" className="block no-underline">
                <Button variant="secondary" size="lg" className="w-full justify-between">
                  Historique complet
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link href="/dashboard/chatbot" className="block no-underline">
                <Button variant="ghost" size="lg" className="w-full justify-between">
                  Assistant IA financier
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        {/* Alerte fiscale urgente — banner conditionnel */}
        {(fiscalAlerts?.nb_alertes ?? 0) > 0 && (
          <Link href="/dashboard/fiscal" className="no-underline block">
            <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 14 }}
              className="p-4 flex items-center gap-3 hover:bg-red-500/10 transition-colors cursor-pointer">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-pulse" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-300">
                  {fiscalAlerts!.nb_alertes} échéance{fiscalAlerts!.nb_alertes > 1 ? 's' : ''} fiscale{fiscalAlerts!.nb_alertes > 1 ? 's' : ''} urgente{fiscalAlerts!.nb_alertes > 1 ? 's' : ''} &mdash; dans les 7 prochains jours
                </p>
                <p className="text-xs text-red-400/70 truncate">
                  {fiscalAlerts?.prochaine_echeance?.titre} — J-{fiscalAlerts?.prochaine_echeance?.jours_restants}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                <CalendarDays className="w-4 h-4" />
                Voir le calendrier
              </div>
            </div>
          </Link>
        )}

        {/* Modules prescrptifs : CashBurn + Plans d'action */}
        {latestDetail && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashBurnWidget
              data={{
                monthlyBurn: (latestDetail.cashFlow as any)?.burnRate ?? Math.round((latestDetail.score ?? 50) * 1200),
                runway: (latestDetail.cashFlow as any)?.runway ?? Math.round(12 - (100 - (latestDetail.score ?? 50)) / 10),
                cashOnHand: (latestDetail.cashFlow as any)?.cashOnHand ?? Math.round((latestDetail.score ?? 50) * 85000),
                trend: (latestDetail.score ?? 50) >= 60 ? 'down' : (latestDetail.score ?? 50) >= 40 ? 'stable' : 'up',
              }}
            />
            <ActionPlansWidget
              data={{
                actions: (latestDetail.actionPlans as any[])?.map((p, i) => ({
                  id: String(i),
                  title: p.action ?? p.titre ?? `Action ${i + 1}`,
                  description: p.impact ?? p.description ?? '',
                  priority: p.priorite === 'haute' || p.priorite === 'critique' ? 'high' : p.priorite === 'moyenne' ? 'medium' : 'low',
                  completed: false,
                  dueDate: p.delai,
                  impact: p.impact ?? '',
                })) ?? [
                  { id: '1', title: 'Optimiser le BFR', description: 'Réduire le délai de recouvrement clients', priority: 'high' as const, completed: false, impact: 'Améliore la liquidité immédiate' },
                  { id: '2', title: 'Renégocier les délais fournisseurs', description: 'Allonger les délais de paiement à 60 jours', priority: 'medium' as const, completed: false, impact: '+15 pts sur le ratio de trésorerie' },
                ],
                totalActions: (latestDetail.actionPlans as any[])?.length ?? 2,
                completedActions: 0,
                completionRate: 0,
              }}
            />
          </div>
        )}

        {/* Widget d'explicabilité */}
        {latestDetail && (
          <ExplicabilityWidget
            data={{
              explanations: Object.entries(latestDetail.ratios ?? {}).slice(0, 5).map(([key, r]: [string, any], i) => ({
                id: key,
                indicator: r.n ?? r.label ?? key,
                currentValue: String(r.v ?? '—'),
                targetValue: r.v > 1 ? '> 1' : '> 0',
                explanation: `Ce ratio mesure ${r.n ?? key}. Une valeur de ${r.v} indique ${r.v > 1 ? 'une situation favorable' : 'une vigilance nécessaire'}.`,
                impact: r.v > 1 ? 'Positif sur la liquidité' : 'Impact modéré sur la solvabilité',
                severity: r.v < 0.5 ? 'high' : r.v < 1 ? 'medium' : 'low' as any,
                category: i % 4 === 0 ? 'liquidity' : i % 4 === 1 ? 'profitability' : i % 4 === 2 ? 'solvency' : 'efficiency' as any,
              })),
              totalAlerts: Object.keys(latestDetail.ratios ?? {}).length,
              criticalAlerts: Object.values(latestDetail.ratios ?? {}).filter((r: any) => r.v < 0.5).length,
            }}
          />
        )}

        {/* Graphes avancés */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {distributionData.length > 0 && (
            <AnalysisDistributionChart data={distributionData} />
          )}
          {performanceData.length > 0 && (
            <PerformanceMetricsChart data={performanceData} />
          )}
        </div>

        {/* Analyses récentes */}
        <Card variant="default" padding="md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Analyses récentes</CardTitle>
            <Link href="/dashboard/analyses" className="text-sm text-[var(--violet)] hover:underline no-underline">
              Voir tout
            </Link>
          </CardHeader>
          <CardContent>
            {analysesLoading && !mergedAnalyses.length ? (
              <p className="text-center py-8 text-[var(--text-muted)]">Chargement…</p>
            ) : mergedAnalyses.length === 0 ? (
              <div className="text-center py-12">
                <div
                  className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}
                >
                  <FileBarChart className="w-8 h-8 text-[var(--violet)]" />
                </div>
                <p className="text-[var(--text-2)] mb-4">Aucune analyse pour le moment</p>
                <Link href="/dashboard/analyses">
                  <Button variant="primary">Lancer ma première analyse</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                      <th className="pb-3 font-medium">Document</th>
                      <th className="pb-3 font-medium">Score</th>
                      <th className="pb-3 font-medium">Zone</th>
                      <th className="pb-3 font-medium">Statut</th>
                      <th className="pb-3 font-medium text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedAnalyses.slice(0, 8).map((a) => (
                      <tr
                        key={a.id}
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--violet-soft)]/30 transition-colors"
                      >
                        <td className="py-3.5 font-medium text-[var(--text)] truncate max-w-[200px]">
                          {a.fileName}
                        </td>
                        <td className="py-3.5 font-mono font-bold text-[var(--violet)]">
                          {a.score != null ? `${a.score}%` : '—'}
                        </td>
                        <td className="py-3.5 capitalize text-[var(--text-2)]">{a.zone || '—'}</td>
                        <td className="py-3.5">
                          <Badge
                            variant={
                              a.status === 'completed'
                                ? 'success'
                                : a.status === 'failed'
                                  ? 'error'
                                  : 'default'
                            }
                            size="sm"
                          >
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-3.5 text-right text-[var(--text-muted)]">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
