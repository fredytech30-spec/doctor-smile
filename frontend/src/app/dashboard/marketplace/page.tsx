'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Users,
  Sparkles,
  MapPin,
  Clock,
  Star,
  CheckCircle,
  Shield,
  MessageSquare,
  Calendar,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyses } from '@/hooks/useAnalyses';
import { apiClient } from '@/lib/api-client';

interface Expert {
  id: string;
  name: string;
  certification: string;
  specializations: string[];
  experience_years: number;
  rating: number;
  hourly_rate: number;
  availability: 'available' | 'busy' | 'offline';
  location: string;
  languages: string[];
  bio: string;
}

interface MatchResult {
  matched_experts: Expert[];
  match_score: number;
  reasoning: string;
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const { analyses } = useAnalyses(user);

  const [activeTab, setActiveTab] = useState<'browse' | 'matching'>('browse');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States pour Smart Matching
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>('');
  const [sector, setSector] = useState<string>('Services');
  const [companySize, setCompanySize] = useState<string>('TPE (1-9 sal.)');
  const [budgetRange, setBudgetRange] = useState<string>('Standard');
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // States pour Modals/Actions
  const [contactingExpert, setContactingExpert] = useState<Expert | null>(null);
  const [bookingExpert, setBookingExpert] = useState<Expert | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingDuration, setBookingDuration] = useState('2');
  const [bookingType, setBookingType] = useState('consultation');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch experts
  useEffect(() => {
    async function loadExperts() {
      if (!user) return;
      setLoadingExperts(true);
      setError(null);
      try {
        const data = await apiClient<Expert[]>('/marketplace/experts', {
          method: 'POST',
        });
        setExperts(data);
      } catch (err: any) {
        console.error(err);
        setError("Impossible de charger la liste des experts.");
      } finally {
        setLoadingExperts(false);
      }
    }
    loadExperts();
  }, [user]);

  const handleSmartMatch = async () => {
    if (!user || !selectedAnalysisId) return;
    setMatchingLoading(true);
    setMatchResult(null);
    setError(null);

    const analysis = analyses.find(a => a.id === selectedAnalysisId);
    // Traduire le risque en format requis par le backend (CRITIQUE|ÉLEVÉ|MOYEN|FAIBLE)
    let riskLevel = 'MOYEN';
    if (analysis?.zone === 'critique') riskLevel = 'CRITIQUE';
    else if (analysis?.zone === 'risque') riskLevel = 'ÉLEVÉ';
    else if (analysis?.zone === 'vigilance') riskLevel = 'MOYEN';
    else if (analysis?.zone === 'saine') riskLevel = 'FAIBLE';

    try {
      const data = await apiClient<MatchResult>('/marketplace/match', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          analyseId: selectedAnalysisId,
          risk_level: riskLevel,
          sector: sector,
          company_size: companySize,
          budget_range: budgetRange
        })
      });
      setMatchResult(data);
    } catch (err: any) {
      console.error(err);
      setError("Erreur lors du calcul du matching IA.");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleContactExpert = async () => {
    if (!user || !contactingExpert) return;
    try {
      await apiClient('/marketplace/contact', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          expertId: contactingExpert.id,
          message: contactMessage,
          analyseId: selectedAnalysisId || null
        })
      });
      setActionSuccess(`Votre message a été transmis avec succès à ${contactingExpert.name}.`);
      setContactingExpert(null);
      setContactMessage('');
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'envoi du message.");
    }
  };

  const handleBookExpert = async () => {
    if (!user || !bookingExpert) return;
    try {
      const response = await apiClient<{
        booking_id: string;
        status: string;
        total_amount: number;
        commission: number;
        payment_link: string;
      }>('/marketplace/booking', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          expertId: bookingExpert.id,
          date: bookingDate,
          duration_hours: parseInt(bookingDuration),
          service_type: bookingType,
          budget: bookingExpert.hourly_rate * parseInt(bookingDuration)
        })
      });
      
      setActionSuccess(`Réservation créée avec succès ! Montant total (sécurisé par Escrow) : ${response.total_amount} FCFA. Lien de paiement simulé : ${response.payment_link}`);
      setBookingExpert(null);
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la réservation.");
    }
  };

  return (
    <>
      <DashboardHeader
        title="Marketplace Experts"
        subtitle="Mise en relation sécurisée avec les experts comptables agréés ONECCA du Cameroun"
      />

      <main className="p-6 max-w-[1400px] mx-auto space-y-6">
        {/* Messages de succès d'action temporaires */}
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-[var(--success)]/10 border border-[var(--success)] text-[var(--success)] flex items-start gap-3"
          >
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Action Réussie</p>
              <p className="text-xs opacity-90 mt-0.5">{actionSuccess}</p>
            </div>
            <button onClick={() => setActionSuccess(null)} className="ml-auto text-xs underline font-semibold">Fermer</button>
          </motion.div>
        )}

        {/* Navigation par onglets */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-6 py-3 font-display font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'browse'
                ? 'border-[var(--violet)] text-[var(--violet)]'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <Store className="w-4 h-4" />
            Parcourir les Experts
          </button>
          <button
            onClick={() => setActiveTab('matching')}
            className={`px-6 py-3 font-display font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'matching'
                ? 'border-[var(--violet)] text-[var(--violet)]'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Smart Matching IA
          </button>
        </div>

        {/* Tab 1 : Parcourir */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {loadingExperts ? (
              <p className="text-center py-16 text-[var(--text-muted)]">Chargement des experts ONECCA…</p>
            ) : error ? (
              <p className="text-center py-16 text-[var(--error)]">{error}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {experts.map((exp) => (
                  <Card key={exp.id} variant="default" className="flex flex-col h-full hover:border-[var(--violet-border-strong)] transition-all">
                    <CardContent className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Header expert */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-display font-bold text-lg text-[var(--text)]">{exp.name}</h3>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="success" size="sm">
                                {exp.certification} Certifié
                              </Badge>
                              <span className="text-[10px] text-[var(--text-muted)]">{exp.experience_years} ans exp.</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-[var(--violet-soft)] text-[var(--violet)] px-2.5 py-1 rounded-xl text-xs font-bold border border-[var(--violet-border)]">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {exp.rating.toFixed(1)}
                          </div>
                        </div>

                        <p className="text-xs text-[var(--text-2)] line-clamp-3 mb-4 leading-relaxed italic">
                          "{exp.bio}"
                        </p>

                        {/* Spécialités */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                          {exp.specializations.map((spec, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-muted)] text-[var(--text-2)] border border-[var(--border)]">
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Infos tarifs et actions */}
                      <div className="pt-4 border-t border-[var(--border)]">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-1 text-[var(--text-2)] text-xs">
                            <MapPin className="w-3.5 h-3.5" />
                            {exp.location}
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-[var(--violet)]">{exp.hourly_rate.toLocaleString('fr-FR')}</span>
                            <span className="text-[10px] text-[var(--text-muted)] block">FCFA / heure</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setContactingExpert(exp)}
                            className="gap-1.5 py-2.5"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Contacter
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setBookingExpert(exp)}
                            className="gap-1.5 py-2.5"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            Réserver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2 : Smart Matching IA */}
        {activeTab === 'matching' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulaire de matching */}
            <div className="lg:col-span-4 space-y-5">
              <Card variant="default" className="p-6">
                <h3 className="font-display font-bold text-base text-[var(--text)] mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--violet)] animate-pulse" />
                  Moteur de matching
                </h3>

                <div className="space-y-4">
                  {/* Choix de l'analyse */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)] block">Sélectionnez le rapport d'analyse</label>
                    <select
                      value={selectedAnalysisId}
                      onChange={(e) => setSelectedAnalysisId(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                    >
                      <option value="">-- Sélectionner une analyse --</option>
                      {analyses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fileName} ({a.score != null ? `${a.score}%` : 'Sans score'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Choix du secteur */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)] block">Secteur d'activité</label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                    >
                      <option value="Commerce">Commerce</option>
                      <option value="Services">Services & Technologie</option>
                      <option value="Industrie">Industrie & Manufacturier</option>
                      <option value="Construction">BTP & Construction</option>
                    </select>
                  </div>

                  {/* Taille de l'entreprise */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)] block">Taille de l'entreprise</label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                    >
                      <option value="TPE (1-9 sal.)">TPE (1-9 salariés)</option>
                      <option value="PME (10-99 sal.)">PME (10-99 salariés)</option>
                      <option value="ETI (100+ sal.)">ETI (100+ salariés)</option>
                    </select>
                  </div>

                  {/* Budget */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)] block">Fourchette budgétaire horaire</label>
                    <select
                      value={budgetRange}
                      onChange={(e) => setBudgetRange(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                    >
                      <option value="Standard">Standard (20k - 25k FCFA/h)</option>
                      <option value="Premium">Premium (26k - 35k FCFA/h)</option>
                    </select>
                  </div>

                  <Button
                    onClick={handleSmartMatch}
                    disabled={matchingLoading || !selectedAnalysisId}
                    variant="primary"
                    className="w-full mt-2"
                  >
                    {matchingLoading ? "Matching en cours..." : "Calculer le Smart Match IA"}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Résultats du matching */}
            <div className="lg:col-span-8 space-y-6">
              {matchingLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-10 h-10 border-4 border-[var(--violet)] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[var(--text-muted)]">Le modèle de matching IA Doctor Smile analyse les vulnérabilités de votre balance OHADA pour identifier le meilleur expert...</p>
                </div>
              ) : matchResult ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Synthèse matching */}
                  <Card variant="bordered" className="bg-[var(--violet-soft)]/10 border-[var(--violet-border-strong)]">
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                          <h4 className="font-display font-bold text-lg text-[var(--text)]">Recommandation du Smart Matching IA</h4>
                          <p className="text-xs text-[var(--text-muted)]">Basé sur l'analyse des risques financiers</p>
                        </div>
                        <div className="bg-[var(--violet-strong)] text-white font-mono font-bold text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-[var(--shadow-md)]">
                          Score : {Math.round(matchResult.match_score * 100)}%
                        </div>
                      </div>

                      <p className="text-sm text-[var(--text-2)] leading-relaxed bg-[var(--bg-muted)] p-4 rounded-xl border border-[var(--border)]">
                        {matchResult.reasoning}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Experts recommandés */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {matchResult.matched_experts.map((exp) => (
                      <Card key={exp.id} variant="default" className="flex flex-col justify-between hover:border-[var(--violet-border-strong)] transition-all">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-display font-bold text-lg text-[var(--text)]">{exp.name}</h3>
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Badge variant="success" size="sm">ONECCA</Badge>
                                <span className="text-[10px] text-[var(--text-muted)]">{exp.experience_years} ans exp.</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 bg-[var(--violet-soft)] text-[var(--violet)] px-2.5 py-1 rounded-xl text-xs font-bold border border-[var(--violet-border)]">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              {exp.rating}
                            </div>
                          </div>

                          <p className="text-xs text-[var(--text-2)] mb-4 italic">
                            "{exp.bio}"
                          </p>

                          <div className="pt-4 border-t border-[var(--border)] flex justify-between items-center mb-4">
                            <span className="text-xs text-[var(--text-2)]">{exp.location}</span>
                            <div className="text-right">
                              <span className="font-mono font-bold text-sm text-[var(--violet)]">{exp.hourly_rate.toLocaleString('fr-FR')}</span>
                              <span className="text-[10px] text-[var(--text-muted)] block">FCFA / h</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setContactingExpert(exp)}
                            >
                              Contacter
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setBookingExpert(exp)}
                            >
                              Réserver
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bg-[var(--violet-soft)] border border-[var(--violet-border)] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[var(--violet)] animate-pulse" />
                  </div>
                  <h4 className="font-display font-bold text-lg text-[var(--text)] mb-1">Mise en relation intelligente</h4>
                  <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">Choisissez une analyse de balance OHADA à gauche pour calculer la correspondance idéale avec les experts.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL CONTACT EXPERT */}
        {contactingExpert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="font-display font-bold text-lg text-[var(--text)]">Contacter {contactingExpert.name}</h3>
                <p className="text-xs text-[var(--text-muted)]">Un message instantané lui sera envoyé via email/WhatsApp</p>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Votre message</label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Bonjour, je souhaite un audit sur mes créances clients suite à l'analyse de ma balance OHADA..."
                    className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl p-4 h-32 outline-none focus:border-[var(--violet)] resize-none"
                  />
                </div>
              </div>
              <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--bg-elevated)]">
                <Button variant="secondary" onClick={() => setContactingExpert(null)}>Annuler</Button>
                <Button variant="primary" onClick={handleContactExpert} disabled={contactMessage.length < 10}>Envoyer le message</Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL RESERVATION */}
        {bookingExpert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[var(--bg-card)] border border-[var(--border)] w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-[var(--border)]">
                <h3 className="font-display font-bold text-lg text-[var(--text)]">Réserver une consultation</h3>
                <p className="text-xs text-[var(--text-muted)]">Avec {bookingExpert.name} (Escrow sécurisé)</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)]">Date souhaitée</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-2)]">Durée (heures)</label>
                    <select
                      value={bookingDuration}
                      onChange={(e) => setBookingDuration(e.target.value)}
                      className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)]"
                    >
                      <option value="1">1 heure</option>
                      <option value="2">2 heures</option>
                      <option value="3">3 heures</option>
                      <option value="4">4 heures</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-2)]">Type d'accompagnement</label>
                  <select
                    value={bookingType}
                    onChange={(e) => setBookingType(e.target.value)}
                    className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)]"
                  >
                    <option value="consultation">Consultation Financière</option>
                    <option value="audit">Audit Balance OHADA</option>
                    <option value="restructuring">Restructuration Financière</option>
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-[var(--violet-soft)] border border-[var(--violet-border)] flex items-start gap-3 mt-4">
                  <Shield className="w-5 h-5 text-[var(--violet)] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">Paiement Escrow Sécurisé</p>
                    <p className="text-[10px] text-[var(--text-2)] mt-0.5">Votre budget de {(bookingExpert.hourly_rate * parseInt(bookingDuration)).toLocaleString('fr-FR')} FCFA restera consigné en Escrow. L'expert ne sera libéré du paiement qu'après réalisation de la prestation.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3 bg-[var(--bg-elevated)]">
                <Button variant="secondary" onClick={() => setBookingExpert(null)}>Annuler</Button>
                <Button variant="primary" onClick={handleBookExpert} disabled={!bookingDate}>Confirmer et Payer</Button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </>
  );
}
