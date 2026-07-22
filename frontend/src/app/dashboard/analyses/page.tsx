'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  FileText,
  Upload,
  TrendingUp,
  MapPin,
  Building,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyses } from '@/hooks/useAnalyses';
import { apiClient } from '@/lib/api-client';
import { UploadAnalysisWidget } from '@/components/analysis/UploadAnalysisWidget';

export default function AnalysesPage() {
  const { user } = useAuth();
  const { analyses, loading, getZoneColor, getZoneBg } = useAnalyses(user);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'processing' | 'pending'>('all');
  const [showUploadWizard, setShowUploadWizard] = useState(false);

  const filtered = analyses.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch = (a.fileName || '').toLowerCase().includes(q) || (a.entreprise || '').toLowerCase().includes(q);
    const matchFilter = filter === 'all' || a.status === filter;
    return matchSearch && matchFilter;
  });


  const handleDeleteAnalysis = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer définitivement cette analyse ?")) return;
    try {
      await apiClient(`/scores/${id}`, {
        method: 'DELETE'
      });
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la suppression de l'analyse.");
    }
  };

  return (
    <>
      <DashboardHeader
        title="Analyses Balance OHADA"
        subtitle="Importez vos balances comptables au format Excel ou CSV et obtenez des scores instantanés"
      />

      <main className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              placeholder="Rechercher une entreprise ou analyse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-[var(--bg-muted)] border-[var(--border)] text-[var(--text)] w-full"
            />
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            {(['all', 'completed', 'processing', 'pending'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === 'all' ? 'Toutes' : f === 'completed' ? 'Complétées' : f === 'processing' ? 'En cours' : 'En attente'}
              </Button>
            ))}
            <Button variant="primary" onClick={() => setShowUploadWizard(true)} className="gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Nouvelle Analyse
            </Button>
          </div>
        </div>

        {/* Upload wizard */}
        {showUploadWizard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card variant="bordered" className="border-[var(--violet-border-strong)] bg-[var(--violet-soft)]/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-display font-bold text-lg text-[var(--text)]">Importer une Balance Financière</h3>
                    <p className="text-xs text-[var(--text-muted)]">Formats supportés : PDF, CSV, Excel, PNG, JPEG</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowUploadWizard(false)}>Annuler</Button>
                </div>
                <UploadAnalysisWidget />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Liste des analyses */}
        {loading ? (
          <p className="text-center py-16 text-[var(--text-muted)]">Chargement de vos analyses financières…</p>
        ) : filtered.length === 0 ? (
          <Card variant="default" className="text-center py-16">
            <CardContent className="flex flex-col items-center justify-center">
              <FileText className="w-14 h-14 text-[var(--violet)] mb-4 opacity-50" />
              <h3 className="font-display font-bold text-lg text-[var(--text)] mb-1">Aucune analyse trouvée</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mb-6">
                Importez un fichier balance pour lancer votre premier diagnostic SYSCOHADA assisté par IA.
              </p>
              <Button variant="primary" onClick={() => setShowUploadWizard(true)}>Importer ma première balance</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filtered.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card variant="default" className="flex flex-col justify-between h-full hover:border-[var(--violet-border-strong)] transition-all group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)] flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {a.entreprise || 'Entreprise Générale'}
                        </span>
                        <h3 className="font-display font-bold text-base text-[var(--text)] mt-1 truncate max-w-[200px]" title={a.fileName}>
                          {a.fileName}
                        </h3>
                      </div>
                      
                      {a.score != null && (
                        <div className={`px-3 py-1 rounded-xl text-sm font-bold border font-mono ${getZoneBg(a.zone || 'saine')} ${getZoneColor(a.zone || 'saine')}`}>
                          {a.score}%
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-[var(--text-2)] mb-5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      {new Date(a.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>

                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge
                          variant={
                            a.status === 'completed' ? 'success' : a.status === 'failed' ? 'error' : 'default'
                          }
                          size="sm"
                        >
                          {a.status === 'completed' ? 'Traité' : a.status === 'failed' ? 'Échoué' : 'En cours'}
                        </Badge>
                        {a.zone && (
                          <Badge variant="default" size="sm" className="capitalize">
                            Zone {a.zone}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeleteAnalysis(a.id)}
                          className="p-2 rounded-lg hover:bg-[var(--error)]/10 text-[var(--text-muted)] hover:text-[var(--error)] transition-colors"
                          title="Supprimer l'analyse"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
