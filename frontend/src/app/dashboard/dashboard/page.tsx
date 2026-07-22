'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileText, CheckCircle2, Clock, Activity, Sparkles,
  Zap, Users, Plus, ChevronRight, Info, TrendingUp, ArrowRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyses } from '@/hooks/useAnalyses';
import { useUserProfile } from '@/hooks/useUserProfile';
import { KPICard } from '@/components/dashboard/KPICard';
import { DoctorScoreGauge } from '@/components/dashboard/DoctorScoreGauge';
import { ScoreTrendChart } from '@/components/dashboard/ScoreTrendChart';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const fadeUp: any = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] },
  }),
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { analyses, loading: analysesLoading } = useAnalyses(user);
  const { profile } = useUserProfile(user);

  const [stats, setStats] = useState({
    totalAnalyses: 0, completedAnalyses: 0,
    pendingAnalyses: 0, averageScore: 0, trendScore: 0
  });

  useEffect(() => {
    if (analyses) {
      const completed = analyses.filter(a => a.status === 'completed');
      const pending = analyses.filter(a => a.status === 'pending' || a.status === 'processing');
      const scores = completed.map(a => a.score).filter((s): s is number => typeof s === 'number');
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      setStats({
        totalAnalyses: analyses.length,
        completedAnalyses: completed.length,
        pendingAnalyses: pending.length,
        averageScore: avg,
        trendScore: avg > 60 ? 5 : avg > 40 ? 2 : -3
      });
    }
  }, [analyses]);

  if (authLoading || analysesLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--violet-border)] opacity-30" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--violet)] animate-spin" />
          <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: 'var(--violet-soft)' }}>
            <Sparkles className="w-6 h-6" style={{ color: 'var(--violet)' }} />
          </div>
        </div>
        <p className="text-sm font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Chargement du tableau de bord…
        </p>
      </div>
    );
  }

  if (!user) { router.push('/auth/login'); return null; }

  const recentAnalyses = analyses?.slice(0, 4) || [];
  const evolutionData = (analyses || [])
    .filter(a => a.status === 'completed' && typeof a.score === 'number')
    .slice(-6)
    .map(a => ({
      label: new Date(a.createdAt).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      score: (a.score as number)
    }));

  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Bonjour' : greetHour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const firstName = profile?.prenom || profile?.nom || 'Analyste';

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title={`${greeting}, ${firstName}`}
        subtitle="Vue globale des audits financiers SYSCOHADA de vos entités."
      />

      <main className="px-6 pb-16 max-w-[1480px] mx-auto space-y-7 pt-4">
        {/* ── ROW 1 : 4 KPI CARDS ──────────────────────────────────── */}
        <motion.div
          custom={0} initial="hidden" animate="visible" variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
        >
          <KPICard label="Analyses totales" value={stats.totalAnalyses} icon={FileText} highlight="default" sub="Dossiers importés sur la plateforme" />
          <KPICard label="Audits complétés" value={stats.completedAnalyses} icon={CheckCircle2} highlight="success" sub="Avec recommandations générées" />
          <KPICard label="En cours de traitement" value={stats.pendingAnalyses} icon={Clock} highlight="default" sub="Fichiers en attente d'analyse" />
          <KPICard label="Score de santé moyen" value={Math.round(stats.averageScore)} suffix="%" icon={Activity} highlight="violet" trend={stats.trendScore} sub="Moyenne globale des diagnostics" />
        </motion.div>

        {/* ── ROW 2 : CHART + RECENTS  |  GAUGE CARD ──────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT : Chart + Récents */}
          <motion.div custom={1} initial="hidden" animate="visible" variants={fadeUp} className="xl:col-span-8 space-y-6">
            {/* Score Evolution Chart */}
            <div className="rounded-2xl overflow-hidden card-clean">
              <div className="px-6 pt-6 pb-2 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <h3 className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>
                    Évolution du Score de Santé
                  </h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Historique sur les 6 dernières analyses complétées
                  </p>
                </div>
                {evolutionData.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ background: 'var(--violet-soft)', color: 'var(--violet)', border: '1px solid var(--violet-border)' }}>
                    <TrendingUp className="w-4 h-4" />
                    {evolutionData.length} points de données
                  </div>
                )}
              </div>
              <div className="p-1">
                <ScoreTrendChart data={evolutionData} />
              </div>
            </div>

            {/* Analyses Récentes */}
            <div className="rounded-2xl p-6 card-clean">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>Audits Récents</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Derniers bilans et balances importés
                  </p>
                </div>
                <button
                  onClick={() => router.push('/dashboard/analyses')}
                  className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-all btn-clean"
                >
                  Voir tout <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {recentAnalyses.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 rounded-xl border-2 border-dashed"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                >
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4 icon-container"
                    style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}>
                    <FileText className="w-6 h-6" style={{ color: 'var(--violet)' }} />
                  </div>
                  <p className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>
                    Aucun audit disponible
                  </p>
                  <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                    Importez votre premier bilan comptable SYSCOHADA pour démarrer
                  </p>
                  <button
                    onClick={() => router.push('/dashboard/analyses')}
                    className="inline-flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all btn-clean"
                  >
                    <Plus className="w-5 h-5" /> Lancer un premier diagnostic
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {recentAnalyses.map((analysis, idx) => {
                    const isDone = analysis.status === 'completed';
                    const isProcessing = analysis.status === 'processing';
                    const scoreNum = typeof analysis.score === 'number' ? analysis.score : null;
                    const scoreColor = scoreNum !== null
                      ? (scoreNum >= 75 ? 'var(--success)' : scoreNum >= 50 ? 'var(--warning)' : 'var(--error)')
                      : 'var(--text-muted)';

                    return (
                      <div
                        key={analysis.id}
                        onClick={() => router.push(`/dashboard/analyses/${analysis.id}`)}
                        className="flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all"
                        style={{ borderColor: 'var(--border)', background: 'var(--bg-muted)' }}
                        onMouseEnter={(e) => {
                          const target = e.currentTarget;
                          target.style.borderColor = 'var(--violet-border)';
                          target.style.background = 'var(--bg-card)';
                          target.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          const target = e.currentTarget;
                          target.style.borderColor = 'var(--border)';
                          target.style.background = 'var(--bg-muted)';
                          target.style.transform = 'translateY(0)';
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: isDone ? 'rgba(5,150,105,0.1)' : isProcessing ? 'rgba(217,119,6,0.1)' : 'var(--bg-card)',
                              border: `1px solid ${isDone ? 'rgba(5,150,105,0.22)' : isProcessing ? 'rgba(217,119,6,0.22)' : 'var(--border)'}`
                            }}
                          >
                            {isDone
                              ? <CheckCircle2 className="w-4.5 h-4.5" style={{ color: 'var(--success)' }} />
                              : isProcessing
                              ? <Activity className="w-4.5 h-4.5" style={{ color: 'var(--warning)' }} />
                              : <Clock className="w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
                            }
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm truncate max-w-[260px]" style={{ color: 'var(--text)' }}>
                              {analysis.fileName || 'balance.pdf'}
                            </h4>
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                              {analysis.entreprise || 'Entité non identifiée'} · {new Date(analysis.createdAt).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {scoreNum !== null && (
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Doctor Score</span>
                              <p className="font-mono text-lg font-black" style={{ color: scoreColor }}>{scoreNum}<span className="text-xs">%</span></p>
                            </div>
                          )}
                          <div className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                            <ChevronRight className="w-4.5 h-4.5" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* RIGHT : Gauge + Insight */}
          <motion.div custom={2} initial="hidden" animate="visible" variants={fadeUp} className="xl:col-span-4">
            <div className="rounded-2xl h-full flex flex-col card-clean">
              {/* Header card */}
              <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--violet-soft)', border: '1px solid var(--violet-border)' }}
                  >
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--violet)' }} />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-base" style={{ color: 'var(--text)' }}>Diagnostic de Synthèse</h3>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Score consolidé de toutes les entités</p>
                  </div>
                </div>
              </div>

              {/* Gauge */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-5">
                <DoctorScoreGauge
                  score={stats.averageScore}
                  zone={stats.averageScore >= 75 ? 'saine' : stats.averageScore >= 50 ? 'vigilance' : 'critique'}
                  label="Score Moyen Global"
                />
              </div>

              {/* Insight box */}
              <div className="px-6 pb-6">
                <div
                  className="p-4 rounded-xl"
                  style={{ background: 'var(--bg-muted)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'var(--violet-soft)' }}>
                      <Info className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold mb-1.5" style={{ color: 'var(--text)' }}>Recommandation</h4>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                        {stats.averageScore >= 75
                          ? "Santé optimale. Maintenez la rigueur sur la gestion du fonds de roulement et la couverture des engagements."
                          : stats.averageScore >= 50
                          ? "Vigilance requise. Consultez l'assistant IA pour identifier les leviers d'amélioration des ratios de liquidité."
                          : "Situation critique. Rapprochez-vous d'un expert ONECCA via la Marketplace pour un diagnostic approfondi."}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/dashboard/analyses')}
                  className="w-full mt-5 flex items-center justify-center gap-3 py-3.5 rounded-xl text-sm font-bold text-white transition-all btn-clean"
                >
                  <Plus className="w-5 h-5" />
                  Nouvelle analyse
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── ROW 3 : QUICK ACTIONS ───────────────────────────────── */}
        <motion.div
          custom={3} initial="hidden" animate="visible" variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-5"
        >
          {[
            {
              title: 'Assistant IA Financier',
              desc: 'Posez vos questions financières en langage naturel. L\'IA interprète vos indicateurs SYSCOHADA en profondeur.',
              icon: Sparkles,
              color: 'var(--violet)',
              bgColor: 'var(--violet-soft)',
              borderColor: 'var(--violet-border)',
              route: '/dashboard/chatbot'
            },
            {
              title: 'Marketplace ONECCA',
              desc: 'Trouvez et contactez un expert-comptable agréé certifié en Afrique pour auditer et sécuriser vos comptes.',
              icon: Users,
              color: 'var(--success)',
              bgColor: 'rgba(5,150,105,0.08)',
              borderColor: 'rgba(5,150,105,0.2)',
              route: '/dashboard/marketplace'
            },
            {
              title: 'Plans & Facturation',
              desc: 'Gérez votre abonnement, les modes de paiement Mobile Money et les accès à toutes les fonctionnalités IA.',
              icon: Zap,
              color: 'var(--gold-strong)',
              bgColor: 'rgba(212,175,55,0.08)',
              borderColor: 'rgba(212,175,55,0.2)',
              route: '/dashboard/settings'
            }
          ].map(({ title, desc, icon: Icon, color, bgColor, borderColor, route }, idx) => (
            <div
              key={title}
              onClick={() => router.push(route)}
              className="rounded-2xl p-6 border cursor-pointer transition-all card-clean"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: bgColor, border: `1px solid ${borderColor}` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <h4 className="font-display font-bold text-lg mb-2" style={{ color: 'var(--text)' }}>
                {title}
              </h4>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
                {desc}
              </p>
              <div className="flex items-center gap-2 text-sm font-bold" style={{ color }}>
                Accéder <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
