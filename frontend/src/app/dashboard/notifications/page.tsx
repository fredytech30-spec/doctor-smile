'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckSquare,
  Smartphone,
  Mail,
  MessageCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Sliders,
  Play,
  FileText,
  UserCheck
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useAnalyses } from '@/hooks/useAnalyses';
import { apiClient } from '@/lib/api-client';

interface AppNotification {
  notification_id: string;
  channel: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sent_at: string;
  status: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { analyses } = useAnalyses(user);

  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences'>('alerts');
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      notification_id: '1',
      channel: 'in_app',
      message: 'Bienvenue sur votre centre d\'alertes Doctor Smile. Les notifications proactives vous préviennent en cas d\'anomalies financières détectées dans vos balances.',
      priority: 'low',
      sent_at: new Date().toISOString(),
      status: 'unread'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState('');

  // Préférences de notification
  const [prefWhatsApp, setPrefWhatsApp] = useState(true);
  const [prefSMS, setPrefSMS] = useState(false);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefProactive, setPrefProactive] = useState(true);

  // Charger historique (simulé depuis backend + Firestore)
  useEffect(() => {
    async function loadHistory() {
      if (!user) return;
      setLoading(true);
      try {
        // En vrai /notifications/history existe dans le router.py
        const response = await apiClient<{ history: any[] }>('/notifications/history', {
          method: 'GET'
        }).catch(() => ({ history: [] }));
        
        if (response.history && response.history.length > 0) {
          setNotifications(response.history.map(h => ({
            notification_id: h.notification_id,
            channel: h.channel,
            message: h.message,
            priority: h.priority,
            sent_at: h.sent_at,
            status: h.status || 'read'
          })));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, [user]);

  // Enregistrer préférences
  const handleSavePreferences = async () => {
    if (!user) return;
    try {
      await apiClient('/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify({
          whatsapp_enabled: prefWhatsApp,
          sms_enabled: prefSMS,
          email_enabled: prefEmail,
          in_app_enabled: true,
          proactive_alerts: prefProactive,
          daily_digest: false,
          weekly_report: true
        })
      });
      alert("Préférences de notification enregistrées avec succès !");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement des préférences.");
    }
  };

  // Simuler une alerte proactive via le backend
  const handleSimulateProactiveAlert = async () => {
    if (!user || !selectedAnalysisId) return;
    setSimulating(true);
    
    const analysis = analyses.find(a => a.id === selectedAnalysisId);
    
    try {
      await apiClient('/notifications/proactive', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          eventType: 'anomalie_tresorerie',
          analysisData: {
            score: analysis?.score || 45,
            zone: analysis?.zone || 'critique',
            entreprise: analysis?.entreprise || 'Entreprise Test',
            ratios: {
              current_ratio: 0.8,
              quick_ratio: 0.4
            }
          }
        })
      });

      // Mettre à jour la liste des alertes locales pour retour d'information immédiat
      const newNotif: AppNotification = {
        notification_id: `SIM_${Math.random().toString(36).substring(7)}`,
        channel: 'in_app',
        message: `[ALERTE PROACTIVE - ${analysis?.entreprise || 'Entreprise'}] Vulnérabilité de trésorerie critique détectée. Votre ratio de liquidité immédiate est inférieur à 0.5.`,
        priority: 'urgent',
        sent_at: new Date().toISOString(),
        status: 'unread'
      };

      setNotifications(prev => [newNotif, ...prev]);
      alert("Alerte proactive déclenchée ! Si vous avez activé WhatsApp, vous recevrez une alerte.");
    } catch (err: any) {
      console.error(err);
      alert("Erreur lors de la simulation de l'alerte.");
    } finally {
      setSimulating(false);
    }
  };

  const getPriorityBadge = (prio: string) => {
    switch (prio) {
      case 'urgent': return 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20';
      case 'high': return 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20';
      case 'medium': return 'bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet-border)]';
      default: return 'bg-[var(--bg-muted)] text-[var(--text-muted)] border-[var(--border)]';
    }
  };

  return (
    <>
      <DashboardHeader title="Alertes & Proactivité" subtitle="Surveillance proactive multi-canal (WhatsApp, SMS, Email)" />
      
      <main className="p-6 max-w-[1200px] mx-auto space-y-6">
        {/* Onglets */}
        <div className="flex border-b border-[var(--border)]">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-6 py-3 font-display font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'alerts'
                ? 'border-[var(--violet)] text-[var(--violet)]'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <Bell className="w-4 h-4" />
            Centre d'Alertes
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-6 py-3 font-display font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'preferences'
                ? 'border-[var(--violet)] text-[var(--violet)]'
                : 'border-transparent text-[var(--text-2)] hover:text-[var(--text)]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Préférences Multi-canal
          </button>
        </div>

        {/* Tab 1 : Centre d'alertes */}
        {activeTab === 'alerts' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Simulation d'alerte */}
            <div className="lg:col-span-4">
              <Card variant="default" className="p-6">
                <h3 className="font-display font-bold text-sm text-[var(--text)] mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-[var(--violet)]" />
                  Simuler une Alerte Proactive
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-5">
                  Testez le moteur de règles SYSCOHADA en forçant le déclenchement d'une alerte sur l'une de vos entreprises.
                </p>

                <div className="space-y-4">
                  <select
                    value={selectedAnalysisId}
                    onChange={(e) => setSelectedAnalysisId(e.target.value)}
                    className="w-full bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text)] text-sm rounded-xl px-4 py-2.5 outline-none focus:border-[var(--violet)] transition-colors"
                  >
                    <option value="">-- Sélectionner une entreprise --</option>
                    {analyses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.entreprise || a.fileName}
                      </option>
                    ))}
                  </select>

                  <Button
                    onClick={handleSimulateProactiveAlert}
                    disabled={simulating || !selectedAnalysisId}
                    variant="primary"
                    className="w-full"
                  >
                    {simulating ? "Simulation..." : "Déclencher l'alerte"}
                  </Button>
                </div>
              </Card>
            </div>

            {/* Historique des alertes */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="font-display font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider px-1">
                Notifications récentes
              </h3>

              {loading ? (
                <p className="text-center py-12 text-[var(--text-muted)]">Chargement...</p>
              ) : notifications.length === 0 ? (
                <Card variant="default" className="text-center py-12">
                  <CardContent>
                    <CheckSquare className="w-10 h-10 text-[var(--success)] mx-auto mb-2 opacity-60" />
                    <p className="text-sm font-semibold text-[var(--text)]">Aucune alerte active</p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">Votre situation financière est sous contrôle.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => (
                    <motion.div
                      key={notif.notification_id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-5 rounded-2xl bg-[var(--bg-card)] border flex gap-4 ${
                        notif.priority === 'urgent' ? 'border-[var(--error)]/30' : 'border-[var(--border)]'
                      }`}
                    >
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        notif.priority === 'urgent' ? 'bg-[var(--error)]/10 text-[var(--error)]' : 'bg-[var(--violet-soft)] text-[var(--violet)]'
                      }`}>
                        {notif.priority === 'urgent' ? <ShieldAlert className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap justify-between items-start gap-2">
                          <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${getPriorityBadge(notif.priority)}`}>
                            Priorité {notif.priority}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {new Date(notif.sent_at).toLocaleDateString('fr-FR')} à {new Date(notif.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <p className="text-sm text-[var(--text)] leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2 : Préférences */}
        {activeTab === 'preferences' && (
          <div className="max-w-2xl">
            <Card variant="default" className="p-6 space-y-6">
              <div>
                <h3 className="font-display font-bold text-base text-[var(--text)]">Canaux de Réception des Alertes</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Configurez où et comment vous souhaitez être informé des variations de risque financier.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                {/* WhatsApp */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#25D366]/10 text-[#25D366]">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">WhatsApp Proactif</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Recommander en cas d'alerte urgente</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefWhatsApp}
                    onChange={(e) => setPrefWhatsApp(e.target.checked)}
                    className="w-4 h-4 accent-[var(--violet)] cursor-pointer"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[var(--violet-soft)] text-[var(--violet)]">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Rapports et Relances Email</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Rapports de diagnostic détaillés</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefEmail}
                    onChange={(e) => setPrefEmail(e.target.checked)}
                    className="w-4 h-4 accent-[var(--violet)] cursor-pointer"
                  />
                </div>

                {/* SMS */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-muted)] border border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Alertes SMS Critiques</p>
                      <p className="text-[10px] text-[var(--text-muted)]">Frais de commission d'opérateur applicables</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefSMS}
                    onChange={(e) => setPrefSMS(e.target.checked)}
                    className="w-4 h-4 accent-[var(--violet)] cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--border)] flex justify-end">
                <Button onClick={handleSavePreferences} variant="primary">
                  Enregistrer les préférences
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
