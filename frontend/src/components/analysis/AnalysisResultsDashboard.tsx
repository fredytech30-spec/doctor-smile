/**
 * ═════════════════════════════════════════════════════════════════════
 * Analysis Results Dashboard — 7-Axis SYSCOHADA Display
 * Doctor Smile v5.0
 *
 * Affiche:
 * - Score global + Health rating
 * - 7 axes détaillés (solidité, liquidité, rentabilité, etc.)
 * - Ratios + Benchmarks
 * - Plan d'action prioritisé
 * - Prédiction défaut
 * ═════════════════════════════════════════════════════════════════════
 */

"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap,
  DollarSign,
  BarChart3,
  Layers,
  Download,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface SYSCOHADAAnalysis {
  timestamp: string;
  document_id: string;
  company_info: {
    name: string;
    sector: string;
    fiscal_year: string;
  };
  global_score: number;
  health_rating: string;
  default_risk_12m: {
    probability: number;
    risk_level: string;
    key_drivers: string[];
  };
  solidite: {
    score: number;
    ratios: Record<string, number>;
    verdict: string;
    explanation: string;
  };
  liquidite: {
    score: number;
    ratios: Record<string, number>;
    warning?: string;
    cash_runway_months?: number;
  };
  rentabilite: {
    score: number;
    ratios: Record<string, number>;
    trend: string;
  };
  efficacite: {
    score: number;
    ratios: Record<string, number>;
  };
  secteur_contexte: {
    sector: string;
    percentile_vs_peers: number;
  };
  risques_aigus: {
    risks: string[];
  };
  plan_action: Array<{
    priority: "HIGH" | "MEDIUM" | "LOW";
    title: string;
    description: string;
    impact_percent?: number;
  }>;
}

interface DashboardProps {
  analysis: SYSCOHADAAnalysis;
  documentId: string;
}

export const AnalysisResultsDashboard: React.FC<DashboardProps> = ({
  analysis,
  documentId,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    solidite: true,
    liquidite: true,
    rentabilite: false,
    efficacite: false,
    risks: false,
    actions: false,
  });

  // Color mapping for scores
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-yellow-50";
    if (score >= 40) return "bg-orange-50";
    return "bg-red-50";
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  return (
    <div className="w-full bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {analysis.company_info.name || "Analyse Financière"}
              </h1>
              <p className="text-gray-600 mt-1">
                {analysis.company_info.sector} · Exercice {analysis.company_info.fiscal_year}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                <Download className="w-4 h-4" />
                Exporter PDF
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                <Share2 className="w-4 h-4" />
                Partager
              </button>
            </div>
          </div>

          {/* Global score card */}
          <div className="flex items-center gap-8">
            <div className={`${getScoreBgColor(analysis.global_score)} px-8 py-6 rounded-lg border border-gray-200`}>
              <p className="text-sm text-gray-600 mb-1">Score Global</p>
              <p className={`text-4xl font-bold ${getScoreColor(analysis.global_score)}`}>
                {analysis.global_score.toFixed(0)}/100
              </p>
              <p className="text-sm text-gray-700 mt-2 font-semibold">
                {analysis.health_rating}
              </p>
            </div>

            {/* Risk indicator */}
            <div className="bg-red-50 px-8 py-6 rounded-lg border border-red-200">
              <p className="text-sm text-gray-600 mb-1">Risque de défaut 12M</p>
              <p className="text-3xl font-bold text-red-600">
                {(analysis.default_risk_12m.probability * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-700 mt-2">
                {analysis.default_risk_12m.risk_level}
              </p>
            </div>

            {/* Secteur position */}
            <div className="bg-blue-50 px-8 py-6 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Position vs Secteur</p>
              <p className="text-3xl font-bold text-blue-600">
                {analysis.secteur_contexte.percentile_vs_peers}e percentile
              </p>
              <p className="text-sm text-gray-700 mt-2">
                {analysis.secteur_contexte.percentile_vs_peers > 75
                  ? "Leader"
                  : analysis.secteur_contexte.percentile_vs_peers > 50
                  ? "In-line"
                  : "À améliorer"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* 7 AXES SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 1. SOLIDITÉ */}
          <AxisCard
            title="Solidité Financière"
            icon={<Shield className="w-5 h-5" />}
            score={analysis.solidite.score}
            verdict={analysis.solidite.verdict}
            expanded={expanded.solidite}
            onToggle={() => toggleSection("solidite")}
          >
            <div className="space-y-3">
              <RatioRow
                label="Autonomie Financière"
                value={analysis.solidite.ratios.autonomie_financiere}
                benchmark="< 1.0"
                status={analysis.solidite.ratios.autonomie_financiere < 1.0 ? "good" : "warning"}
              />
              <RatioRow
                label="Solvabilité"
                value={analysis.solidite.ratios.solvabilite}
                benchmark="> 0.5"
                status={analysis.solidite.ratios.solvabilite > 0.5 ? "good" : "alert"}
              />
              <p className="text-sm text-gray-600 italic mt-3">
                {analysis.solidite.explanation}
              </p>
            </div>
          </AxisCard>

          {/* 2. LIQUIDITÉ */}
          <AxisCard
            title="Liquidité & Trésorerie"
            icon={<DollarSign className="w-5 h-5" />}
            score={analysis.liquidite.score}
            verdict={analysis.liquidite.warning || "OK"}
            expanded={expanded.liquidite}
            onToggle={() => toggleSection("liquidite")}
          >
            <div className="space-y-3">
              <RatioRow
                label="Ratio Courant"
                value={analysis.liquidite.ratios.liquidite_generale}
                benchmark="1.0 - 1.5"
                status={
                  analysis.liquidite.ratios.liquidite_generale >= 0.9 &&
                  analysis.liquidite.ratios.liquidite_generale <= 1.5
                    ? "good"
                    : "warning"
                }
              />
              <RatioRow
                label="Trésorerie Nette"
                value={analysis.liquidite.ratios.tresorerie_nette}
                benchmark="> 0"
                status={analysis.liquidite.ratios.tresorerie_nette > 0 ? "good" : "alert"}
              />
              {analysis.liquidite.cash_runway_months && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm font-semibold text-blue-900">
                    Runway de trésorerie: {analysis.liquidite.cash_runway_months.toFixed(1)} mois
                  </p>
                </div>
              )}
            </div>
          </AxisCard>

          {/* 3. RENTABILITÉ */}
          <AxisCard
            title="Rentabilité & Croissance"
            icon={<TrendingUp className="w-5 h-5" />}
            score={analysis.rentabilite.score}
            verdict={analysis.rentabilite.trend}
            expanded={expanded.rentabilite}
            onToggle={() => toggleSection("rentabilite")}
          >
            <div className="space-y-3">
              <RatioRow
                label="ROE"
                value={analysis.rentabilite.ratios.roe}
                benchmark="> 0.10"
                status={analysis.rentabilite.ratios.roe > 0.1 ? "good" : "warning"}
              />
              <RatioRow
                label="ROA"
                value={analysis.rentabilite.ratios.roa}
                benchmark="> 0.05"
                status={analysis.rentabilite.ratios.roa > 0.05 ? "good" : "warning"}
              />
              <div className="bg-purple-50 p-3 rounded">
                <p className="text-sm font-semibold text-purple-900">
                  Trajectoire: {analysis.rentabilite.trend}
                </p>
              </div>
            </div>
          </AxisCard>

          {/* 4. EFFICACITÉ */}
          <AxisCard
            title="Efficacité Opérationnelle"
            icon={<Zap className="w-5 h-5" />}
            score={analysis.efficacite.score}
            verdict="Details"
            expanded={expanded.efficacite}
            onToggle={() => toggleSection("efficacite")}
          >
            <div className="space-y-3">
              {Object.entries(analysis.efficacite.ratios).map(([key, value]) => (
                <RatioRow
                  key={key}
                  label={key.replace(/_/g, " ").toUpperCase()}
                  value={typeof value === "number" ? value : 0}
                  benchmark="—"
                  status="neutral"
                />
              ))}
            </div>
          </AxisCard>
        </div>

        {/* 5. RISQUES AIGUS */}
        <section className="bg-white rounded-lg border border-gray-200 mb-8">
          <div
            className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
            onClick={() => toggleSection("risks")}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Risques Aigus</h2>
            </div>
            {expanded.risks ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {expanded.risks && (
            <div className="px-6 py-4 space-y-3">
              {analysis.risques_aigus.risks.length > 0 ? (
                analysis.risques_aigus.risks.map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-red-50 rounded">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{risk}</p>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">Aucun risque majeur détecté</p>
              )}
            </div>
          )}
        </section>

        {/* 6. PLAN D'ACTION */}
        <section className="bg-white rounded-lg border border-gray-200 mb-8">
          <div
            className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
            onClick={() => toggleSection("actions")}
          >
            <div className="flex items-center gap-3">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Plan d'Action Prioritisé</h2>
            </div>
            {expanded.actions ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>

          {expanded.actions && (
            <div className="px-6 py-4">
              <div className="space-y-4">
                {analysis.plan_action.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-4 border-l-4 rounded"
                    style={{
                      borderLeftColor:
                        action.priority === "HIGH"
                          ? "#dc2626"
                          : action.priority === "MEDIUM"
                          ? "#f59e0b"
                          : "#10b981",
                      backgroundColor:
                        action.priority === "HIGH"
                          ? "#fef2f2"
                          : action.priority === "MEDIUM"
                          ? "#fffbeb"
                          : "#f0fdf4",
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{action.title}</h3>
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded"
                        style={{
                          backgroundColor:
                            action.priority === "HIGH"
                              ? "#fee2e2"
                              : action.priority === "MEDIUM"
                              ? "#fef3c7"
                              : "#dcfce7",
                          color:
                            action.priority === "HIGH"
                              ? "#991b1b"
                              : action.priority === "MEDIUM"
                              ? "#92400e"
                              : "#166534",
                        }}
                      >
                        {action.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{action.description}</p>
                    {action.impact_percent && (
                      <p className="text-xs text-gray-600">
                        Impact estimé: +{action.impact_percent}% sur la métrique clé
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Descriptive recommendations */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex items-start gap-3">
            <Layers className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Recommandations Contextuellescompila</h3>
              <p className="text-sm text-blue-800">
                Cette entreprise présente un profil de {analysis.health_rating} avec des défis notamment
                sur {"" /* A remplir dynamiquement */}. Priorité: améliorer le working capital et accélérer le recouvrement clients.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// Axis Card Component
// ════════════════════════════════════════════════════════════════════

interface AxisCardProps {
  title: string;
  icon: React.ReactNode;
  score: number;
  verdict: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AxisCard: React.FC<AxisCardProps> = ({
  title,
  icon,
  score,
  verdict,
  expanded,
  onToggle,
  children,
}) => {
  const scoreColor = score >= 80 ? "bg-green-100 text-green-700" : 
                     score >= 60 ? "bg-yellow-100 text-yellow-700" :
                     score >= 40 ? "bg-orange-100 text-orange-700" :
                     "bg-red-100 text-red-700";

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div
        className="px-6 py-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className="text-gray-700">{icon}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{verdict}</p>
          </div>
        </div>
        <div className={`${scoreColor} px-3 py-1 rounded-lg font-semibold text-lg`}>
          {score.toFixed(0)}
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400 ml-2" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />
        )}
      </div>

      {expanded && <div className="px-6 py-4">{children}</div>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// Ratio Row Component
// ════════════════════════════════════════════════════════════════════

interface RatioRowProps {
  label: string;
  value: number;
  benchmark: string;
  status: "good" | "warning" | "alert" | "neutral";
}

const RatioRow: React.FC<RatioRowProps> = ({ label, value, benchmark, status }) => {
  const statusConfig = {
    good: { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, color: "text-green-600" },
    warning: { icon: <AlertCircle className="w-4 h-4 text-yellow-600" />, color: "text-yellow-600" },
    alert: { icon: <AlertTriangle className="w-4 h-4 text-red-600" />, color: "text-red-600" },
    neutral: { icon: <BarChart3 className="w-4 h-4 text-gray-400" />, color: "text-gray-600" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-3">
        <span className={`font-semibold ${config.color}`}>
          {typeof value === "number" ? value.toFixed(3) : value}
        </span>
        <span className="text-xs text-gray-500">{benchmark}</span>
        {config.icon}
      </div>
    </div>
  );
};

export default AnalysisResultsDashboard;
